import test from 'node:test';
import assert from 'node:assert/strict';
import {apportion,dayNumber,isoDay,parseMoney,reconcile,validateBackup} from '../js/engine.js';
import {exampleData} from '../js/sample.js';
import {makeCSV,makeSummary} from '../js/export.js';
const member=(id,from='2026-09-01',to='2026-09-30',absences=[])=>({id,name:id,from,to,absences});
const bill=(props={})=>({id:'electric',name:'Electric',from:'2026-09-01',to:'2026-09-30',amount:'30.00',fixed:'0.00',fixedRule:'equal',payerId:'A',...props});
const compute=(members,bills)=>reconcile(members,bills);
test('parses money strictly in integer cents',()=>{
  assert.equal(parseMoney('19.9'),1990);assert.equal(parseMoney('0'),0);assert.equal(parseMoney('99999999.99'),9999999999);
  for(const v of ['-1','1e3','1,000','NaN','2.345','1.','', 'Infinity'])assert.throws(()=>parseMoney(v));
});
test('Gregorian UTC date validation is timezone independent',()=>{
  assert.equal(isoDay(dayNumber('2024-02-29')),'2024-02-29');
  assert.throws(()=>dayNumber('2026-02-29'));
  assert.throws(()=>dayNumber('2026-13-05'));
});
test('exact cents from largest remainder, with deterministic ties',()=>{
  assert.deepEqual(apportion(100,[1,1,1]),[34,33,33]);
  assert.deepEqual(apportion(2,[1,1,1]),[1,1,0]);
  assert.equal(apportion(999999,[1,2,3]).reduce((a,b)=>a+b),999999);
});
test('daily occupancy differs from simple person-day weighted splits',()=>{
  const r=compute([member('A'),member('B','2026-09-16')],[bill()]);
  const shares=r.entries[0].shares;
  // First 15 days A alone; last 15 days A+B. A = 15 + 7.5; B = 7.5.
  assert.deepEqual(shares.map(s=>s.due),[2250,750]);
  assert.deepEqual(shares.map(s=>s.daysPresent),[30,15]);
});
test('fixed charges are equal for contracted residents, including absences',()=>{
  const r=compute([member('A'),member('B','2026-09-16','2026-09-30',[{from:'2026-09-16',to:'2026-09-30'}])],[bill({amount:'20',fixed:'20'})]);
  assert.deepEqual(r.entries[0].shares.map(s=>s.due),[1000,1000]);
});
test('fixed charges can instead be prorated by residence days, not presence days',()=>{
  const r=compute([member('A'),member('B','2026-09-16')],[bill({amount:'30',fixed:'30',fixedRule:'days'})]);
  assert.deepEqual(r.entries[0].shares.map(s=>s.due),[2000,1000]);
});
test('uncovered usage day is a hard validation error and names the day',()=>{
  assert.throws(()=>compute([member('A','2026-09-02')],[bill({amount:'12'})]),/2026-09-01/);
  assert.doesNotThrow(()=>compute([member('A','2026-09-02')],[bill({amount:'12',fixed:'12'})]));
});
test('absence on overnight-equivalent boundary is inclusive',()=>{
  const r=compute([member('A'),member('B','2026-09-01','2026-09-30',[{from:'2026-09-01',to:'2026-09-10'}])],[bill()]);
  assert.deepEqual(r.entries[0].shares.map(s=>s.due),[2000,1000]);
});
test('multiple bills settle exactly to zero with payments to creditors',()=>{
  const r=compute([member('A'),member('B'),member('C')],[bill({id:'one',amount:'10.01',payerId:'A'}),bill({id:'two',amount:'5.00',payerId:'B'})]);
  assert.equal(r.total,1501);
  assert.equal(r.balances.reduce((sum,b)=>sum+b.net,0),0);
  assert.equal(r.balances.reduce((sum,b)=>sum+b.due,0),1501);
  assert.equal(r.balances.reduce((sum,b)=>sum+b.paid,0),1501);
  assert.equal(r.transfers.reduce((sum,t)=>sum+t.cents,0),r.balances.filter(b=>b.net>0).reduce((sum,b)=>sum+b.net,0));
});
test('example always reconciles completely',()=>{
  const x=exampleData(),r=compute(x.people,x.bills);
  assert.equal(r.total,35100);assert.equal(r.entries.length,3);
  assert.equal(r.balances.reduce((sum,b)=>sum+b.net,0),0);
  assert.equal(r.entries.reduce((sum,e)=>sum+e.shares.reduce((s,x)=>s+x.due,0),0),35100);
});
test('malformed configurations are rejected',()=>{
  assert.throws(()=>compute([member('A'),member('A')],[bill()]),/unique IDs/);
  assert.throws(()=>compute([member('A')],[bill({payerId:'missing'})]),/select a member/);
  assert.throws(()=>compute([member('A')],[bill({amount:'8',fixed:'9'})]),/larger/);
  assert.throws(()=>compute([member('A')],[bill({to:'2025-09-30'})]),/ends before/);
  assert.throws(()=>compute([member('A')],[bill({to:'2028-09-30'})]),/cannot exceed/);
});
test('backup contract validates and round trips',()=>{
  const sample=exampleData();
  assert.deepEqual(validateBackup({format:'dayfair-v1',data:sample}),sample);
  assert.throws(()=>validateBackup({format:'dayfair-v2',data:sample}),/not a Dayfair/);
  assert.throws(()=>validateBackup({format:'dayfair-v1',data:{...sample,currency:'XMR'}}),/currency/);
});
test('CSV export escapes quotes and spreadsheet formula injections',()=>{
  const r=compute([member('A'),{...member('B'),name:'=SUM(1,2)"'}],[bill()]);
  const csv=makeCSV(r,'USD');
  assert.ok(csv.includes('"\'=SUM(1,2)"""'));
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(makeSummary(r,'USD'),/BALANCES/);
});
