(()=>{'use strict';
const $=id=>document.getElementById(id);
window.yutThrowSettled=payload=>{const roll=state.game?.roll;if(!roll||roll.id!==payload.id)return;state.visualSettledId=state.room+':'+roll.id;const label=$('roll-result');if(label)label.textContent=roll.label+'!';const faces=$('face-result');if(faces)faces.classList.remove('throwing');render();};
const initialInvite=new URLSearchParams(location.search).get('room');
const state={ws:null,game:null,player:null,room:null,moves:[],selected:null,selectedRollId:null,phase:0,raf:null,session:localStorage.getItem('yut-session')||('yut-'+(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2))),reconnectTimer:null,manualLeave:false,deadline:null,turnSeconds:20,autoMove:false,host:0,missions:null,economy:null,serverOffset:0,balances:[],started:false,readyFlags:[],account:null,token:localStorage.getItem('yut-token'),charging:false,chargeStart:0,chargePower:0,sound:localStorage.getItem('yut-muted')!=='1'};
localStorage.setItem('yut-session',state.session);
const positions={30:[510,510],21:[435,135],22:[360,210],23:[285,285],24:[210,360],25:[135,435],26:[135,135],27:[210,210],28:[360,360],29:[435,435]};
for(let i=1;i<=5;i++)positions[i]=[510,510-90*i];
for(let i=6;i<=10;i++)positions[i]=[510-90*(i-5),60];
for(let i=11;i<=15;i++)positions[i]=[60,60+90*(i-10)];
for(let i=16;i<=19;i++)positions[i]=[60+90*(i-15),510];
const routes=[[30,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,30],[5,21,22,23,24,25,15],[10,26,27,23,28,29,30]];
function board(){const svg=$('board-svg');svg.innerHTML='';const NS='http://www.w3.org/2000/svg';const add=(tag,attrs,text)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.appendChild(n);return n;};
 add('rect',{x:24,y:24,width:522,height:522,rx:13,fill:'#f7f0e1',stroke:'#e9dcc7','stroke-width':2});add('rect',{x:40,y:40,width:490,height:490,rx:5,fill:'#fcf8ef',stroke:'#f2e8d7'});
 for(const route of routes)for(let i=0;i<route.length-1;i++){const a=positions[route[i]],b=positions[route[i+1]];add('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'board-line'});}
 for(const [key,pos] of Object.entries(positions)){const num=Number(key);add('circle',{cx:pos[0],cy:pos[1],r:[30,5,10,15,23].includes(num)?23:16,class:'board-node'+([30,5,10,15,23].includes(num)?' special':'')});}
 add('text',{x:285,y:286,class:'center-symbol'},'✣');add('text',{x:510,y:552,'text-anchor':'middle',class:'board-label'},'도착칸');add('text',{x:48,y:28,class:'board-label'},'YUTNORI');
}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function connStatus(online){$('connection').classList.toggle('online',online);$('connection').innerHTML='<i></i> '+(online?'서버 연결됨':'연결 중...');}
function startSocket(){if(state.ws&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(state.ws.readyState))return;const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');state.ws=ws;connStatus(false);ws.onopen=()=>{connStatus(true);send({type:'hello',session:state.session,room:state.manualLeave?null:state.room,name:$('name').value,token:state.token});};ws.onmessage=e=>{let msg;try{msg=JSON.parse(e.data);}catch{return;}if(msg.type==='state'){const oldTurn=state.game?.turn,oldRoom=state.room,oldMoveNo=state.game?.moveNo,oldWinner=state.game?.winner;state.room=msg.room;state.player=msg.player;state.game=msg.game;state.moves=msg.moves||[];state.started=!!msg.started;state.readyFlags=msg.ready||[];state.balances=msg.balances||[];state.deadline=msg.deadline||null;state.turnSeconds=msg.turnSeconds||20;state.autoMove=!!msg.autoMove;state.missions=msg.missions||null;state.economy=msg.economy||null;state.host=msg.host??0;state.serverOffset=Number(msg.serverNow||Date.now())-Date.now();if(oldWinner!==null&&oldWinner!==undefined&&msg.game.winner===null){state.lastThrowId=null;state.visualSettledId=null;}if(msg.account)state.account=msg.account; if(oldRoom!==msg.room||oldTurn!==msg.game.turn||oldMoveNo!==msg.game.moveNo){state.selected=null;}if(!msg.game.pending.some(r=>r.id===state.selectedRollId))state.selectedRollId=null;renderTargets();updateAccount();localStorage.setItem('yut-room',msg.room);$('lobby').classList.add('hidden');$('game').classList.remove('hidden');render();}else if(msg.type==='left'){finishLeaving();if(msg.message)toast(msg.message);}else if(msg.type==='hello'){if(msg.account){state.account=msg.account;updateAccount();}}else if(msg.type==='error')toast(msg.message);};ws.onclose=()=>{connStatus(false);if(!state.manualLeave){clearTimeout(state.reconnectTimer);state.reconnectTimer=setTimeout(startSocket,1800);}};ws.onerror=()=>{};}
function send(msg){if(state.ws?.readyState===WebSocket.OPEN)state.ws.send(JSON.stringify(msg));else toast('서버에 연결 중입니다. 다시 시도해 주세요.');}
function ready(){const g=state.game;return !!(g&&g.players.every(p=>p.name&&p.connected));}
function myTurn(){return state.started&&ready()&&state.game.turn===state.player&&state.game.winner===null&&!(state.game.revealAt&&Date.now()<state.game.revealAt);}
const COLORS=['blue','red','green','violet'];
const SIDE_COLORS=['blue','red','blue','red'];
function render(){const g=state.game;if(!g)return;
 $('room-code').textContent=state.room;
 $('mode-caption').textContent=g.mode==='team'?'4인 팀전 · 청팀(1·3번) 대 홍팀(2·4번)':g.playerCount+'인 개인전 · 먼저 말 4개 완주';
 $('board-note').textContent='모퉁이는 자동 지름길 · 도착칸에 선 뒤 다음 결과로 완주';
 const root=$('players');root.innerHTML='';
 for(let i=0;i<g.players.length;i++){
  const fin=g.pieces[i].filter(p=>p.pos==='FIN').length;
  const active=state.started&&g.turn===i&&g.winner===null&&ready();
  const won=g.winner!==null&&(g.mode==='team'?g.winner===i%2:g.winner===i);
  const status=!g.players[i].name?'입장 대기':!g.players[i].connected?'연결 끊김':!state.started?(state.readyFlags[i]?'준비 완료':'준비 전'):won?'승리':g.winner!==null?'경기 종료':active?'진행 중':'대기 중';
  const card=document.createElement('div');card.className='player-card player-'+(g.mode==='team'?SIDE_COLORS[i]:COLORS[i]);
  const heading=document.createElement('div');heading.className='player-heading';
  const dot=document.createElement('span');dot.className='team-dot '+(g.mode==='team'?SIDE_COLORS[i]:COLORS[i]);heading.appendChild(dot);
  const nm=document.createElement('b');nm.textContent=(i+1)+'P '+(g.players[i].name||'입장 대기')+(state.player===i?' (나)':'')+(state.host===i?' 👑 방장':'')+(g.mode==='team'?' · '+(i%2===0?'청팀':'홍팀'):'');heading.appendChild(nm);
  const st=document.createElement('span');st.className='player-status'+(active?' active':'');st.textContent=status;heading.appendChild(st);card.appendChild(heading);
  const balance=state.balances[i];const money=document.createElement('div');money.className='player-money';money.textContent=balance==null?'🪙 비회원 · 잔액 비공개':'🪙 '+Number(balance).toLocaleString('ko-KR')+' 머니';card.appendChild(money);
  const meta=document.createElement('div');meta.className='player-meta';meta.innerHTML='<span>완주한 말</span><strong>'+fin+' <small>/ 4</small></strong>';card.appendChild(meta);
  const bar=document.createElement('div');bar.className='progress';const fill=document.createElement('div');fill.style.width=fin*25+'%';fill.style.background='var(--'+(g.mode==='team'?SIDE_COLORS[i]:COLORS[i])+')';bar.appendChild(fill);card.appendChild(bar);
  const home=document.createElement('div');home.className='home-pieces';
  for(let j=0;j<4;j++){const p=g.pieces[i][j];const selectable=i===state.player&&state.moves.some(m=>m.piece===j)&&p.pos===-1;
   const btn=document.createElement('button');btn.className='home-piece'+(p.pos==='FIN'?' finished':'')+(selectable?' selectable':'');btn.innerHTML=(p.pos==='FIN'?'✓':p.pos===-1?'●':'◉')+' <b>'+(j+1)+'</b>';btn.disabled=!selectable;btn.addEventListener('click',()=>choosePiece(j));home.appendChild(btn);}
  card.appendChild(home);root.appendChild(card);
 }
 const me=myTurn();const waiting=!ready();const animating=!!(g.roll&&state.visualSettledId!==state.room+':'+g.roll.id);let title,desc;
 const readiness=state.readyFlags.filter(Boolean).length;
 $('ready-panel').classList.toggle('hidden',state.started);
 $('turn-timer').classList.toggle('hidden',!state.started||g.winner!==null);
 $('leave-waiting').classList.toggle('hidden',state.started);
 $('ready-heading').textContent=readiness+' / '+g.playerCount+'명 준비 완료';
 $('ready-detail').textContent='모든 참가자가 준비하면 현재 방장이 시작할 수 있습니다. 방장이 나가면 먼저 들어온 참가자에게 위임됩니다.';
 $('ready-toggle').textContent=state.readyFlags[state.player]?'준비 취소':'준비하기';
 $('ready-toggle').disabled=state.started||!g.players[state.player]?.connected;
 $('host-start').classList.toggle('hidden',state.player!==state.host);
 $('host-start').disabled=state.started||waiting||readiness!==g.playerCount;
 if(g.winner!==null){title='경기가 종료되었습니다';desc='다시 한 판 또는 나가기를 선택할 수 있습니다.';}
 else if(!state.started){title='게임 시작 대기';desc='모든 참가자가 준비하면 방장이 게임을 시작합니다.';}
 else if(animating){title='윷이 구르는 중…';desc='윷 4개가 완전히 멈추면 결과를 공개합니다.';}
 else if(waiting){title=g.playerCount+'명 입장 대기';desc=g.players.filter(p=>p.name&&p.connected).length+' / '+g.playerCount+'명 접속 · 친구에게 방 코드를 알려주세요.';}
 else if(!me){title='상대방 차례';desc=g.players[g.turn].name+' 님이 플레이하고 있습니다.';}
 else if(g.phase==='roll'){title=g.pending.length?'윷·모 추가 던지기!':'윷을 던질 차례!';desc='버튼을 누른 채 파워를 충전하고 손을 떼면 던집니다.';}
 else{title='말을 선택해 이동하세요 · 결과 '+g.pending.length+'개';desc=state.selected===null?'기존 말 또는 대기 중인 새 말을 먼저 선택하세요.':'게임판에 표시된 결과별 도착 칸을 직접 누르세요. 다른 말을 다시 선택할 수도 있습니다.';}
 $('action-title').textContent=title;$('action-description').textContent=desc;
 $('turn-hint').textContent=!state.started?'준비 대기':g.winner!==null?'경기 종료':waiting?g.playerCount+'명을 기다리는 중...':g.players[g.turn].name+' 차례';
 $('throw').disabled=!(me&&g.phase==='roll');$('throw').textContent=me&&g.phase==='roll'?'누르고 있다가 놓아 던지기 ↗':'윷 던지기';
 $('roll-result').textContent=g.roll?(state.visualSettledId===state.room+':'+g.roll.id?g.roll.label+'!':'굴러가는 중…'):g.winner!==null?'종료':!state.started?'시작 대기':me?'준비!':'대기';
 $('roll-result').style.color=g.roll?.bonus?'#e29a22':'#be8b2e';
 const faceView=$('face-result');if(faceView){faceView.innerHTML='';faceView.classList.toggle('throwing',!!(g.roll&&state.visualSettledId!==state.room+':'+g.roll.id));if(g.roll){if(state.visualSettledId!==state.room+':'+g.roll.id){const progress=document.createElement('strong');progress.textContent='윷이 착지하는 중…';faceView.appendChild(progress);}else{const note=document.createElement('strong');const facesInfo=window.YutThrowLogic.facesFor(g.roll);const front=facesInfo.front;const back=facesInfo.back;note.textContent=g.roll.nak?'낙 · 판 밖에 윷이 떨어짐 · 무효':`착지 판정 · ${g.roll.label} · 앞면 ${front} / 뒷면 ${4-front}`+(g.roll.backdo?' · 빽도 표시 윷 1개':'');faceView.appendChild(note);if(!g.roll.nak){const faces=document.createElement('div');faces.className='face-dice';for(const [i,f] of facesInfo.faces.entries()){const x=document.createElement('span');x.className='face-die '+(f.bit?'flat':'round');x.textContent=(f.special?'★':'')+f.name;if(f.special)x.classList.add('special-stick');x.title=(i+1)+'번째 윷 · '+(f.bit?'뒷면(평평한 면)':'앞면(둥근 면)');faces.appendChild(x);}faceView.appendChild(faces);}}}}
 if(g.roll && (state.room+':'+g.roll.id) !== state.lastThrowId){state.lastThrowId=state.room+':'+g.roll.id;window.__latestYutThrow={result:g.roll,power:g.lastPower};window.yut3d?.toss?.(g.roll,g.lastPower);setTimeout(()=>{if(state.room+':'+state.game?.roll?.id===state.lastThrowId&&state.visualSettledId!==state.lastThrowId){state.visualSettledId=state.lastThrowId;const out=$('roll-result');if(out)out.textContent=state.game.roll.label+'!';render();}},Number(g.roll.durationMs||5500)+90);}
 const history=$('history');history.innerHTML='';const historyHidden=g.roll&&state.visualSettledId!==state.room+':'+g.roll.id;for(const h of historyHidden?['윷이 구르는 중 · 착지 후 결과 공개']:g.history.length?g.history:['첫 번째 윷을 던져보세요.']){const p=document.createElement('p');p.textContent=h;history.appendChild(p);}
 renderTokens();renderPending();renderTargets();renderMatchExtras();$('win-modal').classList.toggle('hidden',g.winner===null);
 if(g.winner!==null){if(!state.winSoundFor||state.winSoundFor!==state.room+':'+g.moveNo){playSound('win');state.winSoundFor=state.room+':'+g.moveNo;}const winner=g.winner==='aborted'?'경기 취소':g.mode==='team'?(g.winner===0?'청팀':'홍팀'):g.players[g.winner].name;$('win-title').textContent=g.winner==='aborted'?'경기 취소 · 예치금 환불':winner+' 승리!';$('win-subtitle').textContent=g.winner==='aborted'?'참가비와 벌금 예치금 전액을 환불했습니다.':(g.mode==='team'?'승리 팀의 말 8개가 모두 완주했습니다.':'말 4개를 먼저 완주했습니다.')+(state.economy?.payouts?' · 내 정산 지급 '+Number(state.economy.payouts[state.player]||0).toLocaleString('ko-KR')+'머니':'');}
}
function renderMatchExtras(){const m=state.missions,e=state.economy;const money=$('match-money'),missions=$('mission-panel');if(!money||!missions)return;
 money.classList.toggle('hidden',!state.started||!e||!e.stake);missions.classList.toggle('hidden',!state.started||!m);
 if(e&&e.stake){const sum=state.game.playerCount*e.stake;money.innerHTML='<h3>🪙 상금 · 벌금 현황</h3><div class="economy-row"><span>승리 기본 상금</span><b>'+Math.round(sum*.9).toLocaleString('ko-KR')+'</b></div><div class="economy-row"><span>미션 상금 풀</span><b>'+Math.floor(sum*.1).toLocaleString('ko-KR')+'</b></div><div class="economy-row"><span>누적 벌금 풀</span><b>'+Number(e.finePot||0).toLocaleString('ko-KR')+'</b></div><div class="economy-row"><span>내 남은 벌금 예치금</span><b>'+Math.max(0,e.stake-(e.fineSpent?.[state.player]||0)).toLocaleString('ko-KR')+'</b></div>'+(e.payouts?'<div class="economy-row"><span>내 최종 정산 지급</span><b>'+Number(e.payouts[state.player]||0).toLocaleString('ko-KR')+'</b></div>':'');}
 if(m){missions.innerHTML='';const title=document.createElement('h3');title.textContent='🎯 경기 미션';missions.appendChild(title);const scores=document.createElement('div');scores.className='economy-row';scores.innerHTML='<span>내 미션 점수</span><b>'+(m.scores?.[state.player]||0)+'점</b>';missions.appendChild(scores);
 const add=(label,arr,secret)=>{const head=document.createElement('div');head.className='mission-subhead';head.textContent=label;missions.appendChild(head);for(const item of arr){const div=document.createElement('div');div.className='mission-entry'+((secret?item.done:item.winner!==null)?' done':'');const top=document.createElement('div');top.className='mission-row';const strong=document.createElement('strong');strong.textContent=item.title;const point=document.createElement('b');point.className='mission-badge';point.textContent=item.points+'점';top.append(strong,point);const detail=document.createElement('p');detail.textContent=item.description+(secret?(item.done?' · 완료':''):(item.winner!==null?' · '+(state.game.players[item.winner]?.name||'완료')+' 달성':''));div.append(top,detail);missions.appendChild(div);}};add('공통 미션 · 선착순',m.common||[],false);add('내 비밀 미션',m.secret||[],true);}
}
function renderTokens(){const g=state.game;const root=$('board-tokens');root.innerHTML='';const occupied=new Map();
 for(let player=0;player<g.players.length;player++)for(let i=0;i<4;i++){const pos=g.pieces[player][i].pos;if(pos===-1||pos==='FIN')continue;const key=player+':'+pos;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push(i);}
 const atPosition={};for(const key of occupied.keys()){const pos=key.split(':')[1];(atPosition[pos]??=[]).push(key);}
 for(const [key,ids] of occupied){const [playerRaw,posRaw]=key.split(':');const player=Number(playerRaw),pos=Number(posRaw),point=positions[pos];if(!point)continue;
  const el=document.createElement('button');el.className='token '+(g.mode==='team'?SIDE_COLORS[player]:COLORS[player]);
  const others=atPosition[pos];const offset=others.indexOf(key),size=others.length;
  const dx=size>1?((offset%2)*2-1)*15:0,dy=size>2?(Math.floor(offset/2)*2-1)*15:0;
  const selected=player===state.player&&state.moves.some(m=>ids.includes(m.piece));if(selected)el.classList.add('selectable');
  el.style.left=((point[0]+dx)/570*100)+'%';el.style.top=((point[1]+dy)/570*100)+'%';
  el.textContent=(player+1)+'P';el.title=g.players[player].name+' 말 '+(ids[0]+1);
  if(ids.length>1){const sup=document.createElement('sup');sup.textContent='×'+ids.length;el.appendChild(sup);}
  if(selected)el.addEventListener('click',()=>choosePiece(ids.find(i=>state.moves.some(m=>m.piece===i))));else el.disabled=true;root.appendChild(el);
 }
}
function closeRouteModal(){renderTargets();}
function choosePiece(index){
 const options=state.moves.filter(m=>m.piece===index);
 if(!options.length)return;
 state.selected=state.selected===index?null:index;
 playSound('select');renderPending();renderTargets();
 if(state.selected!==null)document.getElementById('board').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderPending(){
 const root=$('pending-rolls');root.innerHTML='';const g=state.game;if(!g)return;
 if(g.roll&&state.visualSettledId!==state.room+':'+g.roll.id){$('pending-help').textContent='윷이 완전히 멈추면 누적 결과를 공개합니다.';$('selection-status').textContent='투척 중 · 결과를 기다려 주세요.';return;}
 const help=$('pending-help');
 if(help)help.textContent=g.pending.length?'원하는 말을 먼저 누르세요. 게임판에 모든 가능한 이동이 나타납니다.':'던진 결과가 여기에 쌓입니다.';
 for(const r of g.pending){
  const el=document.createElement('span');el.className='pending-pill pending-info';
  el.textContent=r.label+' · '+(r.steps>0?r.steps+'칸':r.steps<0?'뒤로 1칸':'무효');
  el.title='말을 먼저 선택하면 이 결과로 갈 수 있는 칸이 표시됩니다.';
  root.appendChild(el);
 }
 const cancel=$('cancel-piece');if(cancel)cancel.classList.toggle('hidden',state.selected===null||g.phase!=='move');
 const label=$('selection-status');if(label){
  label.textContent=g.phase!=='move'?'윷 던지기가 끝나면 이동할 말을 먼저 선택하세요.':state.selected===null?'① 내 말 선택 → ② 맵에 표시되는 윷 결과별 도착 칸 터치':`✓ ${state.selected+1}번 말 선택 · 원하는 도착 칸과 결과를 터치하세요`;
 }
}
function renderTargets(){
 const root=$('board-targets');if(!root)return;root.innerHTML='';
 const preview=$('board-preview');if(preview)preview.innerHTML='';
 if(!state.game||state.selected===null||!myTurn()||state.game.phase!=='move')return;
 const options=state.moves.filter(m=>m.piece===state.selected);
 const grouped=new Map();
 const shownPaths=new Set();
 const routeNodes={outer:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,30],cut5:[1,2,3,4,5,21,22,23,24,25,15,16,17,18,19,30],cut10:[1,2,3,4,5,6,7,8,9,10,26,27,23,28,29,30],cut5fast:[1,2,3,4,5,21,22,23,28,29,30],cut10long:[1,2,3,4,5,6,7,8,9,10,26,27,23,24,25,15,16,17,18,19,30]};
 const selectedPiece=state.game.pieces[state.player][state.selected];
 for(const option of options){
  const previewKey=[option.route,option.to,option.steps,selectedPiece.pos].join(':');
  if(preview&&!shownPaths.has(previewKey)){
   shownPaths.add(previewKey);
   const nodes=routeNodes[option.route]||routeNodes.outer;
   const start=selectedPiece.pos===-1?-1:nodes.indexOf(selectedPiece.pos);
   const traveled=selectedPiece.pos===-1?[30]:[selectedPiece.pos];
   if(option.steps>0){for(let i=start+1;i<=Math.min(start+option.steps,nodes.length-1);i++)traveled.push(nodes[i]);}
   else if(option.steps<0){traveled.push(option.to===30?30:option.to);}
   if(option.to==='FIN')traveled.push(30);
   if(traveled.length>1){const path=document.createElementNS('http://www.w3.org/2000/svg','polyline');path.setAttribute('points',traveled.filter(n=>positions[n]).map(n=>positions[n].join(',')).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',['#2a70e0','#d77c25','#2b9368','#9154cb','#b33b50'][option.rollIndex%5]);path.setAttribute('stroke-width','5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-opacity','.48');path.setAttribute('stroke-dasharray','9 9');preview.appendChild(path);}
  }
  const key=String(option.to==='FIN'?30:option.to);
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(option);
 }
 for(const [key,group] of grouped){
  const point=positions[Number(key)];if(!point)continue;
  const cluster=document.createElement('div');cluster.className='target-cluster';
  cluster.style.left=(point[0]/570*100)+'%';cluster.style.top=(point[1]/570*100)+'%';
  for(const option of group){
   const destination=option.to;
   const enemies=destination==='FIN'?0:state.game.pieces.reduce((count,ps,owner)=>count+(owner===state.player||(state.game.mode==='team'&&owner%2===state.player%2)?0:ps.filter(p=>p.pos===destination).length),0);
   const allies=destination==='FIN'?0:state.game.pieces[state.player].filter(p=>p.pos===destination).length;
   const kind=destination==='FIN'?'완주':enemies?'잡기':allies?'업기':destination===30?'도착':'이동';
   const target=document.createElement('button');target.type='button';target.className='board-target target-choice'+(enemies?' capture':'')+(destination==='FIN'?' finish':'')+(allies?' stack':'');
   const direction=option.steps===-1&&selectedPiece.pos===23?(option.to===27?'왼쪽 위':'오른쪽 위'):'';
   target.innerHTML='<strong>'+option.label+'</strong><small>'+(direction||kind)+'</small>';
   if(direction)target.classList.add('backdo-direction');
   target.title=option.label+' · '+(direction||kind)+(enemies&&option.steps<4?' · 잡은 뒤 추가 던지기':'');
   target.setAttribute('aria-label',option.label+' '+(direction||kind)+' 이동');
   target.addEventListener('click',()=>{
    playSound(enemies?'capture':'move');
    send({type:'move',piece:state.selected,rollIndex:option.rollIndex,route:option.route,to:option.to});
    state.selected=null;root.innerHTML='';
   });
   cluster.appendChild(target);
  }
  root.appendChild(cluster);
 }
}
let lastFrame=0;
function animateGauge(t){
 const timer=$('turn-timer');if(timer&&!timer.classList.contains('hidden')){const remaining=Math.max(0,(state.deadline-Date.now()-state.serverOffset)/1000);$('timer-count').textContent=Math.ceil(remaining)+'초';$('timer-bar').style.width=Math.max(0,Math.min(100,remaining/state.turnSeconds*100))+'%';timer.classList.toggle('urgent',remaining<=5);$('timer-hint').textContent=state.autoMove?'자동 투척 후 10초 내에 이동하지 않으면 턴 종료':state.game?.phase==='roll'?'20초 내에 던지지 않으면 자동으로 던집니다.':'시간 초과 시 가능한 이동 하나를 자동 실행합니다.';}
if(t-lastFrame>25){lastFrame=t;const value=state.charging?window.YutThrowLogic.powerAt(t-state.chargeStart):0;state.chargePower=value;$('gauge-value').style.width=value+'%';$('gauge-value').classList.toggle('charged',value>=90);}state.raf=requestAnimationFrame(animateGauge);}
let audioContext;
function playSound(type){if(!state.sound)return;try{
 audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();
 const now=audioContext.currentTime;
 const count=type==='roll'?5:type==='capture'?4:type==='win'?7:type==='nak'?3:1;
 for(let j=0;j<count;j++){
 const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=now+j*(type==='roll'?.065:.09);
 osc.type=type==='roll'||type==='capture'?'triangle':'sine';osc.frequency.setValueAtTime((type==='roll'?170:type==='capture'?390:type==='nak'?110:type==='win'?480:280)+j*(type==='win'?90:28),t);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(type==='roll'?.19:.11,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.15);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.16);
 }
 }catch{}}
function beginCharge(e){if(!myTurn()||state.game.phase!=='roll'||state.charging)return;if(e?.cancelable)e.preventDefault();state.charging=true;state.chargeStart=performance.now();$('throw').classList.add('charging');try{if(e?.pointerId!=null)$('throw').setPointerCapture(e.pointerId);}catch{}playSound('select');}
function endCharge(e){if(!state.charging)return;if(e?.cancelable)e.preventDefault();state.chargePower=Math.round(window.YutThrowLogic.powerAt(performance.now()-state.chargeStart));state.charging=false;$('throw').classList.remove('charging');if(!myTurn()||state.game.phase!=='roll')return;send({type:'roll',power:Math.round(state.chargePower)});playSound('roll');}
$('cancel-piece')?.addEventListener('click',()=>{state.selected=null;renderPending();renderTargets();playSound('select');});
$('throw').addEventListener('pointerdown',beginCharge);$('throw').addEventListener('pointerup',endCharge);$('throw').addEventListener('pointercancel',()=>{state.charging=false;$('throw').classList.remove('charging');});
$('throw').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat)beginCharge(e);});$('throw').addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')endCharge(e);});
$('mode').addEventListener('change',()=>{if($('mode').value==='team'){$('mode').value='individual';toast('팀전은 개발 중입니다. 개인전을 이용해 주세요.');}$('player-count').disabled=false;});
$('create').addEventListener('click',()=>{if(state.ws?.readyState!==WebSocket.OPEN)return toast('서버 연결을 확인해 주세요.');state.manualLeave=false;send({type:'create',name:$('name').value,mode:$('mode').value,playerCount:Number($('player-count').value),stake:Number($('stake').value)});});
$('join').addEventListener('click',()=>{const room=$('room-input').value.trim().toUpperCase();if(room.length!==6)return toast('6자리 방 코드를 입력하세요.');state.manualLeave=false;send({type:'join',room,name:$('name').value});});$('room-input').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click();});

$('copy-room').addEventListener('click',()=>{const invite=location.origin+'/?room='+encodeURIComponent(state.room);if(navigator.clipboard?.writeText){navigator.clipboard.writeText(invite).then(()=>toast('초대 링크를 복사했습니다.')).catch(()=>toast('방 코드: '+state.room));}else toast('방 코드: '+state.room);});
async function authRequest(route,data,method='POST'){
 const res=await fetch('/api/'+route,{method,headers:{'Content-Type':'application/json',...(state.token?{'Authorization':'Bearer '+state.token}:{})},body:method==='GET'?undefined:JSON.stringify(data||{})});const json=await res.json();if(!res.ok)throw Error(json.error||'요청 실패');return json;
}
function updateAccount(){const a=state.account;$('auth-form').classList.toggle('hidden',!!a);$('account-view').classList.toggle('hidden',!a);$('wallet-mini').textContent=a?'🪙 '+a.balance.toLocaleString('ko-KR')+' 머니':'';if(a){$('account-name').textContent='👤 '+a.name;$('account-balance').textContent='🪙 '+a.balance.toLocaleString('ko-KR')+' 머니';$('account-record').textContent='승리 '+a.wins+' · 패배 '+a.losses;$('name').value=a.name;$('name').disabled=true;$('refill').disabled=a.balance>=2000;}else $('name').disabled=false;}
async function doAuth(route){try{const json=await authRequest(route,{name:$('login-id').value.trim(),password:$('login-pass').value});state.token=json.token;localStorage.setItem('yut-token',json.token);if($('remember-id').checked){localStorage.setItem('yut-remember-id',$('login-id').value.trim());}else{localStorage.removeItem('yut-remember-id');}state.account=json.account;updateAccount();toast(route==='login'?'로그인 성공!':'가입 완료! 10,000 게임머니가 지급됐습니다.');state.ws?.close();}catch(e){toast(e.message);}}
const savedLoginId=localStorage.getItem('yut-remember-id');
if(savedLoginId){$('login-id').value=savedLoginId;$('remember-id').checked=true;}
$('remember-id').addEventListener('change',()=>{if(!$('remember-id').checked)localStorage.removeItem('yut-remember-id');});
$('toggle-password').addEventListener('click',()=>{const showing=$('login-pass').type==='password';$('login-pass').type=showing?'text':'password';$('toggle-password').textContent=showing?'숨기기':'보기';$('toggle-password').setAttribute('aria-label',showing?'비밀번호 숨기기':'비밀번호 보기');$('toggle-password').setAttribute('aria-pressed',String(showing));});
fetch('/health',{cache:'no-store'}).then(r=>r.json()).then(x=>{const hint=$('storage-hint');if(x.accountsPersistent){hint.textContent='✓ 회원정보·게임머니 영구 저장 데이터베이스 연결됨';hint.classList.add('ready');}else{hint.textContent='⚠ 현재는 임시 저장 중입니다. 서버 업데이트 시 회원정보가 초기화될 수 있습니다. Render에 DATABASE_URL을 연결하세요.';}}).catch(()=>{});
$('login').addEventListener('click',()=>doAuth('login'));
$('register').addEventListener('click',()=>doAuth('register'));
$('logout').addEventListener('click',()=>{state.token=null;state.account=null;localStorage.removeItem('yut-token');updateAccount();state.ws?.close();});
$('refill').addEventListener('click',async()=>{try{const r=await authRequest('refill');state.account=r.account;updateAccount();toast('게임머니 잔액을 2,000머니로 보충했습니다.');}catch(e){toast(e.message);}});
$('sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;localStorage.setItem('yut-muted',state.sound?'0':'1');$('sound-toggle').textContent=state.sound?'🔊 소리 켜짐':'🔇 소리 꺼짐';if(state.sound)playSound('select');});
if(state.token)authRequest('me',null,'GET').then(r=>{state.account=r.account;updateAccount();}).catch(()=>{state.token=null;localStorage.removeItem('yut-token');updateAccount();});
$('ready-toggle').addEventListener('click',()=>send({type:'ready',value:!state.readyFlags[state.player]}));
$('host-start').addEventListener('click',()=>send({type:'start'}));
$('rematch').addEventListener('click',()=>send({type:'rematch'}));
$('leave-end').addEventListener('click',()=>send({type:'leave'}));
function finishLeaving(){state.manualLeave=true;state.room=null;state.player=null;state.game=null;state.moves=[];localStorage.removeItem('yut-room');$('game').classList.add('hidden');$('win-modal').classList.add('hidden');$('lobby').classList.remove('hidden');state.ws?.close();setTimeout(()=>{state.manualLeave=false;startSocket();},150);}
$('leave').addEventListener('click',()=>send({type:'leave'}));
$('leave-waiting').addEventListener('click',()=>send({type:'leave'}));
if(initialInvite&&/^[A-Z0-9]{6}$/i.test(initialInvite)){$('room-input').value=initialInvite.toUpperCase();toast('초대받은 방 코드가 입력되었습니다. 이름을 확인한 뒤 입장하세요.');}board();startSocket();state.raf=requestAnimationFrame(animateGauge);window.addEventListener('beforeunload',()=>cancelAnimationFrame(state.raf));
})();
