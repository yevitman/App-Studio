# App Studio

자연어 설명으로 단일 HTML 앱을 생성하고, 미리보기에서 수정 요청을 반복할 수 있는 앱 빌더입니다.

## AI 기능 배포 및 연결

AI API 키를 브라우저에 넣으면 공개될 수 있으므로, 이 저장소의 `api/edit.js` 서버리스 API를 Vercel에 배포해 사용합니다.

1. Vercel에서 이 저장소(`yevitman/App-Studio`)를 Import하고 `main` 브랜치를 배포합니다. Vercel은 `api/edit.js`를 `/api/edit` 서버리스 API로 배포합니다.
2. Vercel 프로젝트의 **Settings → Environment Variables**에 다음 값을 추가합니다.
   - `OPENAI_API_KEY`: 본인의 OpenAI API 키 (브라우저/저장소에 넣지 마세요)
   - `APP_ACCESS_TOKEN`: 긴 임의의 비밀 문자열. 사용자만 보관하세요.
   - `APP_ORIGIN`: GitHub Pages 주소인 `https://yevitman.github.io` (Pages 사이트를 별도 도메인에서 열면 그 origin으로 변경)
   - `OPENAI_MODEL`: 선택 항목, 기본값 `gpt-4.1-mini`
3. 환경변수 저장 뒤 Vercel에서 Redeploy 합니다. 배포 도메인은 예를 들어 `https://app-studio-xxxxx.vercel.app`입니다.
4. GitHub Pages에서 App Studio를 열고 **AI 연결 설정**을 누릅니다.
   - AI 서버 주소: `https://<Vercel 배포 도메인>/api/edit`
   - 서버 접근 토큰: Vercel의 `APP_ACCESS_TOKEN` 값
   - 저장을 누릅니다.
5. 앱 설명 입력 → **프롬프트 만들기** → **AI 앱 생성**으로 생성합니다. 미리보기에서 수정 요청을 입력하고 **AI 수정 적용**을 누르면 새 버전으로 저장됩니다.

서버 주소와 토큰은 사용자의 배포 환경에 따라 달라지므로 저장소만으로 미리 채울 수 없습니다. API 키와 토큰은 채팅/저장소에 붙여넣지 마세요. 요청에 앱 설명 및 (수정할 때) 현재 HTML 코드가 OpenAI API로 전송되며, 사용량에 따라 비용이 발생할 수 있습니다. 비공개 앱에서만 사용하고 공개 배포 전 인증, 요청 제한(rate limit), 비용 제한을 추가하세요.

## 정적 실행

`index.html`을 GitHub Pages 또는 정적 서버에서 열 수 있습니다. UI와 미리보기는 사용할 수 있지만, AI 생성 및 수정 기능은 위 Vercel API를 배포하고 연결해야 작동합니다.
