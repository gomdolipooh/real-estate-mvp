# 🚀 Firebase 규칙 배포 방법

## ⚠️ 반드시 수행해야 할 작업

찜하기 기능과 회원 관리 기능이 작동하려면 **Firebase Console에서 Firestore 규칙을 배포**해야 합니다.

## 📋 단계별 가이드

### 1단계: Firebase Console 접속

브라우저에서 다음 주소로 이동:
```
https://console.firebase.google.com/
```

### 2단계: 프로젝트 선택

- **vision-ac00e** 프로젝트 클릭

### 3단계: Firestore Database 메뉴로 이동

1. 왼쪽 사이드바에서 **Firestore Database** 클릭
2. 상단 탭에서 **규칙(Rules)** 클릭

### 4단계: 규칙 복사 및 배포

1. 아래 규칙 코드를 **전체 복사**
2. Firebase Console의 규칙 에디터에 **기존 내용을 삭제하고 붙여넣기**
3. **게시(Publish)** 또는 **배포** 버튼 클릭
4. 배포 완료 확인

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // listings 컬렉션 (매물)
    match /listings/{listingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // filterOptions 컬렉션 (필터 옵션)
    match /filterOptions/{optionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // inquiries 컬렉션 (의뢰)
    match /inquiries/{inquiryId} {
      allow read: if request.auth != null;
      allow create: if true;
      allow update, delete: if request.auth != null;
    }
    
    // favorites 컬렉션 (찜한 매물)
    match /favorites/{favoriteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null;
    }
    
    // test 컬렉션
    match /test/{testId} {
      allow read, write: if true;
    }
    
    // users 컬렉션: 본인 정보만 읽기/쓰기 가능
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // admin만 전체 users 읽기 가능
    match /users/{userId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 5단계: 페이지 새로고침

규칙 배포 후:
1. 웹사이트 페이지를 **완전히 새로고침** (Ctrl + F5)
2. 브라우저 콘솔 확인 (F12)
3. 테스트

## 🔍 테스트 방법

### 찜하기 기능 테스트

1. **로그인** (상단 바에서 로그인 클릭)
2. **전체 매물 페이지** (listings.html) 이동
3. 매물 카드 우측 상단의 **하트 버튼** 확인
4. 하트 버튼 클릭하여 찜하기
5. **마이페이지 → 찜 매물** 에서 확인

### 최근 본 매물 테스트

1. 매물 카드의 **상세보기** 버튼 클릭
2. 우측 사이드바의 **최근 본 매물** 확인
3. 최근 본 매물이 표시되어야 함

## ❗ 문제 해결

### 찜하기 버튼이 안 보여요

1. 페이지 **완전 새로고침** (Ctrl + F5)
2. 브라우저 콘솔(F12) 확인
3. "🎨 render() 호출됨" 로그 확인
4. "💝 userFavorites size: X" 로그 확인

### 권한 오류가 발생해요

- Firebase Console에서 규칙이 **정상 배포**되었는지 확인
- 배포 후 **1~2분 대기** (규칙 적용 시간)
- 페이지 **새로고침**

### 최근 본 매물이 안 떠요

1. 브라우저 콘솔에서 "📌 최근 본 매물 저장" 로그 확인
2. localStorage 확인 (F12 → Application → Local Storage)
3. `recentListings_...` 키가 있는지 확인

## 📊 예상 콘솔 로그

정상 작동 시:
```
🔥 Firebase에서 매물 로드 중...
✅ 12개 매물 로드 완료
🎨 render() 호출됨
👤 currentUser: user@example.com
💝 userFavorites size: 3
📊 렌더링 매물 수: 12
```

로그인 안한 상태:
```
🎨 render() 호출됨
👤 currentUser: 없음
💝 userFavorites size: 0
📊 렌더링 매물 수: 12
```



