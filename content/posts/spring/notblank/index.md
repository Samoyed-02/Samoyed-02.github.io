---
title: "@NotBlank가 숫자 필드에 붙어있어도 컴파일은 된다"
date: 2026-07-20
draft: false
summary: "@JsonSetter + provided 플래그"
categories: ["Spring"]
tags: ["Validation", "트러블슈팅"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---
# `@NotBlank`가 숫자 필드에 붙어있어도 컴파일은 된다

# 배경

`UpdateScheduleRequest`의 `version` 필드(낙관적 잠금용, `Integer` 타입)에 `@NotBlank`가 붙어있는 걸 테스트 작성 중에 발견했다.

```java
// 문제가 있던 코드
@NotBlank
private Integer version;
```

`@NotBlank`는 `String` 전용 제약이다. 빈 문자열(`""`)이나 공백 문자열을 막기 위한 애너테이션인데, `Integer` 필드엔 애초에 적용될 수 없는 검증이다. 그런데 이게 컴파일 에러로 이어지지 않는다는 게 문제였다 — Bean Validation은 런타임에 동작하기 때문에, 타입이 안 맞는 애너테이션이 붙어있어도 빌드는 통과한다.

## 해결

숫자·객체류 필드는 `@NotNull`로 교체했다.

```java
@NotNull
private Integer version;
```

| 애너테이션 | 대상 | 의미 |
| --- | --- | --- |
| `@NotNull` | 모든 타입 | null이 아니어야 함 |
| `@NotEmpty` | String, Collection, Map, Array | null이 아니고 비어있지 않아야 함 |
| `@NotBlank` | String 전용 | null이 아니고 공백 아닌 문자를 최소 1개 포함해야 함 |

`@NotBlank`/`@NotEmpty`를 문자열 아닌 필드에 붙이면 검증이 항상 통과하거나(사실상 무의미) 예상치 못하게 동작할 수 있어서, 있으나 마나 한 검증이 되어버린다.

## 참고

이런 종류의 실수는 정적 분석 도구로 사전에 잡을 수 있다. 팀 규모가 커지면 커스텀 lint 룰이나 ArchUnit 같은 아키텍처 테스트로 "필드 타입과 검증 애너테이션 궁합"을 강제하는 것도 고려해볼 만하다.

## 한 줄 교훈

Bean Validation 애너테이션은 타입이 안 맞아도 컴파일이 통과하니, PR 리뷰 체크리스트에 "필드 타입과 검증 애너테이션이 실제로 맞는지" 항목을 넣어두는 게 안전하다.