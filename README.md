# App Studio

자연어 설명으로 단일 HTML 앱을 만들고 미리보기에서 AI 수정 요청을 반복할 수 있는 앱 빌더입니다.

## Gemini AI 기능 배포

AI Studio의 Gemini API 키를 브라우저에 넣으면 공개될 수 있으므로, 이 저장소의 `api/edit.js` 서버리스 API를 Vercel에 배포해 사용합니다.

1. Vercel에서 이 GitHub 저장소(`yevitman/App-Studio`)를 Import하고 `main` 브랜치를 배포합니다. Vercel은 `api/edit.js`를 `/api/edit` 서버리스 API로 배포합니다.
2. Vercel 프로젝트의 **Settings → Environment Variables**에 다음 값을 추가합니다.
   - `GEMINI_API_KEY`: Google AI Studio에서 발급한 Gemini API 키. 채팅/저장소에 붙여넣지 말고 Vercel에만 저장하세요.
   - `APP_ACCESS_TOKEN`: 본인이 정하는 긴 임의의 비밀 문자열. 이 값을 앱의 연결 설정에 입력합니다.
   - `APP_ORIGIN`: GitHub Pages 사이트의 실제 origin. 예를 들어 `https://yevitman.github.io` (저장소 Pages 사이트가 프로젝트 경로를 쓰더라도 origin에는 경로를 넣지 않습니다.)
   - `GEMINI_MODEL`: 선택 항목. 생략 시 `gemini-2.5-flash`를 사용합니다. 계정에서 사용할 수 있는 모델명을 Google AI Studio에서 확인하세요.
3. 환경변수를 저장한 뒤 Vercel에서 Redeploy 합니다. 배포 도메인은 예를 들어 `https://app-studio-xxxxx.vercel.app`입니다.
4. App Studio에서 **AI 연결 설정**을 엽니다.
   - AI 서버 주소: `https://<Vercel 배포 도메인>/api/edit`
   - 서버 접근 토큰: Vercel의 `APP_ACCESS_TOKEN` 값
   - 저장을 누릅니다.
5. 앱 설명 입력 → **프롬프트 만들기** → **AI 앱 생성**. 미리보기에서 수정 요청을 입력하고 **AI 수정 적용**을 누르면 새 버전으로 저장됩니다.

GitHub Pages의 정적 미리보기만으로는 Gemini를 호출할 수 없으며, Vercel 배포와 환경 변수 설정이 필요합니다. Gemini API 무료 사용 가능 여부, 요청 한도, 데이터 처리 및 요금은 계정과 모델에 따라 바뀔 수 있으므로 키 발급 전 Google AI Studio의 최신 안내를 확인하세요. 요청에는 앱 설명 및 수정 시 현재 HTML 코드가 Google API로 전송됩니다. 민감한 내용은 보내지 마세요. API 키와 토큰은 채팅이나 저장소에 붙여넣지 마세요.

## 실행

`index.html`은 GitHub Pages나 정적 서버에서 열 수 있습니다. UI/미리보기는 사용할 수 있지만, AI 기능을 쓰려면 위 Gemini API 서버를 배포하고 연결해야 합니다.
