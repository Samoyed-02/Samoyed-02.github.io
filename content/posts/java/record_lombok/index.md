---
title: "응답 DTO를 record 대신 Lombok 클래스로 통일한 이유"
date: 2025-11-20
draft: false
summary: "Record -> Lombk"
categories: ["java"]
tags: ["DTO", "설계원칙", "record"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---
# 응답 DTO를 record 대신 Lombok 클래스로 통일한 이유

# 배경

우리 팀 컨벤션 문서(`docs/CONVENTIONS.md`)는 PR #19를 계기로 만들어졌다. 같은 응답 DTO를 팀원 두 명이 각자 다른 스타일로 만들어서 빌드가 충돌났던 게 원인이었다. 한쪽은 `record`, 한쪽은 Lombok 클래스로 같은 이름의 DTO를 만들었던 것이다.

## 해결

형태를 하나로 고정했다. record가 요즘 트렌드긴 하지만, 팀 전체가 record의 관례(불변, `xxx()` 접근자, compact 생성자 등)에 익숙하지 않은 상태에서 섞어 쓰면 리뷰 비용이 늘어난다고 판단해서 Lombok 클래스로 통일했다.

```java
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AttendanceResponse {

    private final Long attendanceId;
    private final AttendanceStatus status;

    public static AttendanceResponse of(Long attendanceId, AttendanceStatus status) {
        return new AttendanceResponse(attendanceId, status);
    }

    public static AttendanceResponse from(Attendance entity) {
        return of(entity.getAttendanceId(), entity.getStatus());
    }
}
```

규칙은 이렇다.

- 필드는 전부 `private final`
- 생성자는 `@AllArgsConstructor(PRIVATE)`로 감춰서 외부에서 직접 못 만들게 하고, 정적 팩토리로만 생성
- `@JsonInclude(NON_NULL)`을 붙여 null 필드는 응답 JSON에서 제외
- 엔티티에서 바로 만들 수 있는 DTO는 `from(entity)`를 반드시 제공, 내부에서 `of()`를 호출
- `of()`는 엔티티가 없는 자리(쿼리 프로젝션 결과 등)를 위한 저수준 팩토리로 남김
- 매핑 로직은 DTO 안에만 두고, 서비스는 `AttendanceResponse.from(entity)` 한 줄로 끝나야 함

중첩 DTO도 같은 규칙을 따른다 — 상위 DTO의 `from()` 안에서 하위 DTO의 `from()`을 부르는 식이다.

## 주의할 점

접근자가 `getXxx()` 형태라 record의 `xxx()`와 헷갈리기 쉽다. 리뷰할 때 이 부분을 자주 놓치는 편이라 팀에 한 번 짚어줄 만하다.

## 한 줄 교훈

"어느 스타일이 더 나은가"보다 "팀 전체가 하나의 형태로 맞추는가"가 더 중요한 순간이 있다. 우리 팀은 그 교훈을 빌드 충돌을 한 번 겪고 나서야 얻었다.