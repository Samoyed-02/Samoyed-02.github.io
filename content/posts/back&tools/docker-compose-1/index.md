---
title: "docker-compose에 Redis 추가했더니 컨테이너가 안 뜬다"
date: 2026-08-06
draft: false
summary: "Redis 저장 방식 문제"
categories: ["Backend & Tools"]
tags: ["Docker", "Redis", "트러블슈팅"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---
# docker-compose에 Redis 추가했더니 컨테이너가 안 뜬다

# 배경

출결 코드 저장용으로 Redis를 쓰기로 하면서 `docker-compose.yml`에 서비스를 추가했다.

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

그런데 `docker-compose up` 했을 때 포트 바인딩 에러가 났다. 로컬 6379 포트를 이미 다른 프로세스가 쓰고 있었던 것이다. 확인해보니 Homebrew로 설치해둔 로컬 Redis가 백그라운드 서비스로 이미 떠 있었다.

## 해결

`brew services list`로 로컬에서 실행 중인 서비스를 먼저 확인했다.

```bash
brew services list
```

로컬 Redis가 떠 있는 걸 확인하고, 개발 중엔 그 로컬 Redis를 그대로 쓰거나(포트 매핑 없이), 아니면 로컬 서비스를 잠깐 내리고 Docker Compose의 Redis를 쓰는 식으로 정리했다. 어느 쪽을 택하든, **"이 포트를 이미 누가 쓰고 있는가"를 docker-compose.yml을 고치기 전에 먼저 확인**하는 게 핵심이었다.

```bash
lsof -i :6379          # 특정 포트를 누가 쓰는지 확인
brew services stop redis  # 필요하면 로컬 서비스 중지
```

## 참고 — 협업 중인 공용 인프라 파일

`docker-compose.yml`처럼 여러 기능이 공유하는 인프라 설정 파일은, 나중에 알고 보니 다른 브랜치에서도 같은 Redis 서비스를 추가하고 있어서 머지 시 충돌이 났다. 인프라 파일 변경은 기능 브랜치 안에 묻어가기보다, 별도로 먼저 반영하거나 팀에 미리 공지하는 편이 충돌 비용을 줄인다.

## 한 줄 교훈

로컬 개발 환경에 새 서비스를 추가하기 전엔 `brew services list` / `lsof` 같은 명령으로 포트 충돌 여부부터 확인하는 게 습관이 되어야 한다.