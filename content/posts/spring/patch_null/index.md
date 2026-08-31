---
title: "PATCH에서 "안 보냄"과 "null 보냄"을 구분하기"
date: 2026-07-13
draft: false
summary: "@JsonSetter + provided 플래그"
categories: ["Spring"]
tags: ["QueryDSL", "JPA", "쿼리최적화"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---
# PATCH에서 "안 보냄"과 "null 보냄"을 구분하기 — `@JsonSetter` + `provided` 플래그

# 배경

관리자 출결 수정 API(`PATCH /admin/attendances/{id}`)를 만들 때, `memo` 필드를 세 가지 경우로 구분해야 했다.

1. 필드를 아예 안 보냄 → 기존 값 유지
2. 필드에 명시적으로 `null`을 보냄 → 값 제거
3. 필드에 값을 보냄 → 값 변경

문제는 Jackson 기본 역직렬화로는 1번과 2번을 구분할 수 없다는 것이다. 요청 바디에 `"memo"` 키가 아예 없어도, `"memo": null`이 와도, DTO의 `memo` 필드는 똑같이 `null`이 된다.

## 해결

팀에서 이미 `UpdateScheduleRequest`에 쓰고 있던 패턴을 그대로 따랐다. `@JsonSetter`가 실제로 호출됐는지 자체를 "필드가 전송됐다"는 증거로 쓰는 방식이다.

```java
public class UpdateAttendanceRequest {

    private String memo;
    private boolean memoProvided = false;

    @JsonSetter("memo")
    public void setMemo(String memo) {
        this.memo = memo;
        this.memoProvided = true;
    }

    public boolean isMemoProvided() {
        return memoProvided;
    }
}
```

- 필드가 요청 바디에 없으면 `setMemo()`가 아예 호출되지 않으므로 `memoProvided`는 `false`로 남는다
- `"memo": null`이 오면 `setMemo(null)`이 호출되어 `memoProvided`는 `true`, `memo`는 `null`이 된다
- 값이 오면 `memoProvided`는 `true`, `memo`는 그 값이 된다

서비스 레이어에서는 이렇게 분기한다.

```java
if (request.isMemoProvided()) {
    attendance.updateMemo(request.getMemo()); // null이면 제거, 값 있으면 변경
}
// provided가 false면 아무것도 안 함 → 기존 값 유지
```

## 참고

`JsonNullable<T>` 같은 별도 라이브러리를 도입하는 방법도 있지만, 이미 팀에서 쓰던 컨벤션이 있으면 새 라이브러리보다 기존 패턴을 재사용하는 쪽이 일관성 유지에 낫다.

## 한 줄 교훈

PATCH의 부분 수정 의미론(필드 없음 vs null vs 값)은 Jackson 기본 동작만으로는 표현이 안 되니, `@JsonSetter` 호출 여부를 "전송 증거"로 활용하는 패턴을 팀 컨벤션으로 굳혀두면 편하다.