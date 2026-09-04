# 미분계수 실측 프로젝트 — 배포 안내

50m 전력질주(주자 4명)와 경사면 공 굴리기(3가지 조건)로 미분계수를 실측하는 5인 수학 동아리 프로젝트 페이지입니다. 로그인 없이 링크만 열면 누구나 역할분담표·소감문·측정 데이터를 실시간으로 함께 채울 수 있습니다.

**현재 배포 상태**
- 저장소: https://github.com/pedagogy1982-ai/qed-derivative-project
- 사이트: https://pedagogy1982-ai.github.io/qed-derivative-project/
- 지금은 `firebase-config.js`가 자리표시자 값이라 **로컬 저장 모드**입니다 — 입력·계산은 바로 되지만 그 브라우저에만 저장됩니다. 아래 설정을 마치면 모두에게 실시간 공유되는 모드로 바뀝니다.

## 남은 설정: Firebase 프로젝트 연결하기

로그인 기능은 없앴기 때문에, 남은 건 "실시간 공유 저장소" 역할을 할 Firebase 프로젝트를 하나 만들고 그 설정값을 붙여넣는 것뿐입니다. 이 과정만은 반드시 사람이 직접 해야 합니다 — Firebase 프로젝트 생성이 구글 계정 소유자 본인의 로그인을 요구하기 때문에 대신 진행할 수 없습니다. 그 외 나머지(설정값 붙여넣기, 커밋, push)는 알려주시면 대신 처리해 드립니다.

### 1. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 구글 계정으로 로그인
2. "프로젝트 추가" → 이름은 자유롭게 (예: `qed-derivative`) → 애널리틱스는 꺼도 됨

### 2. Firestore 데이터베이스 만들기

1. 왼쪽 메뉴 **Firestore Database** → **데이터베이스 만들기**
2. 위치는 아무 곳(가까운 리전 권장), 모드는 **프로덕션 모드**로 시작
3. 만들어진 뒤 **규칙(Rules)** 탭에서 아래 내용으로 바꾸고 **게시**

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /shared/project {
         allow read, write: if true;
       }
     }
   }
   ```

   > ⚠️ 로그인이 없으므로 이 문서는 링크(정확히는 Firebase 프로젝트 설정값)를 아는 사람이면 누구나 읽고 쓸 수 있습니다. 학생 이름·소감·측정값 정도만 담기는 5인 동아리 프로젝트라 큰 위험은 아니지만, 민감한 내용은 넣지 마세요.

### 3. 웹 앱 등록 & 설정값 복사

1. 프로젝트 설정(톱니바퀴) → "내 앱"에서 **`</>` (웹)** 아이콘 클릭
2. 닉네임만 입력하고 등록 (Firebase Hosting 체크 불필요 — GitHub Pages를 이미 씁니다)
3. 화면에 나오는 `firebaseConfig` 값 6개(`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`)를 복사

   그 값을 저에게 붙여넣어 주시면 `firebase-config.js`에 넣고 커밋·push까지 대신 해드립니다. 직접 하실 경우:

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

   > 이 값들은 "비밀키"가 아니라 클라이언트 식별용 값이라 공개 저장소에 올라가도 괜찮습니다. 실제 접근 제어는 2단계의 Firestore 규칙이 담당합니다.

## 사용 방법

- 링크를 팀원에게 공유하면 별도 로그인 없이 바로 편집할 수 있습니다.
- 역할분담표 · 소감문 · 실험 A(주자 4명) · 실험 B(공 종류 3가지) 데이터가 Firebase 설정 후 모두에게 실시간으로 동기화됩니다.
- 화면 위쪽 배지가 "공유 편집 켜짐"이면 실시간 공유 중, "로컬 저장 모드"면 이 브라우저에만 저장되는 상태입니다.
- 촬영한 `.mp4` 영상은 `.gitignore`로 제외되어 있어 저장소에는 올라가지 않습니다.
