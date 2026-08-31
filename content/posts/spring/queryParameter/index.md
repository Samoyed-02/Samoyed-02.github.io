---
title: "필수 쿼리 파라미터를 안 보냈더니 400이 아니라 500이 떨어졌다"
date: 2026-08-02
draft: false
summary: "핸들러가 없었다."
categories: ["Spring"]
tags: ["예외처리", "트러블슈팅", "API설계"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---
# 필수 쿼리 파라미터를 안 보냈더니 400이 아니라 500이 떨어졌다

# 배경

`GET /admin/attendances`는 `scheduleId`를 필수 쿼리 파라미터로 받는다. 이 파라미터를 빼고 테스트했더니 기대했던 `400 Bad Request`가 아니라 `500 Internal Server Error`가 떨어졌다.

원인은 `GlobalExceptionHandler`에 `MissingServletRequestParameterException`을 처리하는 핸들러가 없었던 것이었다. `@RequestParam(required = true)`인 파라미터가 없으면 스프링이 이 예외를 던지는데, 팀의 예외 핸들러가 이걸 못 잡아서 처리되지 않은 예외로 취급되어 500으로 떨어진 것이다.

## 해결

핸들러를 추가했다.

```java
@ExceptionHandler(MissingServletRequestParameterException.class)
public ResponseEntity<Problem> handleMissingParameter(MissingServletRequestParameterException e) {
    // 400으로 변환, Problem Details 포맷으로 응답
}
```

## 참고 — 새 엔드포인트 만들 때 점검해볼 스프링 내장 예외 목록

이번 기회에 "새 엔드포인트를 추가할 때마다 관련 내장 예외가 다 잡히는지" 체크리스트를 만들어뒀다.

| 예외 | 발생 상황 | 기대 응답 |
| --- | --- | --- |
| `MissingServletRequestParameterException` | 필수 쿼리 파라미터 누락 | 400 |
| `MethodArgumentNotValidException` | `@Valid` 요청 바디 검증 실패 | 400/422 |
| `MethodArgumentTypeMismatchException` | 경로/쿼리 파라미터 타입 불일치 (예: `scheduleId=abc`) | 400 |
| `HttpMessageNotReadableException` | 요청 바디 JSON 파싱 실패 | 400 |

새 엔드포인트에 지금까지 안 쓰던 종류의 파라미터(필수 쿼리값, enum 타입, 경로 변수 타입 등)가 추가되면 이 목록과 대조해보는 걸 습관으로 만들려고 한다.

## 한 줄 교훈

`GlobalExceptionHandler`는 한 번 만들고 끝이 아니라, 새로운 종류의 요청 검증이 추가될 때마다 커버리지를 다시 점검해야 하는 살아있는 문서다.

필수 쿼리 파라미터를 안 보냈더니 400이 아니라 500이 떨어졌다