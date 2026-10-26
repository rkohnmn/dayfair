/** Pure, dependency-free household bill allocation. All monetary values are integer cents. */
export const MAX_PEOPLE = 16;
export const MAX_BILLS = 40;
export const MAX_DAYS = 366;
const DAY_MS = 86400000;

export function dayNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a valid date (YYYY-MM-DD).');
  const [year, month, day] = value.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const actual = new Date(ms);
  if (actual.getUTCFullYear() !== year || actual.getUTCMonth() + 1 !== month || actual.getUTCDate() !== day)
    throw new Error(`Invalid calendar date: ${value}.`);
  return Math.floor(ms / DAY_MS);
}

export function isoDay(day) { return new Date(day * DAY_MS).toISOString().slice(0, 10); }
export function parseMoney(value) {
  const raw = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(raw)) throw new Error('Use a non-negative amount, up to 99,999,999.99, with at most two decimals.');
  const [whole, fractional = ''] = raw.split('.');
  const result = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large.');
  return result;
}
export function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {style:'currency', currency}).format(cents / 100);
}

/** Allocate *every* cent using largest remainders, stable ties by input order. */
export function apportion(cents, weights) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Amount must be non-negative integer cents.');
  if (!Array.isArray(weights) || !weights.length || weights.some(w => !Number.isFinite(w) || w < 0)) throw new Error('Invalid sharing weights.');
  const sum = weights.reduce((a,b)=>a+b, 0);
  if (sum <= 0) { if (cents === 0) return weights.map(()=>0); throw new Error('A bill has nobody eligible to share it.'); }
  const parts = weights.map(w => cents * w / sum);
  const result = parts.map(Math.floor);
  let remaining = cents - result.reduce((a,b)=>a+b, 0);
  const order = parts.map((p,i)=>({i, fraction:p-result[i]})).sort((a,b) => b.fraction-a.fraction || a.i-b.i);
  for (let i=0; i<remaining; i++) result[order[i].i]++;
  return result;
}

function intersectionDays(start, end, member) {
  return Math.max(0, Math.min(end, member.end) - Math.max(start, member.start) + 1);
}
function validation(people, bills) {
  if (!Array.isArray(people) || !people.length || people.length > MAX_PEOPLE) throw new Error(`Add between 1 and ${MAX_PEOPLE} household members.`);
  if (!Array.isArray(bills) || !bills.length || bills.length > MAX_BILLS) throw new Error(`Add between 1 and ${MAX_BILLS} bills.`);
  const ids = new Set();
  const names = new Set();
  const members = people.map((p, i) => {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id)) throw new Error('Members must have unique IDs.');
    ids.add(p.id);
    const name = String(p.name || '').trim();
    if (!name || name.length > 65) throw new Error(`Give member ${i+1} a name (65 characters maximum).`);
    if (names.has(name.toLowerCase())) throw new Error('Member names must be distinct.');
    names.add(name.toLowerCase());
    const start = dayNumber(p.from);
    const end = dayNumber(p.to || '2099-12-31');
    if (end < start) throw new Error(`${name}: last residence day precedes first day.`);
    const absences = (p.absences || []).map(a => {
      const from = dayNumber(a.from), to = dayNumber(a.to);
      if (to < from) throw new Error(`${name}: an absence ends before it starts.`);
      return {from, to};
    });
    if (absences.length > 16) throw new Error(`${name}: too many absence periods (maximum 16).`);
    return {...p, name, start, end, absences};
  });
  const billIds = new Set();
  const definedBills = bills.map((b, i) => {
    if (!b || typeof b.id !== 'string' || !b.id || billIds.has(b.id)) throw new Error('Bills must have unique IDs.');
    billIds.add(b.id);
    const name = String(b.name || '').trim();
    if (!name || name.length > 75) throw new Error(`Give bill ${i+1} a name (75 characters maximum).`);
    const start = dayNumber(b.from), end = dayNumber(b.to);
    if (end < start) throw new Error(`${name}: bill ends before it starts.`);
    if (end - start + 1 > MAX_DAYS) throw new Error(`${name}: billing period cannot exceed ${MAX_DAYS} days.`);
    const amount = parseMoney(b.amount);
    const fixed = parseMoney(b.fixed ?? '0');
    if (fixed > amount) throw new Error(`${name}: fixed charge is larger than the bill total.`);
    if (!ids.has(b.payerId)) throw new Error(`${name}: select a member who paid the bill.`);
    if (!['equal', 'days'].includes(b.fixedRule)) throw new Error(`${name}: choose a fixed-charge rule.`);
    return {...b, name, start, end, amount, fixed};
  });
  return {members, definedBills};
}

export function reconcile(people, bills) {
  const {members, definedBills} = validation(people, bills);
  const amounts = Object.fromEntries(members.map(p=>[p.id, {personId:p.id, name:p.name, due:0, paid:0}]));
  const entries = [];
  for (const bill of definedBills) {
    const weights = members.map(()=>0), residenceDays = members.map(()=>0);
    const activity = [];
    const uncovered = [];
    for (let day=bill.start; day<=bill.end; day++) {
      const present = [];
      members.forEach((p, i) => {
        if (day >= p.start && day <= p.end) {
          residenceDays[i]++;
          if (!p.absences.some(a=>day>=a.from && day<=a.to)) present.push(i);
        }
      });
      activity.push({date:isoDay(day), ids:present.map(i=>members[i].id)});
      if (!present.length && bill.amount - bill.fixed > 0) uncovered.push(isoDay(day));
      else for (const i of present) weights[i] += 1 / present.length;
    }
    if (uncovered.length) throw new Error(`${bill.name}: nobody is present on ${uncovered[0]}${uncovered.length>1?` and ${uncovered.length-1} other day(s)`:''}. Adjust residence/absence dates or make the charge fully fixed.`);
    const eligibleCount = residenceDays.filter(n=>n>0).length;
    if (!eligibleCount && bill.amount > 0) throw new Error(`${bill.name}: no member has residence days in this billing period.`);
    const fixedWeights = bill.fixedRule === 'equal' ? residenceDays.map(n=>n>0?1:0) : residenceDays;
    const variableShares = apportion(bill.amount - bill.fixed, weights);
    const fixedShares = apportion(bill.fixed, fixedWeights);
    const shares = members.map((p,i) => {
      const due = variableShares[i]+fixedShares[i];
      amounts[p.id].due += due;
      return {personId:p.id, name:p.name, daysPresent:activity.filter(a=>a.ids.includes(p.id)).length, residenceDays:residenceDays[i], variable:variableShares[i], fixed:fixedShares[i], due};
    });
    amounts[bill.payerId].paid += bill.amount;
    entries.push({id:bill.id,name:bill.name,from:bill.from,to:bill.to,days:bill.end-bill.start+1,amount:bill.amount,fixed:bill.fixed, variable:bill.amount-bill.fixed,payerId:bill.payerId,fixedRule:bill.fixedRule,shares,activity});
  }
  const balances = Object.values(amounts).map(x=>({...x, net:x.paid-x.due}));
  const creditors = balances.filter(x=>x.net>0).map(x=>({...x,left:x.net})).sort((a,b)=>b.left-a.left);
  const debtors = balances.filter(x=>x.net<0).map(x=>({...x,left:-x.net})).sort((a,b)=>b.left-a.left);
  const transfers = [];
  let ci=0,di=0;
  while (ci<creditors.length && di<debtors.length) {
    const sum = Math.min(creditors[ci].left, debtors[di].left);
    if (sum > 0) transfers.push({from:debtors[di].personId, fromName:debtors[di].name,to:creditors[ci].personId,toName:creditors[ci].name,cents:sum});
    creditors[ci].left-=sum; debtors[di].left-=sum;
    if (!creditors[ci].left) ci++;
    if (!debtors[di].left) di++;
  }
  return {entries,balances,transfers,total:entries.reduce((sum,b)=>sum+b.amount,0),members:members.map(({id,name})=>({id,name}))};
}

/** Strictly validate the imported backup contract; data is then revalidated by reconcile. */
export function validateBackup(doc) {
  if (!doc || doc.format !== 'dayfair-v1' || !doc.data || !Array.isArray(doc.data.people) || !Array.isArray(doc.data.bills)) throw new Error('This is not a Dayfair v1 backup.');
  if (doc.data.people.length > MAX_PEOPLE || doc.data.bills.length > MAX_BILLS) throw new Error('Backup exceeds the supported size limits.');
  const people = doc.data.people.map(p => ({id:String(p.id ?? ''),name:String(p.name??''),from:String(p.from??''),to:String(p.to??''),absences:(Array.isArray(p.absences)?p.absences:[]).map(a=>({from:String(a.from??''),to:String(a.to??'')}))}));
  const bills = doc.data.bills.map(b => ({id:String(b.id??''),name:String(b.name??''),from:String(b.from??''),to:String(b.to??''),amount:String(b.amount??''),fixed:String(b.fixed??''),payerId:String(b.payerId??''),fixedRule:String(b.fixedRule??'')}));
  const currency = String(doc.data.currency ?? 'USD');
  if (!['USD','EUR','GBP','CAD','AUD'].includes(currency)) throw new Error('Unsupported currency in backup.');
  reconcile(people, bills);
  return {people,bills,currency};
}
