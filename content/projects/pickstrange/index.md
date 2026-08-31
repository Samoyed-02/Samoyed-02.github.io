---
title: "PickStranger"
date: 2026-08-29
summary: "로그인 관리 시스템"
techStack: ["ReverseProxy", "depedancy", "Machine Leaning", "Go", "AI", "g6" , "Prometheus", "Grafana"]
githubUrl: "https://github.com/PickStranger"
categories: ["Projects"]
tag : ["gRPC", "인증", "팀프로젝트", "리버스프록시"]
weight: 10
showToc: true 
---


### 개요 📃

OAuth2 로그인 시 발생할 수 있는 계정 연쇄 탈취 문제를 막기 위해, 기존 서비스에 Add-on 형태로 붙는 보안 계층을 개발한다. 리버스 프록시(Go)와 브라우저 핑거프린팅으로 기기를 고유 식별하고, 스푸핑 공격에도 강건하게 대응한다. 평소 접속 패턴을 학습한 AI 모델로 이상 징후를 탐지해 위험 점수에 따라 세션을 실시간 차단한다. 최종 결과물은 SDK, 리버스 프록시 에이전트, AI 탐지 모듈, 모니터링 대시보드 4종이다.

### 역할 🙋🏻‍♂️

✦ Go 리버스 프록시 담당 — 리버스 프록시 설계·구현(net/http, httputil.ReverseProxy), goroutine 기반 동시성 최적화, gRPC 연동, k6/wrk 부하테스트 및 pprof 성능 프로파일링

### Skills 🛠️

✦ Go, Kotlin, Java, Python

✦ MySQL, Redis

✦ Scikit-learn, TensorFlow

✦ gRPC, REST API

✦ Docker Compose, Terraform, AWS EC2

## 보안 미들웨어 개발 🔒

---

## **AI 서버 장애 격리 (Circuit Breaker)**

### **AS-IS**

AI 분석 서버 호출이 리버스 프록시 요청 처리 흐름에 동기적으로 포함되어 있어, AI 서버 장애 시 모든 요청이 실패하고 원 서비스까지 영향을 받는 구조였습니다.

#### **TO-BE**

AI 서버 연속 실패 임계치 도달 시 자동으로 AI 호출을 우회하고 안전한 기본값으로 즉시 응답하는 **Circuit Breaker(Fail-Open) 패턴을 구현**했습니다. AI 서버를 강제 중단시켜 장애를 재현한 결과, 적용 전 요청 100% 실패 → 적용 후 **장애 재현 테스트에서 정상 응답률 100% 유지**를 로그 기반으로 검증했습니다.

## **부하테스트 기반 병목 구간 규명**

### **AS-IS**

리버스 프록시와 AI 분석 서버로 구성된 시스템에서 성능 병목 지점이 어디인지 확인되지 않은 상태였습니다.

### **TO-BE**

k6로 동시 사용자 100명 규모 부하테스트를 수행하고 실시간 리소스 모니터링을 병행한 결과, AI 판정 요청의 **약 30%가 타임아웃으로 실패**하는 반면 리버스 프록시 자체는 CPU 사용률 1% 미만으로 안정적임을 확인했습니다. 이를 통해 병목이 프록시 계층이 아닌 AI 추론 계층에 있음을 **정량적으로 입증**했습니다.

![모니터링화면](/grafana.png)

## **gRPC 인터페이스 정합성 확보**

### **AS-IS**

리버스 프록시와 AI 분석 서버가 각자 독립적으로 설계한 gRPC 인터페이스(Protocol Buffers)를 사용하고 있어, 실제 연동 시 "정의되지 않은 메서드" 오류로 통신이 불가능했습니다.

### **TO-BE**

AI 서버의 실제 프로토콜 정의를 기준으로 클라이언트를 재작성하여 연동을 정상화했습니다. 이후 응답값 검증 과정에서 위험도 점수의 비정상 범위를 추가로 발견해 방어 로직을 적용, 판정 결과의 논리적 일관성을 확보했습니다.