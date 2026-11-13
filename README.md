# App-Studio

App-Studio is a static HTML app builder with optional in-app AI generation and editing.

## Deploy the in-app AI endpoint

The GitHub Pages/HTML Preview copy is static and cannot keep an AI provider secret. Deploy this repository to Vercel (or adapt `api/edit.js` to another serverless provider) to enable the built-in AI buttons.

1. Import `yevitman/App-Studio` into Vercel and deploy the `fix/app-studio-boot` branch, or deploy the branch containing these files.
2. In Vercel Project Settings → Environment Variables, set:
   - `OPENAI_API_KEY`: your OpenAI API key. Keep it only in the server environment; never put it in `index.html`.
   - `APP_ACCESS_TOKEN`: a long, random private token used to restrict access to your endpoint. Do not share the deployed app or token publicly.
   - `APP_ORIGIN`: optional exact origin of the deployed app (for example `https://your-app.vercel.app`). The default allows `https://yevitman.github.io`.
   - `OPENAI_MODEL`: optional model override; defaults to `gpt-4.1-mini`.
3. Redeploy after setting environment variables.
4. Open the deployed app, select **AI 연결 설정**, enter the deployed endpoint URL ending in `/api/edit` and your `APP_ACCESS_TOKEN`, then save. The access token is kept in the current browser tab's session storage; the provider API key remains on the server.
5. Enter an app description and choose **AI로 앱 만들기**. For edits, open a project preview, expand **수정 요청 입력**, enter a change request, and choose **AI에게 수정 요청하고 미리보기**. Each successful result is saved as a new project version.

AI requests send the entered description and, for edits, the current app HTML to OpenAI. Review privacy, API usage charges, and access controls before using sensitive content. The access token is a basic private-use gate, not a substitute for rate limiting or user authentication on a public service. The app does not execute AI output until it passes a basic full-HTML check; inspect generated code before sharing it.

## Static preview

GitHub Pages and HTML Preview can show the UI, but the AI features require the deployed serverless endpoint above. No API key or access token is committed to this repository.
