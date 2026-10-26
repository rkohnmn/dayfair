import {formatMoney} from './engine.js';
export const csvCell = value => {
  const s = String(value??'');
  // Spreadsheet applications may execute formula-looking untrusted names.
  const safe = /^[\s]*[=+@\-]/.test(s) ? `'${s}` : s;
  return `"${safe.replaceAll('"','""')}"`;
};
export function makeCSV(result, currency) {
  const rows = [['Bill','From','To','Payer','Member','Days present','Residence days','Usage share','Fixed share','Total due','Currency']];
  for (const bill of result.entries) for (const share of bill.shares) {
    rows.push([bill.name,bill.from,bill.to,result.members.find(p=>p.id===bill.payerId)?.name||'',share.name,share.daysPresent,share.residenceDays,(share.variable/100).toFixed(2),(share.fixed/100).toFixed(2),(share.due/100).toFixed(2),currency]);
  }
  rows.push([]);rows.push(['Member','Total paid','Total owed','Net balance','Currency']);
  for (const b of result.balances) rows.push([b.name,(b.paid/100).toFixed(2),(b.due/100).toFixed(2),(b.net/100).toFixed(2),currency]);
  rows.push([]);rows.push(['From','To','Settlement','Currency']);
  for (const t of result.transfers) rows.push([t.fromName,t.toName,(t.cents/100).toFixed(2),currency]);
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function makeSummary(result, currency) {
  const f = n=>formatMoney(n,currency);
  return [`DAYFAIR — HOUSEHOLD BILL RECONCILIATION`,`Total bills: ${f(result.total)} across ${result.entries.length} bill(s)`,``,...result.entries.map(b=>`${b.name}: ${f(b.amount)} (${b.from} through ${b.to}, both inclusive) | fixed ${f(b.fixed)}, usage ${f(b.variable)} | paid by ${result.members.find(p=>p.id===b.payerId)?.name}`),``,`BALANCES (paid minus owed)`,...result.balances.map(b=>`${b.name}: paid ${f(b.paid)}, owes ${f(b.due)}, net ${f(b.net)}`),``,`SETTLE UP`,...(result.transfers.length?result.transfers.map(t=>`${t.fromName} pays ${t.toName} ${f(t.cents)}`):['All settled.']),``,`Method: usage is allocated one day at a time among present members. Fixed charges are split using each bill's chosen rule. Totals are rounded to exact cents using largest remainders.`,`Estimates based on your inputs and agreement, not meter readings, legal requirements or proof of payment.`].join('\n');
}
