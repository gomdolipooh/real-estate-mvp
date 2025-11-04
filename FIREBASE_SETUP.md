# Firebase 설정 가이드

## 1. Firestore 보안 규칙 설정

Firebase Console → Firestore Database → 규칙 탭에서 다음 규칙을 적용하세요:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // listings 컬렉션 (매물)
    match /listings/{listingId} {
      // 모든 사용자가 읽기 가능
      allow read: if true;
      
      // 인증된 사용자만 쓰기 가능
      allow write: if request.auth != null;
    }
    
    // filterOptions 컬렉션 (필터 옵션)
    match /filterOptions/{optionId} {
      // 모든 사용자가 읽기 가능
      allow read: if true;
      
      // 인증된 사용자만 쓰기 가능
      allow write: if request.auth != null;
    }
    
    // inquiries 컬렉션 (매수/매도 의뢰)
    match /inquiries/{inquiryId} {
      // 인증된 사용자만 읽기 가능
      allow read: if request.auth != null;
      
      // 모든 사용자가 의뢰 생성 가능
      allow create: if true;
      
      // 인증된 사용자만 수정/삭제 가능
      allow update, delete: if request.auth != null;
    }
    
    // test 컬렉션 (테스트용)
    match /test/{testId} {
      allow read, write: if true;
    }
  }
}
```

## 2. Storage 보안 규칙 설정

Firebase Console → Storage → 규칙 탭에서 다음 규칙을 적용하세요:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /listings/{allPaths=**} {
      // 모든 사용자가 읽기 가능
      allow read: if true;
      
      // 인증된 사용자만 업로드 가능
      allow write: if request.auth != null;
    }
  }
}
```

## 3. 관리자 계정 생성

Firebase Console → Authentication → Users → Add user

- 이메일: admin@vision.com (또는 원하는 이메일)
- 비밀번호: 안전한 비밀번호 설정

## 4. 초기 필터 옵션 설정

관리자 페이지에서 로그인 후 "필터 옵션 관리" 탭에서 다음 옵션들을 추가하세요:

### 지역 옵션:
- 인천 남동구
- 시흥시
- 김포시

### 용도 옵션:
- 공장
- 창고
- 사무

### 거래유형 옵션:
- 분양
- 매매
- 전세
- 월세

또는 Firestore 콘솔에서 직접 추가:
1. Firestore Database → 데이터 탭
2. "컬렉션 시작" 클릭
3. 컬렉션 ID: `filterOptions`
4. 문서 ID: `regions`
5. 필드 추가:
   - 필드: `options`
   - 유형: `array`
   - 값: `["인천 남동구", "시흥시", "김포시"]`

같은 방법으로:
- 문서 ID: `purposes`, 필드: `options`, 값: `["공장", "창고", "사무"]`
- 문서 ID: `dealTypes`, 필드: `options`, 값: `["분양", "매매", "전세", "월세"]`

## 5. 연결 확인

1. 관리자 로그인 페이지 접속: `/admin/login.html`
2. 생성한 관리자 계정으로 로그인
3. 브라우저 콘솔(F12)에서 Firebase 연결 로그 확인:
   - "🔥 Firebase 초기화 완료"
   - "✅ 사용자 인증됨: [이메일]"

## 문제 해결

### Firebase에 데이터가 안 올라가는 경우:

1. **Firestore 규칙 확인**
   - Firebase Console → Firestore → 규칙 탭
   - 규칙이 위의 내용과 동일한지 확인
   - "게시" 버튼을 눌러 규칙 적용

2. **Storage 규칙 확인**
   - Firebase Console → Storage → 규칙 탭
   - 규칙이 위의 내용과 동일한지 확인
   - "게시" 버튼을 눌러 규칙 적용

3. **브라우저 콘솔 확인**
   - F12를 눌러 개발자 도구 열기
   - Console 탭에서 에러 메시지 확인
   - 빨간색 에러가 있다면 해당 메시지를 확인

4. **인증 상태 확인**
   - 관리자 페이지에서 로그인이 되어 있는지 확인
   - 로그아웃 후 다시 로그인 시도

5. **네트워크 연결 확인**
   - 인터넷 연결 상태 확인
   - Firebase 서버에 접근 가능한지 확인

## 데이터 구조

### listings 컬렉션 (매물)
```javascript
{
  title: string,           // 제목
  dealType: string,        // 거래유형 (분양/매매/전세/월세)
  price: number | null,    // 매매가 (만원)
  deposit: number | null,  // 보증금 (만원)
  rent: number | null,     // 월세 (만원)
  sizePyeong: number | null, // 면적 (평)
  floor: string,           // 층수 (예: "1/2")
  purpose: string,         // 용도 (공장/창고/사무)
  region: string,          // 지역
  description: string,     // 상세 설명
  images: string[],        // 이미지 URL 배열
  createdAt: timestamp,    // 생성일시
  updatedAt: timestamp,    // 수정일시
  status: string          // 상태 (published/draft)
}
```

### filterOptions 컬렉션 (필터 옵션)
```javascript
// 문서 ID: regions
{
  options: string[]  // ["인천 남동구", "시흥시", "김포시"]
}

// 문서 ID: purposes
{
  options: string[]  // ["공장", "창고", "사무"]
}

// 문서 ID: dealTypes
{
  options: string[]  // ["분양", "매매", "전세", "월세"]
}
```

