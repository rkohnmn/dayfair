/** Batch 21 regression proposals. Run after patch: node --test tests/audit-dayfair-integrity.test.js */
import test from 'node:test';
import assert from 'node:assert/strict';
import {apportion,dayNumber,isoDay,parseMoney,reconcile,isEditableHouseholdState} from '../js/engine.js';
import {csvCell,makeCSV} from '../js/export.js';

const person = (id, overrides={}) => ({id,name:id,from:'2026-09-01',to:'2026-09-30',absences:[],...overrides});
const bill = (overrides={}) => ({id:'bill',name:'Electric',from:'2026-09-01',to:'2026-09-30',amount:'10.00',fixed:'0.00',fixedRule:'equal',payerId:'A',...overrides});
const household = () => ({currency:'USD',people:[person('A'),person('B')],bills:[bill()]});

test('civil year 0000 and 0099 are not silently rewritten to 1900 and 1999', () => {
  for (const date of ['0000-01-01','0099-03-01','0100-01-01','2024-02-29']) {
    assert.equal(isoDay(dayNumber(date)),date);
  }
});
test('invalid leap days and out-of-range dates still fail', () => {
  for (const date of ['0099-02-29','2026-02-29','0000-13-01','0100-00-10']) {
    assert.throws(()=>dayNumber(date), /Invalid calendar date/);
  }
});
test('inclusive days work across historical calendar boundaries', () => {
  assert.equal(dayNumber('0100-01-01')-dayNumber('0099-12-31'),1);
  assert.equal(dayNumber('0000-03-01')-dayNumber('0000-02-28'),2);
});
test('apportion preserves all cents with stable ties',()=>{
  assert.deepEqual(apportion(100,[1,1,1]),[34,33,33]);
  assert.deepEqual(apportion(100,[0,0,1]),[0,0,100]);
  assert.equal(apportion(9007199,[5,3,1]).reduce((a,b)=>a+b),9007199);
});
test('ordinary floating weights preserve the original deterministic cent allocation',()=>{
  assert.deepEqual(apportion(1424321488,[4.875,7.125,22]),[204222566,298479136,921619786]);
});
test('unrepresentable sums of finite weights are rejected instead of corrupting allocation', () => {
  assert.throws(()=>apportion(100,[1e308,1e308]),/overflow/i);
});
test('very large finite weights do not overflow intermediate share multiplication',()=>{
  assert.deepEqual(apportion(300,[1e300,2e300]),[100,200]);
});
test('structurally valid household and incomplete editing drafts are reloadable',()=>{
  const draft=household();
  assert.equal(isEditableHouseholdState(draft),true);
  draft.people[0].name=''; draft.bills[0].amount=''; draft.bills[0].from='';
  assert.equal(isEditableHouseholdState(draft),true);
});
test('malformed saved members, dates and absences are not renderable',()=>{
  const mk=()=>household();
  const a=mk();a.people[0]=null;assert.equal(isEditableHouseholdState(a),false);
  const b=mk();b.people[0].absences={from:'2026-01-01'};assert.equal(isEditableHouseholdState(b),false);
  const c=mk();c.people[0].from=123;assert.equal(isEditableHouseholdState(c),false);
  const d=mk();d.people[0].absences=[null];assert.equal(isEditableHouseholdState(d),false);
});
test('duplicate or blank saved IDs cannot confuse the editor',()=>{
  const a=household();a.people[1].id='A';assert.equal(isEditableHouseholdState(a),false);
  const b=household();b.bills[0].id='';assert.equal(isEditableHouseholdState(b),false);
});
test('unsupported currencies and oversized or malformed drafts fail closed',()=>{
  const a=household();a.currency='INVALID';assert.equal(isEditableHouseholdState(a),false);
  const b=household();b.people[0].name='N'.repeat(4001);assert.equal(isEditableHouseholdState(b),false);
  const c=household();c.people[0].absences=Array.from({length:17},()=>({from:'',to:''}));assert.equal(isEditableHouseholdState(c),false);
});
test('CSV exports negative balances as numeric spreadsheet cells (not apostrophe text)',()=>{
  const res=reconcile([person('A'),person('B')],[bill()]);
  const csv=makeCSV(res,'USD');
  assert.match(csv,/"B","0\.00","5\.00","-5\.00","USD"/);
  assert.ok(!csv.includes("\"'-5.00\""));
});
test('CSV escaping still neutralizes formula-like resident and bill names',()=>{
  const res=reconcile([person('A'),person('B',{name:'=CMD()'})],[bill({name:'@risk'})]);
  const csv=makeCSV(res,'USD');
  assert.ok(csv.includes("\"'@risk\""));
  assert.ok(csv.includes("\"'=CMD()\""));
  assert.equal(csvCell('-9.99'),"\"'-9.99\"");
  assert.equal(csvCell('=1+1'),"\"'=1+1\"");
  assert.equal(csvCell('-9.99',true),'"-9.99"');
  assert.equal(csvCell('=1+1',true),"\"'=1+1\"");
});
test('ordinary conservation and payments remain unchanged',()=>{
  const res=reconcile([person('A'),person('B')],[bill({amount:'10.01'}),bill({id:'b2',amount:'11.00',fixed:'3.00',payerId:'B'})]);
  assert.equal(res.total,2101);
  assert.equal(res.balances.reduce((s,r)=>s+r.net,0),0);
  assert.equal(res.balances.reduce((s,r)=>s+r.due,0),2101);
  assert.equal(res.entries.reduce((s,e)=>s+e.shares.reduce((a,x)=>a+x.due,0),0),2101);
});
test('currency and formatting retain original minor-unit handling',()=>{
  assert.equal(parseMoney('19.90'),1990);
  assert.throws(()=>parseMoney('19.999'));
});
