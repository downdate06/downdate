const OUTER = [0, ...Array.from({length:19},(_,i)=>i+1), 'FIN'];
const CUT5 = [0,1,2,3,4,5,21,22,23,24,25,15,16,17,18,19,'FIN'];
const CUT10 = [0,1,2,3,4,5,6,7,8,9,10,26,27,23,28,29,'FIN'];
const CUT5FAST = [0,1,2,3,4,5,21,22,23,28,29,'FIN'];
const CUT10LONG = [0,1,2,3,4,5,6,7,8,9,10,26,27,23,24,25,15,16,17,18,19,'FIN'];
const PATHS={outer:OUTER,cut5:CUT5,cut10:CUT10,cut5fast:CUT5FAST,cut10long:CUT10LONG};
const LABELS = {1:'도',2:'개',3:'걸',4:'윷',5:'모'};
function createGame(mode='individual',playerCount=4){
 if(!['individual','team'].includes(mode))throw Error('잘못된 경기 방식입니다.');
 if(!Number.isInteger(playerCount)||playerCount<2||playerCount>4||(mode==='team'&&playerCount!==4))throw Error('개인전은 2~4명, 팀전은 4명만 가능합니다.');
 return {mode,playerCount,players:Array.from({length:playerCount},()=>({name:'',connected:false})),pieces:Array.from({length:playerCount},()=>Array.from({length:4},()=>({pos:-1,route:'outer'}))),turn:0,phase:'roll',roll:null,winner:null,history:[],moveNo:0};
}
function teamOf(game,player){return game.mode==='team'?player%2:player;}
function sameSide(game,a,b){return teamOf(game,a)===teamOf(game,b);}
function optionsFor(piece,steps){
 if(piece.pos==='FIN')return [];
 let routes=[piece.route];
 if(piece.pos===5 && piece.route==='outer')routes.push('cut5');
 if(piece.pos===10 && piece.route==='outer')routes.push('cut10');
 if(piece.pos===23 && piece.route==='cut5')routes.push('cut5fast');
 if(piece.pos===23 && piece.route==='cut10')routes.push('cut10long');
 const results=[];
 for(const route of routes){const path=PATHS[route];const at=piece.pos===-1?0:path.indexOf(piece.pos);if(at<0)continue;const target=path[Math.min(path.length-1,at+steps)];if(!results.some(v=>v.to===target))results.push({route,to:target,branch:route!==piece.route});}
 return results;
}
function movesFor(game,player){if(game.phase!=='move'||game.turn!==player||!game.roll||game.winner!==null)return [];
 const all=[];const used=new Set();for(let i=0;i<4;i++){const p=game.pieces[player][i];if(p.pos==='FIN')continue;
 if(p.pos!==-1){const key=String(p.pos);if(used.has(key))continue;used.add(key);}
 for(const option of optionsFor(p,game.roll.steps))all.push({piece:i,from:p.pos,...option});}
 return all;
}
function roll(game,player){if(game.turn!==player||game.phase!=='roll'||game.winner!==null)throw Error('지금은 윷을 던질 수 없습니다.');
 const bits=Array.from({length:4},()=>Math.random()<0.5?1:0);const count=bits.reduce((a,b)=>a+b,0);const steps=count===0?5:count;
 game.roll={steps,label:LABELS[steps],bits,bonus:steps>=4};game.phase='move';game.history.unshift(`${game.players[player].name} · ${LABELS[steps]}!`);game.history=game.history.slice(0,12);return game.roll;
}
function move(game,player,pieceIndex,route){if(game.turn!==player||game.phase!=='move'||game.winner!==null)throw Error('지금 이동할 수 없습니다.');
 const candidates=movesFor(game,player);const chosen=candidates.find(m=>m.piece===pieceIndex&&m.route===route);if(!chosen)throw Error('유효하지 않은 이동입니다.');
 const own=game.pieces[player];const source=own[pieceIndex].pos;
 const moved=source===-1?[pieceIndex]:own.map((p,i)=>p.pos===source?i:-1).filter(i=>i>=0);
 for(const idx of moved){own[idx].pos=chosen.to;own[idx].route=chosen.route;}
 let captured=0;
 if(chosen.to!=='FIN')for(let other=0;other<game.players.length;other++){
  if(sameSide(game,player,other))continue;
  for(const enemy of game.pieces[other])if(enemy.pos===chosen.to){enemy.pos=-1;enemy.route='outer';captured++;}
 }
 game.history.unshift(`${game.players[player].name} · ${moved.length}개 말 이동${captured?' · 상대 말 잡기!':''}`);game.history=game.history.slice(0,12);game.moveNo++;
 const side=teamOf(game,player);
 const sidePlayers=game.players.map((_,i)=>i).filter(i=>teamOf(game,i)===side);
 if(sidePlayers.every(i=>game.pieces[i].every(p=>p.pos==='FIN'))){game.winner=side;game.phase='ended';game.roll=null;game.history.unshift(`🏆 ${game.mode==='team'?(side===0?'청팀':'홍팀'):game.players[player].name} 승리!`);}
 else {const bonus=game.roll.bonus||captured>0;game.roll=null;game.phase='roll';if(!bonus)game.turn=(player+1)%game.players.length;}
 return {captured,moved:moved.length};
}
module.exports={createGame,teamOf,sameSide,optionsFor,movesFor,roll,move,PATHS};
