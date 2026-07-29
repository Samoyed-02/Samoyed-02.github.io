---
title: "Kotlin 노트 [ 1 ]"
date: 2026-04-10
draft: false
summary: "코틀린 문법 실수와 헷갈렸던 개념들을 정리해봅니다."
categories: ["kotlin"]
# 특정 글에서 목차를 끄고 싶다면 false로 지정 가능 (기본은 toml 설정을 따름)
showToc: true 
---


## 1. Kotlin 기초 문법

val / var, 타입 변환, nulll 안전성

코틀린은 val(불변)과 var(가변)를 명확히 구분한다. 자바에서 넘어오면 이 구분에 익숙하지  않아서, val로 선언한 변수를 재할당하려다 컴파일 에러를 만나는 경우가 많다.

```jsx
val name = "samoyed"
// name = "other" // 컴파일 에러: val cannot be reassigned

var count = 0
count += 1 // OK
```

타입 변환은 명시적으로 해줘야 한다. 특히 Int 와 Long을 섞어 쓸 때 자동 변환이 안 되는 걸 자주 잊는다.

```jsx
val a: Int = 0
val b: Long = a.toLong() // 명시적 변환 필요
```

null 안전성은 코틀린의 대표적인 특징이다. ?와 !! , “:(엘비스 연산자)를 상황에 맞게 써야한다.

```jsx
val s: String? = null
val length = s?.length ?: 0 // null이면 0
```

### String 불변성과 StringBuilder

코틀린의 String 은 자바와 마찬가지로 불변 객체다. 반복문 안에서 문자열을 계속 이어붙이는 로직을 짤 때 +=를 남발하면 매번 새 객체가 생성되어 성능 저하로 이어진다.

```jsx
// 비효율적
var result = ""
for (c in "hello") {
	result += c.uppercase()
}

// 효율적
val sb = StringBuilder()
for (c in "hello") {
	sb.append(c.uppercase())
}
val result2 = sb.toString()
```

문자열을 자주 조작해야 하는 문제(괄호 변환, 문자열 압축 등)에서는 StringBuilder를 기본으로 쓰는 습관을 들이는 게 좋다.

### for / while / when, withIndex()

인덱스가 필요한 반복문에서는 withIndex()를 쓰면 훨씬 깔끔하다.

```kotlin
val arr=listOf("a","b","c")
for((index, value)in arr.withIndex()){
	println("$index:$value")
}
```

`when`은 자바의 `switch`보다 훨씬 유연하다. 범위, 타입 체크까지 가능하다.

```kotlin
funcategorize(n: Int): String=when{    
	n < 0 -> "음수"    
	n == 0 -> "영"    
	n in 1..9 -> "한 자리 수"
	else -> "두 자리 수 이상"
}
```