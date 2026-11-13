// Vercel serverless endpoint for App-Studio in-app AI generation and editing.
// Configure OPENAI_API_KEY and APP_ACCESS_TOKEN in Vercel Project Settings > Environment Variables.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || 'https://yevitman.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 지원합니다.' });

  const expected = process.env.APP_ACCESS_TOKEN;
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !provided || provided !== expected) return res.status(401).json({ error: '서버 접근 토큰이 올바르지 않습니다.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: '서버에 OPENAI_API_KEY가 설정되지 않았습니다.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    if (!prompt || prompt.length > 180000) return res.status(400).json({ error: '요청 내용이 비어 있거나 너무 깁니다.' });
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_completion_tokens: 16000
      })
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      console.error('OpenAI API error', upstream.status, result.error?.type || 'unknown');
      return res.status(502).json({ error: 'AI 서비스 요청에 실패했습니다. API 키, 모델, 사용 한도를 확인하세요.' });
    }
    const html = result.choices?.[0]?.message?.content || '';
    if (!html) return res.status(502).json({ error: 'AI가 빈 응답을 반환했습니다. 다시 시도하세요.' });
    return res.status(200).json({ html });
  } catch (error) {
    console.error('App-Studio API failure', error.message);
    return res.status(500).json({ error: 'AI 처리 중 서버 오류가 발생했습니다.' });
  }
}
