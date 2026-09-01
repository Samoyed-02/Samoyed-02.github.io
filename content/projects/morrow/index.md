---
title: "Morrow"
date: 2026-08-24
summary: "AI 팀원 기반 글로벌 협업 플랫폼"
techStack: ["Java", "SpringBoot", "MySQL", "ChromaDB", "OpenAI API", "Notion API","Google OAuth2", "Docker","Railway","Gabia Cloud"]
githubUrl: "https://github.com/zeeonii/PENG"
categories: ["Projects"]
tag : ["Spring Boot","OAuth2","팀프로젝트","AI","배포"]
image : "morrow2.png"
weight: 10
showToc: true 
---


개요 📃

글로벌 협업 팀을 위한 AI 팀원 협업 플랫폼을 개발한다. 시차·언어·문화·조직이라는 네 가지 경계로 끊기는 협업 맥락을, AI 팀원이 회의(Google Meet)와 문서(Notion)를 자동으로 기억했다가 브리핑·질의응답·번역으로 이어준다. 사용자의 부재 시간 동안 발생한 변경사항 중 담당 업무와 관련된 항목만 선별해 브리핑하는 AI Briefing, 회의/문서 근거에 기반해 답하는 Context Q&A, 수신자 문화권에 맞춰 메시지를 자동 변환하는 Cultural Translation을 핵심 기능으로 한다.

역할 🙋🏻‍♂️

✦ Backend 담당 — AI Briefing·Context Q&A 기능 개발, ChromaDB 기반 벡터 검색 연동, Railway/가비아 배포 및 트러블슈팅

Skills 🛠️

✦ Java, Spring Boot, Spring Security, OAuth2, WebFlux

✦ MySQL

✦ ChromaDB, OpenAI API

✦ Docker, Docker Compose, Railway

✦ Notion API, Google OAuth2

![Morrow화면](/morrow3.png)

백엔드 개발 & 트러블슈팅 💻
ChromaDB v1 → v2 마이그레이션 대응
AS-IS

Context Q&A 기능의 벡터 검색을 담당하는 ChromaDB가 v1 API를 사용 중이었는데, ChromaDB가 v1 API를 폐지하면서 기존 컬렉션 접근 로직이 전부 동작하지 않게 되었습니다.

TO-BE

tenant/database 하위 구조로 변경된 v2 API 스펙에 맞춰 컬렉션 접근 로직을 전면 재작성하고, 관련 WebClient 설정(chromaWebClient)을 다시 구성해 Context Q&A 기능을 복구했습니다.

협업 중 발생한 코드 유실 복구 및 API 명세 정합성 확보
AS-IS

브랜치 merge 과정에서 .gitkeep이 실수로 되살아나며 QnaController 파일이 통째로 유실되고, 팀원이 WebClientConfig를 다른 방식으로 재작성하면서 기존에 등록해둔 openAiWebClient, chromaWebClient Bean이 함께 사라지는 문제가 발생했습니다.

TO-BE

원인을 추적해 유실된 컨트롤러와 Bean 설정을 재작성·복원했습니다. 이후 API 응답 필드(id→briefingId/qnaHistoryId, sources 위치, 페이지네이션 page/size/content/hasNext)를 프론트엔드 명세서에 맞춰 재정비해 팀 간 연동 문제를 해소했습니다.

배포 환경 트러블슈팅 (Railway → 가비아)
AS-IS

Railway 배포 시 팀원 개인 소유 레포라 접근 권한을 얻지 못했고, 모노레포 구조라 루트 디렉토리 설정 없이는 빌드가 실패했으며, *.jar 와일드카드가 실행 불가능한 -plain.jar를 잘못 지목해 실행이 반복적으로 실패했습니다.

TO-BE

레포를 fork해 권한 문제를 우회하고, Root Directory를 backend로 명시 지정했으며, 실행 대상 jar 파일명을 정확히 지정해 배포를 정상화했습니다. 이후 가비아 서버로 전환하며 SSH 키 등록과 Docker/Compose 환경을 직접 구성했고, OAUTH2_SUCCESS_REDIRECT_URI 등 로컬 주소로 남아있던 환경변수를 실 배포 도메인으로 교체, 프론트엔드와 불일치했던 OAuth 콜백 경로(/auth/callback vs /oauth/callback)를 맞춰 Google/Notion 로그인 후 리다이렉트 오류를 해결했습니다.

로컬 개발 환경 정비
AS-IS

로컬 MySQL 포트가 다른 프로젝트(likelion-cms-mysql)와 3306에서 충돌했고, 새 터미널을 열 때마다 .env가 로드되지 않아 DB 연결 실패가 반복됐습니다. 또한 docker exec mysql 콘솔에서 한글이 latin1로 깨져 저장되고, document.content/briefing.summary 컬럼이 tinytext로 생성돼 긴 텍스트 저장이 실패하는 문제가 있었습니다.

TO-BE

MySQL 포트를 3307로 변경해 충돌을 해소하고, source .env 습관화 및 alias 등록으로 환경변수 로드 문제를 없앴습니다. --default-character-set=utf8mb4 옵션으로 인코딩 문제를 해결하고, 해당 컬럼들을 LONGTEXT로 변경해 데이터 저장 실패를 방지했습니다.

시크릿 관리 프로세스 개선
AS-IS

OpenAI API 키, Notion Client Secret, MySQL 비밀번호가 팀 채팅방에 여러 차례 평문으로 노출됐습니다.

TO-BE

노출이 확인될 때마다 즉시 해당 키/시크릿을 폐기·재발급하는 대응을 반복 적용해, 유출된 키가 실제 운영 환경에서 악용되지 않도록 관리했습니다.

Notion 데이터베이스 미인식 버그 원인 분석
AS-IS

Notion 워크스페이스 내 데이터베이스(표) 형식의 문서 — 예를 들어 "팀원 소개페이지" — 가 Context Q&A 검색 결과에서 계속 누락되는 문제가 발생했습니다.

TO-BE

NotionContentClient 로직을 추적한 결과, object: "page" 타입만 필터링하도록 구현되어 있어 데이터베이스(object: "database") 형식의 콘텐츠가 원천적으로 제외되고 있었음을 원인으로 확정했습니다. (수정은 팀원이 진행 중)