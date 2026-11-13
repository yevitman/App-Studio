// Vercel serverless endpoint for Gemini. Keep both secrets in Vercel environment variables.
export default async function handler(req, res) {
  const allowedOrigin = process.env.APP_ORIGIN || 'https://yevitman.github.io';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 지원합니다.' });

  const expected = process.env.APP_ACCESS_TOKEN;
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !supplied || supplied !== expected) {
    return res.status(401).json({ error: '서버 접근 토큰이 올바르지 않습니다.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Vercel 환경 변수에 GEMINI_API_KEY를 설정하세요.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return res.status(400).json({ error: '앱 설명 또는 수정 요청이 비어 있습니다.' });
    if (prompt.length > 180000) return res.status(413).json({ error: '요청이 너무 큽니다. 앱 HTML을 줄여 주세요.' });

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 16000 }
      })
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      console.error('Gemini API error', upstream.status, result.error?.status || 'unknown');
      return res.status(502).json({ error: 'Gemini 요청에 실패했습니다. API 키, 모델, 사용 가능량을 확인하세요.' });
    }

    const html = (result.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('')
      .trim();
    if (!html) {
      const reason = result.candidates?.[0]?.finishReason;
      console.error('Gemini returned no text', reason || 'unknown');
      return res.status(502).json({ error: 'Gemini가 HTML을 반환하지 않았습니다. 요청을 간단히 바꾸고 다시 시도하세요.' });
    }
    return res.status(200).json({ html });
  } catch (error) {
    console.error('App-Studio Gemini endpoint error', error.message);
    return res.status(500).json({ error: 'AI 처리 중 서버 오류가 발생했습니다.' });
  }
}
