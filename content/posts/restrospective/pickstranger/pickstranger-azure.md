---
title: "[PickStranger] Azure 배포 설정 기록"
date: 2026-07-15
draft: false
summary: "PickStranger Azure 배포 설정 기록입니다."
categories: ["backend-tools"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---

> 작성일: 2026-07-16 목적 : Azure VM 최초 설정 과정 기록 배포 방식:                                                  단일 VM + Docker Compose (revproxy + AI 서버 + Redis + MySQL)
> 

## 1.  전체 배포 전략

- 방식 : 단일 Azure VM에 Docker Compose로 전체 스택(rev proxy, AI gRPC 서버, Redis, MySQL) 한번에 구동
- 이유: 프로젝트 규모, 기존 docker-compose 구성 그대로 재사용 가능, 관리 리소스 대비 비용 절감
- 비용 제약 : Azure for Students 크레딧 $100, 사용 기간 2 ~ 3 개월

---

## 2. VM 생성 — 기본 사항

| 항목 | 설정값 | 비고 |
| --- | --- | --- |
| 구독 | Azure for Students |  |
| 리소스 그룹 | PickStranger (신규 생성) |  |
| VM 이름 | LazyPotato |  |
| 지역 | ~~Korea Central~~ → **변경 필요 (아래 6번 참고)** | Students 구독 정책상 배포 제한 발생 |
| 이미지 | Ubuntu Server 24.04 LTS - x64 Gen2 | 22.04 대신 24.04도 문제 없음 |
| VM 아키텍처 | x64 | Arm64는 크로스 컴파일 이슈 우려로 제외 |
| 보안 유형 | 신뢰할 수 있는 시작 가상 머신 (Trusted Launch) | 기본값 유지, 추가 비용 없음 |

---

## 3. VM 크기 선택

**최초 추천값 Standard_D2s_v3 ($89.79/월)는 과함 → 변경**

| 후보 | vCPU / RAM | 월비용(24h 기준) | 채택 여부 |
| --- | --- | --- | --- |
| D2s_v3 (기본 추천값) | 2 / 8GiB | $89.79 | ❌ 크레딧 소모 너무 빠름 |
| B2ats_v2 (무료 서비스 적격) | 2 / 1GiB | $8.54 | ❌ RAM 부족 (MySQL+Redis+AI서버 OOM 위험) |
| **B2als_v2** | 2 / 4GiB | **$34.16** | ✅ **채택** |
| B2ls_v2 | 2 / 4GiB | $37.96 | ❌ 동일 스펙에 더 비쌈 |
| B2s_v2 | 2 / 8GiB | $75.92 | ❌ 과함 |

**선택 이유**: Go rev proxy(수십MB) + Redis(수백MB) + MySQL(200~400MB) + Python AI서버(XGBoost 로딩 시 최대 1GB) 합산 시 4GB가 적정선. 실제로는 자동 종료 + 수동 중지 습관화하면 월 $5~10 수준으로 운용 가능.

---

## 4. 비용 관리 전략

#### 핵심 원리

Azure VM 은 “중지” 상태에서는 컴퓨팅 비용이 0원. 디스크 보관비만 남음.

#### 설정할 것

1. 자동 종료(Auto-shutdown) — VM “관리” 탭 또는 생성 후 좌측 메뉴에서 설정
    - 종료 시간: 새벽 3시
    - 시단대:  Seoul
    - 종료 전 알림 반드시 체크
2. 예산 알림 — “비용 관리 + 청구” → “예산” → $70 , $90 단계 이메일 알림 설정
3. 최대 절전 모드(Hibernation)는 사용 안함
    - Trust Launch 보안 유형과 상충되어 비활성화됨(정상)
    - 어차피 컨테이너 재시각이 몇십 초 수준이라 절전모드로 얻는 이득이 적음
    - RAM 크기만큼 디스크를 추가로 잡아먹어 오히려 비효율적

---

## 5. 관리자 계정 / SSH 설정

| 항목 | 설정값 | 비고 |
| --- | --- | --- |
| 인증 형식 | SSH 공개 키 | 비밀번호 인증보다 안전 |
| 사용자 이름 | azureuser |  |
| SSH 키 유형 | RSA → **Ed25519 권장** | 짧은 키로 동등 이상 보안, 최신 OpenSSH 기본 권장 |
| 키 쌍 이름 | LazyPotato_key |  |

#### ⚠️ `.pem` 키 파일은 재발급 불가. 분실 시 VM 재생성 필요.

---

## 6.  네트워킹 / 포트

### 생성 시점

- 인바운드 포트: **SSH(22)만 허용** (기본값 유지)
- rev proxy 포트(9000)는 이 단계에서 추가하지 않음 → VM 생성 후 별도로 NSG에서 개별 설정

### 향후 강화할 것

- 22번 포트를 "모든 IP 허용" → 내 고정 공인 IP만 허용하도록 NSG 규칙 수정
- 외부 노출은 rev proxy 포트(9000)만, Redis/MySQL/gRPC 포트는 절대 외부 노출 금지 (컨테이너 내부 네트워크로만 통신)

### 공개 IP — 반드시 확인할 것 ⚠️

- 기본값이 "동적(Dynamic)"이면 VM을 중지 후 재시작할 때 IP가 바뀔 수 있음
- **"네트워킹" 탭에서 공개 IP를 "고정(Static)"으로 설정** 필요 → OAuth2 리다이렉트 URI, 접속 URL 안정성 확보