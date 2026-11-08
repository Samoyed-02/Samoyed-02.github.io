---
title: "AI Manager"
date: 2026-11-05
draft: false
summary: "채팅과 음성 통화의 기억을 함께 쓰며 루틴과 성장을 돕는 개인 AI 매니저 서버"
image : "/image/ai-manager-intro.jpg"
techStack: ["Kotlin", "Spring Boot", "Spring Data JPA", "Flyway", "PostgreSQL", "Testcontainers", "Claude API", "Docker"]
categories: ["Projects"]
tags: ["Kotlin", "Spring Boot", "개인프로젝트"]
weight: 10
showToc: true
---

## 개요 📃

통화를 끊으면 내용이 사라지던 구조를 바꿔, 기억과 행동을 서버가 갖고 채팅과 음성 통화는 그것을 쓰는 입구가 되도록 만든 개인 AI 매니저 서버다. 대화가 끝나면 민감 정보를 걸러 기억과 요약을 추출하고, 말로 요청한 일은 공용 도구로 처리하며, 목표 진행과 주간 회고로 성장을 돕는다.

## Skills 🛠️

✦ Kotlin, Spring Boot, Spring Data JPA

✦ Flyway, PostgreSQL

✦ Claude API (Anthropic Java SDK)

✦ Testcontainers, GitHub Actions, Docker

## 주요 기능 ⚙️

✦ 공유 기억 — 채팅과 음성 통화가 같은 기억을 쓴다. 대화가 끝나면 민감 정보를 걸러 기억과 요약을 추출한다

✦ 도구 실행 — 말로 요청한 일을 공용 도구로 처리한다

✦ 성장 관리 — 목표 진행 상황을 기록하고 주간 회고를 돕는다

## 진행 상황 🚧

아직 개발 중이다. 만드는 과정에서 겪은 문제와 해결 과정은 회고 글로 정리하고 있다.

- [Kotlin에서 List<@Valid T>로 바꾸면 경고와 함께 검증도 사라진다]({{< relref "/posts/retrospective/ai-manager-server/ai-manager-server-valid-type-annotation" >}})
- [캐시 지점만으로는 부족했다: 바뀌는 맥락을 뒤로 옮겨 채팅 턴 비용을 80% 줄였다]({{< relref "/posts/retrospective/ai-manager-server/ai-manager-server-prompt-cache" >}})
