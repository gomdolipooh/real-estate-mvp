# 찜하기 기능 설정 가이드

## Firebase Firestore 복합 인덱스 생성

찜하기 기능을 사용하려면 Firestore에 복합 인덱스가 필요합니다.

### 1. Firebase Console 접속

https://console.firebase.google.com/ 접속

### 2. Firestore Database → 인덱스 → 복합 색인 추가

다음 인덱스를 생성하세요:

**인덱스 1: favorites - userId + listingId**
- 컬렉션 ID: `favorites`
- 필드 1: `userId` (오름차순)
- 필드 2: `listingId` (오름차순)
- 쿼리 범위: `컬렉션`

**인덱스 2: favorites - userId + createdAt**
- 컬렉션 ID: `favorites`
- 필드 1: `userId` (오름차순)
- 필드 2: `createdAt` (내림차순)
- 쿼리 범위: `컬렉션`

### 3. Firestore 규칙 업데이트

`firestore.rules` 파일의 내용을 Firebase Console의 규칙 탭에 복사하여 배포하세요.

## 찜하기 기능 설명

### 로그인한 사용자만 가능
- 찜하기 버튼은 모든 매물 카드에 표시됩니다
- 로그인하지 않은 사용자가 클릭하면 로그인 안내 메시지 표시
- 로그인한 사용자는 즉시 찜하기/찜 해제 가능

### Firestore 저장 구조

**favorites 컬렉션:**
```javascript
{
  userId: "user_uid",       // 사용자 ID
  listingId: "listing_id",  // 매물 ID
  createdAt: timestamp      // 찜한 시간
}
```

### 최근 본 매물 vs 찜한 매물

**최근 본 매물:**
- localStorage에 저장 (브라우저별)
- 로그인한 사용자별로 분리 (`recentListings_{userId}`)
- 30일 후 자동 삭제
- 최대 10개 유지

**찜한 매물:**
- Firestore에 저장 (클라우드)
- 어떤 기기에서든 접근 가능
- 사용자가 직접 삭제할 때까지 유지
- 개수 제한 없음

## 페이지 구조

1. **listings.html**: 전체 매물 (찜하기 버튼 있음)
2. **index.html**: 메인 페이지
3. **favorites.html**: 찜한 매물 페이지 (로그인 필수)
4. **마이페이지 드롭다운**: 찜 매물 링크

## 사용 방법

1. 로그인
2. 매물 카드의 하트 버튼 클릭하여 찜하기
3. 마이페이지 → 찜 매물 에서 확인
4. 찜한 매물 페이지에서 하트 버튼 클릭하여 해제



