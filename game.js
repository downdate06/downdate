const OUTER=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,30,'FIN'];
// A throw that crosses the center continues along its entry diagonal.
// Turning is permitted only if the piece actually stopped at node 23.
const CUT5=[1,2,3,4,5,21,22,23,24,25,15,16,17,18,19,30,'FIN'];
const CUT10=[1,2,3,4,5,6,7,8,9,10,26,27,23,28,29,30,'FIN'];
const CUT5FAST=[1,2,3,4,5,21,22,23,28,29,30,'FIN'];
const CUT10LONG=[1,2,3,4,5,6,7,8,9,10,26,27,23,24,25,15,16,17,18,19,30,'FIN'];
const PATHS={outer:OUTER,cut5:CUT5,cut10:CUT10,cut5fast:CUT5FAST,cut10long:CUT10LONG};
const LABELS={1:'도',2:'개',3:'걸',4:'윷',5:'모','-1':'빽도'};

function createGame(mode='individual',playerCount=4){
 if(!['individual','team'].includes(mode))throw Error('잘못된 경기 방식입니다.');
 if(!Number.isInteger(playerCount)||playerCount<2||playerCount>4||(mode==='team'&&playerCount!==4))throw Error('개인전은 2~4명, 팀전은 4명만 가능합니다.');
 return {mode,playerCount,players:Array.from({length:playerCount},()=>({name:'',connected:false})),pieces:Array.from({length:playerCount},()=>Array.from({length:4},()=>({pos:-1,route:'outer'}))),turn:0,phase:'roll',roll:null,pending:[],captureThrows:0,captureRollReady:false,winner:null,history:[],moveNo:0,throwNo:0,lastPower:0};
}
function teamOf(game,player){return game.mode==='team'?player%2:player;}
function sameSide(game,a,b){return teamOf(game,a)===teamOf(game,b);}

function routesFor(piece){
 if(piece.pos===5&&piece.route==='outer')return ['cut5'];
 if(piece.pos===10&&piece.route==='outer')return ['cut10'];
 // Once a piece STOPS at center, the next move always exits to lower-right.
 // Merely crossing center preserves the incoming diagonal.
 if(piece.pos===23&&piece.route==='cut5')return ['cut5fast'];
 if(piece.pos===23&&piece.route==='cut10')return ['cut10'];
 return [piece.route];
}

function optionTo(route,piece,steps){
 if(piece.pos==='FIN')return null;
 if(steps===-1){
  if(piece.pos===-1)return null;
  if(piece.pos===30)return {route,to:PATHS[route][PATHS[route].length-3],branch:false};
  const path=PATHS[route];
  const at=path.indexOf(piece.pos);
  if(at<0)return null;
  return {route,to:at===0?30:path[at-1],branch:false};
 }
 if(piece.pos===30)return {route,to:'FIN',branch:false};
 const path=PATHS[route];
 const at=piece.pos===-1?-1:path.indexOf(piece.pos);
 if(at<-1)return null;
 const finishTileIndex=path.length-2; // 30
 const nextIndex=at+steps;
 const to=nextIndex===finishTileIndex?30:nextIndex>finishTileIndex?'FIN':path[nextIndex];
 return {route,to,branch:route!==piece.route};
}

function optionsFor(piece,steps){
 if(piece.pos==='FIN' || steps===0)return [];
 // From the exact center, back-do can go to either upper diagonal node.
 // 27 is upper-left; 22 is upper-right on the rendered board.
 if(piece.pos===23&&steps===-1)return [
  {route:'cut10',to:27,branch:true,direction:'왼쪽 위'},
  {route:'cut5fast',to:22,branch:true,direction:'오른쪽 위'}
 ];
 // Back-do at the bottom-left corner or the finish tile also branches.
 if(piece.pos===15&&steps===-1)return [
  {route:'outer',to:14,branch:true,direction:'위쪽'},
  {route:'cut5',to:25,branch:true,direction:'오른쪽 위'}
 ];
 if(piece.pos===30&&steps===-1)return [
  {route:'outer',to:19,branch:true,direction:'왼쪽'},
  {route:'cut10',to:29,branch:true,direction:'왼쪽 위'}
 ];
 const results=[];
 for(const route of routesFor(piece)){
  const option=optionTo(route,piece,steps);
  if(option && !results.some(v=>v.to===option.to&&v.route===option.route))results.push(option);
 }
 return results;
}

function movesFor(game,player){
 if(game.phase!=='move'||game.turn!==player||!game.pending.length||game.winner!==null)return [];
 const all=[];
 const used=new Set();
 for(let i=0;i<4;i++){
  const p=game.pieces[player][i];
  if(p.pos==='FIN')continue;
  if(p.pos!==-1){const key=String(p.pos);if(used.has(key))continue;used.add(key);}
  for(let rollIndex=0;rollIndex<game.pending.length;rollIndex++){
   const roll=game.pending[rollIndex];
   for(const option of optionsFor(p,roll.steps))all.push({piece:i,rollIndex,steps:roll.steps,label:roll.label,from:p.pos,...option});
  }
 }
 return all;
}

function roll(game,player,power=50,forcedBits,forcedNak=false){
 const deferredCapture=game.captureThrows>0&&(game.phase==='move'||(game.phase==='roll'&&game.captureRollReady));
 if(game.turn!==player||(!deferredCapture&&game.phase!=='roll')||game.winner!==null)throw Error('지금은 윷을 던질 수 없습니다.');
 if(deferredCapture)game.captureThrows--;
 game.captureRollReady=false;
 const nak=forcedNak || (!forcedBits && Math.random()<0.055);
 if(nak){
  const result={id:++game.throwNo,steps:0,label:'낙',bits:[],bonus:false,nak:true};
  game.roll=result;game.lastPower=Math.max(0,Math.min(100,Number(power)||0));
  game.history.unshift(`${game.players[player].name} · 낙! 던진 윷이 판 밖으로 떨어졌습니다.`);
  game.history=game.history.slice(0,14);
  if(game.pending.length){game.phase='move';}
  else if(game.captureThrows){game.phase='roll';game.captureRollReady=true;}
  else{game.phase='roll';game.turn=(player+1)%game.players.length;}
  return result;
 }
 const bits=forcedBits||Array.from({length:4},()=>Math.random()<.5?1:0);
 if(bits.length!==4||bits.some(b=>b!==0&&b!==1))throw Error('잘못된 윷 결과입니다.');
 const count=bits.reduce((a,b)=>a+b,0),steps=count===0?5:count;
 const backdo=steps===1&&bits[3]===1;
 const moveSteps=backdo?-1:steps;
 const result={id:++game.throwNo,steps:moveSteps,label:LABELS[moveSteps],bits:[...bits],bonus:steps>=4,backdo};
 game.roll=result;game.pending.push(result);game.lastPower=Math.max(0,Math.min(100,Number(power)||0));
 game.phase=result.bonus?'roll':'move';
 if(game.phase==='move'&&!movesFor(game,player).length){game.pending=[];game.phase='roll';if(game.captureThrows)game.captureRollReady=true;else game.turn=(player+1)%game.players.length;}
 game.history.unshift(`${game.players[player].name} · ${result.label}!${result.bonus?' 추가 던지기!':''}`);
 game.history=game.history.slice(0,14);
 return result;
}

function move(game,player,pieceIndex,route,rollIndex=0,target){
 if(game.turn!==player||game.phase!=='move'||game.winner!==null)throw Error('지금 이동할 수 없습니다.');
 const choice=movesFor(game,player).find(m=>m.piece===pieceIndex&&m.route===route&&m.rollIndex===rollIndex&&((target===undefined)||m.to===target));
 if(!choice)throw Error('유효하지 않은 이동입니다.');
 const own=game.pieces[player],source=own[pieceIndex].pos;
 const moved=source===-1?[pieceIndex]:own.map((p,i)=>p.pos===source?i:-1).filter(i=>i>=0);
 for(const index of moved){own[index].pos=choice.to;own[index].route=choice.route;}
 let captured=0;const victims=[];
 if(choice.to!=='FIN'){
  for(let other=0;other<game.players.length;other++){
   if(sameSide(game,player,other))continue;
   for(let j=0;j<game.pieces[other].length;j++){const enemy=game.pieces[other][j];if(enemy.pos===choice.to){enemy.pos=-1;enemy.route='outer';captured++;victims.push({player:other,piece:j});}}
  }
 }
 game.pending.splice(rollIndex,1);
 game.moveNo++;
 game.history.unshift(`${game.players[player].name} · ${choice.label} ${moved.length}개 말 이동${captured?' · '+captured+'개 잡기!':''}`);
 game.history=game.history.slice(0,14);
 const side=teamOf(game,player),sidePlayers=game.players.map((_,i)=>i).filter(i=>teamOf(game,i)===side);
 if(sidePlayers.every(i=>game.pieces[i].every(p=>p.pos==='FIN'))){
  game.winner=side;game.phase='ended';game.roll=null;game.pending=[];game.captureThrows=0;game.captureRollReady=false;
  game.history.unshift(`🏆 ${game.mode==='team'?(side===0?'청팀':'홍팀'):game.players[player].name} 승리!`);
 }
 else {
  if(captured && choice.steps<4)game.captureThrows++;
  if(game.pending.length){
  game.phase='move';
 }
 else if(game.captureThrows){
   game.phase='roll';game.captureRollReady=true;
  }else{
   game.phase='roll';game.turn=(player+1)%game.players.length;
  }
 }
 return {captured,moved:moved.length,movedPieces:moved,victims,source,choice};
}

module.exports={createGame,teamOf,sameSide,optionsFor,movesFor,roll,move,PATHS};
