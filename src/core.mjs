export const sampleRows = [
  {RegistrationID:'PL-001',FullName:'Arjun Mehta',Role:'Batter',Category:'Senior',Age:24,City:'Bengaluru',Email:'arjun@example.com',Phone:'9000000001',JerseySize:'M'},
  {RegistrationID:'PL-002',FullName:'Rohan Nair',Role:'All-rounder',Category:'Senior',Age:26,City:'Kochi',Email:'rohan@example.com',Phone:'9000000002',JerseySize:'L'},
  {RegistrationID:'PL-003',FullName:'Karthik Rao',Role:'Bowler',Category:'Senior',Age:23,City:'Hyderabad',Email:'karthik@example.com',Phone:'9000000003',JerseySize:'M'},
  {RegistrationID:'PL-004',FullName:'Dev Sharma',Role:'Wicketkeeper',Category:'Junior',Age:21,City:'Pune',Email:'dev@example.com',Phone:'9000000004',JerseySize:'S'},
  {RegistrationID:'PL-005',FullName:'Sahil Khan',Role:'Batter',Category:'Senior',Age:25,City:'Mumbai',Email:'sahil@example.com',Phone:'9000000005',JerseySize:'L'},
  {RegistrationID:'PL-006',FullName:'Vikram Patel',Role:'Bowler',Category:'Junior',Age:22,City:'Ahmedabad',Email:'vikram@example.com',Phone:'9000000006',JerseySize:'M'}
];
export const sampleTeams = [
  {id:'t1',name:'Royal Strikers',short:'RS',color:'#7258c9',symbol:'crown',logo:''},
  {id:'t2',name:'Coastal Sharks',short:'CS',color:'#288ab3',symbol:'wave',logo:''},
  {id:'t3',name:'Thunder XI',short:'TX',color:'#d28c29',symbol:'bolt',logo:''},
  {id:'t4',name:'Green Falcons',short:'GF',color:'#21846d',symbol:'wing',logo:''}
];
export const defaultMapping = {id:'RegistrationID',name:'FullName',role:'Role',category:'Category',age:'Age',city:'City',photo:''};
export function defaultBudget(unit){return unit==='INR'?10000:1000;}
export function initialState(){return {version:2,round:1,stage:'live',sampleData:true,fileName:'arena_registrations.xlsx',rows:structuredClone(sampleRows),mapping:{...defaultMapping},players:mapRows(sampleRows,defaultMapping).map(({errors,...p})=>p),teams:sampleTeams.map(t=>({...t,maxPlayers:11,budgets:{POINTS:1000,INR:10000}})),unit:'INR',currentId:null,autoNext:true,history:[],eventName:'Auction House',season:'Premier League 2026',eventLogo:'',display:{photo:true,age:true,city:true},imported:true};}
const roundMoney=n=>Math.round((n+Number.EPSILON)*100)/100;
export function teamStats(s,id){const team=s.teams.find(t=>t.id===id);if(!team)throw Error('Team not found.');const players=s.players.filter(p=>p.status==='Sold'&&p.teamId===id),spent=roundMoney(players.reduce((n,p)=>n+p.amount,0)),budget=team.budgets?.[s.unit]??defaultBudget(s.unit);return {count:players.length,spent,budget,remaining:roundMoney(budget-spent)};}
export function migrateState(saved){if(![1,2].includes(saved?.version)||!Array.isArray(saved.players)||!Array.isArray(saved.teams))return initialState();const s=structuredClone(saved);s.round??=1;s.teams=s.teams.map(t=>{const budgets={POINTS:1000,INR:10000,...t.budgets};if(!t.budgets){const spent=roundMoney(s.players.filter(p=>p.status==='Sold'&&p.teamId===t.id).reduce((n,p)=>n+p.amount,0));budgets[s.unit]=Math.max(defaultBudget(s.unit),spent);}return {...t,budgets,maxPlayers:t.maxPlayers||11};});s.history=s.history.map(h=>({...h,round:h.round??1}));s.players=s.players.map(p=>({...p,round:p.round??(p.sequence?1:null)}));s.version=2;return s;}
export function mapRows(rows,map){
  const seen=new Set();
  return rows.map((row,index)=>{
    const id=String(row[map.id]??'').trim()||'PL-'+String(index+1).padStart(3,'0');
    const name=String(row[map.name]??'').trim();
    const errors=[];if(!name)errors.push('Player name is missing');if(seen.has(id))errors.push('Duplicate player ID');seen.add(id);
    return {id,name,role:String(row[map.role]??'Player'),category:String(row[map.category]??''),age:String(row[map.age]??''),city:String(row[map.city]??''),photo:String(row[map.photo]??''),sourceRow:index+2,status:'Pending',teamId:null,amount:null,sequence:null,timestamp:null,round:null,errors};
  });
}
export function stats(s){return {total:s.players.length,sold:s.players.filter(p=>p.status==='Sold').length,unsold:s.players.filter(p=>p.status==='Unsold').length,pending:s.players.filter(p=>p.status==='Pending').length,current:s.players.filter(p=>p.status==='Current').length,totalAmount:roundMoney(s.players.reduce((n,p)=>n+(p.status==='Sold'?p.amount:0),0))};}
export function isComplete(s){const c=stats(s);return c.total>0&&c.pending===0&&c.current===0&&c.sold+c.unsold===c.total;}
export function startUnsoldRound(s){if(!isComplete(s))throw Error('Finish the current auction round before re-auctioning unsold players.');const pool=s.players.filter(p=>p.status==='Unsold');if(!pool.length)throw Error('There are no unsold players to re-auction.');if(!s.teams.length)throw Error('Add a team before starting the unsold round.');s.round=(s.round??1)+1;for(const p of pool)Object.assign(p,{status:'Pending',previousStatus:'Unsold',teamId:null,amount:null,sequence:null,timestamp:null,round:null});s.currentId=null;s.stage='live';return pool.length;}
export function pickPlayer(s,random=Math.random){if(s.currentId)throw Error('Finish the current player first.');const pool=s.players.filter(p=>p.status==='Pending');if(!pool.length)throw Error('All players have been processed.');const index=Math.min(pool.length-1,Math.floor(random()*pool.length));const p=pool[index];s.currentId=p.id;p.status='Current';return {player:p,index,pool};}
export function validateAmount(value,unit){const str=String(value).trim();if(!str||!/^\d+(?:\.\d+)?$/.test(str)||!Number.isFinite(Number(str))||Number(str)<=0)throw Error('Enter a valid amount greater than zero.');if(unit==='POINTS'&&!/^\d+$/.test(str))throw Error('Points must be a whole number.');if(unit==='INR'&&!/^\d+(?:\.\d{1,2})?$/.test(str))throw Error('Use no more than two decimal places for rupees.');return Number(str);}
export function validateBudget(value,unit){const str=String(value).trim();if((unit==='POINTS'&&/^0+$/.test(str))||(unit==='INR'&&/^0+(?:\.0{1,2})?$/.test(str)))return 0;try{return validateAmount(value,unit);}catch(e){throw Error('Starting budget: '+e.message);}}
export function validateSale(s,amount,teamId){const value=validateAmount(amount,s.unit);if(!s.teams.some(t=>t.id===teamId))throw Error('Select the winning team to complete the sale.');const balance=teamStats(s,teamId),team=s.teams.find(t=>t.id===teamId);if(balance.count>=(team.maxPlayers||11))throw Error('This team has reached its squad limit. Select another team.');if(Math.round(value*100)>Math.round(balance.remaining*100))throw Error('This team has only '+money(balance.remaining,s.unit)+' remaining. Enter an amount within its budget.');return value;}
export function recordOutcome(s,status,amount,teamId){
  const p=s.players.find(p=>p.id===s.currentId&&p.status==='Current');if(!p)throw Error('Spin to select a player first.');
  if(!['Sold','Unsold'].includes(status))throw Error('Invalid outcome.');
  const saleAmount=status==='Sold'?validateSale(s,amount,teamId):null;
  const seq=s.history.length+1;Object.assign(p,{status,amount:saleAmount,teamId:status==='Sold'?teamId:null,sequence:seq,timestamp:new Date().toISOString(),round:s.round??1});s.history.push({playerId:p.id,status,amount:p.amount,teamId:p.teamId,sequence:seq,timestamp:p.timestamp,round:p.round});s.currentId=null;return p;
}
export function reviseSale(s,id,amount,teamId){
 const p=s.players.find(p=>p.id===id&&p.status==='Sold');if(!p)throw Error('Only sold results can be corrected.');if(s.currentId)throw Error('Finish the current player before editing a result.');
 const before={...p};Object.assign(p,{status:'Pending',amount:null,teamId:null});let value;try{value=validateSale(s,amount,teamId);}catch(e){Object.assign(p,before);throw e;}
 Object.assign(p,before,{amount:value,teamId});s.history.push({playerId:id,status:'Sold',amount:value,teamId,sequence:s.history.length+1,timestamp:new Date().toISOString(),round:before.round||s.round,action:'Correction',previousAmount:before.amount,previousTeamId:before.teamId});return p;
}
export function changeUnit(s,unit){if(s.history.length)throw Error('The auction unit is locked after the first result.');if(!['POINTS','INR'].includes(unit))throw Error('Invalid auction unit.');s.unit=unit;}
export function deleteTeam(s,id){if(s.players.some(p=>p.teamId===id))throw Error('This team has sold players and cannot be deleted.');s.teams=s.teams.filter(t=>t.id!==id);}
export function money(amount,unit){return unit==='INR'?'₹'+Number(amount).toLocaleString('en-IN',{maximumFractionDigits:2}):Number(amount).toLocaleString('en-IN')+' pts';}
export function workbookRows(s){const c=stats(s);const headers=['Player ID','Player name','Role','Category','Age','City','Status','Team','Sold amount','Unit','Auction order','Completed at','Final round'];const playerRow=p=>[p.id,p.name,p.role,p.category,p.age,p.city,p.status,s.teams.find(t=>t.id===p.teamId)?.name??'',p.amount??'',s.unit==='INR'?'INR':'Points',p.sequence??'',p.timestamp??'',p.round??''];return [
  {name:'Player Results',rows:[headers,...s.players.map(playerRow)]},
  {name:'Team Allocations',rows:[['Team','Player ID','Player name','Role','Sold amount','Unit'],...s.players.filter(p=>p.status==='Sold').map(p=>[s.teams.find(t=>t.id===p.teamId)?.name??'',p.id,p.name,p.role,p.amount,s.unit==='INR'?'INR':'Points'])]},
  {name:'Unsold Players',rows:[headers,...s.players.filter(p=>p.status==='Unsold').map(playerRow)]},
  {name:'Summary',rows:[['Metric','Value'],['Event',s.eventName],['Season',s.season],['Unit',s.unit==='INR'?'INR':'Points'],['Total players',c.total],['Sold',c.sold],['Unsold',c.unsold],['Pending',c.pending+c.current],['Total sold amount',c.totalAmount],['Rounds completed',s.round??1],...s.teams.flatMap(t=>{const b=teamStats(s,t.id);return [[t.name+' — players',b.count],[t.name+' — starting budget',b.budget],[t.name+' — spent',b.spent],[t.name+' — remaining',b.remaining]];})]},
  {name:'Auction History',rows:[['Order','Round','Player ID','Player name','Outcome','Team','Amount','Unit','Completed at','Action'],...s.history.map(h=>[h.sequence,h.round??1,h.playerId,s.players.find(p=>p.id===h.playerId)?.name??h.playerId,h.status,s.teams.find(t=>t.id===h.teamId)?.name??'',h.amount??'',s.unit==='INR'?'INR':'Points',h.timestamp,h.action||'Auction'])]}
];}
