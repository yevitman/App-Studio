const KEY = 'app-studio-v1';
const $ = (sel) => document.querySelector(sel);
const state = { request: '', prompt: '', app: null, versions: [], image: '', pendingType: 'create' };
const tabs = [...document.querySelectorAll('.nav-btn')];

function setStatus(msg, isError = false) {
  const el = $('#status');
  el.textContent = msg;
  el.style.color = isError ? '#d94747' : '#1f9d73';
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    setStatus('저장에 실패했습니다.', true);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch {
    // ignore
  }
}

function inferType(text) {
  const t = text.toLowerCase();
  if (/(할 일|todo|task|업무|일정)/.test(t)) return 'todo';
  if (/(쇼핑|상품|스토어|장바구니|구매|오더)/.test(t)) return 'shop';
  if (/(대시보드|통계|분석|차트|매출)/.test(t)) return 'dashboard';
  return 'general';
}

function buildPrompt(text, mode = 'create') {
  const clean = text.trim();
  if (!clean) return '내용을 입력해 주세요.';

  if (mode === 'change') {
    return [
      '수정 요청',
      `- 변경 내용: ${clean}`,
      '- 조건: 기존 구조를 유지하고 필요한 부분만 경미하게 수정',
      '- 결과: 화면이 단순하고 직관적으로 보이도록 정리',
      '- 보존: 핵심 기능과 기존 흐름 유지'
    ].join('\n');
  }

  return [
    '앱 생성 요청',
    `- 설명: ${clean}`,
    '- 조건: 화면은 단순하고 직관적이어야 함',
    '- 기능: 핵심 기능 우선, 불필요한 설명 제거',
    '- 결과: 바로 이해할 수 있는 최소형 UI'
  ].join('\n');
}

function renderPrompt() {
  const text = state.prompt || '';
  const el = $('#prompt');
  if (!text) {
    el.textContent = '생성된 프롬프트가 여기에 표시됩니다.';
    el.classList.add('empty');
    return;
  }
  el.textContent = text;
  el.classList.remove('empty');
}

function renderApp() {
  const root = $('#app-preview');
  if (!state.app) {
    root.innerHTML = '<div class="empty-preview">앱 미리보기가 여기에 표시됩니다.</div>';
    return;
  }

  const { title, description, type } = state.app;
  let body = '';

  if (type === 'todo') {
    body = `
      <div class="sample-list">
        <p>☐ 작업 1</p>
        <p>☐ 작업 2</p>
        <p>✓ 완료</p>
      </div>
    `;
  } else if (type === 'shop') {
    body = `
      <div class="sample-grid">
        <p>🛍 상품 A · ₩28,000</p>
        <p>✨ 상품 B · ₩35,000</p>
      </div>
    `;
  } else if (type === 'dashboard') {
    body = `
      <div class="sample-grid">
        <p>방문 128</p>
        <p>전환 84%</p>
        <p>매출 5.4K</p>
      </div>
    `;
  } else {
    body = `
      <div class="sample-list">
        <p>✦ 메인 액션</p>
        <p>✓ 단순 구성</p>
        <p>◎ 빠른 사용</p>
      </div>
    `;
  }

  root.innerHTML = `
    <article class="sample-app">
      <div class="sample-head">
        <strong>${title}</strong>
        <span>Live</span>
      </div>
      <p>${description}</p>
      ${body}
    </article>
  `;
}

function backupVersion() {
  if (!state.app) return;
  state.versions.unshift({
    app: JSON.parse(JSON.stringify(state.app)),
    time: new Date().toLocaleString('ko-KR')
  });
  state.versions = state.versions.slice(0, 10);
  renderVersions();
}

function renderVersions() {
  const list = $('#version-list');
  if (!state.versions.length) {
    list.innerHTML = '<div class="empty-version">저장된 버전이 없습니다.</div>';
    return;
  }

  list.innerHTML = state.versions.map((item, index) => `
    <div class="version-item">
      <div>
        <div class="version-label"><span class="version-tag">${index === 0 ? '최근' : '백업'}</span>${item.app.title}</div>
        <div class="version-time">${item.time}</div>
      </div>
      <button class="btn ghost" data-restore="${index}">복원</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-restore]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.restore);
      const target = state.versions[idx];
      if (!target) return;
      state.app = JSON.parse(JSON.stringify(target.app));
      renderApp();
      setStatus('버전을 복원했습니다.');
      switchTab('preview');
      save();
    });
  });
}

function switchTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.panel === tabName);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabName);
  });
}

function generateFromInput() {
  const raw = $('#request').value.trim();
  if (!raw) {
    setStatus('앱 내용을 입력해 주세요.', true);
    return;
  }

  state.request = raw;
  state.prompt = buildPrompt(raw, 'create');
  state.pendingType = 'create';
  renderPrompt();
  $('#approve').disabled = false;
  setStatus('프롬프트를 검토하고 승인해 주세요.');
  save();
}

function showApproveDialog() {
  if (!state.prompt) return;
  $('#dialog-prompt').textContent = state.prompt;
  $('#confirm-dialog').showModal();
}

function applyApprovedPrompt() {
  const raw = (state.request || $('#request').value).trim();
  if (!raw) {
    setStatus('입력값이 비어 있습니다.', true);
    return;
  }

  if (!state.app) {
    backupVersion();
  }

  if (state.pendingType === 'change' && state.app) {
    state.app.description = raw;
    state.app.type = inferType(raw);
    const nextTitle = raw.length > 20 ? `${raw.slice(0, 20)}…` : raw;
    state.app.title = nextTitle;
  } else {
    state.app = {
      title: raw.length > 20 ? `${raw.slice(0, 20)}…` : raw,
      description: raw,
      type: inferType(raw)
    };
    backupVersion();
  }

  $('#prompt').textContent = '승인된 프롬프트가 적용되었습니다.';
  $('#prompt').classList.add('empty');
  $('#approve').disabled = true;
  setStatus('적용되었습니다. 미리보기를 확인하세요.');
  renderApp();
  save();
  switchTab('preview');
  $('#confirm-dialog').close();
}

function submitModifyRequest() {
  const text = $('#change').value.trim();
  const imageAttached = !!$('#attachment').querySelector('img');

  if (!text && !imageAttached) {
    setStatus('수정 내용 또는 이미지를 추가해 주세요.', true);
    return;
  }

  const requestText = text || '첨부 이미지를 참고해 화면을 정리하고 개선합니다.';
  $('#request').value = requestText;
  state.request = requestText;
  state.prompt = buildPrompt(requestText, 'change');
  state.pendingType = 'change';
  renderPrompt();
  $('#approve').disabled = false;
  setStatus('수정 프롬프트가 준비되었습니다.');
  switchTab('create');
  save();
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
  if (file.size > 5 * 1024 * 1024) {
    setStatus('이미지는 5MB 이하만 첨부할 수 있습니다.', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const data = String(reader.result || '');
    $('#attachment').innerHTML = `<img src="${data}" alt="첨부 이미지">`;
    $('#attachment').classList.remove('hidden');
    state.image = data;
    save();
  };
  reader.readAsDataURL(file);
}

async function capturePreview() {
  if (!window.html2canvas) {
    setStatus('캡처 모듈이 준비되지 않았습니다.', true);
    return;
  }

  try {
    const canvas = await html2canvas($('#app-preview'));
    const data = canvas.toDataURL('image/png');
    $('#attachment').innerHTML = `<img src="${data}" alt="캡처 이미지">`;
    $('#attachment').classList.remove('hidden');
    state.image = data;
    setStatus('현재 화면을 캡처했습니다.');
    save();
  } catch {
    setStatus('캡처에 실패했습니다.', true);
  }
}

$('#make-prompt').addEventListener('click', generateFromInput);
$('#approve').addEventListener('click', showApproveDialog);
$('#confirm').addEventListener('click', applyApprovedPrompt);
$('#cancel').addEventListener('click', () => $('#confirm-dialog').close());
$('#send-change').addEventListener('click', submitModifyRequest);
$('#clear').addEventListener('click', clearModify);
$('#capture').addEventListener('click', capturePreview);
$('#image').addEventListener('change', (event) => handleImage(event.target.files?.[0]));
$('#request').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    generateFromInput();
  }
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.panel));
});

load();
if (state.request) {
  $('#request').value = state.request;
}
if (state.prompt) {
  renderPrompt();
  $('#approve').disabled = false;
}
if (state.app) {
  renderApp();
}
renderVersions();
switchTab('create');
