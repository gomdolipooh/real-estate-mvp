# 비전부동산 - 공장·창고 전문 부동산 웹사이트

Firebase 기반의 공장·창고 전문 부동산 웹사이트입니다.

## 🚀 주요 기능

### 사용자 (프론트엔드)
- 📋 매물 목록 조회 및 검색
- 🔍 다양한 필터 옵션 (지역, 용도, 평수, 가격 등)
- 📱 반응형 디자인 (모바일/태블릿/데스크톱)
- 🏠 카테고리별 TOP 3 매물 표시 (메인 페이지)
- 📄 매물 상세 페이지

### 관리자 (백오피스)
- ✍️ **매물 등록**: 제목, 가격, 이미지, 상세 정보 등록
- 📊 **매물 관리**: 전체 목록 조회, 검색, 필터링
- ✏️ **매물 수정**: 기존 매물 정보 수정
- 🗑️ **매물 삭제**: 불필요한 매물 삭제
- ⚙️ **필터 옵션 관리**: 지역, 용도, 거래유형 옵션 추가/삭제
- 🔐 이메일/비밀번호 인증

## 📦 기술 스택

- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript (ES6+)
- **Backend**: Firebase
  - Authentication (이메일/비밀번호)
  - Firestore (NoSQL Database)
  - Storage (이미지 저장)
- **Hosting**: 정적 호스팅 (Firebase Hosting, Vercel, Netlify 등)

## 🛠️ 설치 및 설정

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication → Email/Password 활성화
3. Firestore Database 생성 (프로덕션 모드)
4. Storage 생성

### 2. Firebase 보안 규칙 설정

[FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 파일을 참고하여:
- Firestore 보안 규칙 설정
- Storage 보안 규칙 설정
- 관리자 계정 생성

### 3. 로컬 개발 서버 실행

```bash
# 프로젝트 디렉토리로 이동
cd real-estate-mvp

# 개발 서버 실행 (Node.js가 설치되어 있어야 함)
npx http-server -p 3000

# 또는 Python이 설치되어 있다면
python -m http.server 3000

# 또는 PHP가 설치되어 있다면
php -S localhost:3000
```

브라우저에서 `http://localhost:3000` 접속

### 4. 관리자 페이지 접속

1. `http://localhost:3000/admin/login.html` 접속
2. Firebase에서 생성한 관리자 계정으로 로그인
3. 매물 등록 및 관리

## 📁 프로젝트 구조

```
real-estate-mvp/
├── index.html              # 메인 페이지
├── listings.html           # 매물 목록 페이지
├── listing.html            # 매물 상세 페이지
├── admin/
│   ├── login.html         # 관리자 로그인
│   ├── index.html         # 관리자 대시보드
│   └── admin.js           # 관리자 기능 로직
├── src/
│   ├── home.js            # 메인 페이지 로직
│   ├── app.js             # 매물 목록 로직
│   ├── detail.js          # 매물 상세 로직
│   ├── filters.js         # 필터링 로직
│   └── utils.js           # 유틸리티 함수
├── FIREBASE_SETUP.md      # Firebase 설정 가이드
└── README.md              # 이 파일
```

## 🎯 사용 방법

### 관리자

#### 1. 매물 등록
1. 관리자 페이지 로그인
2. "매물 등록" 탭 선택
3. 필수 정보 입력:
   - 제목 (필수)
   - 거래유형 (분양/매매/전세/월세)
   - 가격 정보
   - 면적, 층수, 지역, 용도
   - 상세 설명
   - 이미지 (여러 장 가능)
4. "저장" 버튼 클릭

#### 2. 매물 관리
1. "매물 관리" 탭 선택
2. 전체 매물 목록 확인
3. 검색 또는 필터로 원하는 매물 찾기
4. "수정" 버튼: 매물 정보 수정
5. "삭제" 버튼: 매물 삭제

#### 3. 필터 옵션 관리
1. "필터 옵션 관리" 탭 선택
2. 지역/용도/거래유형 옵션 추가
3. 불필요한 옵션 삭제

### 사용자

#### 1. 매물 검색
- 메인 페이지 또는 매물 목록 페이지에서 키워드 검색
- 지역, 용도, 평수, 가격 등 다양한 필터 사용
- 거래유형 탭으로 빠른 필터링

#### 2. 매물 상세 확인
- 매물 카드 클릭 → 상세 페이지 이동
- 이미지, 가격, 위치, 상세 정보 확인
- 전화, 카카오톡, 이메일로 문의 가능

## 🔒 보안

- Firebase Authentication으로 관리자 인증
- Firestore 규칙으로 데이터 접근 제어
- Storage 규칙으로 이미지 업로드 제한
- 프론트엔드는 읽기 전용, 쓰기는 인증된 사용자만 가능

## 📱 반응형 디자인

- **모바일** (< 768px): 햄버거 메뉴, 1열 그리드
- **태블릿** (768px - 1024px): 2열 그리드
- **데스크톱** (> 1024px): 3-4열 그리드

## 🐛 문제 해결

### Firebase에 데이터가 안 올라가는 경우

1. **Firestore 규칙 확인**
   - [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 참고
   - 규칙 "게시" 버튼 클릭 확인

2. **Storage 규칙 확인**
   - [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 참고
   - 규칙 "게시" 버튼 클릭 확인

3. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 빨간색 에러 메시지 확인

4. **인증 상태 확인**
   - 로그아웃 후 다시 로그인
   - 콘솔에서 "✅ 사용자 인증됨" 메시지 확인

### 매물이 표시되지 않는 경우

1. **상태 확인**: 매물의 `status`가 `"published"`인지 확인
2. **콘솔 확인**: 브라우저 콘솔에서 에러 메시지 확인
3. **Firestore 데이터 확인**: Firebase Console → Firestore에서 데이터 직접 확인

## 📞 연락처

- 전화: (032) 812-5001, (032) 818-3663
- 이메일: vs1705@daum.net, vs4555@naver.com

## 📄 라이선스

© 2025 비전부동산 (남동비전 공인중개사사무소). All rights reserved.

