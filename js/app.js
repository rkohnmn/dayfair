import {reconcile,formatMoney,validateBackup,MAX_PEOPLE,MAX_BILLS} from './engine.js';
import {exampleData,emptyData} from './sample.js';
import {makeCSV,makeSummary} from './export.js';

const STORAGE = 'dayfair-household-v1';
const THEME = 'dayfair-theme';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let loadedFromStorage = false;
let data = loadState();
let outcome = null;
let selectedBill = null;
let toastTimer = 0;
function loadState() {
  try {
    const text = localStorage.getItem(STORAGE);
    if (text && text.length < 400000) {
      const found = JSON.parse(text);
      if (found && ['USD','EUR','GBP','CAD','AUD'].includes(found.currency) && Array.isArray(found.people) && Array.isArray(found.bills) && found.people.length <= MAX_PEOPLE && found.bills.length <= MAX_BILLS) { loadedFromStorage = true; return found; }
    }
  } catch { /* Storage may be disabled; use the example */ }
  return exampleData();
}
function save() {
  try { localStorage.setItem(STORAGE,JSON.stringify(data)); $('saveStatus').textContent='Saved on this device'; }
  catch { $('saveStatus').textContent='Local saving unavailable — download a backup'; }
}
function notify(message) {
  const el=$('toast');el.textContent=message;el.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3400);
}
function field({label,name,value,type='text',placeholder='',min,max,step,options}) {
  const control = options ? `<select data-field="${esc(name)}" aria-label="${esc(label)}">${options.map(x=>`<option value="${esc(x.value)}"${x.value===value?' selected':''}>${esc(x.label)}</option>`).join('')}</select>` : `<input data-field="${esc(name)}" aria-label="${esc(label)}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"${min!==undefined?` min="${esc(min)}"`:''}${max!==undefined?` max="${esc(max)}"`:''}${step!==undefined?` step="${esc(step)}"`:''}>`;
  return `<div class="field"><label>${esc(label)}${control}</label></div>`;
}
function renderEditors() {
  $('membersList').innerHTML=data.people.map((p,i)=>`<div class="entry" data-kind="person" data-id="${esc(p.id)}"><div class="entry-title"><b><span class="color-index" aria-hidden="true"></span>Resident ${i+1}</b><button class="ghost-button" type="button" data-action="remove-person" aria-label="Remove ${esc(p.name)}">Remove</button></div><div class="field-grid">${field({label:'Name',name:'name',value:p.name,placeholder:'e.g. Alex'})}${field({label:'First day here',name:'from',value:p.from,type:'date'})}${field({label:'Last day here',name:'to',value:p.to,type:'date'})}</div><div class="subentry"><div class="subentry-head"><span>AWAY DAYS <span style="font-weight:400">(optional)</span></span><span style="font-weight:400;color:var(--mute)">Both dates included</span></div>${(p.absences||[]).map((a,j)=>`<div class="absence-grid" data-absence="${j}">${field({label:'Away from',name:'from',value:a.from,type:'date'})}${field({label:'Through',name:'to',value:a.to,type:'date'})}<button type="button" class="ghost-button" data-action="remove-absence">Remove</button></div>`).join('')}${p.absences?.length>=16?'':`<button type="button" class="inline-add" data-action="add-absence">+ Add time away</button>`}</div></div>`).join('') || '<div class="empty-state">Add a resident to begin.</div>';
  $('billsList').innerHTML=data.bills.map((b,i)=>`<div class="entry" data-kind="bill" data-id="${esc(b.id)}"><div class="entry-title"><b><span class="color-index" aria-hidden="true"></span>Bill ${i+1}</b><button class="ghost-button" type="button" data-action="remove-bill" aria-label="Remove ${esc(b.name)}">Remove</button></div><div class="field-grid bill-grid">${field({label:'Bill name',name:'name',value:b.name,placeholder:'e.g. Electricity'})}${field({label:'Total billed',name:'amount',value:b.amount,type:'number',min:0,max:99999999.99,step:'.01'})}${field({label:'Period starts',name:'from',value:b.from,type:'date'})}${field({label:'Period ends',name:'to',value:b.to,type:'date'})}${field({label:'Fixed service charge',name:'fixed',value:b.fixed,type:'number',min:0,max:99999999.99,step:'.01'})}${field({label:'Paid by',name:'payerId',value:b.payerId,options:data.people.map(p=>({label:p.name||'Unnamed',value:p.id}))})}${field({label:'How to divide fixed fees?',name:'fixedRule',value:b.fixedRule,options:[{value:'equal',label:'Equal / residents in period'},{value:'days',label:'By residence days'}]})}</div></div>`).join('') || '<div class="empty-state">Add a bill to calculate shares.</div>';
  $('currencyInput').value=data.currency;
  document.querySelector('[data-action="add-person"]').disabled=data.people.length>=MAX_PEOPLE;
  document.querySelector('[data-action="add-bill"]').disabled=data.bills.length>=MAX_BILLS;
}
function renderResults() {
  const root=$('resultArea');
  try { outcome=reconcile(data.people,data.bills); }
  catch(error) {
    outcome=null;
    $('printReport').innerHTML='';
    $('quickTotal').textContent='Check your inputs to update the split.';
    root.innerHTML=`<div class="result-error" role="alert"><strong>Check the details above</strong><p>${esc(error.message)}</p></div>`;
    for(const name of ['csvBtn','copyBtn','printBtn']) $(name).disabled=true;
    return;
  }
  for(const name of ['csvBtn','copyBtn','printBtn']) $(name).disabled=false;
  $('quickTotal').textContent=`Live total: ${formatMoney(outcome.total,data.currency)} · ${outcome.entries.length} bill${outcome.entries.length===1?'':'s'}`;
  if(!outcome.entries.some(x=>x.id===selectedBill))selectedBill=outcome.entries[0].id;
  const money=n=>formatMoney(n,data.currency);
  const selected=outcome.entries.find(x=>x.id===selectedBill);
  const billPayer=outcome.members.find(p=>p.id===selected.payerId)?.name||'';
  const maxShare=Math.max(1,...selected.shares.map(x=>x.due));
  const eligible=selected.shares.filter(s=>s.due>0||s.residenceDays>0);
  root.innerHTML=`
    <div class="results-hero"><div class="results-hero-label">TOTAL HOUSEHOLD BILLS</div><div class="results-hero-number">${esc(money(outcome.total))}</div><div class="results-hero-footer"><span>${outcome.entries.length} ${outcome.entries.length===1?'bill':'bills'} accounted for</span><span>${outcome.members.length} ${outcome.members.length===1?'person':'people'} in the household</span></div></div>
    <div class="mini-heading"><h4>Who paid · who owes</h4><span>Net = paid − owed</span></div><table class="balance-table"><thead><tr><th scope="col">Member</th><th scope="col">Paid</th><th scope="col">Owes</th><th scope="col">Net</th></tr></thead><tbody>${outcome.balances.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(money(p.paid))}</td><td>${esc(money(p.due))}</td><td class="${p.net>0?'positive':p.net<0?'negative':''}">${p.net>0?'+':''}${esc(money(p.net))}</td></tr>`).join('')}</tbody></table>
    <div class="mini-heading"><h4>Settle up</h4><span>${outcome.transfers.length} ${outcome.transfers.length===1?'payment':'payments'}</span></div>${outcome.transfers.length?outcome.transfers.map(t=>`<div class="settlement"><div><span>${esc(t.fromName)} <span aria-hidden="true">→</span> ${esc(t.toName)}</span><div class="subtext">${esc(t.fromName)} pays ${esc(t.toName)}</div></div><strong>${esc(money(t.cents))}</strong></div>`).join(''):'<div class="all-settled">✓ Everyone is square. No transfers needed.</div>'}
    <div class="mini-heading"><h4>Inside each bill</h4><span>Tap to inspect</span></div><label class="field"><span class="subtext" style="margin-bottom:7px">Choose a bill</span><select id="billDetailSelect" class="detail-select">${outcome.entries.map(b=>`<option value="${esc(b.id)}"${b.id===selectedBill?' selected':''}>${esc(b.name)} · ${esc(money(b.amount))}</option>`).join('')}</select></label>
    <div class="detail-meta">${esc(selected.from)} through ${esc(selected.to)} · ${selected.days} days<br>Paid by ${esc(billPayer)} · ${esc(money(selected.variable))} usage + ${esc(money(selected.fixed))} fixed</div>
    <div class="detail-shares">${eligible.map(s=>`<div class="detail-share"><span>${esc(s.name)}</span><div class="detail-track" role="img" aria-label="${esc(s.name)} share of ${esc(selected.name)}: ${esc(money(s.due))}"><div class="detail-fill" style="width:${Math.max(0,100*s.due/maxShare)}%"></div></div><b>${esc(money(s.due))}</b></div>`).join('')}</div>
    <div class="dayline" role="img" aria-label="Daily number of present residents from ${esc(selected.from)} to ${esc(selected.to)}">${selected.activity.map(a=>`<span class="day-block" data-count="${Math.min(a.ids.length,8)}" title="${esc(a.date)}: ${esc(a.ids.map(id=>outcome.members.find(p=>p.id===id)?.name).join(', ')||'Nobody present')}"></span>`).join('')}</div><div class="dayline-caption"><span>${esc(selected.from)}</span><span>Each bar = 1 day</span><span>${esc(selected.to)}</span></div>
    <p class="breakout">Fixed fee: ${selected.fixedRule==='equal'?'equal among residents whose dates overlap the bill':'weighted by days each person resided in the home'}. Usage: divided equally on each day among residents present. Final cents are allocated by largest remainders.</p>
    <details class="daily-disclosure"><summary>View the daily presence breakdown</summary><div class="daily-list">${selected.activity.map(a=>`<div class="daily-row"><span>${esc(a.date)}</span><span>${esc(a.ids.map(i=>outcome.members.find(p=>p.id===i)?.name).join(', ')||'Nobody present')}</span></div>`).join('')}</div></details>`;
  renderPrintReport();
}
function renderPrintReport() {
  if(!outcome)return;
  const money=n=>formatMoney(n,data.currency);
  const billRows=outcome.entries.flatMap(b=>b.shares.filter(s=>s.due||s.residenceDays).map(s=>`<tr><td>${esc(b.name)}</td><td>${esc(b.from)} – ${esc(b.to)}</td><td>${esc(s.name)}</td><td>${esc(money(s.variable))}</td><td>${esc(money(s.fixed))}</td><td>${esc(money(s.due))}</td></tr>`)).join('');
  $('printReport').innerHTML=`<h1>Dayfair. A household settlement statement</h1><p>Calculated in your browser · ${outcome.entries.length} bills · ${outcome.members.length} residents · Total ${esc(money(outcome.total))}</p><h2>Bill-by-bill shares</h2><table><thead><tr><th>Bill</th><th>Inclusive period</th><th>Resident</th><th>Usage</th><th>Fixed</th><th>Owed</th></tr></thead><tbody>${billRows}</tbody></table><h2>What everyone paid</h2><table><thead><tr><th>Resident</th><th>Paid</th><th>Owed</th><th>Net</th></tr></thead><tbody>${outcome.balances.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(money(p.paid))}</td><td>${esc(money(p.due))}</td><td>${esc(money(p.net))}</td></tr>`).join('')}</tbody></table><h2>Settle up</h2>${outcome.transfers.length?`<table><thead><tr><th>From</th><th>To</th><th>Amount</th></tr></thead><tbody>${outcome.transfers.map(t=>`<tr><td>${esc(t.fromName)}</td><td>${esc(t.toName)}</td><td>${esc(money(t.cents))}</td></tr>`).join('')}</tbody></table>`:'<p>Everyone is square. No payments needed.</p>'}<h2>Allocation rules</h2>${outcome.entries.map(b=>`<p><strong>${esc(b.name)}:</strong> ${esc(money(b.amount))} total. ${esc(money(b.fixed))} fixed charge split ${b.fixedRule==='equal'?'equally among residents with dates in this billing period':'by residence days'}. ${esc(money(b.variable))} usage split day by day among present residents. Paid by ${esc(outcome.members.find(p=>p.id===b.payerId)?.name||'')}.</p>`).join('')}<p>These are modelled shares, not meter readings or a legal determination. Dates are inclusive. Charges are reconciled in integer cents.</p>`;
}
function updateStateFromField(target) {
  const container=target.closest('[data-kind]');
  if(!container)return;
  const list=container.dataset.kind==='person'?data.people:data.bills;
  const record=list.find(x=>x.id===container.dataset.id);
  if(!record)return;
  const absence=target.closest('[data-absence]');
  const obj=absence?record.absences?.[Number(absence.dataset.absence)]:record;
  const key=target.dataset.field;
  if(!obj || !Object.hasOwn(obj,key))return;
  obj[key]=target.value;
  save();renderResults();
  if(container.dataset.kind==='person'&&key==='name') {
    document.querySelectorAll('[data-kind="bill"] select[data-field="payerId"]').forEach(select=>{
      const option=[...select.options].find(opt=>opt.value===record.id);
      if(option)option.textContent=record.name||'Unnamed';
    });
  }
}
function attach() {
  document.addEventListener('input',e=>{if(e.target.matches('[data-field]'))updateStateFromField(e.target);});
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-field]'))updateStateFromField(e.target);
    if(e.target.id==='billDetailSelect'){selectedBill=e.target.value;renderResults();}
    if(e.target.id==='currencyInput'){data.currency=e.target.value;save();renderResults();}
  });
  document.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-action]');if(!btn)return;
    const action=btn.dataset.action, row=btn.closest('[data-kind]');
    const entry=row ? (row.dataset.kind==='person'?data.people:data.bills).find(x=>x.id===row.dataset.id):null;
    if(action==='add-person') {
      if(data.people.length>=MAX_PEOPLE)return notify('The limit is 16 people.');
      const name=`Roommate ${data.people.length+1}`;
      data.people.push({id:id(),name,from:'2026-10-01',to:'2026-10-31',absences:[]});
    } else if(action==='remove-person') {
      if(data.people.length<=1)return notify('Keep at least one resident.');
      if(data.bills.some(b=>b.payerId===entry.id)){notify('Reassign bills paid by this person before removing them.');return;}
      data.people=data.people.filter(p=>p.id!==entry.id);
    } else if(action==='add-bill') {
      if(data.bills.length>=MAX_BILLS)return notify('The limit is 40 bills.');
      const first=data.bills.at(-1);
      data.bills.push({id:id(),name:'New bill',from:first?.from||'2026-10-01',to:first?.to||'2026-10-31',amount:'0.00',fixed:'0.00',fixedRule:'equal',payerId:data.people[0]?.id||''});
    } else if(action==='remove-bill') {
      if(data.bills.length<=1)return notify('Keep at least one bill.');
      data.bills=data.bills.filter(b=>b.id!==entry.id);
    } else if(action==='add-absence') {
      if(entry.absences.length>=16)return notify('Maximum 16 absences per resident.');
      entry.absences.push({from:entry.from||'2026-10-01',to:entry.from||'2026-10-01'});
    } else if(action==='remove-absence') {
      entry.absences.splice(Number(btn.closest('[data-absence]').dataset.absence),1);
    } else return;
    save();renderEditors();renderResults();
    if(action==='add-person') $('membersList').querySelector('.entry:last-child [data-field="name"]')?.focus();
    else if(action==='add-bill') $('billsList').querySelector('.entry:last-child [data-field="name"]')?.focus();
    else if(action==='add-absence') $('membersList').querySelector(`[data-id="${CSS.escape(entry.id)}"] .absence-grid:last-of-type input`)?.focus();
    else if(action==='remove-person') document.querySelector('[data-action="add-person"]')?.focus();
    else if(action==='remove-bill') document.querySelector('[data-action="add-bill"]')?.focus();
  });
  $('exampleBtn').addEventListener('click',()=>{
    if(!confirm('Replace the current household with a worked example? Download a backup first if you need your current work.'))return;
    data=exampleData();selectedBill=null;refresh();notify('Example household loaded.');
  });
  $('blankBtn').addEventListener('click',()=>{
    if(!confirm('Start with a new household? This replaces your current inputs.'))return;
    data=emptyData();selectedBill=null;refresh();notify('Fresh household ready to edit.');
  });
  $('clearBtn').addEventListener('click',()=>{
    if(!confirm('Delete your saved household on this device? Download a backup first if needed.'))return;
    try { localStorage.removeItem(STORAGE); } catch {}
    data=emptyData();selectedBill=null;renderEditors();renderResults();
    $('saveStatus').textContent='Saved household deleted (starter shown)';notify('Saved household deleted. Starter inputs are not saved until edited.');
  });
  $('csvBtn').addEventListener('click',()=>outcome&&download('dayfair-reconciliation.csv',makeCSV(outcome,data.currency),'text/csv;charset=utf-8'));
  $('copyBtn').addEventListener('click',async()=>{
    if(!outcome)return;
    try { await navigator.clipboard.writeText(makeSummary(outcome,data.currency));notify('Summary copied to clipboard.'); }
    catch {notify('Clipboard permission unavailable. Download the report instead.');}
  });
  $('printBtn').addEventListener('click',()=>{if(outcome)window.print();});
  $('backupBtn').addEventListener('click',()=>download('dayfair-backup.json',JSON.stringify({format:'dayfair-v1',createdAt:new Date().toISOString(),data},null,2),'application/json'));
  $('importBtn').addEventListener('click',()=>$('importInput').click());
  $('importInput').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    e.target.value='';
    if(file.size>300000){notify('Backup is too large (300 KB maximum).');return;}
    try {
      const doc=JSON.parse(await file.text());
      const imported=validateBackup(doc);
      if(!confirm('Restore this backup and replace the current household?'))return;
      data=imported;selectedBill=null;refresh();notify('Backup restored successfully.');
    } catch(err){notify(`Could not restore backup: ${err.message}`);}
  });
  $('themeToggle').addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    setTheme(next);try{localStorage.setItem(THEME,next);}catch{}
  });
}
function setTheme(theme) {
  document.documentElement.dataset.theme=theme;
  $('themeToggle').setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} theme`);
  $('themeToggle').title=`Switch to ${theme==='dark'?'light':'dark'} theme`;
}
function download(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function refresh(){save();renderEditors();renderResults();}
try { setTheme(localStorage.getItem(THEME)==='dark'?'dark':'light'); } catch {setTheme('light');}
renderEditors();renderResults();attach();
if (!loadedFromStorage) $('saveStatus').textContent='Example loaded · edit to begin';
