# 윷판 승부 v2.0 — 실시간 2~4인 윷놀이

## 새 기능

- 개인전 2/3/4명, 팀전 4명(2 대 2)
- 윷·모가 나오면 말을 이동하기 전에 추가 던지기
- 윷 결과가 여러 개일 때 원하는 결과를 골라 말 이동
- 말 선택 → 사용 윷 결과 및 목적지 선택 → 최종 확인 → 서버에서 이동 검증
- 상대 말을 잡으면 추가 던지기
- 길 갈림길(우회 경로) 선택
- 터치/마우스로 버튼을 누르고 있는 동안 충전하고 놓으면 던지기
- CSS 입체 윷 그래픽, 던지기 애니메이션, Web Audio 효과음
- 회원가입/로그인, 가상 게임머니, 승리·패배 저장
- 게임머니 방 선택: 무료, 1,000 / 5,000 / 10,000 머니
- 가입 시 100,000 머니 지급, 잔액이 **정확히 0**이면 100,000 머니 다시 받기
- 승리시 참가비 합계를 획득; 2대2 팀전에서는 승리 팀 두 명이 절반씩 받음

## 주의사항

이것은 **현금 가치가 전혀 없는 가상 게임머니**입니다. 돈 충전, 결제, 환전, 현금 인출은 지원하지 않습니다. 랜덤 결과는 서버에서 결정합니다. 충전 게이지는 던지는 손맛을 위한 시각적인 조작이며 윷 결과를 조작하지 않습니다.

서버 재시작 시 현재 게임방/진행 중인 게임은 초기화됩니다. 참가비 대전 도중 서버가 재시작되는 상황까지 금융 수준으로 보상하는 기능은 미구현이므로, 테스트용으로만 사용하십시오.

### 로컬 실행

Node.js 20 이상 필요

```
npm install
npm start
```

PowerShell에서 npm 실행 제한이 있다면 `npm.cmd install`, `node server.js`를 사용합니다.
브라우저에서 `http://localhost:3000` 접속합니다.

### Render 업데이트

1. 기존 `https://github.com/downdate06/downdate` 저장소의 파일을 새 패키지 파일로 교체합니다. `server.js`, `auth.js`, `game.js`, `package.json`, `tests.js`, `README.md`, `render.yaml`, `public`의 파일을 모두 올려야 합니다.
2. GitHub에서 Commit changes를 누릅니다.
3. Render > yutnori-online > Deploys에서 새 배포 `Live`를 확인합니다. 자동 배포되지 않으면 Manual Deploy > Deploy latest commit.
4. 아이폰/PC에서 페이지를 강력 새로고침한 뒤 확인합니다.

### 영구 계정 저장: PostgreSQL 필수

Render 무료 Web Service의 디스크는 임시 저장소이므로 `DATABASE_URL`이 없는 경우 계정과 잔액이 **재배포·휴면·재시작 시 초기화**됩니다. 계정·머니를 실제로 유지하려면 별도 PostgreSQL 데이터베이스를 연결하세요.

1. 관리하는 PostgreSQL 서비스(예: Neon 등)에서 데이터베이스를 생성합니다.
2. PostgreSQL 연결 문자열을 복사합니다(`postgresql://...`). 이 문자열은 절대 GitHub에 업로드하거나 사람에게 공개하지 마세요.
3. Render > 현재 `yutnori-online` Web Service > Environment > `Add Environment Variable`.
4. `Key`: `DATABASE_URL`, `Value`: 연결 문자열. 저장 후 자동 재배포합니다.
5. 서버는 처음 시작할 때 `yut_accounts` 및 `yut_sessions` 테이블을 자동 생성합니다.

`DATABASE_URL`이 설정되지 않은 경우에는 서버 로컬 JSON 파일(`accounts.json`, Git 관리 제외)에 저장되며, 이는 Render에서 영구 보존되지 않습니다. 로컬 PC에서는 폴더가 남아있다면 유지됩니다.

게임머니 기능은 프로토타입입니다. 공개 서비스 전에는 서버 장애 대비 정산/환불·트랜잭션, 세션 만료, 요청 제한 및 별도 사용자 검증을 보완해야 합니다.

## 점검

```
npm test
```

기본 규칙 테스트 11개가 포함돼 있습니다.
