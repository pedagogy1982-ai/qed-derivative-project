# 미분계수 실측 프로젝트 — 배포 안내

50m 전력질주(4명)와 경사면 공 굴리기(3가지 조건)로 미분계수를 실측하는 5인 수학 동아리 프로젝트 페이지입니다. 팀원이 각자 구글 계정으로 로그인해서 역할분담표·소감문·측정 데이터를 실시간으로 함께 채울 수 있습니다.

이 폴더를 그대로 GitHub Pages에 올리면 끝나는 정적 사이트이고, 실시간 로그인·공유 저장만 Firebase(무료 티어)를 붙여서 처리합니다. 아래 순서대로 한 번만 설정하면 됩니다.

## 1. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속해 구글 계정으로 로그인합니다.
2. "프로젝트 추가"를 눌러 새 프로젝트를 만듭니다. (이름은 자유롭게, 예: `qed-derivative`)
3. Google 애널리틱스는 꺼도 됩니다.

## 2. 구글 로그인 켜기

1. 왼쪽 메뉴에서 **Authentication** → **시작하기**
2. **Sign-in method** 탭 → **Google** 선택 → 사용 설정 → 저장

## 3. Firestore 데이터베이스 만들기

1. 왼쪽 메뉴에서 **Firestore Database** → **데이터베이스 만들기**
2. 위치는 아무 곳이나(가까운 리전 권장), 모드는 **프로덕션 모드**로 시작
3. 만들어진 뒤 **규칙(Rules)** 탭으로 가서 아래 내용으로 바꾸고 **게시**합니다 — 로그인한 사람만 읽고 쓸 수 있게 하는 규칙입니다.

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /shared/project {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   (선택) 팀원 5명의 구글 이메일만 쓰기를 허용하고 싶다면 `if request.auth != null` 대신 아래처럼 이메일 화이트리스트를 쓸 수 있습니다.

   ```
   allow read, write: if request.auth != null &&
     request.auth.token.email in [
       'member1@gmail.com', 'member2@gmail.com',
       'member3@gmail.com', 'member4@gmail.com', 'member5@gmail.com'
     ];
   ```

## 4. 웹 앱 등록 & 설정값 복사

1. 프로젝트 개요 화면(톱니바퀴 → 프로젝트 설정) → 아래 "내 앱" 섹션에서 **</> (웹)** 아이콘 클릭
2. 앱 닉네임만 입력하고 등록 (Firebase Hosting은 체크하지 않아도 됨 — GitHub Pages를 쓸 것이므로)
3. 화면에 나오는 `firebaseConfig` 객체 값을 복사해서 이 폴더의 **`firebase-config.js`** 파일에 그대로 붙여넣습니다.

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

   > 이 값들은 "비밀키"가 아니라 클라이언트 식별용 값이라 공개 저장소에 올라가도 괜찝습니다. 실제 접근 제어는 3단계의 Firestore 규칙이 담당합니다.

## 5. GitHub에 올리기

Git이 이미 이 폴더에 초기화되어 있습니다 (`git init` 완료).

1. GitHub에서 새 저장소를 만듭니다 (Public 또는 Private 모두 가능 — Private이어도 GitHub Pages는 공개 URL로 열립니다. 완전히 비공개로 하고 싶다면 GitHub Pro 이상이 필요합니다).
2. 터미널에서:

   ```bash
   git add index.html app.js firebase-config.js README.md .gitignore
   git commit -m "미분계수 실측 프로젝트 사이트"
   git branch -M main
   git remote add origin https://github.com/<사용자명>/<저장소명>.git
   git push -u origin main
   ```

   (촬영한 `.mp4` 영상은 `.gitignore`에 의해 자동으로 제외됩니다 — 용량도 크고 학생 얼굴이 나오기 때문입니다.)

## 6. GitHub Pages 켜기

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source**를 `Deploy from a branch`로, 브랜치는 `main` / `/ (root)` 선택 → **Save**
3. 1~2분 후 `https://<사용자명>.github.io/<저장소명>/` 주소로 사이트가 열립니다.

## 7. Firebase에 이 도메인 허용하기

Firebase 콘솔 → Authentication → Settings → **승인된 도메인**에 `<사용자명>.github.io`를 추가해야 구글 로그인 팝업이 정상 작동합니다.

## 사용 방법

- 링크를 팀원에게 공유하면 각자 자신의 구글 계정으로 로그인해서 편집할 수 있습니다.
- 역할분담표 · 소감문 · 실험 A(주자 4명) · 실험 B(공 종류 3가지) 데이터가 모두 실시간으로 동기화됩니다.
- 화면 위쪽의 `v12 · 이름 · n분 전` 같은 표시가 이 문서의 최신 저장 버전과 마지막 수정자입니다.
- 로그인하지 않으면 읽기 전용으로만 보입니다.
