export function exampleData() {
  return {
    currency: 'USD',
    people: [
      {id:'alex',name:'Alex',from:'2026-09-01',to:'2026-09-30',absences:[]},
      {id:'sam',name:'Sam',from:'2026-09-01',to:'2026-09-30',absences:[{from:'2026-09-11',to:'2026-09-17'}]},
      {id:'jo',name:'Jo',from:'2026-09-16',to:'2026-09-30',absences:[]}
    ],
    bills: [
      {id:'elec',name:'Electricity',from:'2026-09-01',to:'2026-09-30',amount:'180.00',fixed:'30.00',fixedRule:'equal',payerId:'alex'},
      {id:'net',name:'Internet',from:'2026-09-01',to:'2026-09-30',amount:'75.00',fixed:'75.00',fixedRule:'equal',payerId:'sam'},
      {id:'water',name:'Water',from:'2026-09-08',to:'2026-09-30',amount:'96.00',fixed:'16.00',fixedRule:'days',payerId:'alex'}
    ]
  };
}
export function emptyData() {
  return {currency:'USD',people:[
    {id:'person-1',name:'Roommate 1',from:'2026-10-01',to:'2026-10-31',absences:[]},
    {id:'person-2',name:'Roommate 2',from:'2026-10-01',to:'2026-10-31',absences:[]}
  ],bills:[{id:'bill-1',name:'Electricity',from:'2026-10-01',to:'2026-10-31',amount:'120.00',fixed:'20.00',payerId:'person-1',fixedRule:'equal'}]};
}
