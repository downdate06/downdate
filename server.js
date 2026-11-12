const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {createGame,movesFor,roll,move,teamOf}=require('./game');
const auth=require('./auth');
const {CATALOG,selectMissions,record,publicView}=require('./missions');
const economyRules=require('./economy');
const {afterMove}=require('./turn-clock');
const PORT=Number(process.env.PORT)||3000,HOST=process.env.HOST||'0.0.0.0';
const PUBLIC=path.join(__dirname,'public'),rooms=new Map(),clients=new Set();
const TURN_MS=Number(process.env.YUT_TURN_MS)||20000, AUTO_MOVE_MS=Number(process.env.YUT_AUTO_MOVE_MS)||10000;
const throwPhysics = import('./throw-physics.mjs');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
function response(res,code,payload){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}
async function body(req){let txt='';for await(const chunk of req){txt+=chunk;if(txt.length>8192)throw Error('요청이 너무 큽니다.');}return JSON.parse(txt||'{}');}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
 if(pathname==='/health')return response(res,200,{ok:true,rooms:rooms.size,accountsPersistent:auth.isPersistent()});
 if(pathname==='/api/rules')return response(res,200,{stakes:[0,1000,5000,10000],entryMultiplier:2,missionShare:.1,missions:CATALOG});
 if(pathname==='/api/mission-stats')return response(res,200,{stats:await auth.missionStats()});
 if(pathname.startsWith('/api/')){
  if(req.method==='POST'&&pathname==='/api/register')return response(res,200,await auth.register(...((x)=>[x.name,x.password])(await body(req))));
  if(req.method==='POST'&&pathname==='/api/login')return response(res,200,await auth.login(...((x)=>[x.name,x.password])(await body(req))));
  const a=auth.byToken(req.headers.authorization?.replace(/^Bearer /i,''));
  if(!a)return response(res,401,{error:'로그인해 주세요.'});
  if(req.method==='GET'&&pathname==='/api/me')return response(res,200,{account:auth.safe(a)});
  if(req.method==='POST'&&pathname==='/api/refill')return response(res,200,{account:await auth.refill(a.id)});
  return response(res,404,{error:'요청을 찾을 수 없습니다.'});
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return response(res,405,{error:'지원하지 않는 요청입니다.'});
 const filename=path.resolve(PUBLIC,'.'+pathname.replace(/\/$/,'/index.html'));
 if(!filename.startsWith(PUBLIC+path.sep))return response(res,403,{error:'금지된 경로입니다.'});
 fs.readFile(filename,(err,data)=>{if(err)return response(res,404,{error:'파일을 찾을 수 없습니다.'});res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?'':data);});
 }catch(e){response(res,400,{error:e.message});}});
function frame(data,opcode=1){const buf=Buffer.isBuffer(data)?data:Buffer.from(data);const n=buf.length;let head;if(n<126){head=Buffer.alloc(2);head[1]=n;}else if(n<65536){head=Buffer.alloc(4);head[1]=126;head.writeUInt16BE(n,2);}else{head=Buffer.alloc(10);head[1]=127;head.writeBigUInt64BE(BigInt(n),2);}head[0]=0x80|opcode;return Buffer.concat([head,buf]);}
function send(c,obj){if(!c.socket.destroyed)try{c.socket.write(frame(JSON.stringify(obj)));}catch{}}
function stateFor(r,c){return {type:'state',room:r.code,player:c.player,game:r.game,moves:c.player===null?[]:movesFor(r.game,c.player),stake:r.stake,started:r.started,ready:r.ready,host:r.host??0,autoMove:r.autoMove||false,account:auth.safe(auth.get(c.accountId)),balances:r.accountIds.map(id=>id?auth.get(id)?.balance??null:null),deadline:r.deadline||null,serverNow:Date.now(),turnSeconds:(r.autoMove?AUTO_MOVE_MS:TURN_MS)/1000,turnBudget:TURN_MS/1000,animationUntil:r.game.revealAt||null,missions:publicView(r.missions,c.player),economy:r.economy?{stake:r.stake,entryCost:r.economy.entryCost,finePot:r.economy.finePot,fineSpent:r.economy.fineSpent,events:r.economy.events,payouts:r.economy.payouts}:null};}
function broadcast(r){for(const c of clients)if(c.room===r.code)send(c,stateFor(r,c));}
function error(c,msg){send(c,{type:'error',message:msg});}
function cleanName(x){return String(x||'플레이어').trim().slice(0,12)||'플레이어';}
function code(){let c;do{c=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(c));return c;}
function countReady(r){return r.game.players.every(p=>p.name&&p.connected);}
function allReady(r){return countReady(r)&&r.ready.every(Boolean);}
async function startIfReady(r){
 if(r.started)throw Error('이미 게임이 시작됐습니다.');
 if(r.starting)throw Error('게임 시작을 처리하는 중입니다.');
 if(!allReady(r))throw Error('모든 참가자가 준비해야 시작할 수 있습니다.');
 r.starting=true;
 try{
  const missionStats=await auth.missionStats();
  const chosenMissions=selectMissions(r.game.playerCount,crypto.randomBytes(4).readUInt32BE(0),missionStats);
  if(r.stake){
   const ids=r.accountIds;
   if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw Error('게임머니 대전은 모두 서로 다른 계정이 필요합니다.');
   await auth.lockMatch(r.matchId,ids,r.stake);
  }
  chosenMissions.matchId=r.matchId;r.missions=chosenMissions;
  r.economy=economyRules.initEconomy(r.game.playerCount,r.stake);
  r.turnSerial=0;
  r.started=true;
  r.deadline=Date.now()+TURN_MS;r.autoMove=false;
  r.game.history.unshift(r.stake?`참가자 전원 준비 · ${(r.stake*2).toLocaleString('ko-KR')} 머니씩 참가비+예치금 차감 · 게임 시작!`:'참가자 전원 준비 · 게임 시작!');
 }finally{r.starting=false;}
}

function missionEvent(r,p,event){if(!r.missions)return;const hits=record(r.missions,r.game,p,event);for(const h of hits)if(h.kind==='common')r.game.history.unshift(`${r.game.players[h.player].name} · 공통 미션 달성: ${require('./missions').CATALOG_MAP.get(h.id).title}`);r.game.history=r.game.history.slice(0,14);}
async function finishRound(r){if(!r.economy||r.settled||r.settling||r.game.winner===null)return;r.settling=true;try{if(r.stake){const payout=economyRules.settle(r.economy,r.missions.scores,r.game.winner);await auth.finishMatch(r.matchId,r.accountIds,r.stake,payout,r.game.winner);}r.settled=true;void auth.recordMissionStats(r.missions);}finally{r.settling=false;}}
function registerMove(r,player,info){const g=r.game;const counter=r.missions?.counters[player];const event={kind:'move',piece:info.choice.piece,steps:info.choice.steps,route:info.choice.route,branch:info.choice.branch,to:info.choice.to,source:info.source,moved:info.moved,stackSize:g.pieces[player].filter(x=>x.pos===info.choice.to).length,captured:info.captured,victims:info.victims,turn:r.turnSerial,capturedBefore:counter?.hasCapturePiece.includes(info.choice.piece)||false,caughtBefore:counter?.caughtPieces.includes(info.choice.piece)||false};
 missionEvent(r,player,event);
 for(const victim of info.victims){missionEvent(r,victim.player,{kind:'caught',caught:1,pieces:[victim.piece],by:player,turn:r.turnSerial});}
 if(info.captured){const fines=economyRules.captured(r.economy,player,info.victims,r.turnSerial);for(const f of fines)if(f.paid)g.history.unshift(`${g.players[f.player].name} · ${f.number}개 잡힘 / 벌금 ${f.paid.toLocaleString('ko-KR')}머니 · 벌금 풀 적립`);}
 if(event.to==='FIN')for(let i=0;i<g.playerCount;i++)if(i!==player)missionEvent(r,i,{kind:'enemy_finished',turn:r.turnSerial});
 if(g.winner!==null)missionEvent(r,player,{kind:'win',turn:r.turnSerial});
 g.history=g.history.slice(0,14);
}
async function handle(c,msg){if(!msg||typeof msg!=='object')return;
 try{
 if(msg.type==='create'){
  const mode=msg.mode||'individual',n=Number(msg.playerCount??4),stake=Number(msg.stake||0);
  if(mode==='team')throw Error('팀전은 현재 개발 중입니다. 개인전을 선택해 주세요.');
  if(![0,1000,5000,10000].includes(stake))throw Error('잘못된 게임머니 설정입니다.');
  if(stake&&!c.accountId)throw Error('가상 머니 대전은 로그인이 필요합니다.');
  if(stake&&auth.get(c.accountId)?.balance<economyRules.entryCost(stake))throw Error('참가비와 벌금 예치금 합계 '+economyRules.entryCost(stake).toLocaleString('ko-KR')+' 머니가 필요합니다.');
  const id=code(),g=createGame(mode,n);g.players[0].name=c.accountId?auth.get(c.accountId).name:cleanName(msg.name);g.players[0].connected=true;
  const r={code:id,game:g,owners:Array.from({length:n},(_,i)=>i===0?c.session:null),accountIds:Array.from({length:n},(_,i)=>i===0?c.accountId:null),stake,started:false,starting:false,ready:Array(n).fill(false),settled:false,deadline:null,host:0,joinOrder:Array.from({length:n},(_,i)=>i===0?1:null),nextJoinOrder:2,autoMove:false,updated:Date.now(),round:1,matchId:id+'-1',missions:null,economy:null,turnSerial:0};rooms.set(id,r);c.room=id;c.player=0;broadcast(r);return;
 }
 if(msg.type==='join'){
  const id=String(msg.room||'').trim().toUpperCase(),r=rooms.get(id);if(!r)throw Error('방을 찾을 수 없습니다. 방 코드를 확인해 주세요.');
  if(r.stake&&!c.accountId)throw Error('게임머니 방은 로그인 후 입장할 수 있습니다.');
  if(r.stake&&auth.get(c.accountId)?.balance<economyRules.entryCost(r.stake))throw Error('이 방의 참가비와 벌금 예치금을 합한 게임머니가 부족합니다.');
  let slot=r.owners.indexOf(c.session);if(slot===-1){if(r.started)throw Error('이미 진행 중인 게임입니다.');slot=r.owners.indexOf(null);if(slot===-1)throw Error('이 방은 정원이 '+r.game.playerCount+'명입니다.');if(c.accountId&&r.accountIds.includes(c.accountId))throw Error('동일 계정으로 중복 입장할 수 없습니다.');r.owners[slot]=c.session;r.joinOrder[slot]=r.nextJoinOrder++;r.accountIds[slot]=c.accountId;r.game.players[slot].name=c.accountId?auth.get(c.accountId).name:cleanName(msg.name);r.ready[slot]=false;}
  c.room=id;c.player=slot;r.game.players[slot].connected=true;r.updated=Date.now();
  broadcast(r);return;
 }
 const r=rooms.get(c.room);if(!r||c.player===null||r.owners[c.player]!==c.session)throw Error('먼저 게임방에 입장해 주세요.');
 if(msg.type==='ready'){
  if(r.started)throw Error('이미 시작된 경기입니다.');
  r.ready[c.player]=Boolean(msg.value);
  broadcast(r);return;
 }
 if(msg.type==='start'){
  if(c.player!==r.host)throw Error('방장만 시작할 수 있습니다.');
  await startIfReady(r);broadcast(r);return;
 }
 if(msg.type==='leave'){
  const leaving=c.player,wasHost=leaving===r.host;
  // Preserve a running match's slot, but hand the host privileges to the
  // earliest joined remaining participant. Waiting rooms free the slot.
  if(!r.started){r.owners[leaving]=null;r.joinOrder[leaving]=null;r.accountIds[leaving]=null;r.ready[leaving]=false;r.game.players[leaving]={name:'',connected:false};}
  else{r.game.players[leaving].connected=false;r.joinOrder[leaving]=null;
   if(r.game.winner===null){
    if(r.game.playerCount===2){const winner=1-leaving;r.game.winner=winner;r.game.phase='ended';r.game.pending=[];r.deadline=null;missionEvent(r,winner,{kind:'win',turn:r.turnSerial});await finishRound(r);r.game.history.unshift('상대 퇴장 · 남은 플레이어의 승리로 경기 종료');}
    else {if(r.stake&&!r.settled)await auth.abortMatch(r.matchId,r.accountIds,r.stake);r.settled=true;r.economy.payouts=Array(r.game.playerCount).fill(r.stake*2);r.game.winner='aborted';r.game.phase='ended';r.game.pending=[];r.deadline=null;r.game.history.unshift('플레이어 퇴장 · 경기 취소 / 참가비와 벌금 예치금 전액 환불');}
   }
  }
  c.room=null;c.player=null;
  if(wasHost){
   const occupied=r.joinOrder.map((order,i)=>({order,i})).filter(x=>x.order!==null&&x.i!==leaving).sort((a,b)=>a.order-b.order);
   if(occupied.length)r.host=occupied[0].i;
   else if(!r.started)rooms.delete(r.code);
  }
  if(!r.started&&r.owners.every(x=>!x))rooms.delete(r.code);
  else{if(wasHost)r.game.history.unshift('방장이 퇴장하여 가장 먼저 입장한 참가자에게 방장이 위임되었습니다.');broadcast(r);}
  send(c,{type:'left'});return;
 }
 if(!r.started)throw Error('모든 참가자가 준비한 뒤 방장이 시작해야 합니다.');
 if(!countReady(r))throw Error('모든 참가자가 연결될 때까지 기다려 주세요.');
 if(Date.now()<(r.game.revealAt||0))throw Error('윷이 완전히 멈춘 뒤 움직일 수 있습니다.');
 if(r.deadline&&Date.now()>r.deadline)throw Error('제한시간이 끝났습니다.');
 if(msg.type==='roll'){
  if(r.rolling)throw Error('이미 윷을 던지는 중입니다.');
  if(r.game.turn!==c.player||!(r.game.phase==='roll'||(r.game.phase==='move'&&r.game.captureThrows>0)))throw Error('지금은 윷을 던질 수 없습니다.');
  r.rolling=true;
  try{
   await applyThrow(r,c.player,Number(msg.power)||0,false);
  }finally{r.rolling=false;}
 }
 else if(msg.type==='move'){
  const priorTurn=r.game.turn;const info=move(r.game,c.player,Number(msg.piece),String(msg.route),Number(msg.rollIndex),msg.to);
  registerMove(r,c.player,info);if(r.game.turn!==priorTurn)r.turnSerial++;
  afterMove(r,priorTurn,info.captured,Date.now(),TURN_MS); // Only a capture or new turn restores 20 seconds.
  if(r.game.winner!==null)await finishRound(r);broadcast(r);
 }else if(msg.type==='rematch'){
  if(r.game.winner===null)throw Error('경기가 끝나야 재경기할 수 있습니다.');if(!r.settled)throw Error('게임머니 정산을 마칠 때까지 다시 시작할 수 없습니다.');const old=r.game;r.game=createGame(old.mode,old.playerCount);r.game.players=old.players.map(p=>({...p}));r.started=false;r.starting=false;r.ready=Array(old.playerCount).fill(false);r.settled=false;r.deadline=null;r.autoMove=false;r.round++;r.matchId=r.code+'-'+r.round;r.missions=null;r.economy=null;broadcast(r);
 }else throw Error('알 수 없는 요청입니다.');r.updated=Date.now();
 }catch(e){error(c,e.message||'요청 처리 실패');}}
server.on('upgrade',(req,socket)=>{
 if(new URL(req.url,'http://localhost').pathname!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){socket.destroy();return;}
 const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 const c={socket,buffer:Buffer.alloc(0),room:null,player:null,session:null,accountId:null};clients.add(c);
 socket.on('data',chunk=>{c.buffer=Buffer.concat([c.buffer,chunk]);if(c.buffer.length>65536){socket.destroy();return;}
 while(c.buffer.length>=2){let n=c.buffer[1]&127,off=2;const op=c.buffer[0]&15,masked=!!(c.buffer[1]&128);if(!(c.buffer[0]&128)){socket.destroy();return;}if(n===126){if(c.buffer.length<4)break;n=c.buffer.readUInt16BE(2);off=4;}else if(n===127){if(c.buffer.length<10)break;const big=c.buffer.readBigUInt64BE(2);if(big>BigInt(65536)){socket.destroy();return;}n=Number(big);off=10;}
 if(!masked){socket.destroy();return;}if(c.buffer.length<off+4+n)break;const mask=c.buffer.subarray(off,off+4);off+=4;const payload=Buffer.from(c.buffer.subarray(off,off+n));c.buffer=c.buffer.subarray(off+n);for(let i=0;i<n;i++)payload[i]^=mask[i%4];
 if(op===8){socket.end(frame('',8));return;}if(op===9){socket.write(frame(payload,10));continue;}if(op!==1)continue;
 try{const msg=JSON.parse(payload.toString('utf8'));if(msg.type==='hello'){
  c.session=String(msg.session||'').replace(/[^a-zA-Z0-9-]/g,'').slice(0,80);if(!c.session)throw Error('연결 정보 오류');
  c.accountId=auth.byToken(msg.token)?.id||null;send(c,{type:'hello',ok:true,account:auth.safe(auth.get(c.accountId))});if(msg.room)void handle(c,{type:'join',room:msg.room,name:msg.name});
 }else if(c.session)void handle(c,msg);}catch(e){error(c,e.message||'메시지 오류');}
 }
 });
 function disconnect(){clients.delete(c);if(!c.room)return;const r=rooms.get(c.room);if(!r)return;const other=Array.from(clients).some(o=>o.room===c.room&&o.player===c.player&&o.session===c.session);if(!other&&c.player!==null){r.game.players[c.player].connected=false;if(!r.started)r.ready[c.player]=false;}broadcast(r);}
 socket.on('close',disconnect);socket.on('error',()=>{});
});
async function applyThrow(r,p,power,automatic){
 const physics=await throwPhysics;
 const simulation=physics.simulateThrow(power);
 const oldTurn=r.game.turn;const outcome=roll(r.game,p,power,simulation.bits,simulation.nak);
 missionEvent(r,p,{kind:'throw',label:outcome.label,nak:outcome.nak,turn:r.turnSerial});if(oldTurn!==r.game.turn)r.turnSerial++;
 outcome.trajectory=simulation.frames;
 outcome.durationMs=simulation.durationMs;
 outcome.physics=simulation.physics;
 const revealStart=Date.now();
 r.game.revealAt=revealStart+simulation.durationMs;
 // Pause the shared action budget during the non-interactive 3D playback.
 // Do not reset the timer on additional throws, captures, or piece moves.
 if(automatic){
  r.autoMove=r.game.phase==='move'&&r.game.turn===p;
  r.deadline=r.game.revealAt+(r.autoMove?AUTO_MOVE_MS:TURN_MS);
 }else if(r.game.turn!==oldTurn){
  r.autoMove=false;r.deadline=r.game.revealAt+TURN_MS;
 }else if(r.deadline){
  r.deadline+=simulation.durationMs;
 }else{r.deadline=r.game.revealAt+TURN_MS;}
 if(automatic)r.game.history.unshift(`${r.game.players[p].name} · 시간 초과로 윷 자동 투척 (${outcome.label})`);
 broadcast(r);
 return outcome;
}
const processingTimeout=new Set();
async function expireTurn(r){
 if(!r.started||r.game.winner!==null||!r.deadline||Date.now()<r.deadline||Date.now()<(r.game.revealAt||0)||processingTimeout.has(r.code))return;
 processingTimeout.add(r.code);
 try{
  const g=r.game,p=g.turn;
  if(g.phase==='roll'){
   if(r.rolling)return;
   r.rolling=true;
   try{await applyThrow(r,p,45,true);}finally{r.rolling=false;}
   // applyThrow already established a new deadline after the animation.
   r.updated=Date.now();return;
  }else if(g.phase==='move'){
   if(r.autoMove){
    g.history.unshift(`${g.players[p].name} · 자동 투척 후 10초 경과 · 미이동으로 턴 종료`);
   }else{
    const options=movesFor(g,p);
    if(options.length){
     const choice=options[0];const info=move(g,p,choice.piece,choice.route,choice.rollIndex,choice.to);
     registerMove(r,p,info);
     g.history.unshift(`${g.players[p].name} · 20초 소진 · 자동 이동 (${choice.label})`);
    }else g.history.unshift(`${g.players[p].name} · 20초 소진 · 이동 가능한 말 없음`);
   }
   if(g.winner===null){
    // A spent turn cannot be extended by a capture, remaining roll, or auto move.
    g.pending=[];g.captureThrows=0;g.captureRollReady=false;g.phase='roll';
    g.turn=(p+1)%g.playerCount;r.turnSerial++;
   }else await finishRound(r);
   r.autoMove=false;r.deadline=g.winner===null?Date.now()+TURN_MS:null;
  }
  g.history=g.history.slice(0,14);r.updated=Date.now();broadcast(r);
 }catch(e){console.error('Turn timeout:',e);}finally{processingTimeout.delete(r.code);}
}
setInterval(()=>{for(const r of rooms.values())void expireTurn(r);},200).unref();
setInterval(()=>{for(const r of rooms.values())if(r.game.winner!==null&&r.game.winner!=='aborted'&&r.started&&!r.settled)void finishRound(r).then(()=>broadcast(r)).catch(err=>console.error('Settlement retry:',err));},2000).unref();
setInterval(()=>{const now=Date.now();for(const [id,r]of rooms)if(now-r.updated>24*60*60*1000)rooms.delete(id);},60*60*1000).unref();
auth.init().then(()=>server.listen(PORT,HOST,()=>console.log(`윷놀이 서버: http://localhost:${PORT}`))).catch(e=>{console.error('DB initialization failed:',e);process.exit(1);});
