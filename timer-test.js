const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const port=37924;
const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port),DATABASE_URL:'',DATA_FILE:'/tmp/yut33-'+process.pid+'.json'}});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function conn(){return new Promise((resolve,reject)=>{const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws');const incoming=[];const waiters=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(waiters.length)waiters.shift()(m);else incoming.push(m)};ws.onopen=()=>resolve({ws,send:x=>ws.send(JSON.stringify(x)),next:()=>incoming.length?Promise.resolve(incoming.shift()):new Promise(r=>waiters.push(r))});ws.onerror=reject;});}
async function nextType(c,type){for(let i=0;i<15;i++){const m=await c.next();if(m.type===type)return m;}throw Error('not found '+type);}
(async()=>{try{
 let ok=false;for(let i=0;i<90;i++){try{ok=(await fetch('http://127.0.0.1:'+port+'/health')).ok;}catch{}if(ok)break;await sleep(40);}assert(ok,output);
 const a=await conn(),b=await conn();a.send({type:'hello',session:'host-test'});b.send({type:'hello',session:'guest-test'});await nextType(a,'hello');await nextType(b,'hello');
 a.send({type:'create',mode:'individual',playerCount:2,stake:0});let s=await nextType(a,'state');const room=s.room;
 b.send({type:'join',room});await nextType(b,'state');await nextType(a,'state');
 assert.deepEqual(s.balances,[null,null]);
 a.send({type:'leave'});assert.equal((await nextType(a,'left')).type,'left');assert.equal((await nextType(b,'left')).type,'left');
 a.send({type:'create',mode:'individual',playerCount:2,stake:0});s=await nextType(a,'state');b.send({type:'join',room:s.room});await nextType(b,'state');await nextType(a,'state');
 a.send({type:'ready',value:true});await nextType(a,'state');await nextType(b,'state');b.send({type:'ready',value:true});await nextType(a,'state');await nextType(b,'state');
 a.send({type:'start'});s=await nextType(a,'state');await nextType(b,'state');assert(s.deadline>Date.now());assert(s.deadline<=Date.now()+21000);
 await sleep(20700);
 s=await nextType(a,'state');assert.equal(s.game.turn,1);assert.match(s.game.history[0],/제한시간 초과/);assert(s.deadline>Date.now());
 a.ws.close();b.ws.close();console.log('PASS: lobby host exit, peer exit, 20-sec server timer, automatic turn advance');
 }catch(e){console.error('FAIL',e,output);process.exitCode=1;}finally{child.kill();}})();
