# 윷판 승부 — PC·모바일 최대 4인 온라인 윷놀이

## 인터넷 무료 배포 — Render

이 ZIP 파일은 **GitHub 저장소에 바로 올릴 수 있도록** 최상위에 `render.yaml`, `package.json`, `server.js`가 들어 있습니다. `node_modules` 설치나 별도 빌드가 필요 없습니다.

1. https://github.com 에 로그인 → 우측 `+` → **New repository** → 이름 예: `yutnori-online` → **Create repository**.
2. 저장소에서 **Add file → Upload files** → ZIP 파일을 압축 해제한 폴더 **안의 모든 파일과 `public` 폴더**를 끌어다 놓으세요. ZIP 파일 자체를 업로드하지 마세요. **중요: `render.yaml`이 저장소 맨 위에 있어야 합니다.** `Commit changes`를 누르세요.
3. https://dashboard.render.com 에 로그인 → **New → Blueprint** → GitHub 계정 연결 → 해당 저장소 선택.
4. Blueprint Path가 `render.yaml`인지 확인 → **Deploy Blueprint**. Render에서 무료(`free`) Node.js 서비스가 생성됩니다.  
   또는 **New → Web Service**를 선택하고 해당 저장소를 연결한 뒤 Build Command `npm install`, Start Command `npm start`, Instance Type **Free**로 설정해도 됩니다.
5. 배포 상태가 `Live`가 되면 Render에서 받은 `https://...onrender.com` 주소를 PC/아이폰/다른 와이파이에서 열면 됩니다.
6. 방장이 **2·3·4인 개인전** 또는 **4인 2대2 팀전**을 선택해 방을 만든 다음, **초대 링크** 버튼을 눌러 필요한 인원의 친구에게 공유합니다. 초대받은 사람은 이름 입력 후 **입장하기**를 누릅니다.

### 무료 호스팅 제약

- Render 무료 인스턴스는 HTTP/WebSocket 트래픽이 15분간 없으면 잠자기 상태가 되며, 다음 접속 시 재기동에 약 1분 걸릴 수 있습니다.
- 서버가 재시작되면 진행 중인 방과 게임 상태가 없어집니다. 이 버전은 데이터베이스를 쓰지 않습니다.
- Render 무료 제공량·정책은 바뀔 수 있습니다. 사용량 및 요금제는 Render 계정에서 확인하세요.
- **여기에 제공된 파일만으로 공개 인터넷 주소가 자동 발급되지는 않습니다.** GitHub에 올리고 본인 Render 계정에서 배포해야 합니다.

## 내 PC에서 실행

Node.js 18 이상을 설치한 후 해당 폴더에서 PowerShell을 실행하고:

```powershell
npm.cmd install
node server.js
```

브라우저에서 `http://localhost:3000`에 접속하세요. Windows 보안 정책에 따라 `npm` 대신 `npm.cmd`를 사용합니다.

## 규칙

- 개인전: 2~4명 각자 말 4개, 가장 먼저 모두 완주한 플레이어 승리
- 팀전: 1P·3P 청팀 vs 2P·4P 홍팀, 각자 말 4개, 팀 전체 말 8개 완주 시 승리
- 도·개·걸·윷·모 / 말 업기·잡기 / 지름길 / 윷·모·잡기에 따른 추가 차례
- 설정한 인원이 모두 접속해야 시작되며, 파워 게이지는 연출용이고 윷 결과는 서버가 무작위로 정합니다.
- 빽도, 게임머니, 특정 서비스의 독점적 이미지/로고는 포함하지 않습니다.

## 테스트

`npm.cmd test` 또는 `node tests.js`.
