const KEY = 'app-studio-v1';
const ENDPOINT_KEY = 'app-studio-ai-endpoint-v1';
const TOKEN_KEY = 'app-studio-ai-token-v1';
const $ = (selector) => document.querySelector(selector);
const state = { request: '', prompt: '', app: null, versions: [], image: '', pendingType: 'create' };
const tabs = [...document.querySelectorAll('.nav-btn')];

function setStatus(message, isError = false) {
  const el = $('#status');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#d94747' : '#1f9d73';
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...state, request: '', prompt: '' })); }
  catch { setStatus('저장 공간이 부족해 저장하지 못했습니다.', true); }
}
function starterApp() {
  return {
    title: '내 첫 앱',
    description: '서버 없이 실행되는 시작 화면',
    updated: new Date().toISOString(),
    html: '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>내 첫 앱</title>\n<style>body{font:16px system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:24px;color:#172033}h1{color:#4f46e5}button{padding:10px 16px;border:0;border-radius:10px;background:#4f46e5;color:white;font-size:16px}</style>\n</head>\n<body>\n<h1>앱이 실행됐어요!</h1>\n<p>이 화면은 서버 연결 없이 휴대폰에서 실행됩니다.</p>\n<button onclick="document.querySelector(\'p\').textContent=\'버튼이 작동합니다!\'">눌러 보기</button>\n</body>\n</html>'
  };
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    Object.assign(state, saved);
  } catch { /* start with the local starter app */ }
  state.request = '';
  state.prompt = '';
  state.pendingType = 'create';
  if (!state.app?.html) {
    state.app = starterApp();
    state.versions = Array.isArray(state.versions) ? state.versions : [];
    save();
  }
}
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}
function buildPrompt(text, mode = 'create') {
  const clean = String(text || '').trim();
  if (!clean) return '';
  if (mode === 'change') return [
    '기존 앱을 이번 수정 요청에 맞게 변경하세요. 요청하지 않은 기능은 보존하고, 이전 대화나 다른 주제를 반영하지 마세요.',
    '[이번 수정 요청 시작]', clean, '[이번 수정 요청 끝]',
    '수정된 완전한 단일 HTML 문서만 출력하세요. 코드 펜스나 설명은 넣지 마세요.'
  ].join('\n');
  return [
    '새 앱을 개발하세요. 오직 아래 이번 앱 설명만 요구사항으로 사용하세요. 이전 대화, 과거 요청 또는 저장된 내용을 가져오지 마세요.',
    '[이번 앱 설명 시작]', clean, '[이번 앱 설명 끝]',
    '요구사항을 다른 주제로 바꾸거나 원고를 답변으로 다시 작성하지 마세요.',
    '스마트폰에 최적화된 완전한 단일 HTML 앱을 작성하고, 코드 펜스나 설명 없이 <!doctype html>부터 </html>까지 출력하세요.'
  ].join('\n');
}
function renderPrompt() {
  const el = $('#prompt');
  if (!el) return;
  if (!state.prompt) { el.textContent = '현재 입력한 앱 설명으로 프롬프트를 만듭니다.'; el.classList.add('empty'); return; }
  el.textContent = state.prompt;
  el.classList.remove('empty');
}
function backupVersion() {
  if (!state.app) return;
  state.versions.unshift({ app: JSON.parse(JSON.stringify(state.app)), time: new Date().toLocaleString('ko-KR') });
  state.versions = state.versions.slice(0, 20);
  renderVersions();
}
function renderApp() {
  const root = $('#app-preview');
  if (!root || !state.app?.html) return;
  root.innerHTML = '';
  const frame = document.createElement('iframe');
  frame.title = state.app.title || '앱 미리보기';
  frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals');
  frame.srcdoc = state.app.html;
  root.appendChild(frame);
  const editor = $('#local-html-editor');
  if (editor && document.activeElement !== editor) editor.value = state.app.html;
}
function renderVersions() {
  const list = $('#version-list');
  if (!list) return;
  if (!state.versions.length) { list.innerHTML = '<div class="empty-version">저장된 버전이 없습니다.</div>'; return; }
  list.innerHTML = state.versions.map((item, index) => `<div class="version-item"><div><div class="version-label"><span class="version-tag">${index === 0 ? '최근' : '백업'}</span>${escapeHtml(item.app?.title || '앱')}</div><div class="version-time">${escapeHtml(item.time || '')}</div></div><button class="btn ghost" data-restore="${index}">복원</button></div>`).join('');
  list.querySelectorAll('[data-restore]').forEach((button) => button.addEventListener('click', () => {
    const item = state.versions[Number(button.dataset.restore)];
    if (!item) return;
    backupVersion();
    state.app = JSON.parse(JSON.stringify(item.app));
    renderApp();
    setStatus('버전을 복원했습니다.');
    switchTab('preview');
    save();
  }));
}
function switchTab(name) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.panel === name));
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('active', panel.id === name));
}
function makePromptFromCurrentInput() {
  const raw = $('#request').value.trim();
  if (!raw) { setStatus('이번 앱 설명을 입력해 주세요.', true); return; }
  state.request = raw;
  state.prompt = buildPrompt(raw, 'create');
  state.pendingType = 'create';
  renderPrompt();
  $('#approve').disabled = false;
  setStatus('현재 입력한 설명만 프롬프트에 포함했습니다. AI 앱 생성은 서버 없이 사용할 수 없지만, 미리보기에서 HTML을 직접 수정할 수 있습니다.');
}
function openSettings() {
  $('#endpoint').value = localStorage.getItem(ENDPOINT_KEY) || '';
  $('#access-token').value = sessionStorage.getItem(TOKEN_KEY) || '';
  $('#settings-dialog').showModal();
}
function saveSettings() {
  const endpoint = $('#endpoint').value.trim();
  const token = $('#access-token').value.trim();
  try { const parsed = new URL(endpoint); if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error(); }
  catch { setStatus('AI 서버 주소를 확인해 주세요.', true); return; }
  if (!token) { setStatus('서버 접근 토큰을 입력해 주세요.', true); return; }
  localStorage.setItem(ENDPOINT_KEY, endpoint);
  sessionStorage.setItem(TOKEN_KEY, token);
  $('#settings-dialog').close();
  setStatus('AI 서버 설정을 저장했습니다. 기본 앱 실행과 직접 편집에는 서버가 필요하지 않습니다.');
}
function extractHtml(result) {
  let html = String(result || '').trim();
  const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced) html = fenced[1].trim();
  const start = html.search(/<!doctype\s+html|<html\b/i);
  if (start > 0) html = html.slice(start);
  return html;
}
async function callAI(mode, request) {
  const endpoint = localStorage.getItem(ENDPOINT_KEY);
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!endpoint || !token) {
    setStatus('AI 생성 기능에만 서버 연결이 필요합니다. 앱 실행과 HTML 직접 수정은 지금 바로 사용할 수 있습니다.', true);
    openSettings();
    return;
  }
  const prompt = mode === 'create' ? buildPrompt(request, 'create') : [
    '기존 앱의 코드를 참고하여 사용자의 수정 요청만 반영하세요. 보존할 기존 기능은 유지하고, 다른 대화 내용은 사용하지 마세요.',
    '[이번 수정 요청]', request, '[/이번 수정 요청]',
    '수정된 전체 HTML 문서만 출력합니다.', '[현재 앱 HTML]', state.app?.html || ''
  ].join('\n');
  document.body.classList.add('is-loading');
  setStatus('AI가 작업 중입니다. 잠시 기다려 주세요.');
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ mode, request, html: mode === 'edit' ? state.app?.html || '' : '', prompt }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `서버 요청 실패 (${response.status})`);
    const html = extractHtml(data.html || data.output || data.code);
    if (!/<(?:!doctype\s+html|html|body)\b/i.test(html)) throw new Error('AI 응답에 전체 HTML이 없습니다. 다시 요청해 주세요.');
    if (state.app) backupVersion();
    const title = mode === 'create' ? (request.length > 32 ? `${request.slice(0, 32)}…` : request) : state.app.title;
    state.app = { title, html, description: request, updated: new Date().toISOString() };
    state.request = '';
    state.prompt = '';
    state.pendingType = 'create';
    $('#request').value = '';
    $('#change').value = '';
    renderPrompt();
    $('#approve').disabled = true;
    renderApp();
    renderVersions();
    save();
    switchTab('preview');
    setStatus(mode === 'create' ? '앱을 생성하고 저장했습니다.' : '수정 내용을 적용하고 새 버전으로 저장했습니다.');
  } catch (error) { setStatus(error.message || 'AI 연결에 실패했습니다.', true); }
  finally { document.body.classList.remove('is-loading'); }
}
function confirmGenerate() {
  if (!state.prompt || !state.request) { setStatus('앱 설명을 다시 입력하고 프롬프트를 만드세요.', true); return; }
  $('#dialog-prompt').textContent = state.prompt;
  $('#confirm-dialog').showModal();
}
function approvePrompt() {
  const request = state.request;
  $('#confirm-dialog').close();
  callAI('create', request);
}
function submitModifyRequest() {
  const text = $('#change').value.trim();
  if (!text) { setStatus('수정할 내용을 입력하세요.', true); return; }
  if (!state.app?.html) { setStatus('먼저 앱을 불러오세요.', true); return; }
  callAI('edit', text);
}
function clearModify() {
  $('#change').value = '';
  $('#image').value = '';
  $('#attachment').innerHTML = '';
  $('#attachment').classList.add('hidden');
  setStatus('수정 입력을 초기화했습니다.');
}
function handleImage(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { setStatus('이미지는 5MB 이하만 첨부할 수 있습니다.', true); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const data = String(reader.result || '');
    $('#attachment').innerHTML = `<img src="${data}" alt="첨부 이미지">`;
    $('#attachment').classList.remove('hidden');
    state.image = data;
  };
  reader.readAsDataURL(file);
}
async function capturePreview() {
  if (!window.html2canvas) { setStatus('캡처 모듈이 준비되지 않았습니다.', true); return; }
  try {
    const data = await html2canvas($('#app-preview')).then((canvas) => canvas.toDataURL('image/png'));
    $('#attachment').innerHTML = `<img src="${data}" alt="캡처 이미지">`;
    $('#attachment').classList.remove('hidden');
    state.image = data;
    setStatus('미리보기를 첨부했습니다.');
  } catch { setStatus('캡처에 실패했습니다.', true); }
}
function addLocalEditor() {
  const root = $('#app-preview');
  if (!root || $('#local-editor-card')) return;
  const style = document.createElement('style');
  style.textContent = '.local-editor-card{margin-top:12px}.local-editor-card textarea{width:100%;min-height:220px;font:13px/1.5 ui-monospace,monospace;white-space:pre;tab-size:2}.local-editor-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.local-editor-note{color:#6f7a90;font-size:.85rem;margin:8px 0}';
  document.head.appendChild(style);
  const card = document.createElement('section');
  card.id = 'local-editor-card';
  card.className = 'card local-editor-card';
  card.innerHTML = '<div class="card-head"><span>로컬 HTML 편집 · 서버 불필요</span><button type="button" class="btn ghost" id="toggle-local-editor">HTML 직접 수정</button></div><div id="local-editor-body" class="hidden"><p class="local-editor-note">코드를 수정하고 저장하면 이 기기의 브라우저에 저장됩니다. AI 서버 연결이나 배포가 필요하지 않습니다.</p><textarea id="local-html-editor" aria-label="앱 HTML 코드" spellcheck="false"></textarea><div class="local-editor-actions"><button type="button" class="btn primary" id="save-local-html">저장하고 실행</button><button type="button" class="btn ghost" id="import-local-html">HTML 파일 가져오기</button><button type="button" class="btn ghost" id="download-local-html">HTML 다운로드</button><input id="local-html-file" type="file" accept=".html,.htm,text/html" hidden></div></div>';
  root.insertAdjacentElement('afterend', card);
  $('#toggle-local-editor').addEventListener('click', () => {
    const body = $('#local-editor-body');
    body.classList.toggle('hidden');
    $('#toggle-local-editor').textContent = body.classList.contains('hidden') ? 'HTML 직접 수정' : '편집 닫기';
    if (!body.classList.contains('hidden')) $('#local-html-editor').value = state.app?.html || '';
  });
  $('#save-local-html').addEventListener('click', () => {
    const html = $('#local-html-editor').value.trim();
    if (!/<(?:!doctype\s+html|html\b)/i.test(html)) { setStatus('완전한 HTML 문서를 입력해 주세요.', true); return; }
    backupVersion();
    state.app = { ...state.app, html, updated: new Date().toISOString() };
    save();
    renderApp();
    setStatus('수정한 HTML을 이 기기에 저장하고 실행했습니다.');
  });
  $('#import-local-html').addEventListener('click', () => $('#local-html-file').click());
  $('#local-html-file').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const html = String(reader.result || '');
      if (!/<(?:!doctype\s+html|html\b)/i.test(html)) { setStatus('올바른 HTML 파일이 아닙니다.', true); return; }
      backupVersion();
      state.app = { ...state.app, title: file.name.replace(/\.html?$/i, '') || '가져온 앱', html, updated: new Date().toISOString() };
      save();
      renderApp();
      setStatus('HTML 파일을 가져와 실행했습니다.');
      event.target.value = '';
    };
    reader.readAsText(file);
  });
  $('#download-local-html').addEventListener('click', () => {
    const blob = new Blob([$('#local-html-editor').value || state.app?.html || ''], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(state.app?.title || 'app').replace(/[\\/:*?"<>|]/g, '_')}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
$('#make-prompt').addEventListener('click', makePromptFromCurrentInput);
$('#approve').addEventListener('click', confirmGenerate);
$('#confirm').addEventListener('click', approvePrompt);
$('#cancel').addEventListener('click', () => $('#confirm-dialog').close());
$('#send-change').addEventListener('click', submitModifyRequest);
$('#clear').addEventListener('click', clearModify);
$('#capture').addEventListener('click', capturePreview);
$('#image').addEventListener('change', (event) => handleImage(event.target.files?.[0]));
$('#open-settings').addEventListener('click', openSettings);
$('#close-settings').addEventListener('click', () => $('#settings-dialog').close());
$('#save-settings').addEventListener('click', saveSettings);
$('#request').addEventListener('input', () => { state.request = ''; state.prompt = ''; $('#approve').disabled = true; renderPrompt(); });
$('#request').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); makePromptFromCurrentInput(); } });
tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.panel)));
load();
addLocalEditor();
$('#request').value = '';
renderPrompt();
$('#approve').disabled = true;
renderApp();
renderVersions();
setStatus('앱이 준비되었습니다. 서버 없이 실행하거나 미리보기에서 HTML을 직접 수정할 수 있습니다.');
