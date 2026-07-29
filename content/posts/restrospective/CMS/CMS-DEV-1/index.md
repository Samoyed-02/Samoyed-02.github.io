---
title: "[CMS 개발기 #1] 관리자 일정 등록/수정/삭제 API"
date: 2026-07-24
draft: false
summary: "CMS 개발 회고 -- 확정된 줄 알았던 정책이 두 번 뒤집힌 이야기"
categories: ["Retrospective"]
tags: ["Spring Boot", "API설계", "팀프로젝트"]
image : "likelion_home.png"
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---

## 들어가며

이슈 `#10 관리자 일정 등록/수정/삭제 API 구현` 을 맡아서 진행했다. BE 파트장 부재로 설계부터 ERD, API 명세서까지 팀원들과 함께 정리해온 흐름의 연장선이라, “이번엔 설계도 다 되어 있으니 구현만 하면 되겠지” 싶었는데 막상 코드를 짜는 동안에도 정책의 불일치 문제를 겪었다. 이번 글은 그 과정을 정리한 회고다.

## 무엇을 만들었나

`Schedule` 엔티티를 대상으로 관리자용 CRUD 3종을 구현했다.

- `POST /admin/schedules` — 일정 등록
- `PATCH /admin/schedules/{scheduleId}` — 일정 수정
- `DELETE /admin/schedules/{scheduleId}` — 일정 삭제 (soft delete)

레이어는 팀 컨벤션을 그대로 따랐다.

- **엔티티**: `Schedule`에 `update()`, `softDelete()` 메서드 추가
- **DTO**: 응답 DTO 컨벤션 문서(PR #19에서 정리된 것) 기준으로 `@Getter` + `@AllArgsConstructor(PRIVATE)` + `@JsonInclude(NON_NULL)` Lombok 클래스, `of()`/`from()` 정적 팩토리 패턴
- **Repository**: 순수 `JpaRepository`
- **Service**: 클래스 레벨 `@Transactional(readOnly = true)`, 쓰기 메서드에서 `@Transactional`로 오버라이드, `findActor()`/`findCohort()` private 헬퍼, `validateAllDayCombination()`, `validateVersion()` 낙관적 잠금 검증
- **Controller**: `AdminNoticeController` 패턴을 따라 `AdminAccessGuard` + `@AuthenticationPrincipal CurrentUserPrincipal` + `Idempotency-Key` 헤더 처리
- **테스트**: `ScheduleRequestValidationTest`, `ScheduleServiceTest`, `AdminScheduleControllerTest` (`@WebMvcTest` + `AdminContentControllerTest` 패턴)

## 문제 1 — "하루 1개 일정 제한"이 사실은 정반대 정책이었다

API 명세서를 처음 작성할 때는 "하루 1개 일정 제한, 위반 시 409 Conflict"로 정리했었다. 등록 API 설계 단계에서도 `startDate` 기준 유니크 제약이나 사전 체크로 막아야 한다고 문서화했고, 응답 코드 표에도 `409: 하루 1개 일정 제한 위반`을 넣어뒀다.

그런데 구현 중 기획팀의 최종 확정 문서를 다시 열어봤더니, 5.2 등록 항목에 이렇게 적혀 있었다.

> "동일한 날짜와 시간에 여러 개의 일정을 등록할 수 있다"
> 

즉 **하루 여러 일정 등록이 정상 케이스**였다. 실제로 다시 대조해보니 API 명세서(YAML)의 `createSchedule`(POST) 응답에도 애초에 `409`가 없었고, `updateSchedule`(PATCH)의 `409`는 하루 제한용이 아니라 `version` 낙관적 잠금 충돌용이었다. 7/16 논의 시점의 초안 정책을 그대로 최종 정책이라고 믿고 있었던 것이다.

이 발견으로 다음을 되돌려야 했다.

- `ScheduleRepository`에 `existsConflictingSchedule` 같은 중복 체크 쿼리를 추가할 필요가 없어짐
- 서비스 레이어의 "하루 1개 제한 위반 → 409" 체크리스트 항목 삭제
- 다행히 QueryDSL로 조건부 검증 쿼리를 짜던 도중에 발견해서, 실제로 적용되기 전에 멈출 수 있었음
- 

## 문제 2 — cohortId 수정 가능 여부가 뒤늦게 확정됐다

API 명세서 작성 시점에는 `UpdateScheduleRequest`에 `cohortId`가 수정 가능 필드로 들어가 있었다. 그런데 이것도 예전 논의와 다르다는 의심이 있어 "확인 필요"로 표시해뒀던 부분이었는데, 기획팀 최종 문서 5.3 수정 항목을 보니 이렇게 적혀 있었다.

> "수정 화면에는 기존 일정 정보를 표시하며, 일정명, 설명, 날짜, 시간, 장소 및 종일 일정 여부를 수정할 수 있다."
> 

**기수(cohort)가 목록에 없었다.** 즉 `cohortId`는 등록 시에만 지정하고, 수정 대상에서는 제외해야 한다는 게 이제야 확정된 것이다. `UpdateScheduleRequest`에서 `cohortId` 필드를 빼고, 서비스 로직의 병합/재조회 코드도 함께 지웠다. 엔티티만 고치면 서비스 쪽 컴파일 에러가 나기 때문에 연쇄적으로 손봐야 하는 부분이었다.

이 두 가지 모두 API 명세서(YAML) 자체도 최신 기획 문서 기준으로 다시 고쳐야 하는 상태로 남아 있다.

## 그 외 잔잔한 이슈들

- `UpdateScheduleRequest.version`이 `@NotBlank`(String 전용 제약)로 잘못 붙어 있던 걸 테스트 실행 중 발견 — `@NotNull`로 교체
- `isAllDay=true` ↔ `false` 전환 시 `startTime`을 자동으로 null 처리하는 검증(`validateAllDayCombination()`)은 정책 변경과 무관하게 그대로 유효했음
- PATCH DTO는 `JsonNullable` 대신 팀 컨벤션인 `provided` 플래그 + `@JsonSetter` 패턴을 그대로 따름 (필드 미전달 / 명시적 null / 값 있음을 구분)

## 배운 점

1. “확정됐다”는 말은 문서 버전까지 확인해야 진짜 확정이다. 같은 주제로 여러 번 논의가 오갔던 정책일수록,  최신 논의 시점의 결론이 아니라 최종 문서를 직접 열어서 대조하는 습관이 필요했다. 기억에 의존해서 넘어가면, 이번처럼 초안 단계 정책을  최종 정책으로 착각한 채 진행될 수 있다.
2. 정책이 뒤집히면 API명세서(YAML)도 동기화 대상이라는 걸 남겨둬야 한다. 코드는 고쳤지만 YAML은 아직 예전 정책 그대로인 상태라, 다른 팀원이 YAML만 보고 “cohortId 수정 가능하네” 라고 오해할 수 있다. 이런 건 발견 즉시 기록해두고 별도로 정리해야 놓치지 않는다.
3. 구현 초반에 검증 로직부터 짜지 않고 Repository/service 레이어 순서로 진행한 게 다행이다. 만약 프론트까지 이 정책을 안내한 뒤에 뒤집혔다면 더 큰 재작업이 됐을 것이다.