---
title: "[AI Manager] 캐시 지점만으로는 부족했다: 바뀌는 맥락을 뒤로 옮겨 채팅 턴 비용을 80% 줄였다"
date: 2026-11-05
draft: true
summary: "매 턴 바뀌는 맥락이 시스템 프롬프트에 있으면 대화 기록은 캐시되지 않는다. 맥락을 대화 기록 뒤로 옮겨 두 번째 턴부터 비용을 약 80% 줄였다."
categories: ["Retrospective"]
tags: ["Claude API", "프롬프트캐시", "비용최적화", "Kotlin", "개인프로젝트"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true
---

## 배경

AI Manager는 채팅과 음성 통화의 기억을 함께 쓰는 개인 AI 매니저 서버다. 채팅은 Anthropic Java SDK 2.60.0으로 `claude-sonnet-5-5`를 호출하고, 활동 기록이나 목표 등록 같은 일은 도구로 처리한다.

mock 테스트만 돌리던 서버를 처음으로 실제 API에 연결해 17개 시나리오를 돌렸다. 기능은 대부분 동작했지만 호출 로그에 눈에 띄는 값이 있었다.

```
input_tokens=... cache_read_tokens=0
```

모든 호출의 `cache_read_tokens`가 0이었다. 전체 비용 $0.60 중 채팅이 $0.54로 89%를 차지했고, 요청 한 번의 입력은 약 1.1만~1.3만 토큰이었다. 도구를 쓰는 턴은 요청이 여러 번이라 턴당 $0.05 안팎이 들었다. 금액은 모두 사용량 로그에 정가를 곱한 추정치다.

## 문제

도구 정의 12개와 고정 지시는 매 요청 똑같은데, 이 약 1.1만 토큰을 매번 정가로 내고 있었다. 코드에 캐시 지점(`cache_control`)이 하나도 없었으니 당연한 결과다.

하지만 캐시 지점을 찍는 것만으로는 부족했다. 캐시는 요청의 `tools → system → messages` 순서에서 앞부분이 바이트 단위로 같을 때만 읽힌다. 기존 요청은 이렇게 만들어졌다.

```kotlin
.system(SYSTEM_PROMPT.trimIndent() + "\n\n" + context.forClaude(prepared.conversationId))
```

맥락(`context.forClaude`)은 사용자의 기억과 활동을 담고, **분 단위 현재 시각**을 포함한다. 이 값이 시스템 프롬프트 안에 있어서 대화 기록보다 앞에 온다. 앞부분이 매번 달라지니 그 뒤의 대화 기록은 캐시 지점을 어디에 두어도 읽히지 않는다.

## 시도와 판단

Claude Code가 원인을 정리해 두 방식을 비교한 계획을 냈고, 내가 그중 B를 골랐다.

| | 방식 | 캐시되는 범위 |
|---|---|---|
| A | 시스템 프롬프트를 [고정 지시 + 캐시 지점]과 [맥락] 두 블록으로 나눈다 | 도구와 고정 지시 |
| B | 맥락을 시스템 프롬프트에서 빼서 현재 사용자 메시지 뒤의 system 메시지로 옮긴다 | 도구, 고정 지시, 대화 기록 전체 |

A는 변경이 작지만 대화 기록은 계속 정가다. B는 대화가 길어질수록 차이가 커진다. 다만 B는 Sonnet 5.5가 지원하는 대화 중 `system` 메시지에 기댄다는 위험이 있었다. 400 오류가 나면 되돌릴 수 있도록 설정을 하나 남겼다.

바꾼 요청 구조는 다음과 같다.

```kotlin
/**
 * 캐시는 tools → system → messages 순서의 앞부분이 똑같을 때만 읽힌다. 바뀌지 않는 것을 앞에, 바뀌는 것을 뒤에 둔다.
 * ① 고정 지시(앞의 도구 정의 포함) ② 현재 사용자 메시지에 캐시 지점을 두고, 매 턴 바뀌는 맥락은 그 뒤에 보낸다.
 * 다음 턴에는 이번 ②까지가 그대로 앞부분이 되어 대화 기록 전체를 캐시에서 읽는다.
 * 같은 턴의 도구 라운드는 자동 캐시 지점(요청의 마지막 블록)으로 맥락·도구 결과까지 읽는다
 */
private fun buildParams(prepared: PreparedChat): MessageCreateParams {
    val context = context.forClaude(prepared.conversationId)
    val system = buildList {
        add(TextBlockParam.builder().text(SYSTEM_PROMPT.trimIndent()).cacheControl(CACHE).build())
        if (!contextAsSystemMessage) add(TextBlockParam.builder().text(context).build())
    }
    return MessageCreateParams.builder()
        .model(model)
        .maxTokens(4096)
        .systemOfTextBlockParams(system)
        .tools(WEB_TOOLS + tools.claudeDefinitions.map { ToolUnion.ofTool(it) })
        .cacheControl(CACHE)
        .apply {
            prepared.history.forEachIndexed { i, message ->
                when {
                    message.role != "user" -> addAssistantMessage(withActions(message))
                    i == prepared.history.lastIndex -> addUserMessageOfBlockParams(
                        listOf(ContentBlockParam.ofText(TextBlockParam.builder().text(message.content).cacheControl(CACHE).build()))
                    )
                    else -> addUserMessage(message.content)
                }
            }
            if (contextAsSystemMessage) addSystemMessage(context)
        }
        .build()
}
```

핵심은 캐시 지점 ②가 맥락 **앞**에 있다는 것이다. 이번 턴의 맥락은 ② 뒤에 붙었다가 다음 턴 요청에서는 빠진다. 그래서 다음 턴의 앞부분은 이전 요청의 ②까지와 똑같고, 대화 기록 전체를 캐시에서 읽는다.

도구 라운드는 계획에서 "마지막 도구 결과로 캐시 지점을 옮긴다"고 했지만, 실제로는 요청 최상위의 자동 캐시(`.cacheControl(CACHE)`)로 처리했다. 라운드마다 캐시 지점을 직접 옮기지 않아도 된다.

"앞부분이 같다"는 조건은 코드만 봐서는 깨져도 알아채기 어렵다. 그래서 두 턴을 연달아 보내 비교하는 테스트를 넣었다.

```kotlin
val cachedUpTo = firstSent.messages().indexOfFirst { it.cached() }
assertAll(
    { assertEquals(firstSent.system(), secondSent.system()) },
    { assertEquals(firstSent.tools(), secondSent.tools()) },
    {
        assertEquals(
            firstSent.messages().take(cachedUpTo + 1).map { it.role() to it.text() },
            secondSent.messages().take(cachedUpTo + 1).map { it.role() to it.text() },
        )
    },
    // ...
)
```

## 결과

실제 API로 같은 대화에서 4턴을 돌렸다($0.06). 대화 중 `system` 메시지도 400 없이 동작했다.

| 턴 | 캐시 읽기 | 캐시 쓰기 | 비용 | 수정 전 실행 |
|---|---|---|---|---|
| 인사 | 0 | 11,082 | $0.0293 | $0.0247 |
| 활동 기록 (도구 2회) | 33,657 | 535 | $0.0115 | $0.0513 |
| 목표 등록 | 22,722 | 703 | $0.0104 | $0.0576 |
| 목표에 연결된 활동 | 23,271 | 697 | $0.0087 | $0.0547 |

두 번째 턴부터 약 80% 줄었고, 첫 턴은 캐시 쓰기 때문에 약 20% 비싸졌다. 첫 턴에 더 낸 약 $0.005는 다음 턴 하나에서 바로 회수된다.

다만 이 비교는 그대로 믿기 어려운 면이 있다. 수정 전 값은 전체 시나리오 실행에서 나왔고, 그때는 같은 대화에 날씨 검색과 코드 질문 턴이 더 있었다. 대화 길이도, 도구 라운드 수도 다르다. 그래서 수정 후 실행의 토큰 수에 캐시 없는 정가를 곱해 같은 턴끼리 다시 계산해 봤다. 입력 $2, 출력 $10, 캐시 읽기 $0.20, 5분 캐시 쓰기 $2.50(모두 MTok당)을 썼다.

| 턴 | 입력 합계 | 캐시 없을 때 (계산) | 실제 | 절감 |
|---|---|---|---|---|
| 인사 | 11,083 | $0.0238 | $0.0293 | −23% |
| 활동 기록 | 34,197 | $0.0718 | $0.0115 | 84% |
| 목표 등록 | 23,428 | $0.0509 | $0.0104 | 80% |
| 목표에 연결된 활동 | 23,971 | $0.0502 | $0.0087 | 83% |

계산으로 봐도 80%대가 나왔다.

이 숫자의 한계도 적어 둔다.

- **연달아 보낸 대화에서 잰 값이다.** 캐시 유지 시간은 5분이라, 5분 넘게 쉬었다 말을 걸면 첫 턴처럼 쓰기 비용이 다시 든다. 실제 사용 간격이 길면 절감 폭은 이보다 작다.
- **월 청구액이 80% 준다는 뜻이 아니다.** 턴 4개를 잰 추정치이고, 출력 토큰과 웹 검색 비용은 캐시와 관계없다.
- **방식 A는 돌려 보지 않았다.** A와 B의 차이를 실제로 잰 것은 아니다.

<!-- TODO: 실제 사용 로그의 cache_read_tokens로 잰 절감 폭이 나오면 추가. 1시간 유지로 바꿀지 판단한 결과도 추가 -->

## 배운 점

- **캐시 지점보다 요청 순서가 먼저다.** 캐시 지점은 어디까지 저장할지를 정할 뿐이다. 그 앞에 매번 바뀌는 값이 있으면 읽히지 않는다. 분 단위 시각 하나가 대화 기록 전체의 캐시를 막고 있었다.
- **로그가 있어야 문제가 보인다.** 호출마다 남긴 `cache_read_tokens=0`을 보고 캐시가 전혀 쓰이지 않는다는 것을 바로 확인할 수 있었다.
- **비용 비교는 조건부터 맞춘다.** 수정 전후 실행의 조건이 달라서 턴별 숫자를 그대로 비교할 수 없었다. 같은 토큰 수로 다시 계산해 보고 나서야 숫자를 믿을 수 있었다.
- **첫 턴이 비싸지는 것은 받아들일 만하다.** 캐시 쓰기는 정가보다 비싸므로 한 번 쓰고 다시 읽지 않으면 손해다. 대화가 이어지는 채팅에는 맞지만, 프롬프트가 짧거나 매번 달라 효과가 작은 기억 추출, 브리핑, 회고, 문서 작업에는 적용하지 않았다.
