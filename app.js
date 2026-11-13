(() => {
  'use strict';

  const STORAGE_KEY = 'app-studio-workspace-v2';
  const MAX_VERSIONS = 30;
  const SAMPLE_HTML = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>나의 첫 앱</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; min-height: 100vh; display: grid; place-items: center; background: #f3f5ff; color: #172033; font: 16px/1.6 system-ui, sans-serif; }
    main { width: min(100%, 440px); padding: 28px; border-radius: 22px; background: white; box-shadow: 0 16px 48px #29326b1c; }
    h1 { margin-top: 0; color: #4f46e5; }
    button { border: 0; border-radius: 12px; padding: 12px 18px; background: #4f46e5; color: white; font: inherit; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>앱이 실행됐어요!</h1>
    <p>이 화면은 서버 연결 없이 휴대폰에서 실행됩니다.</p>
    <button id="hello">눌러 보기</button>
  </main>
  <script>
    document.querySelector('#hello').addEventListener('click', () => {
      document.querySelector('p').textContent = '버튼이 잘 작동합니다!';
    });
  </script>
</body>
</html>`;

  const $ = (selector) => document.querySelector(selector);
  const editor = $('#html-editor');
  const preview = $('#app-preview');
  const tabs = [...document.querySelectorAll('.tab')];
  let currentHtml = SAMPLE_HTML;
  let versions = [];
  let toastTimer;

  function notify(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ html: currentHtml, versions }));
      $('#save-indicator').textContent = '기기에 저장됨';
      return true;
    } catch {
      $('#save-indicator').textContent = '저장 공간 부족';
      notify('저장 공간이 부족해 브라우저에 저장하지 못했습니다.');
      return false;
    }
  }

  function validHtml(value) {
    return /<!doctype\s+html|<html\b/i.test(value);
  }

  function updatePreview() {
    preview.srcdoc = currentHtml;
  }

  function escapeText(value) {
    const node = document.createElement('span');
    node.textContent = value;
    return node.innerHTML;
  }

  function renderVersions() {
    const list = $('#version-list');
    const empty = $('#empty-history');
    list.replaceChildren();
    empty.hidden = versions.length > 0;
    versions.forEach((version, index) => {
      const item = document.createElement('article');
      item.className = 'version-item';
      const meta = document.createElement('div');
      meta.className = 'version-meta';
      const title = document.createElement('strong');
      title.textContent = `이전 버전 ${versions.length - index}`;
      const date = document.createElement('span');
      date.textContent = version.date;
      meta.append(title, date);
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'button button-secondary';
      restore.textContent = '복구';
      restore.addEventListener('click', () => {
        if (currentHtml !== version.html) {
          versions.unshift({ html: currentHtml, date: new Date().toLocaleString('ko-KR') });
          versions = versions.slice(0, MAX_VERSIONS);
        }
        currentHtml = version.html;
        editor.value = currentHtml;
        persist();
        renderVersions();
        updatePreview();
        notify('선택한 버전을 복구했습니다.');
        showPanel('preview-panel');
      });
      item.append(meta, restore);
      list.append(item);
    });
  }

  function saveAndPreview() {
    const nextHtml = editor.value.trim();
    if (!validHtml(nextHtml)) {
      notify('완전한 HTML 문서를 입력해 주세요.');
      editor.focus();
      return;
    }
    if (nextHtml !== currentHtml) {
      versions.unshift({ html: currentHtml, date: new Date().toLocaleString('ko-KR') });
      versions = versions.slice(0, MAX_VERSIONS);
    }
    currentHtml = nextHtml;
    persist();
    renderVersions();
    updatePreview();
    showPanel('preview-panel');
    notify('저장하고 미리보기에 적용했습니다.');
  }

  function showPanel(panelId) {
    tabs.forEach((tab) => {
      const active = tab.dataset.panel === panelId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.panel').forEach((panel) => {
      const active = panel.id === panelId;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }

  function downloadHtml() {
    const value = editor.value.trim();
    if (!validHtml(value)) { notify('다운로드할 올바른 HTML을 먼저 입력해 주세요.'); return; }
    const blob = new Blob([value], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-app.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && validHtml(saved.html)) {
        currentHtml = saved.html;
        versions = Array.isArray(saved.versions) ? saved.versions.filter((item) => item && validHtml(item.html)).slice(0, MAX_VERSIONS) : [];
      }
    } catch { /* use the bundled sample */ }
    editor.value = currentHtml;
    updatePreview();
    renderVersions();
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => showPanel(tab.dataset.panel)));
  $('#save-preview').addEventListener('click', saveAndPreview);
  $('#refresh-preview').addEventListener('click', updatePreview);
  $('#download-html').addEventListener('click', downloadHtml);
  $('#import-html').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const html = String(reader.result || '');
      if (!validHtml(html)) { notify('올바른 HTML 파일을 선택해 주세요.'); return; }
      editor.value = html;
      saveAndPreview();
      event.target.value = '';
    };
    reader.onerror = () => notify('파일을 읽지 못했습니다.');
    reader.readAsText(file);
  });
  $('#reset-sample').addEventListener('click', () => {
    if (!window.confirm('현재 편집 내용을 예제 앱으로 바꿀까요? 저장되지 않은 내용은 사라집니다.')) return;
    editor.value = SAMPLE_HTML;
    saveAndPreview();
  });
  editor.addEventListener('input', () => { $('#save-indicator').textContent = '저장 전 변경사항'; });
  editor.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveAndPreview();
  });

  loadSaved();
})();
