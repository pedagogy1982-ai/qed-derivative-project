# 미분계수 실측 프로젝트 — 배포 안내

50m 전력질주(주자 4명)와 경사면 공 굴리기(3가지 조건)로 미분계수를 실측하는 5인 수학 동아리 프로젝트 페이지입니다. 로그인 없이 링크만 열면 누구나 역할분담표·소감문·측정 데이터를 실시간으로 함께 채울 수 있습니다.

**현재 배포 상태 — 완료**
- 저장소: https://github.com/pedagogy1982-ai/qed-derivative-project
- 사이트: https://pedagogy1982-ai.github.io/qed-derivative-project/
- Firebase 프로젝트: `qed-derivative-project` (Firestore 연결 완료, 공유 편집 켜짐)
- `firebase-config.js`에 실제 설정값이 들어가 있어, 링크를 여는 즉시 5명 모두 실시간으로 같은 문서를 편집합니다. 화면 위쪽 배지가 "공유 편집 켜짐"으로 뜨면 정상 동작 중입니다.

## 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 실험 설계보고서 본문 (이론 · 지식 코너 · 실험 A/B · 실행계획 · 포스터 기획 · 소감문) |
| `app.js` | 표 계산, 회귀분석, Firestore 실시간 동기화 로직 |
| `firebase-config.js` | Firebase 프로젝트 연결 설정값 (공개돼도 무방한 값) |
| `firestore.rules` / `firebase.json` / `.firebaserc` | Firestore 보안 규칙과 배포 설정 |

## Firestore 보안 규칙

로그인이 없으므로 아래처럼 완전히 열어뒀습니다 — 이 프로젝트 설정값을 아는 사람은 누구나 `shared/project` 문서를 읽고 쓸 수 있습니다.

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

> ⚠️ 학생 이름·소감·측정값 정도만 담기는 5인 동아리 프로젝트라 감수할 만한 위험이지만, 민감한 내용은 넣지 마세요. 규칙을 고치고 싶으면 `firestore.rules`를 수정한 뒤 `npx firebase-tools deploy --only firestore:rules`로 다시 배포하면 됩니다.

## 사용 방법

- 링크를 팀원에게 공유하면 별도 로그인 없이 바로 편집할 수 있습니다.
- 역할분담표 · 소감문 · 실험 A(주자 4명) · 실험 B(공 종류 3가지) 데이터와 회귀분석 결과가 모두에게 실시간으로 동기화됩니다.
- 화면 위쪽 배지: "공유 편집 켜짐"이면 실시간 공유 중, "로컬 저장 모드"면 이 브라우저에만 저장되는 상태(네트워크 문제 등)입니다.
- 촬영한 `.mp4` 영상은 `.gitignore`로 제외되어 있어 저장소에는 올라가지 않습니다.

## 코드를 고친 뒤 반영하는 방법

```bash
git add <바뀐 파일>
git commit -m "설명"
git push
```

GitHub Pages가 자동으로 1~2분 안에 새 버전을 반영합니다.
