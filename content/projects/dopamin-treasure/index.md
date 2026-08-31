---
title: "Dopamine-Treasure-Island"
date: 2026-04-28
summary: "시험기간 캠퍼스 보물찾기 이벤트 웹 서비스"
techStack: ["FastAPI", "React", "Vite", "SQLite", "Railway"]
githubUrl: "https://github.com/Samoyed-02/dopamine-treasure-backend"
categories: ["Projects"]
tag : 	["FastAPI", "PostGIS", "팀프로젝트", "멋쟁이사자처럼"]
image : "dopamin_intro.png"
weight: 10
showToc: true 
---

### 개요 📃

시험기간 지친 수원대 학우들이 캠퍼스 곳곳에 숨겨진 보물(응원 메세지·기프티콘)을 찾으며 스트레스를 해소할 수 있도록, 장소별 미션 인증과 보물 현황 조회를 제공하는 캠퍼스 보물찾기 웹 서비스입니다. 기획부터 배포까지 6일 안에 끝내는 단기 스프린트로 진행되었습니다.

### 역할 🙋🏻‍♂️

✦ 백엔드 메인 개발자로서 장소·보물·검증 관련 API 설계 및 개발, DB 스키마 설계, 중복 획득 방지 로직, 관리자용 승인·통계 API 개발 담당

✦ 마감(4/20)을 넘긴 시점까지 프론트엔드 파트가 완성되지 못한 상황에서, LLM(Claude)의 도움을 받아 800줄 이상의 프론트엔드 코드를 Vite+React 구조로 전면 재설계·개발해 4/22 최종 배포까지 단독 대응

### Skills 🛠️

✦ FE : React, Vite, GitHub Pages
✦ BE : FastAPI, SQLite
✦ Infra : Railway

## 백엔드 개발 💻

---

## 촉박한 6일 일정 속 API/DB 구조 설계

### **AS-IS**

기획자 1명, 백엔드 1명(본인), 프론트 1명, 개발 보조 1명으로 구성된 팀이 **기획부터 배포까지 단 6일** 안에 끝내야 하는 일정이었습니다. 진행 중 기능 범위가 계속 늘어나면 그때마다 API/DB 구조를 다시 손봐야 했고, 이 경우 **6일 안에 배포 자체가 불가능해질 위험**이 있었습니다.

### **TO-BE**

Day1에 필수/제외 기능을 표로 확정하고, **"Day3 이후 신규 기능 추가 금지"** 원칙을 세워 API/DB 구조를 초기에 고정했습니다. 장소 조회, 코드/퀴즈 검증, 보물 숨기기·찾기, 응원 메시지 등록 등 핵심 API를 먼저 설계해 **프론트 파트와 병렬로 진행 가능한 구조**로 만들었습니다.

## 마감 초과, 팀원 공백 속 프론트엔드 전면 재설계

### AS-IS

원래 마감은 **4/20**이었지만, 프론트엔드 담당자의 공백으로 화면 개발이 마무리되지 못한 채 마감을 넘긴 상황이었습니다. 기존 프론트 코드는 **800줄이 넘는 분량이 구조화 없이 쌓여 있어**, 남은 기간 안에 다른 사람이 이어받아 수정·개발하기 어려운 상태였습니다.

### TO-BE

백엔드 담당자인 제가 **LLM(Claude)의 도움을 받아** 화면 구성은 기존 기획을 최대한 유지한 채, **800줄 이상의 코드를 Vite+React 기반 파일 구조로 전면 재설계**했습니다. 백엔드 API 개발과 병행해 프론트엔드까지 직접 개발을 마쳐, **마감을 2일 넘긴 4/22에 최종 배포를 완료**했습니다.

**Repository** : [Backend](https://github.com/Samoyed-02/dopamine-treasure-backend) · [Frontend](https://github.com/Samoyed-02/dopamine-treasure-frontend)