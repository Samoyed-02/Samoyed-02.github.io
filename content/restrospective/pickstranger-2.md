---
title: "[PickStranger#2] 리버스 프록시 뼈대 세우기, 그리고 핑거프린팅 미들 웨어"
date: 2025-03-20
draft: false
summary: "PickStranger 뼈대부터"
categories: ["Retrospective"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---

지난 글에서 PickStranger가 왜 필요한지, 어떤 문제를 풀려고 하는지 이야기를 했습니다. 이번 글에서는 제가 실제로 손을 댄 부분 — Go로 만든 리버스 프록시의 기본 골격과, 그 위에 얹은 핑거프린팅 미들웨어에 대하여 이야기 하려고 합니다.

# 왜 처음부터 프록시 서버부터 짰나

PickStranger는 결국 트래픽 사이에 끼어드는 시스템입니다. 그러니 가장 먼저 확인해야 할 건 "트래픽을 가로채서 그대로 통과시키는 게 되는가"였습니다. 화려한 기능보다 이 기본기가 안 되면 뒤에 뭘 얹어도 소용없으니까요.

그래서 첫 스텝은 단순했습니다. 클라이언트 → 프록시(9000번 포트) → 실제 서비스 서버(8080번 포트)로 요청이 그대로 전달되는지 확인하는 것.

```go
proxy := httputil.NewSingleHostReverseProxy(targetURL)
http.HandleFunc("/",func(w http.ResponseWriter, r *http.Request){    
		proxy.ServeHTTP(w, r)
})
log.Fatal(http.ListenAndServe(":9000",nil))
```

`httputil.ReverseProxy`를 쓰면 요청/응답 포워딩 자체는 표준 라이브러리가 거의 다 해줍니다. 여기서 중요한 건 이 골격 자체가 아니라, 이 위에 **미들웨어를 얼마나 깔끔하게 끼워 넣을 수 있느냐**였습니다. PickStranger의 핵심 로직(핑거프린팅, 분석 요청, 차단 판단)은 결국 이 프록시 핸들러 앞뒤로 붙는 미들웨어 형태로 구현되기 때문입니다.

## 핑거프린팅 미들웨어: 뭘 모으고, 왜 해싱하나

두 번째로 만든 건 요청이 프록시를 통과할 때 기기/브라우저 정보를 뽑아내는 핑거프린팅 미들웨어입니다. 이야기했듯, PickStranger가 하려는 건 "이 사람이 평소 쓰던 환경이 맞는지" 확인하는 것이기 때문에, 이 미들웨어가 사실상 시스템의 눈 역할을 합니다.

지금 단계에서는 아래 세 가지를 뽑아냅니다.

- IP 주소
- User-Agent
- Accept-Language

그리고 이 값들을 그대로 저장하지 않고 SHA256으로 해싱해서 하나의 지문(fingerprint) 값으로 만듭니다.

```go
func GenerateFingerprint(ip, userAgent, acceptLang string)string {    
	raw := ip + "|" + userAgent + "|" + acceptLang    
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}
```

해싱하는 이유는 두 가지입니다. 하나는 저장 효율 — 여러 값을 조합한 원본 문자열을 그대로 들고 다니는 것보다 고정 길이 해시 하나로 비교하는 게 훨씬 간단합니다. 다른 하나는 개인정보 최소화 — IP나 User-Agent 원본을 그대로 쌓아두는 것보다는, 비교 가능한 해시값만 남기는 편이 데이터 취급 측면에서 더 안전합니다. 

## 삽질 기록: 해시가 왜 자꾸 달라지지?

미들웨어를 처음 완성하고 테스트해보는데, 이상한 현상을 발견했습니다. 같은 브라우저로 같은 페이지를 새로고침했을 뿐인데 핑거프린트 해시값이 계속 바뀌는 겁니다. 핑거프린팅의 핵심은 "같은 사람이면 같은 값이 나와야 한다"는 건데, 이게 깨지면 시스템 자체가 무의미해집니다.

원인을 추적해보니 범인은 `IP`였습니다. Go에서 `r.RemoteAddr`을 그대로 쓰면 이런 형태로 들어옵니다.

```
127.0.0.1:54231
```

포트 번호까지 붙어서 들어오는 거죠. 그런데 이 포트 번호는 매 요청마다 클라이언트가 새로 여는 임시 포트라서, 같은 브라우저·같은 사람이어도 요청마다 값이 달라집니다. 결국 해싱 재료 자체가 매번 바뀌니 해시값도 매번 다르게 나올 수밖에 없었습니다.

해결은 생각보다 간단했습니다. `net.SplitHostPort`로 포트를 떼어내고 순수 IP만 사용하도록 고쳤습니다.

```go
func extractIP(remoteAddrstring)string {    
	ip, _, err := net.SplitHostPort(remoteAddr)
	if err !=nil{
		return remoteAddr// 포트가 없는 형식이면 그대로 사용
	}
	return ip
}
```

작은 수정이었지만, 이 문제를 겪고 나서 "핑거프린팅에 쓰는 값 하나하나가 정말 안정적인 값인지"를 훨씬 의심하는 습관이 생겼습니다.

## 지금까지 쌓아올린 것들

핑거프린팅 미들웨어를 안정화한 이후로는 아래 것들을 순서대로 붙여나갔습니다.

- **Config 패키지**: `TargetURL`, `RedisAddr`, `Port`, `BlockThreshold`, `BlacklistTTL`, `WhitelistIPs`, `AITimeout` 같은 값들을 환경변수로 관리
- **Redis 연동**: 핑거프린트와 블랙리스트를 TTL과 함께 저장 — 세션이 영원히 블랙리스트에 남지 않도록

이렇게 골격 + 핑거프린팅 + 저장소까지 갖추고 나서 AI 모듈과의 통신을 시도하는 과정에서 문제를 만나게 됩니다.