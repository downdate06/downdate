const {spawn}=require('child_process');
const assert=require('assert/strict');
const fs=require('fs');
const port=37923;
const file='/tmp/yut29-accounts-'+process.pid+'.json';
const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port),DATA_FILE:file}});
let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
function delay(t){return new Promise(r=>setTimeout(r,t));}
function inbox(url){return new Promise((resolve,reject)=>{const ws=new WebSocket(url);const q=[];const pending=[];ws.onmessage=e=>{const obj=JSON.parse(e.data);if(pending.length)pending.shift()(obj);else q.push(obj);};ws.onerror=reject;ws.onopen=()=>resolve({ws,send:o=>ws.send(JSON.stringify(o)),next:()=>q.length?Promise.resolve(q.shift()):new Promise(r=>pending.push(r))});});}
async function wait(t,msg){const until=Date.now()+t;while(Date.now()<until){const s=await msg();if(s)return s;await delay(60);}throw Error('timeout '+output);}
(async()=>{try{
 await wait(5000,async()=>{try{return (await fetch('http://localhost:'+port+'/health')).ok;}catch{return false;}});
 async function signup(name){const response=await fetch('http://localhost:'+port+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,password:'longpassword123'})});const payload=await response.json();assert.equal(response.status,200,JSON.stringify(payload));return payload.token;}
 const t1=await signup('ptest'+process.pid+'a'),t2=await signup('ptest'+process.pid+'b');
 const a=await inbox('ws://localhost:'+port+'/ws'),b=await inbox('ws://localhost:'+port+'/ws');
 a.send({type:'hello',session:'sessiona',token:t1});b.send({type:'hello',session:'sessionb',token:t2});
 assert.equal((await a.next()).type,'hello');assert.equal((await b.next()).type,'hello');
 a.send({type:'create',mode:'team',playerCount:4,stake:0});const teamError=await a.next();assert.equal(teamError.type,'error');assert.match(teamError.message,/팀전.*개발 중/);
 a.send({type:'create',mode:'individual',playerCount:2,stake:1000});let s=await a.next();assert.equal(s.type,'state');assert.equal(s.started,false);const room=s.room;
 b.send({type:'join',room});s=await b.next();assert.equal(s.started,false);assert.equal(s.account.balance,1000);s=await a.next();assert.equal(s.account.balance,1000);
 a.send({type:'start'});assert.match((await a.next()).message,/준비/);
 a.send({type:'ready',value:true});await a.next();await b.next();
 b.send({type:'ready',value:true});await a.next();s=await b.next();assert.deepEqual(s.ready,[true,true]);
 a.send({type:'start'});s=await a.next();assert.equal(s.type,'state');assert.equal(s.started,true);assert.equal(s.account.balance,0);s=await b.next();assert.equal(s.account.balance,0);
 a.send({type:'start'});assert.match((await a.next()).message,/이미/);
 a.send({type:'roll',power:45});s=await a.next();assert.equal(s.type,'state');assert(s.game.revealAt>Date.now());await b.next();
 a.send({type:'roll',power:45});assert.match((await a.next()).message,/멈춘 뒤/);
 a.send({type:'leave'});assert.equal((await a.next()).type,'left');
 a.ws.close();b.ws.close();console.log('PASS: 2인 입장, 준비, 방장 시작, 1회 차감, 시작 중복 방지, 투척 결과 대기, 나가기');
 }catch(e){console.error('FAIL:',e);process.exitCode=1;}finally{child.kill();try{fs.unlinkSync(file)}catch{}}})();
