const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {CATALOG,selectMissions,record,publicView,splitPool}=require('./missions');
const {entryCost,initEconomy,captured,settle}=require('./economy');
const {optionsFor,createGame}=require('./game');
(async()=>{
 assert.equal(CATALOG.length,40);assert.equal(new Set(CATALOG.map(m=>m.id)).size,40);
 for(const n of [2,3,4]){
  const m=selectMissions(n,12345);assert.equal(m.common.length,3);assert.equal(m.secret.length,n);assert(m.secret.every(arr=>arr.length===2));
  const public0=publicView(m,0),public1=publicView(m,1);assert.deepEqual(public0.secret.map(x=>x.id),m.secret[0]);assert.deepEqual(public1.secret.map(x=>x.id),m.secret[1]);
  for(const id of [...m.common,...m.secret.flat()])assert(CATALOG.find(x=>x.id===id).minimum<=n);
  const e=initEconomy(n,1000);const fines=captured(e,0,[{player:1,piece:0},{player:1,piece:1}],0);assert.equal(fines[0].nominal,200);assert.equal(fines[0].paid,200);const pay=settle(e,Array(n).fill(0),0);assert.equal(pay.reduce((a,b)=>a+b,0),n*2000);
  const free=initEconomy(n,0);assert.deepEqual(settle(free,Array(n).fill(0),0),Array(n).fill(0));
 }
 assert.deepEqual(optionsFor({pos:23,route:'cut5'},-1).map(x=>x.to),[27,22]);
 assert.deepEqual(optionsFor({pos:15,route:'outer'},-1).map(x=>x.to),[14,25]);
 assert.deepEqual(optionsFor({pos:30,route:'outer'},-1).map(x=>x.to),[19,29]);
 assert.equal(entryCost(1000),2000);assert.equal(entryCost(5000),10000);assert.equal(entryCost(10000),20000);
 assert.throws(()=>entryCost(-1));
 const e=initEconomy(2,1000);for(let turn=0;turn<6;turn++)captured(e,0,[{player:1,piece:0},{player:1,piece:1},{player:1,piece:2},{player:1,piece:3}],turn);assert.equal(e.fineSpent[1],1000);assert.equal(e.finePot,1000);
 const all=settle(e,[0,0],0);assert.deepEqual(all,[4000,0]);
 const a=splitPool(100,[3,2,0],0);assert.deepEqual(a,[60,40,0]);assert.equal(splitPool(100,[0,0,0],1)[1],100);
 const m=selectMissions(2,1313);m.common=['double_yut','capture_twice','stack_three'];m.secret=[['double_yut','back_mo'],['all_results','back_capture']];
 const game=createGame('individual',2);const events1=record(m,game,0,{kind:'throw',label:'윷',nak:false});assert.equal(events1.length,0);const events2=record(m,game,0,{kind:'throw',label:'윷',nak:false});assert(events2.some(x=>x.id==='double_yut'));assert.equal(m.completedCommon.double_yut,0);assert(publicView(m,1).events.some(x=>x.kind==='secret'&&x.player===0&&x.title));
 const file=path.join(os.tmpdir(),'yut-v42-unit-'+process.pid+'.json');process.env.DATA_FILE=file;process.env.DATABASE_URL='';const auth=require('./auth');try{
 await auth.init();const a=await auth.register('tester'+process.pid+'A','longpassword123');const b=await auth.register('tester'+process.pid+'B','longpassword123');assert.equal(a.account.balance,10000);await auth.lockMatch('match-testing',[a.account.id,b.account.id],1000);assert.equal(auth.get(a.account.id).balance,8000);assert.equal(auth.get(b.account.id).balance,8000);await auth.finishMatch('match-testing',[a.account.id,b.account.id],1000,[1000,3000],1);assert.equal(auth.get(a.account.id).balance,9000);assert.equal(auth.get(b.account.id).balance,11000);const c=await auth.refill(a.account.id).catch(e=>e.message);assert.match(c,/2,000/);
 await auth.lockMatch('match-refund',[a.account.id,b.account.id],1000);await auth.abortMatch('match-refund',[a.account.id,b.account.id],1000);assert.equal(auth.get(a.account.id).balance,9000);assert.equal(auth.get(b.account.id).balance,11000);
 }finally{try{fs.unlinkSync(file)}catch{}}
 console.log('PASS 40 missions / player-size eligibility / private mission pre-completion / public completion / all branch backdos / fines and conservation / recharge rules / local account escrow-settlement-refund');
})().catch(e=>{console.error(e);process.exitCode=1;});
