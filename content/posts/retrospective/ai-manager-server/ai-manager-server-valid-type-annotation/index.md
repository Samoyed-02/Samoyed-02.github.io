---
title: "[AI Manager] Kotlin에서 List<@Valid T>로 바꾸면 경고와 함께 검증도 사라진다"
date: 2026-11-05
draft: true
summary: "HV000271 경고를 고치려고 @Valid를 타입 인자로 옮겼더니 목록 원소 검증이 조용히 빠졌고, -Xemit-jvm-type-annotations로 해결했다."
categories: ["Retrospective"]
tags: ["Kotlin", "Spring Boot", "Validation", "트러블슈팅", "개인프로젝트"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true
---

## 배경

AI Manager는 채팅과 음성 통화의 기억을 함께 쓰는 개인 AI 매니저 서버다. Kotlin, Spring Boot 4.1.1로 만들고 있다. 통화가 끝나면 클라이언트가 받아 적은 기록을 `POST /voice/calls`로 보내고, 서버는 이 기록을 대화로 저장한다.

요청 DTO는 이렇게 생겼다. 발화 개수와 함께 각 발화의 역할(`role`)과 내용(`text`)도 검증한다.

```kotlin
data class VoiceTurn(
    @field:Pattern(regexp = "user|assistant", message = "user 또는 assistant만 가능합니다")
    val role: String,

    @field:NotBlank(message = "비어 있을 수 없습니다")
    @field:Size(max = MAX_CALL_TURN_TEXT, message = "최대 {max}자까지 입력할 수 있습니다")
    val text: String,
)

data class VoiceCallRequest(
    val startedAt: OffsetDateTime,
    val endedAt: OffsetDateTime? = null,

    @field:Size(min = 1, max = MAX_CALL_TURNS, message = "발화는 {min}~{max}개여야 합니다")
    @field:Valid
    val turns: List<VoiceTurn>,
)
```

실제 Docker 이미지로 서버를 띄워 점검하다가 기동 로그에서 경고 하나를 봤다.

```
HV000271: Using `@Valid` on a container (java.util.List) is deprecated.
You should apply the annotation on the type argument(s). Affected element: turns
```

동작에는 문제가 없었지만, 이후 버전에서 지원이 빠지면 발화 검증이 사라질 수 있어 고치기로 했다.

## 문제

경고가 시키는 대로 `@Valid`를 타입 인자로 옮겼다.

```kotlin
@field:Size(min = 1, max = MAX_CALL_TURNS, message = "발화는 {min}~{max}개여야 합니다")
val turns: List<@Valid VoiceTurn>,
```

컴파일은 통과했고, 테스트 로그에서 `HV000271`도 사라졌다. 여기까지만 보면 잘 고친 것처럼 보인다. 그런데 기존 테스트 하나가 실패했다.

```
VoiceCallApiTest
jakarta.servlet.ServletException: Request processing failed:
org.springframework.dao.DataIntegrityViolationException: could not execute statement
[ERROR: new row for relation "messages" violates check constraint "messages_role_check"
```

`role`이 `system`인 발화를 보내고 400을 기대하는 테스트였다. 요청은 검증에서 막히지 않고 컨트롤러를 지나 DB까지 갔고, `messages` 테이블의 체크 제약에 걸려서야 멈췄다. 경고와 함께 발화 검증도 사라진 것이다.

`role`은 DB 제약이 있어 500 오류로라도 막혔다. 하지만 `text` 값이 저장되는 `content` 컬럼은 `not null` 제약뿐이라 공백 문자열을 막을 곳이 없다. 경고가 사라진 것만 확인했다면 놓치기 쉬운 문제였다.

## 시도와 판단

이 위험은 수정 전에 세운 계획에 적어 두었다. Claude Code와 계획을 검토할 때 나온 내용으로, Kotlin이 타입 인자의 어노테이션을 바이트코드에 남기지 않으면 경고만 사라지고 검증도 빠질 수 있으니, 그 경우 컴파일 옵션을 추가하자는 것이었다. 기존 테스트가 `turns[0].role` 오류까지 확인한다는 것도 미리 봐 두었다.

Bean Validation은 런타임에 리플렉션으로 어노테이션을 읽는다. 바이트코드에 없으면 검증기는 `@Valid`가 있는지 알 수 없고, 목록 원소를 검사하지 않는다. 옵션을 추가해 이 설명이 맞는지 확인했다.

```kotlin
kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
        // List<@Valid T>처럼 타입 인자에 붙인 어노테이션을 바이트코드에 남긴다. 없으면 목록 원소 검사가 조용히 빠진다
        freeCompilerArgs.add("-Xemit-jvm-type-annotations")
    }
}
```

## 결과

옵션을 켜자 테스트 171개가 모두 통과했고, 테스트 로그에 `HV000271`도 없었다. 컴파일된 클래스를 `javap -v`로 보면 필드의 타입 인자에 `@Valid`가 남아 있다.

```
RuntimeVisibleTypeAnnotations:
  0: #11(): FIELD, location=[TYPE_ARGUMENT(0)]
    jakarta.validation.Valid
```

옵션을 켜기 전의 바이트코드를 직접 비교해 보지는 않았다. 옵션 유무에 따라 테스트 결과가 달라진 것으로 원인을 판단했다.

이번에 검증 테스트도 하나 늘렸다. 기존 테스트는 `role`만 확인했으므로, 두 번째 발화의 `text`가 공백이면 400이 나오는지도 확인한다. 목록의 첫 원소만이 아니라 뒤 원소도 검사되는지, DB 제약이 없는 필드도 막히는지 함께 볼 수 있다.

```kotlin
post("""{"startedAt":"2026-11-03T12:30:00Z","turns":[{"role":"user","text":"안녕"},{"role":"assistant","text":" "}]}""").andExpect {
    status { isBadRequest() }
    jsonPath("$.fields['turns[1].text']") { exists() }
}
```

옵션은 프로젝트 전체에 적용되므로, 앞으로 다른 DTO에 `List<@Valid T>`를 써도 같은 문제가 생기지 않는다.

## 배운 점

- **경고가 사라졌다고 고쳐진 것은 아니다.** 이번에 경고가 사라진 이유는 검증기가 `@Valid`를 올바른 위치에서 찾아서가 아니라, 아예 찾지 못해서였다.
- **어노테이션을 옮기는 수정도 동작을 바꿀 수 있다.** 런타임에 읽는 어노테이션은 소스에 있어도 바이트코드에 없으면 없는 것과 같다. 컴파일러가 잡아 주지도 않는다.
- **검증은 통과 경로뿐 아니라 거부 경로도 테스트해야 한다.** 정상 요청만 확인했다면 이번 문제는 드러나지 않았다. 잘못된 입력이 어떤 필드 오류로 거부되는지까지 확인한 테스트가 잡아냈다.
- **DB 제약은 마지막 방어선이다.** `role` 체크 제약 덕분에 잘못된 데이터가 저장되지는 않았다. 다만 사용자는 400 대신 500을 받았을 것이고, 제약이 없는 `text`는 막지 못한다.

