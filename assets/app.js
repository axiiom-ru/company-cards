'use strict';

const REPO = 'axiiom-ru/company-cards';
const DATA_PATH = 'data/companies.json';

const FIELD_DEFS = {
  general: [
    {key:'shortName', label:'Краткое наименование'},
    {key:'fullName', label:'Полное наименование'},
    {key:'legalAddress', label:'Юридический адрес', type:'textarea'},
    {key:'actualAddress', label:'Фактический адрес', type:'textarea'},
    {key:'director', label:'Генеральный директор'},
  ],
  codes: [
    {key:'inn', label:'ИНН'},
    {key:'kpp', label:'КПП'},
    {key:'ogrn', label:'ОГРН'},
    {key:'okpo', label:'ОКПО'},
    {key:'okato', label:'ОКАТО'},
    {key:'oktmo', label:'ОКТМО'},
    {key:'okogu', label:'ОКОГУ'},
    {key:'okved', label:'ОКВЭД'},
  ],
  contacts: [
    {key:'site', label:'Сайт'},
    {key:'email', label:'E-mail'},
    {key:'phone', label:'Телефон'},
  ],
};

const STATE = { companies: [], current: null };

function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(s){
  return (s==null?'':String(s)).replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- карточка (индекс + предпросмотр) ---------- */
function renderCard(c){
  const codes = FIELD_DEFS.codes.map(f => `
    <div class="cc-row"><span class="k">${esc(f.label)}</span><span class="v">${esc(c.codes ? c.codes[f.key] : '')}</span></div>`).join('');
  const banks = (c.banks || []).map(b => `
    <div class="cc-bank">
      <div class="bn">${esc(b.bankName || 'Банк')}</div>
      <div class="cc-row"><span class="k">р/с</span><span class="v">${esc(b.rs)}</span></div>
      <div class="cc-row"><span class="k">БИК</span><span class="v">${esc(b.bik)}</span></div>
      <div class="cc-row"><span class="k">к/с</span><span class="v">${esc(b.ks)}</span></div>
    </div>`).join('');
  const contacts = [];
  if(c.contacts && c.contacts.site) contacts.push(`<a href="${esc(c.contacts.site)}" target="_blank" rel="noopener">🌐 ${esc(c.contacts.site)}</a>`);
  if(c.contacts && c.contacts.email) contacts.push(`<a href="mailto:${esc(c.contacts.email)}">✉ ${esc(c.contacts.email)}</a>`);
  if(c.contacts && c.contacts.phone) contacts.push(`<span>📞 ${esc(c.contacts.phone)}</span>`);
  return `
  <div class="cc">
    <div class="cc-head">
      <div class="short">${esc(c.shortName || 'Компания')}</div>
      <div class="full">${esc(c.fullName || '')}</div>
    </div>
    <div class="cc-body">
      <div class="cc-section"><h3>Общая информация</h3>
        <div class="cc-row"><span class="k">Юридический адрес</span><span class="v">${esc(c.legalAddress)}</span></div>
        <div class="cc-row"><span class="k">Фактический адрес</span><span class="v">${esc(c.actualAddress)}</span></div>
        <div class="cc-row"><span class="k">Генеральный директор</span><span class="v">${esc(c.director)}</span></div>
      </div>
      <div class="cc-section"><h3>Коды</h3>${codes}</div>
      ${contacts.length ? `<div class="cc-section"><h3>Способ связи</h3><div class="cc-contacts">${contacts.join('')}</div></div>` : ''}
      ${banks ? `<div class="cc-section"><h3>Банковские реквизиты</h3>${banks}</div>` : ''}
    </div>
  </div>`;
}

/* ---------- страница просмотра ---------- */
async function initIndex(){
  const res = await fetch(DATA_PATH, {cache:'no-store'});
  const data = await res.json();
  document.getElementById('cards').innerHTML = data.companies.map(renderCard).join('');
}

/* ---------- конструктор ---------- */
async function initConstructor(){
  const res = await fetch(DATA_PATH, {cache:'no-store'});
  const data = await res.json();
  STATE.companies = data.companies;
  buildForm();
  const tok = sessionStorage.getItem('gh_token');
  if(tok) document.getElementById('tokenInput').value = tok;
  document.getElementById('companySelect').addEventListener('change', e => selectCompany(e.target.value || null));
  document.getElementById('newBtn').addEventListener('click', onNew);
  document.getElementById('deleteBtn').addEventListener('click', onDelete);
  document.getElementById('saveBtn').addEventListener('click', onSave);
  document.getElementById('exportBtn').addEventListener('click', onExport);
  document.getElementById('addBank').addEventListener('click', () => addBankRow({}));
  document.getElementById('tokenInput').addEventListener('input', e => sessionStorage.setItem('gh_token', e.target.value));
  buildSelect();
  if(STATE.companies.length) selectCompany(STATE.companies[0].id);
  else selectCompany(null);
}

function buildForm(){
  const form = document.getElementById('cardForm');
  form.innerHTML = '';
  const fs1 = el('<fieldset><legend>Общая информация</legend></fieldset>');
  FIELD_DEFS.general.forEach(f => fs1.appendChild(fieldEl(f, 'root')));
  form.appendChild(fs1);
  const fs2 = el('<fieldset><legend>Коды</legend></fieldset>');
  const grid = el('<div class="codes-grid"></div>');
  FIELD_DEFS.codes.forEach(f => grid.appendChild(fieldEl(f, 'codes')));
  fs2.appendChild(grid); form.appendChild(fs2);
  const fs3 = el('<fieldset><legend>Способ связи</legend></fieldset>');
  FIELD_DEFS.contacts.forEach(f => fs3.appendChild(fieldEl(f, 'contacts')));
  form.appendChild(fs3);
  const fs4 = el('<fieldset><legend>Банковские реквизиты</legend></fieldset>');
  fs4.appendChild(el('<div id="banksWrap"></div>'));
  fs4.appendChild(el('<button type="button" class="add-bank" id="addBank">+ Добавить банк</button>'));
  form.appendChild(fs4);
}

function fieldEl(f, group){
  const wrap = el(`<div class="field"><label>${esc(f.label)}</label></div>`);
  const input = f.type === 'textarea'
    ? el(`<textarea data-key="${f.key}" data-group="${group}"></textarea>`)
    : el(`<input type="text" data-key="${f.key}" data-group="${group}">`);
  input.addEventListener('input', e => {
    const g = e.target.dataset.group, k = e.target.dataset.key, v = e.target.value;
    if(g === 'root') STATE.current[k] = v; else STATE.current[g][k] = v;
    refreshPreview();
  });
  wrap.appendChild(input);
  return wrap;
}

function fillForm(){
  const c = STATE.current;
  document.querySelectorAll('#cardForm [data-group="root"]').forEach(i => i.value = c[i.dataset.key] || '');
  document.querySelectorAll('#cardForm [data-group="codes"]').forEach(i => i.value = (c.codes && c.codes[i.dataset.key]) || '');
  document.querySelectorAll('#cardForm [data-group="contacts"]').forEach(i => i.value = (c.contacts && c.contacts[i.dataset.key]) || '');
  const wrap = document.getElementById('banksWrap');
  wrap.innerHTML = '';
  (c.banks || []).forEach(b => addBankRow(b));
}

function addBankRow(b){
  b = b || {bankName:'', rs:'', bik:'', ks:''};
  STATE.current.banks = STATE.current.banks || [];
  const obj = {bankName:b.bankName||'', rs:b.rs||'', bik:b.bik||'', ks:b.ks||''};
  STATE.current.banks.push(obj);
  const block = el(`<div class="bank-block"><button type="button" class="rm danger">✕</button>
     <div class="field"><label>Банк</label><input type="text" data-bank="bankName"></div>
     <div class="field"><label>р/с</label><input type="text" data-bank="rs"></div>
     <div class="field"><label>БИК</label><input type="text" data-bank="bik"></div>
     <div class="field"><label>к/с</label><input type="text" data-bank="ks"></div>
  </div>`);
  block.querySelectorAll('input').forEach(inp => {
    const k = inp.dataset.bank;
    inp.value = obj[k] || '';
    inp.addEventListener('input', e => { obj[k] = e.target.value; refreshPreview(); });
  });
  block.querySelector('.rm').addEventListener('click', () => {
    const i = STATE.current.banks.indexOf(obj);
    if(i >= 0) STATE.current.banks.splice(i, 1);
    block.remove();
    refreshPreview();
  });
  document.getElementById('banksWrap').appendChild(block);
}

function refreshPreview(){
  document.getElementById('preview').innerHTML = STATE.current ? renderCard(STATE.current) : '';
}

function buildSelect(){
  const sel = document.getElementById('companySelect');
  sel.innerHTML = '';
  STATE.companies.forEach(c => {
    const o = el(`<option value="${esc(c.id)}">${esc(c.shortName || c.id)}</option>`);
    sel.appendChild(o);
  });
  sel.appendChild(el('<option value="">— новая компания —</option>'));
}

function selectCompany(id){
  if(id && STATE.companies.some(c => c.id === id)){
    STATE.current = JSON.parse(JSON.stringify(STATE.companies.find(c => c.id === id)));
    document.getElementById('companySelect').value = id;
  } else {
    STATE.current = blankCompany();
    document.getElementById('companySelect').value = '';
  }
  fillForm();
  refreshPreview();
}

function blankCompany(){
  return {
    id:'company-' + Date.now(),
    shortName:'Новая компания', fullName:'', legalAddress:'', actualAddress:'', director:'',
    codes:{}, contacts:{}, banks:[{}]
  };
}

function onNew(){
  STATE.current = blankCompany();
  document.getElementById('companySelect').value = '';
  fillForm();
  refreshPreview();
}

function onDelete(){
  if(!STATE.current) return;
  const i = STATE.companies.findIndex(c => c.id === STATE.current.id);
  if(i >= 0) STATE.companies.splice(i, 1);
  buildSelect();
  if(STATE.companies.length) selectCompany(STATE.companies[0].id);
  else selectCompany(null);
  setStatus('Компания удалена из локального списка. Сохрани, чтобы закрепить в репозитории.', false);
}

function onExport(){
  const blob = new Blob([JSON.stringify({companies: STATE.companies}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'companies.json';
  a.click();
  setStatus('Выгружен companies.json (локально).', false);
}

async function onSave(){
  const token = document.getElementById('tokenInput').value.trim();
  if(!token){ setStatus('Ошибка: введите токен GitHub (scope repo).', true); return; }
  if(!STATE.current.shortName){ setStatus('Ошибка: укажите краткое наименование.', true); return; }
  // merge
  const i = STATE.companies.findIndex(c => c.id === STATE.current.id);
  if(i >= 0) STATE.companies[i] = JSON.parse(JSON.stringify(STATE.current));
  else STATE.companies.push(JSON.parse(JSON.stringify(STATE.current)));
  try{
    await writeRepo({companies: STATE.companies}, token);
    buildSelect();
    document.getElementById('companySelect').value = STATE.current.id;
    setStatus('Сохранено в репозиторий ' + REPO + '.', false);
  }catch(e){
    setStatus('Ошибка сохранения: ' + e.message, true);
  }
}

async function writeRepo(payload, token){
  const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`, {
    headers:{Authorization:'Bearer ' + token, Accept:'application/vnd.github+json'}
  });
  const getJson = await getRes.json();
  const sha = getJson.sha;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
  const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`, {
    method:'PUT',
    headers:{Authorization:'Bearer ' + token, 'Content-Type':'application/json', Accept:'application/vnd.github+json'},
    body: JSON.stringify({message:'update company cards via constructor', content, sha})
  });
  if(!putRes.ok){
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || ('HTTP ' + putRes.status));
  }
}

function setStatus(msg, isError){
  const s = document.getElementById('status');
  s.textContent = msg;
  s.style.color = isError ? 'var(--danger)' : 'var(--accent-2)';
}

/* ---------- роутинг ---------- */
const page = document.body.dataset.page;
if(page === 'constructor') initConstructor();
else if(page === 'index') initIndex();
