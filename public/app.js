(()=>{'use strict';
const $=id=>document.getElementById(id);
const initialInvite=new URLSearchParams(location.search).get('room');
const state={ws:null,game:null,player:null,room:null,moves:[],selected:null,phase:0,raf:null,session:localStorage.getItem('yut-session')||('yut-'+(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2))),reconnectTimer:null,manualLeave:false,account:null,token:localStorage.getItem('yut-token'),charging:false,chargeStart:0,chargePower:0,sound:localStorage.getItem('yut-muted')!=='1'};
localStorage.setItem('yut-session',state.session);
const positions={0:[510,510],21:[435,135],22:[360,210],23:[285,285],24:[210,360],25:[135,435],26:[135,135],27:[210,210],28:[360,360],29:[435,435]};
for(let i=1;i<=5;i++)positions[i]=[510,510-90*i];
for(let i=6;i<=10;i++)positions[i]=[510-90*(i-5),60];
for(let i=11;i<=15;i++)positions[i]=[60,60+90*(i-10)];
for(let i=16;i<=19;i++)positions[i]=[60+90*(i-15),510];
const routes=[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,0],[5,21,22,23,24,25,15],[10,26,27,23,28,29,0]];
function board(){const svg=$('board-svg');svg.innerHTML='';const NS='http://www.w3.org/2000/svg';const add=(tag,attrs,text)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.appendChild(n);return n;};
 add('rect',{x:24,y:24,width:522,height:522,rx:13,fill:'#f7f0e1',stroke:'#e9dcc7','stroke-width':2});add('rect',{x:40,y:40,width:490,height:490,rx:5,fill:'#fcf8ef',stroke:'#f2e8d7'});
 for(const route of routes)for(let i=0;i<route.length-1;i++){const a=positions[route[i]],b=positions[route[i+1]];add('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'board-line'});}
 for(const [key,pos] of Object.entries(positions)){const num=Number(key);add('circle',{cx:pos[0],cy:pos[1],r:[0,5,10,15,23].includes(num)?23:16,class:'board-node'+([0,5,10,15,23].includes(num)?' special':'')});}
 add('text',{x:285,y:286,class:'center-symbol'},'✣');add('text',{x:510,y:552,'text-anchor':'middle',class:'board-label'},'출발 / 도착');add('text',{x:48,y:28,class:'board-label'},'YUTNORI');
}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function connStatus(online){$('connection').classList.toggle('online',online);$('connection').innerHTML='<i></i> '+(online?'서버 연결됨':'연결 중...');}
function startSocket(){if(state.ws&&[WebSocket.CONNECTING,WebSocket.OPEN].includes(state.ws.readyState))return;const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');state.ws=ws;connStatus(false);ws.onopen=()=>{connStatus(true);send({type:'hello',session:state.session,room:state.manualLeave?null:state.room,name:$('name').value,token:state.token});};ws.onmessage=e=>{let msg;try{msg=JSON.parse(e.data);}catch{return;}if(msg.type==='state'){state.room=msg.room;state.player=msg.player;state.game=msg.game;state.moves=msg.moves||[];if(msg.account)state.account=msg.account;state.selected=null;closeRouteModal();updateAccount();localStorage.setItem('yut-room',msg.room);$('lobby').classList.add('hidden');$('game').classList.remove('hidden');render();}else if(msg.type==='hello'){if(msg.account){state.account=msg.account;updateAccount();}}else if(msg.type==='error')toast(msg.message);};ws.onclose=()=>{connStatus(false);if(!state.manualLeave){clearTimeout(state.reconnectTimer);state.reconnectTimer=setTimeout(startSocket,1800);}};ws.onerror=()=>{};}
function send(msg){if(state.ws?.readyState===WebSocket.OPEN)state.ws.send(JSON.stringify(msg));else toast('서버에 연결 중입니다. 다시 시도해 주세요.');}
function ready(){const g=state.game;return !!(g&&g.players.every(p=>p.name&&p.connected));}
function myTurn(){return ready()&&state.game.turn===state.player&&state.game.winner===null;}
const COLORS=['blue','red','green','violet'];
const SIDE_COLORS=['blue','red','blue','red'];
function render(){const g=state.game;if(!g)return;
 $('room-code').textContent=state.room;
 $('mode-caption').textContent=g.mode==='team'?'4인 팀전 · 청팀(1·3번) 대 홍팀(2·4번)':g.playerCount+'인 개인전 · 먼저 말 4개 완주';
 const root=$('players');root.innerHTML='';
 for(let i=0;i<g.players.length;i++){
  const fin=g.pieces[i].filter(p=>p.pos==='FIN').length;
  const active=g.turn===i&&g.winner===null&&ready();
  const won=g.winner!==null&&(g.mode==='team'?g.winner===i%2:g.winner===i);
  const status=!g.players[i].name?'입장 대기':!g.players[i].connected?'연결 끊김':won?'승리':g.winner!==null?'경기 종료':active?'진행 중':'대기 중';
  const card=document.createElement('div');card.className='player-card player-'+(g.mode==='team'?SIDE_COLORS[i]:COLORS[i]);
  const heading=document.createElement('div');heading.className='player-heading';
  const dot=document.createElement('span');dot.className='team-dot '+(g.mode==='team'?SIDE_COLORS[i]:COLORS[i]);heading.appendChild(dot);
  const nm=document.createElement('b');nm.textContent=(i+1)+'P '+(g.players[i].name||'입장 대기')+(state.player===i?' (나)':'')+(g.mode==='team'?' · '+(i%2===0?'청팀':'홍팀'):'');heading.appendChild(nm);
  const st=document.createElement('span');st.className='player-status'+(active?' active':'');st.textContent=status;heading.appendChild(st);card.appendChild(heading);
  const meta=document.createElement('div');meta.className='player-meta';meta.innerHTML='<span>완주한 말</span><strong>'+fin+' <small>/ 4</small></strong>';card.appendChild(meta);
  const bar=document.createElement('div');bar.className='progress';const fill=document.createElement('div');fill.style.width=fin*25+'%';fill.style.background='var(--'+(g.mode==='team'?SIDE_COLORS[i]:COLORS[i])+')';bar.appendChild(fill);card.appendChild(bar);
  const home=document.createElement('div');home.className='home-pieces';
  for(let j=0;j<4;j++){const p=g.pieces[i][j];const selectable=i===state.player&&state.moves.some(m=>m.piece===j)&&p.pos===-1;
   const btn=document.createElement('button');btn.className='home-piece'+(p.pos==='FIN'?' finished':'')+(selectable?' selectable':'');btn.innerHTML=(p.pos==='FIN'?'✓':p.pos===-1?'●':'◉')+' <b>'+(j+1)+'</b>';btn.disabled=!selectable;btn.addEventListener('click',()=>choosePiece(j));home.appendChild(btn);}
  card.appendChild(home);root.appendChild(card);
 }
 const me=myTurn();const waiting=!ready();let title,desc;
 if(g.winner!==null){title='경기가 종료되었습니다';desc='다시 한 판으로 새로운 경기를 시작할 수 있습니다.';}
 else if(waiting){title=g.playerCount+'명 입장 대기';desc=g.players.filter(p=>p.name&&p.connected).length+' / '+g.playerCount+'명 접속 · 친구에게 방 코드를 알려주세요.';}
 else if(!me){title='상대방 차례';desc=g.players[g.turn].name+' 님이 플레이하고 있습니다.';}
 else if(g.phase==='roll'){title=g.pending.length?'윷·모 추가 던지기!':'윷을 던질 차례!';desc='버튼을 누른 채 파워를 충전하고 손을 떼면 던집니다.';}
 else{title='말을 선택하세요';desc='쌓인 '+g.pending.length+'개의 결과 중 하나를 골라 이동하세요.';}
 $('action-title').textContent=title;$('action-description').textContent=desc;
 $('turn-hint').textContent=g.winner!==null?'경기 종료':waiting?g.playerCount+'명을 기다리는 중...':g.players[g.turn].name+' 차례';
 $('throw').disabled=!(me&&g.phase==='roll');$('throw').textContent=me&&g.phase==='roll'?'누르고 있다가 놓아 던지기 ↗':'윷 던지기';
 $('roll-result').textContent=g.roll?g.roll.label+'!':g.winner!==null?'종료':me?'준비!':'대기';
 $('roll-result').style.color=g.roll?.bonus?'#e29a22':'#be8b2e';
 const sticks=$('yut-sticks').children;for(let i=0;i<4;i++){sticks[i].classList.toggle('back',!!g.roll&&g.roll.bits[i]===1);sticks[i].querySelector('i').textContent=!g.roll?'윷':g.roll.bits[i]?'●':'윷';}
 const history=$('history');history.innerHTML='';for(const h of g.history.length?g.history:['첫 번째 윷을 던져보세요.']){const p=document.createElement('p');p.textContent=h;history.appendChild(p);}
 renderTokens();renderChoices();renderPending();$('win-modal').classList.toggle('hidden',g.winner===null);
 if(g.winner!==null){if(!state.winSoundFor||state.winSoundFor!==state.room+':'+g.moveNo){playSound('win');state.winSoundFor=state.room+':'+g.moveNo;}const winner=g.mode==='team'?(g.winner===0?'청팀':'홍팀'):g.players[g.winner].name;$('win-title').textContent=winner+' 승리!';$('win-subtitle').textContent=g.mode==='team'?'승리 팀의 말 8개가 모두 완주했습니다.':'말 4개를 먼저 완주했습니다.';}
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
  el.textContent=(player+1)+'P';el.title=g.players[player].name+' 말 '+ids[0]+1;
  if(ids.length>1){const sup=document.createElement('sup');sup.textContent='×'+ids.length;el.appendChild(sup);}
  if(selected)el.addEventListener('click',()=>choosePiece(ids.find(i=>state.moves.some(m=>m.piece===i))));else el.disabled=true;root.appendChild(el);
 }
}
function closeRouteModal(){const modal=$('route-modal');if(modal)modal.classList.add('hidden');}
function choosePiece(index){const options=state.moves.filter(m=>m.piece===index);if(!options.length)return;state.selected=index;playSound('select');renderChoices();}
function renderPending(){const root=$('pending-rolls');root.innerHTML='';const g=state.game;if(!g)return;for(const [i,r] of g.pending.entries()){const el=document.createElement('span');el.className='pending-pill';el.textContent=(i+1)+' · '+r.label;root.appendChild(el);}}
function renderChoices(){
 const root=$('route-modal-options');root.innerHTML='';if(state.selected===null){closeRouteModal();return;}
 const options=state.moves.filter(m=>m.piece===state.selected);if(!options.length){closeRouteModal();return;}
 const routeNames={outer:'바깥길',cut5:'대각선 지름길',cut10:'대각선 지름길',cut5fast:'중앙 빠른길',cut10long:'중앙 바깥길'};
 const ul=document.createElement('div');ul.className='destination-grid';
 for(const option of options){const button=document.createElement('button');button.className='route-choice';
  const enemies=option.to==='FIN'?0:state.game.pieces.reduce((sum,ps,owner)=>sum+(owner===state.player||(state.game.mode==='team'&&owner%2===state.player%2)?0:ps.filter(p=>p.pos===option.to).length),0);
  button.textContent=option.label+' ('+option.steps+'칸) → '+(option.to==='FIN'?'완주':routeNames[option.route]+' · '+(option.to===0?'출발/도착':option.to+'번 칸'))+(enemies?' 🎯 '+enemies+'개 잡기':'');
  button.addEventListener('click',()=>confirmMove(option));ul.appendChild(button);
 }
 root.appendChild(ul);$('route-modal-title').textContent=(state.selected+1)+'번 말 · 도착할 칸을 선택하세요';$('route-modal').classList.remove('hidden');
}
function confirmMove(option){
 const g=state.game,point=option.to==='FIN'?'완주':option.to===0?'출발/도착':option.to+'번 칸';
 const enemies=option.to==='FIN'?0:g.pieces.reduce((n,ps,i)=>n+(i===state.player||(g.mode==='team'&&i%2===state.player%2)?0:ps.filter(p=>p.pos===option.to).length),0);
 const yes=window.confirm(option.label+' 사용 · '+(state.selected+1)+'번 말을 '+point+'으로 이동'+(enemies?'\n상대 말 '+enemies+'개 잡기!':'')+'\n확정하시겠습니까?');
 if(!yes)return;
 playSound(enemies?'capture':'move');send({type:'move',piece:state.selected,rollIndex:option.rollIndex,route:option.route,to:option.to});state.selected=null;closeRouteModal();
}
$('route-cancel').addEventListener('click',()=>{state.selected=null;closeRouteModal();});
let lastFrame=0;
function animateGauge(t){if(t-lastFrame>25){lastFrame=t;const value=state.charging?Math.min(100,(t-state.chargeStart)/14):0;state.chargePower=value;$('gauge-value').style.width=value+'%';$('gauge-value').classList.toggle('charged',value>=90);}state.raf=requestAnimationFrame(animateGauge);}
let audioContext;
function playSound(type){if(!state.sound)return;try{
 audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();
 const now=audioContext.currentTime;
 const count=type==='roll'?5:type==='capture'?4:type==='win'?7:1;
 for(let j=0;j<count;j++){
 const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=now+j*(type==='roll'?.065:.09);
 osc.type=type==='roll'||type==='capture'?'triangle':'sine';osc.frequency.setValueAtTime((type==='roll'?170:type==='capture'?390:type==='win'?480:280)+j*(type==='win'?90:28),t);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(type==='roll'?.19:.11,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.15);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.16);
 }
 }catch{}}
function beginCharge(e){if(!myTurn()||state.game.phase!=='roll'||state.charging)return;if(e?.cancelable)e.preventDefault();state.charging=true;state.chargeStart=performance.now();$('throw').classList.add('charging');try{if(e?.pointerId!=null)$('throw').setPointerCapture(e.pointerId);}catch{}playSound('select');}
function endCharge(e){if(!state.charging)return;if(e?.cancelable)e.preventDefault();state.chargePower=Math.min(100,(performance.now()-state.chargeStart)/14);state.charging=false;$('throw').classList.remove('charging');if(!myTurn()||state.game.phase!=='roll')return;send({type:'roll',power:Math.round(state.chargePower)});$('yut-sticks').classList.add('throwing');playSound('roll');setTimeout(()=>$('yut-sticks').classList.remove('throwing'),850);}
$('throw').addEventListener('pointerdown',beginCharge);$('throw').addEventListener('pointerup',endCharge);$('throw').addEventListener('pointercancel',()=>{state.charging=false;$('throw').classList.remove('charging');});
$('throw').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat)beginCharge(e);});$('throw').addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')endCharge(e);});
$('mode').addEventListener('change',()=>{const team=$('mode').value==='team';$('player-count').value=team?'4':$('player-count').value;$('player-count').disabled=team;});
$('create').addEventListener('click',()=>{if(state.ws?.readyState!==WebSocket.OPEN)return toast('서버 연결을 확인해 주세요.');state.manualLeave=false;send({type:'create',name:$('name').value,mode:$('mode').value,playerCount:Number($('player-count').value),stake:Number($('stake').value)});});
$('join').addEventListener('click',()=>{const room=$('room-input').value.trim().toUpperCase();if(room.length!==6)return toast('6자리 방 코드를 입력하세요.');state.manualLeave=false;send({type:'join',room,name:$('name').value});});$('room-input').addEventListener('keydown',e=>{if(e.key==='Enter')$('join').click();});

$('copy-room').addEventListener('click',()=>{const invite=location.origin+'/?room='+encodeURIComponent(state.room);if(navigator.clipboard?.writeText){navigator.clipboard.writeText(invite).then(()=>toast('초대 링크를 복사했습니다.')).catch(()=>toast('방 코드: '+state.room));}else toast('방 코드: '+state.room);});
async function authRequest(route,data,method='POST'){
 const res=await fetch('/api/'+route,{method,headers:{'Content-Type':'application/json',...(state.token?{'Authorization':'Bearer '+state.token}:{})},body:method==='GET'?undefined:JSON.stringify(data||{})});const json=await res.json();if(!res.ok)throw Error(json.error||'요청 실패');return json;
}
function updateAccount(){const a=state.account;$('auth-form').classList.toggle('hidden',!!a);$('account-view').classList.toggle('hidden',!a);$('wallet-mini').textContent=a?'🪙 '+a.balance.toLocaleString('ko-KR')+' 머니':'';if(a){$('account-name').textContent='👤 '+a.name;$('account-balance').textContent='🪙 '+a.balance.toLocaleString('ko-KR')+' 머니';$('account-record').textContent='승리 '+a.wins+' · 패배 '+a.losses;$('name').value=a.name;$('name').disabled=true;$('refill').disabled=a.balance!==0;}else $('name').disabled=false;}
async function doAuth(route){try{const json=await authRequest(route,{name:$('login-id').value.trim(),password:$('login-pass').value});state.token=json.token;localStorage.setItem('yut-token',json.token);state.account=json.account;updateAccount();toast(route==='login'?'로그인 성공!':'가입 완료! 10만 게임머니가 지급됐습니다.');state.ws?.close();}catch(e){toast(e.message);}}
$('login').addEventListener('click',()=>doAuth('login'));
$('register').addEventListener('click',()=>doAuth('register'));
$('logout').addEventListener('click',()=>{state.token=null;state.account=null;localStorage.removeItem('yut-token');updateAccount();state.ws?.close();});
$('refill').addEventListener('click',async()=>{try{const r=await authRequest('refill');state.account=r.account;updateAccount();toast('가상 머니 100,000원이 충전됐습니다.');}catch(e){toast(e.message);}});
$('sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;localStorage.setItem('yut-muted',state.sound?'0':'1');$('sound-toggle').textContent=state.sound?'🔊 소리 켜짐':'🔇 소리 꺼짐';if(state.sound)playSound('select');});
if(state.token)authRequest('me',null,'GET').then(r=>{state.account=r.account;updateAccount();}).catch(()=>{state.token=null;localStorage.removeItem('yut-token');updateAccount();});
$('rematch').addEventListener('click',()=>send({type:'rematch'}));$('leave').addEventListener('click',()=>{state.manualLeave=true;state.room=null;state.player=null;state.game=null;state.moves=[];localStorage.removeItem('yut-room');$('game').classList.add('hidden');$('win-modal').classList.add('hidden');$('lobby').classList.remove('hidden');state.ws?.close();setTimeout(()=>{state.manualLeave=false;startSocket();},150);});
if(initialInvite&&/^[A-Z0-9]{6}$/i.test(initialInvite)){$('room-input').value=initialInvite.toUpperCase();toast('초대받은 방 코드가 입력되었습니다. 이름을 확인한 뒤 입장하세요.');}board();startSocket();state.raf=requestAnimationFrame(animateGauge);window.addEventListener('beforeunload',()=>cancelAnimationFrame(state.raf));
})();
