---
title: "QueryDSL로 조건부 쿼리 깔끔하게 짜기"
date: 2026-07-10
draft: false
summary: "where()의 null 무시 트릭"
categories: ["Spring"]
tags: ["Jackson", "PATCH", "API설계"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---
# QueryDSL로 조건부 쿼리 깔끔하게 짜기 — `where()`의 null 무시 트릭

## 배경

관리자 일정 API를 만들면서 "이 날짜에 이미 다른 일정이 있는지" 같은 조건부 검증 쿼리가 필요했다. 문제는 등록할 때와 수정할 때 조건이 미묘하게 다르다는 점이었다. 수정 시에는 "자기 자신은 제외하고" 중복을 체크해야 한다.

이런 걸 if문으로 분기하면 쿼리 메서드가 두 개로 늘어나거나, 지저분한 동적 SQL 조립이 필요해진다.

## 해결

QueryDSL의 `where()`는 콤마로 조건을 나열하면 자동으로 AND로 묶이고, **조건이 `null`이면 그냥 무시**된다. 이 특성을 이용하면 삼항식 하나로 "조건 있을 때만 추가"를 표현할 수 있다.

```java
@Override
public boolean existsConflictingSchedule(Long cohortId, LocalDate date, Long excludeScheduleId) {
    QSchedule schedule = QSchedule.schedule;

    Integer fetchOne = queryFactory
        .selectOne()
        .from(schedule)
        .where(
            schedule.cohortId.eq(cohortId),
            schedule.scheduleDate.eq(date),
            excludeScheduleId != null ? schedule.scheduleId.ne(excludeScheduleId) : null
        )
        .fetchFirst();

    return fetchOne != null;
}
```

- 등록 시엔 `excludeScheduleId`에 `null`을 넘기면 마지막 조건이 통째로 사라져서 "전체 대상 중복 체크"가 되고
- 수정 시엔 자기 `scheduleId`를 넘기면 자동으로 "자기 자신 제외" 조건이 추가된다

메서드 하나로 두 시나리오를 다 커버할 수 있다.

## 참고

- Custom 구현 클래스명은 반드시 `인터페이스명 + Impl`이어야 스프링 데이터가 자동으로 인식한다 (`ScheduleRepository` → `ScheduleRepositoryImpl`)
- `QSchedule` 같은 Q타입은 어노테이션 프로세서가 컴파일 시점에 자동 생성한다. IDE에서 안 보이면 직접 만들 게 아니라 `./gradlew compileJava`부터 실행해보면 된다

## 한 줄 교훈

조건부 쿼리는 if 분기로 메서드를 늘리기보다, `where()`의 null 무시 특성을 활용해 하나의 메서드로 표현하는 게 더 깔끔하다.