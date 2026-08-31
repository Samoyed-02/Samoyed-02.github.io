---
title: "브랜치 세 개가 같은 Repository 파일을 동시에 건드리고 있었다"
date: 2026-08-08
draft: false
summary: "협업시 문제 가능성"
categories: ["Retrospective"]
tags: ["Git", "충돌해결", "팀프로젝트"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---
# 브랜치 세 개가 같은 Repository 파일을 동시에 건드리고 있었다

# 배경

관리자 출결 기능(`feat/11`)을 구현하면서 `AppUserRepository`에 파생 쿼리 메서드를 하나 추가해야 했다. develop에 머지하려는 시점에 확인해보니, 같은 시기에 **세 개의 브랜치가 이 파일을 각자 수정 중**이었다.

- `feat/11`(본인): 코호트+역할+계정상태로 대상자를 찾는 파생 쿼리 메서드 추가
- Lions 기능 브랜치: `@Query`로 `findLions` 메서드 추가
- 회원 관리 브랜치: `JpaSpecificationExecutor<AppUser>` 인터페이스 상속 추가

## 왜 이런 충돌이 흔한가

`Repository`, `Service`, 설정 파일(`docker-compose.yml`, `application.yml`)처럼 여러 기능이 공통으로 참조하는 파일은, 각 브랜치가 서로 다른 메서드/설정을 "추가"하는 형태로 건드리는 경우가 많다. 이런 충돌은 Git이 "어느 쪽을 채택할지" 고르는 문제가 아니라, **"양쪽 다 살려야 하는" 병합 문제**인 경우가 대부분이다.

## 해결

Git이 자동으로 못 푸는 충돌 구간을 열어서, 세 브랜치의 변경사항을 전부 남기는 방향으로 수동 병합했다.

```java
public interface AppUserRepository extends JpaRepository<AppUser, Long>,
        JpaSpecificationExecutor<AppUser> {  // 회원 관리 브랜치

    List<AppUser> findAllByCohort_CohortIdAndSystemRoleAndAccountStatus(
        Long cohortId, SystemRole role, AccountStatus status);  // feat/11

    @Query("...")
    List<AppUser> findLions(...);  // Lions 브랜치
}
```

세 메서드/상속을 전부 유지해야 하니, 단순히 "충돌 마커 지우고 한쪽 선택"으로는 안 되고 파일 전체를 다시 읽으면서 각 변경의 의도를 파악해야 했다.

## 참고

`feat/11`은 아직 develop에 안 들어간 `feat/10` 위에 쌓아올린 브랜치였다. develop이 자주 바뀌는 초기 개발 단계에선 이런 스택 전략이 유효했지만, 공용 파일 충돌 자체를 막아주진 못한다. 브랜치 전략과 "공용 파일은 건드리기 전에 확인한다"는 규칙은 별개로 챙겨야 하는 문제였다.

## 한 줄 교훈

Repository나 설정 파일처럼 여러 기능이 공유하는 파일을 건드릴 땐, 머지 전에 "지금 이 파일을 누가 같이 수정 중인지" 한 번 확인하는 게 머지 시점의 충돌 비용을 크게 줄여준다.