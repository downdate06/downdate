const {spawn}=require('node:child_process');
const {strict:assert}=require('node:assert');
const {optionsFor}=require('./game');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(){
 const left=optionsFor({pos:23,route:'cut5'},-1);
 assert.deepEqual(left.map(x=>[x.to,x.direction]),[[27,'왼쪽 위'],[22,'오른쪽 위']]);
 const port=39000+Math.floor(Math.random()*1000);
 const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port),DATABASE_URL:'',YUT_TURN_MS:'500',YUT_AUTO_MOVE_MS:'500'}});
 let logs='';child.stderr.on('data',d=>logs+=d);child.stdout.on('data',d=>logs+=d);
 const sessions=[];
 try {
  let started=false;for(let i=0;i<100;i++){try{const r=await fetch(`http://localhost:${port}/health`);if(r.ok){started=true;break;}}catch{}await sleep(50)}
  assert(started,logs);
  const connect=async(id)=>{
   const ws=new WebSocket(`ws://localhost:${port}/ws`);const messages=[];const waiting=[];
   ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(waiting.length)waiting.shift()(m);else messages.push(m)});
   await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
   const c={ws,send:o=>ws.send(JSON.stringify(o)),next:()=>messages.length?Promise.resolve(messages.shift()):new Promise(resolve=>waiting.push(resolve))};
   c.send({type:'hello',session:id});await until(c,'hello');sessions.push(c);return c;
  };
  const until=async(c,t)=>{for(let i=0;i<100;i++){const m=await Promise.race([c.next(),sleep(9000).then(()=>{throw Error('timeout '+t)})]);if(m.type===t)return m;}throw Error('missing '+t)};
  let a=await connect('A'),b=await connect('B'),c=await connect('C');
  a.send({type:'create',mode:'individual',playerCount:3,stake:0});const room=(await until(a,'state')).room;
  b.send({type:'join',room});await until(b,'state');await until(a,'state');
  c.send({type:'join',room});await until(c,'state');await until(a,'state');await until(b,'state');
  a.send({type:'leave'});await until(a,'left');
  const bState=await until(b,'state'),cState=await until(c,'state');
  assert.equal(bState.host,1);assert.equal(cState.host,1);
  b.send({type:'ready',value:true});await until(b,'state');await until(c,'state');
  c.send({type:'ready',value:true});await until(b,'state');await until(c,'state');
  const d=await connect('D');d.send({type:'join',room});await until(d,'state');await until(b,'state');await until(c,'state');
  d.send({type:'ready',value:true});await until(d,'state');await until(b,'state');await until(c,'state');
  b.send({type:'start'});let state=await until(b,'state');assert(state.started,logs);
  // The first 500ms of inactivity must automatically throw, never just pass the turn.
  const auto=await until(b,'state');
  assert(auto.game.throwNo>=1,JSON.stringify(auto.game.history));
  assert(auto.game.roll,logs);
  assert.match(auto.game.history.join(' '),/자동 투척/);
  if(auto.autoMove){assert.equal(auto.turnSeconds,.5);assert.equal(auto.game.phase,'move');assert.equal(auto.deadline-auto.game.revealAt,500);}
  console.log('PASS center backdo 2 directions, earliest host handoff, new host start, timeout auto throw, movement grace');
 }finally{for(const c of sessions)c.ws.close();child.kill();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
