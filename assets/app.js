'use strict';

const DATA_PATH = 'data/companies.json';

const FIELD_LABELS = {
  title:'Шапка «Карточка …»',
  fullName:'Полное наименование', legalAddress:'Юридический адрес',
  actualAddress:'Фактический адрес', director:'Генеральный директор',
  inn:'ИНН', kpp:'КПП', ogrn:'ОГРН', okpo:'ОКПО', okato:'ОКАТО',
  oktmo:'ОКТМО', okogu:'ОКОГУ', okved:'ОКВЭД',
  site:'Сайт', email:'E-mail', phone:'Телефон',
  bankName:'Название банка', rs:'р/с', bik:'БИК', ks:'к/с'
};

const BUILDER = {
  general: ['title','fullName','legalAddress','actualAddress','director'],
  codes:   ['inn','kpp','ogrn','okpo','okato','oktmo','okogu','okved'],
  contacts:['site','email','phone'],
  bank:    ['bankName','rs','bik','ks']
};

const STATE = { companies: [], current: null };

function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- рендер карточки (стиль PDF) ---------- */
function renderCard(c, opts){
  opts = opts || {all:true};
  const f = opts.fields;            // Set допустимых ключей или undefined
  const show = k => opts.all || (f && f.has(k));
  const accent = c.accent || '#0d3a66';

  // head-лента: контакты
  const head = [];
  if(show('phone') && c.contacts && c.contacts.phone) head.push(`<span>📞 ${esc(c.contacts.phone)}</span>`);
  if(show('email') && c.contacts && c.contacts.email) head.push(`<span>✉ ${esc(c.contacts.email)}</span>`);
  if(show('site')  && c.contacts && c.contacts.site)  head.push(`<span>🌐 ${esc(c.contacts.site)}</span>`);

  // общая информация
  const gen = [];
  if(show('fullName') && c.fullName) gen.push(row('Полное наименование предприятия', c.fullName));
  if(show('legalAddress') && c.legalAddress) gen.push(row('Юридический адрес', c.legalAddress));
  if(show('actualAddress') && c.actualAddress) gen.push(row('Фактический адрес', c.actualAddress));
  if(show('director') && c.director) gen.push(row('Генеральный директор', c.director));

  // коды
  const codes = BUILDER.codes.filter(k => show(k) && c.codes && c.codes[k]).map(k =>
    `<div class="code"><div class="k">${esc(FIELD_LABELS[k])}</div><div class="v">${esc(c.codes[k])}</div></div>`).join('');

  // способ связи (повтор pills)
  const contacts = BUILDER.contacts.filter(k => show(k) && c.contacts && c.contacts[k]).map(k => {
    const v = c.contacts[k];
    const inner = k==='site' ? `🌐 ${esc(v)}` : k==='email' ? `✉ ${esc(v)}` : `📞 ${esc(v)}`;
    const href = k==='site' ? esc(v) : k==='email' ? 'mailto:'+esc(v) : 'tel:'+esc(v.replace(/\D/g,''));
    return `<a href="${href}" target="_blank" rel="noopener">${inner}</a>`;
  }).join('');

  // банки
  let banksHtml = '';
  const banks = (opts.bank==='all' || opts.bank==null) ? (c.banks||[]) : [(c.banks||[])[opts.bank]];
  banks.forEach(b => {
    if(!b) return;
    const parts = [];
    if(show('rs') && b.rs) parts.push(row('р/с', b.rs));
    if(show('bik') && b.bik) parts.push(row('БИК', b.bik));
    if(show('ks') && b.ks) parts.push(row('к/с', b.ks));
    if(!parts.length && !show('bankName')) return;
    const logo = (b.logo && show('bankName')) ? `<img class="bank-logo" src="${esc(b.logo)}" alt="${esc(b.bankName||'банк')}">` : '';
    const name = (show('bankName') && b.bankName) ? `<div class="bank-name">${esc(b.bankName)}</div>` : '';
    if(logo || name || parts.length)
      banksHtml += `<div class="bank-block">${logo}${name}${parts.join('')}</div>`;
  });

  const title = show('title') ? `<div class="card-title">Карточка ${esc(c.shortName||'')}</div><div class="card-rule"></div>` : '';

  return `<div class="card" style="--accent:${esc(accent)}">
    ${head.length ? `<div class="card-head">${head.join('')}</div>` : ''}
    ${title}
    ${gen.length ? `<div class="section"><h3>Общая информация</h3>${gen.join('')}</div>` : ''}
    ${codes ? `<div class="section"><h3>Коды</h3><div class="codes-grid">${codes}</div></div>` : ''}
    ${contacts ? `<div class="section"><h3>Способ связи</h3><div class="contacts">${contacts}</div></div>` : ''}
    ${banksHtml ? `<div class="section"><h3>Банковские реквизиты</h3>${banksHtml}</div>` : ''}
  </div>`;
}

function row(k, v){ return `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`; }

/* ---------- просмотр (index) ---------- */
async function initIndex(){
  const data = await (await fetch(DATA_PATH, {cache:'no-store'})).json();
  document.getElementById('cards').innerHTML = data.companies.map(c => renderCard(c)).join('');
}

/* ---------- конструктор (builder) ---------- */
async function initBuilder(){
  const data = await (await fetch(DATA_PATH, {cache:'no-store'})).json();
  STATE.companies = data.companies;

  const form = document.getElementById('builderForm');
  form.innerHTML = '';

  // компания
  form.appendChild(el('<label>Компания</label>'));
  const selC = el('<select id="selCompany"></select>');
  STATE.companies.forEach(c => selC.appendChild(el(`<option value="${esc(c.id)}">${esc(c.shortName)}</option>`)));
  form.appendChild(selC);

  // банк
  form.appendChild(el('<label>Банк</label>'));
  const selB = el('<select id="selBank"></select>');
  form.appendChild(selB);

  // поля
  Object.entries(BUILDER).forEach(([group, keys]) => {
    const fs = el(`<fieldset><legend>${group==='general'?'Общая информация':group==='codes'?'Коды':group==='contacts'?'Способ связи':'Банковские реквизиты'}</legend></fieldset>`);
    keys.forEach(k => {
      const id = 'f_'+k;
      const lab = el(`<label class="chk" for="${id}"><input type="checkbox" id="${id}" data-key="${k}" checked> ${esc(FIELD_LABELS[k])}</label>`);
      fs.appendChild(lab);
    });
    form.appendChild(fs);
  });

  form.appendChild(el('<div class="actions"><button type="button" id="allBtn">Выбрать всё</button><button type="button" id="noneBtn">Снять всё</button></div>'));

  // кнопки действий
  const act = document.getElementById('actions');
  act.innerHTML = '';
  act.appendChild(el('<button type="button" class="primary" id="printBtn">Печать / PDF</button>'));
  act.appendChild(el('<button type="button" id="copyBtn">Копировать текст</button>'));
  act.appendChild(el('<button type="button" id="dlBtn">Выгрузить HTML</button>'));

  // события
  selC.addEventListener('change', () => { fillBanks(); renderPreview(); });
  selB.addEventListener('change', renderPreview);
  form.querySelectorAll('input[type=checkbox]').forEach(i => i.addEventListener('change', renderPreview));
  document.getElementById('allBtn').addEventListener('click', () => { form.querySelectorAll('input[type=checkbox]').forEach(i=>i.checked=true); renderPreview(); });
  document.getElementById('noneBtn').addEventListener('click', () => { form.querySelectorAll('input[type=checkbox]').forEach(i=>i.checked=false); renderPreview(); });
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('copyBtn').addEventListener('click', onCopy);
  document.getElementById('dlBtn').addEventListener('click', onDownload);

  fillBanks();
  renderPreview();

  function fillBanks(){
    const c = STATE.companies.find(x => x.id === selC.value);
    selB.innerHTML = '';
    (c.banks||[]).forEach((b, i) => selB.appendChild(el(`<option value="${i}">${esc(b.bankName || ('Банк '+(i+1)))}</option>`)));
    selB.appendChild(el('<option value="all">— все банки —</option>'));
    selB.value = 'all';
  }
  function renderPreview(){
    const c = STATE.companies.find(x => x.id === selC.value);
    const fields = new Set([...form.querySelectorAll('input[type=checkbox]:checked')].map(i => i.dataset.key));
    const bank = selB.value;
    document.getElementById('preview').innerHTML = renderCard(c, {fields, bank});
  }
}

function selectedCompany(){
  const id = document.getElementById('selCompany').value;
  return STATE.companies.find(x => x.id === id);
}
function currentOpts(){
  const form = document.getElementById('builderForm');
  const fields = new Set([...form.querySelectorAll('input[type=checkbox]:checked')].map(i => i.dataset.key));
  return {fields, bank: document.getElementById('selBank').value};
}

function onCopy(){
  const c = selectedCompany(); const o = currentOpts();
  const lines = [];
  if(o.fields.has('title')) lines.push('Карточка ' + (c.shortName||''));
  if(o.fields.has('fullName') && c.fullName) lines.push('Полное наименование: ' + c.fullName);
  if(o.fields.has('legalAddress') && c.legalAddress) lines.push('Юридический адрес: ' + c.legalAddress);
  if(o.fields.has('actualAddress') && c.actualAddress) lines.push('Фактический адрес: ' + c.actualAddress);
  if(o.fields.has('director') && c.director) lines.push('Генеральный директор: ' + c.director);
  BUILDER.codes.forEach(k => { if(o.fields.has(k) && c.codes && c.codes[k]) lines.push(FIELD_LABELS[k]+': ' + c.codes[k]); });
  BUILDER.contacts.forEach(k => { if(o.fields.has(k) && c.contacts && c.contacts[k]) lines.push(FIELD_LABELS[k]+': ' + c.contacts[k]); });
  const banks = (o.bank==='all'||o.bank==null) ? (c.banks||[]) : [c.banks[o.bank]];
  banks.forEach(b => {
    if(!b) return;
    if(o.fields.has('bankName') && b.bankName) lines.push('Банк: ' + b.bankName);
    if(o.fields.has('rs') && b.rs) lines.push('р/с: ' + b.rs);
    if(o.fields.has('bik') && b.bik) lines.push('БИК: ' + b.bik);
    if(o.fields.has('ks') && b.ks) lines.push('к/с: ' + b.ks);
  });
  navigator.clipboard.writeText(lines.join('\n')).then(
    () => flash('Скопировано в буфер обмена'),
    () => flash('Не удалось скопировать (нет прав у браузера)')
  );
}

function onDownload(){
  const card = document.getElementById('preview').firstElementChild;
  if(!card) return;
  const html = '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="assets/styles.css"></head>' +
    '<body><div class="container" style="max-width:760px">'+card.outerHTML+'</div></body></html>';
  const blob = new Blob([html], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'card.html';
  a.click();
  flash('Выгружен card.html');
}

let flashTimer;
function flash(msg){
  const s = document.getElementById('status');
  if(!s) return;
  s.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(()=> s.textContent='', 2500);
}

/* ---------- роутинг ---------- */
const page = document.body.dataset.page;
if(page === 'builder') initBuilder();
else if(page === 'index') initIndex();
