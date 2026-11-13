const KEY='app-studio-v1';
const $=s=>document.querySelector(s);
const state={request:'',prompt:'',app:null,versions:[],image:'',pendingType:'create'};
const tabs=[...document.querySelectorAll('.tab')];
function load(){try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{$('#status').textContent='저장 공간이 부족합니다'}}
function escapeHTML(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function makePrompt(text,type='create'){
 const clean=text.trim();
 if(type==='change') return `기존 앱 수정 요청\n\n요구사항: ${clean}\n\n기존 기능과 디자인을 유지하면서 요청한 부분만 변경합니다. 변경 전 버전을 백업하고, 결과를 미리보기에서 확인할 수 있게 합니다.`;
 return `앱 생성 요청\n\n요구사항: ${clean}\n\n간단하고 직관적인 화면으로 구성합니다. 핵심 기능을 우선 구현하고, 불필요한 설명과 복잡한 설정은 제외합니다.`;
}
function showPrompt(text,type){state.prompt=makePrompt(text,type);state.pendingType=type;$('#prompt').textContent=state.prompt;$('#prompt').classList.remove('empty');$('#approve').disabled=false;$('#status').textContent='프롬프트를 확인하고 승인하세요.';save()}
function infer(text){if(/쇼핑|상품|스토어|장바구니|구매/.test(text))return'shop';if(/통계|분석|대시보드|차트|매출/.test(text))return'dashboard';if(/할 일|todo|task|업무|일정/.test(text))return'todo';return'general'}
function renderApp(){const root=$('#app-preview');if(!state.app){root.innerHTML='<div class="empty-preview">✳<span>프롬프트를 승인하면 앱이 표시됩니다</span></div>';return}const app=state.app;const title=escapeHTML(app.title);const desc=escapeHTML(app.description);let body='';if(app.type==='todo')body='<div class="sample-list"><p>☐　첫 번째 작업</p><p>☐　두 번째 작업</p><p>✓　완료한 작업</p></div>';else if(app.type==='shop')body='<div class="sample-grid"><p>🛍️　추천 상품　　₩28,000</p><p>✨　인기 상품　　₩35,000</p></div>';else if(app.type==='dashboard')body='<div class="sample-grid"><p>방문　128</p><p>성장　+12%</p></div>';else body='<p>✦　시작하기</p><p>✓　간단하게 관리</p>';
 root.innerHTML=`<article class="sample-app"><div class="sample-head"><strong>${title}</strong><span>앱 미리보기</span></div><p>${desc}</p>${body}</article>`;
}
function backup(){if(!state.app)return;state.versions.unshift({app:structuredClone(state.app),date:new Date().toLocaleString('ko-KR')});state.versions=state.versions.slice(0,20);renderVersions()}
function renderVersions(){const list=$('#version-list');if(!state.versions.length){list.innerHTML='<div class="version-empty">저장된 버전이 없습니다</div>';return}list.innerHTML=state.versions.map((v,i)=>`<div class="version-item"><div><div class="version-name">${escapeHTML(v.app?.title||'앱 버전')}${i===0?'<span class="version-current">최근 백업</span>':''}</div><div class="version-date">${escapeHTML(v.date)}</div></div><button class="button secondary" data-restore="${i}">복원</button></div>`).join('');list.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>{const v=state.versions[Number(b.dataset.restore)];if(!v)return;state.app=structuredClone(v.app);renderApp();save();$('#status').textContent='버전을 복원했습니다.';switchTab('preview')})}
function switchTab(id){tabs.forEach(t=>t.classList.toggle('active',t.dataset.panel===id));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id))}
function openApproval(){if(!state.prompt)return;$('#dialog-prompt').textContent=state.prompt;$('#confirm-dialog').showModal()}
function applyPrompt(){const raw=$('#request').value.trim();if(!raw)return;backup();if(state.pendingType==='change'&&state.app){state.app.description=raw;state.app.type=infer(raw);state.app.title=raw.length>32?raw.slice(0,32)+'…':raw}else{state.app={title:raw.length>32?raw.slice(0,32)+'…':raw,description:raw,type:infer(raw)}}state.request=raw;state.prompt='';$('#approve').disabled=true;$('#prompt').textContent='프롬프트가 적용되었습니다.';$('#prompt').classList.add('empty');$('#status').textContent='데모 미리보기에 적용했습니다. 실제 AI 코드 생성은 연결되어 있지 않습니다.';renderApp();renderVersions();save();$('#confirm-dialog').close();switchTab('preview')}
$('#make-prompt').onclick=()=>{const text=$('#request').value.trim();if(!text){$('#status').textContent='먼저 앱 내용을 입력하세요.';return}showPrompt(text,'create')};
$('#request').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#make-prompt').click()}});
$('#approve').onclick=openApproval;$('#cancel').onclick=()=>$('#confirm-dialog').close();$('#confirm').onclick=applyPrompt;
tabs.forEach(t=>t.onclick=()=>switchTab(t.dataset.panel));
$('#send-change').onclick=()=>{const text=$('#change').value.trim();if(!text&&!state.image){$('#status').textContent='수정 내용이나 이미지를 추가하세요.';return}const request=text||'첨부한 화면을 참고해 앱을 수정합니다.';$('#request').value=request;showPrompt(request,'change');switchTab('create')};
$('#clear').onclick=()=>{$('#change').value='';$('#image').value='';state.image='';$('#attachment').innerHTML='';$('#attachment').classList.add('hidden');save()};
$('#image').onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){$('#status').textContent='이미지는 5MB 이하로 선택하세요.';e.target.value='';return}const reader=new FileReader();reader.onload=()=>{state.image=String(reader.result);$('#attachment').innerHTML=`<img src="${state.image}" alt="첨부 이미지">`;$('#attachment').classList.remove('hidden');save()};reader.readAsDataURL(file)};
$('#capture').onclick=async()=>{if(!window.html2canvas){$('#status').textContent='캡처 모듈을 불러오지 못했습니다.';return}try{const canvas=await html2canvas($('#app-preview'),{backgroundColor:'#ffffff'});state.image=canvas.toDataURL('image/png');$('#attachment').innerHTML=`<img src="${state.image}" alt="화면 캡처">`;$('#attachment').classList.remove('hidden');$('#status').textContent='캡처를 수정 요청에 첨부했습니다.';save()}catch{$('#status').textContent='화면을 캡처하지 못했습니다.'}};
load();$('#request').value=state.request||'';if(state.prompt){$('#prompt').textContent=state.prompt;$('#prompt').classList.remove('empty');$('#approve').disabled=false}if(state.image){$('#attachment').innerHTML=`<img src="${state.image}" alt="첨부 이미지">`;$('#attachment').classList.remove('hidden')}renderApp();renderVersions();
