---
title: "Kotlin 노트 [ 2 ]"
date: 2026-04-15
draft: false
summary: "코틀린 문법 실수와 헷갈렸던 개념들을 정리해봅니다."
categories: ["kotlin"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---


프로그래머스 기초 문제를 풀며 반복적으로 마주했던 코틀린 문법 실수와 헷갈렸던 개념들을 정리해봅니다.

## 2. 자주 쓰는 함수

### toInt() vs digitToInt()

문자를 숫자로 바꿀 때 이 두 함수를 헷갈리기 쉽다.

```jsx
val c = '7'
// c.toInt() -> 55 (아스키 코드값!)
// c.digitToInt() -> 7 (실제 숫자값)
```

Char.toInt()는 아스키 코드값을 반환하기 때문에, 숫자 문자를 실제 정수로 쓰고 싶다면 반드시 digitToInt()를 써야 한다. 이걸 모르고 아스키값으로 연산하다가 틀린 답을 내는 경우가 은근히 많다.

---

### sorted() vs sort()

```jsx
var arr = intArrayOf(1, 2, 3)
arr,plus(4) // 이 줄만으로는 arr이 안 바뀜!
arr = arr.plus(4) // 반드시 재할당해야 반영됨
```

answer.plus(x) 라고만 쓰고 결과를 반영 안 해서 빈 배열을 반환하는 실수를 정말 자주 한다. 함수형 스타일 함수들(plus, filter, map등)은 대부분 원본을 바꾸지 않고 새 값을 반환한다는 점을 항상 염두에 둬야 한다.

---

### take(), drop(), slice(), sliceArray()

#### .. vs until 차이

```jsx
for (i in 0..5) // 0, 1, 2, 3, 4, 5 (5 포함)
for (i in 0 until 5){} // 0, 1, 2, 3, 4 (5 미포함)
```

배열 인덱스를 순회할 때 arr.size 까지 포함하는 ..를 쓰면 IndexOutOfBoundsException이 터진다. 인덱스 순회는 until arr.size 또는 arr.indices를 쓰는 게 안전하다.

#### continue가 i++를 건더뜀

```jsx
var i = 0
while (i < 10){
	if (condition){
		continue // i++ 전에 continue하면 무한루프!
	}
	i++
}
```

while 문에서 continue는 그 시점에 즉시 다음 반복으로 넘어가기 때문에, continue 이후에 있는 카운터 증가 코드가 실행되지 않는다. 이 실수는 무한루프로 이어져서 디버깅하다 한참을 해매게 만든다. for 문을 쓰거나, 카운터 증가를 continue 이전에 배치하는 습관이 필요하다.

#### String vs Char 비교(”1” vs ‘1’)

```jsx
val s = "1"
val c = '1'
// s == c // 컴파일 에러: String과 Char는 비교 불가

s[0] == c // OK: Char끼리 비교
s == c.toString() // OK: Stringㄲ리 비교
```

문자열에서 한 글자를 꺼내면 Char 타입이 되는데, 이걸 큰따움표로 쓴 Striing과 비교하려다 타입 불일치 에러를 만나는 경우가 많다. 작은 따움표(Char)와 큰따움표(String)의 차이를 명확히 인식하는 게 중요하다.