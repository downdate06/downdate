'use strict';
// Missions are server-owned definitions. A/B are visibility, C/D are tags.
const make=(id,title,description,points,tags,minimum=2)=>({id,title,description,points,tags,minimum});
const CATALOG=[
 make('capture_twice','연속 사냥꾼','한 턴에 서로 다른 두 번의 이동으로 상대 말을 잡기',4,['capture']),
 make('capture_triple','대량 포획','한 번에 3개 이상 업힌 상대 말을 잡기',4,['capture']),
 make('back_capture','완벽한 포획','빽도로 상대 말을 잡기',6,['capture','backdo']),
 make('capture_finish','사냥 후 귀환','상대를 잡은 말로 나중에 완주하기',4,['capture','finish']),
 make('stack_three','삼중 결속','말 3개를 한 칸에 업기',2,['stack']),
 make('stack_four','전원 집합','말 4개를 한 칸에 업기',5,['stack']),
 make('return_stack','다시 만난 동료','잡혔던 말을 다시 출발시켜 업기',3,['stack','comeback']),
 make('next_turn_capture','역습의 사냥꾼','내 말이 잡힌 다음 내 차례에 상대를 잡기',4,['capture','comeback']),
 make('capture_two_pieces','쌍둥이 포획','한 번의 이동으로 상대 말 2개 이상 잡기',3,['capture']),
 make('capture_two_pieces_multi','연쇄 추격','서로 다른 내 말로 한 턴에 2회 잡기',6,['capture']),
 make('double_yut','쌍윷','연속된 내 투척에서 윷 다음 윷',4,['combination']),
 make('double_mo','쌍모','연속된 내 투척에서 모 다음 모',6,['combination']),
 make('yut_mo','황금 연계','연속된 내 투척에서 윷 다음 모',4,['combination']),
 make('back_mo','뒤집힌 운명','연속된 내 투척에서 빽도 다음 모',6,['combination']),
 make('triple_geol','정밀한 세 걸음','걸 3회 연속',6,['combination']),
 make('ascending','행운의 사다리','연속된 내 투척에서 도·개·걸',4,['combination']),
 make('descending','반대의 흐름','연속된 내 투척에서 걸·개·도',4,['combination']),
 make('mo_back','극과 극','연속된 내 투척에서 모 다음 빽도',6,['combination']),
 make('four_bonus','윷의 축복','한 경기에서 윷·모를 합쳐 4회 얻기',3,['combination']),
 make('all_results','오색의 결과','한 경기에서 도·개·걸·윷·모 모두 얻기',6,['combination']),
 make('shortcut_finish','지름길 완주','대각선 지름길을 이용한 말 완주',2,['finish']),
 make('two_safe_finish','무적 귀환','잡힌 적 없는 말 2개 완주',4,['finish']),
 make('stack_finish','단체 귀환','말 2개 이상을 한 번에 완주',4,['stack','finish']),
 make('late_winner','마지막 추월','상대 3개 완주 후 승리',7,['comeback','win']),
 make('two_shortcuts','두 갈래 지배','양쪽 대각선을 모두 이용하여 완주',5,['finish']),
 make('back_branch','빽도의 귀재','빽도로 갈림길 역주행을 선택해 이동',2,['backdo']),
 make('run_eight','강행군','한 턴에 같은 말로 총 8칸 이상 전진',3,['move']),
 make('double_finish','두 마리 동시 완주','한 번의 이동으로 말 2개 이상 완주',4,['finish']),
 make('next_turn_finish','역전 완주','내 말이 잡힌 다음 내 턴에 다른 말 완주',4,['comeback','finish']),
 make('long_route','긴 여정','바깥 테두리 경로로 말 하나 완주',2,['finish']),
 make('lost_three_win','불굴의 승부사','말이 3회 이상 잡힌 뒤 승리',7,['comeback','win']),
 make('last_hope','마지막 희망','상대 3개 완주 이후 2개 연속 완주',7,['comeback','finish']),
 make('revenge','복수의 완성','내 말을 잡았던 플레이어의 말을 잡기',4,['capture','comeback']),
 make('retaliation','위기 탈출','두 번 잡힌 후 2차례 이내 상대를 잡기',6,['capture','comeback']),
 make('back_late_capture','역전의 한 수','상대가 3개 이상 완주한 뒤 빽도로 잡기',7,['backdo','comeback']),
 make('behind_double_capture','집중 반격','내 말이 2회 이상 잡힌 상태에서 한 턴 2회 잡기',7,['capture','comeback']),
 make('first_finish_late_win','뒤늦은 승리','상대가 먼저 완주했지만 결국 승리',4,['comeback','win']),
 make('all_recaptured_win','포기 없는 귀환','내 말 4개 모두 잡힌 경험이 있는 경기에서 승리',8,['comeback','win']),
 make('edge_capture','벼랑 끝 포획','상대 3개 완주 후 상대 말을 잡기',4,['capture','comeback']),
 make('more_caught_win','최후의 반격','상대보다 내 말이 더 많이 잡힌 경기에서 승리',6,['comeback','win'])
];
const THREESOME=new Set(['capture_triple','capture_two_pieces_multi','behind_double_capture','lost_three_win']);
const FOUR_SOME=new Set(['all_recaptured_win','last_hope','more_caught_win']);
for(const m of CATALOG){if(THREESOME.has(m.id))m.minimum=3;if(FOUR_SOME.has(m.id))m.minimum=4;}
const CATALOG_MAP=new Map(CATALOG.map(m=>[m.id,m]));
const COMMON_ALLOWED=new Set(['capture_twice','capture_triple','stack_three','capture_two_pieces','double_yut','double_mo','yut_mo','mo_back','four_bonus','shortcut_finish','stack_finish','back_branch','run_eight','double_finish','long_route','revenge','behind_double_capture','first_finish_late_win','edge_capture']);
const rng=(seed)=>{let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};};
function selectMissions(playerCount,seed,stats=[]){const random=rng(seed||1);const allowed=CATALOG.filter(m=>m.minimum<=playerCount);const statsMap=new Map(stats.map(x=>[x.mission_id,x]));const weight=m=>{const data=statsMap.get(m.id);if(!data||data.appearances<20)return 1;const rate=data.completions/data.appearances;return rate>.5?.45:rate>.3?.75:rate<.025?.5:1;};const pick=(pool,n,used)=>{const arr=pool.filter(x=>!used.has(x.id));const picked=[];while(picked.length<n&&arr.length){const total=arr.reduce((sum,m)=>sum+weight(m),0);let offset=random()*total,index=0;for(;index<arr.length-1;index++){offset-=weight(arr[index]);if(offset<0)break;}picked.push(arr.splice(index,1)[0]);}picked.forEach(x=>used.add(x.id));return picked.map(x=>x.id);};const used=new Set();const common=pick(allowed.filter(m=>COMMON_ALLOWED.has(m.id)),3,used);const secret=Array.from({length:playerCount},()=>pick(allowed.filter(m=>!m.tags.includes('win')&&m.points>=3),2,new Set(common)));return {common,secret,completedCommon:{},completedSecret:Array.from({length:playerCount},()=>[]),scores:Array(playerCount).fill(0),counters:Array.from({length:playerCount},()=>({throws:[],bonus:0,captures:0,caught:0,caughtPieces:[],finished:0,firstFinished:false,lastTurnCaptures:0,turnCaptures:0,lastTurn:-1,lastCapturePlayer:null,usedRoutes:[],hasCapturePiece:[],runs:{},lastCaughtTurn:-100})),events:[],nextEventId:1};}
function grade(id,ctx){const a=ctx.self,e=ctx.event,c=ctx.counter,g=ctx.game;const enemyMax=Math.max(...g.pieces.map((p,i)=>i===a?0:p.filter(x=>x.pos==='FIN').length));const caught=c.caught;
 switch(id){
 case 'capture_twice':return e.kind==='move'&&c.turnCaptures>=2;
 case 'capture_triple':return e.kind==='move'&&e.captured>=3;
 case 'back_capture':return e.kind==='move'&&e.steps===-1&&e.captured>0;
 case 'capture_finish':return e.kind==='move'&&e.to==='FIN'&&e.capturedBefore;
 case 'stack_three':return e.kind==='move'&&e.stackSize>=3&&e.to!=='FIN';
 case 'stack_four':return e.kind==='move'&&e.stackSize===4&&e.to!=='FIN';
 case 'return_stack':return e.kind==='move'&&e.caughtBefore&&e.stackSize>=2;
 case 'next_turn_capture':return e.kind==='move'&&e.captured>0&&e.turn>=c.lastCaughtTurn+1&&e.turn<=c.lastCaughtTurn+g.playerCount+1;
 case 'capture_two_pieces':return e.kind==='move'&&e.captured>=2;
 case 'capture_two_pieces_multi':return e.kind==='move'&&e.captured>0&&c.turnCaptures>=2&&new Set(c.hasCapturePiece).size>=2;
 case 'double_yut':return e.kind==='throw'&&c.throws.slice(-2).join(',')==='윷,윷';
 case 'double_mo':return e.kind==='throw'&&c.throws.slice(-2).join(',')==='모,모';
 case 'yut_mo':return e.kind==='throw'&&c.throws.slice(-2).join(',')==='윷,모';
 case 'back_mo':return e.kind==='throw'&&c.throws.slice(-2).join(',')==='빽도,모';
 case 'triple_geol':return e.kind==='throw'&&c.throws.slice(-3).join(',')==='걸,걸,걸';
 case 'ascending':return e.kind==='throw'&&c.throws.slice(-3).join(',')==='도,개,걸';
 case 'descending':return e.kind==='throw'&&c.throws.slice(-3).join(',')==='걸,개,도';
 case 'mo_back':return e.kind==='throw'&&c.throws.slice(-2).join(',')==='모,빽도';
 case 'four_bonus':return e.kind==='throw'&&c.bonus>=4;
 case 'all_results':return e.kind==='throw'&&['도','개','걸','윷','모'].every(v=>c.throws.includes(v));
 case 'shortcut_finish':return e.kind==='move'&&e.to==='FIN'&&e.route!=='outer';
 case 'two_safe_finish':return e.kind==='move'&&e.to==='FIN'&&c.finished>=2&&caught===0;
 case 'stack_finish':case 'double_finish':return e.kind==='move'&&e.to==='FIN'&&e.moved>=2;
 case 'late_winner':return e.kind==='win'&&enemyMax>=3;
 case 'two_shortcuts':return e.kind==='move'&&e.to==='FIN'&&c.usedRoutes.includes('cut5')&&c.usedRoutes.includes('cut10');
 case 'back_branch':return e.kind==='move'&&e.steps===-1&&e.branch;
 case 'run_eight':return e.kind==='move'&&c.runs[e.piece]>=8;
 case 'next_turn_finish':return e.kind==='move'&&e.to==='FIN'&&e.turn>=c.lastCaughtTurn+1&&e.turn<=c.lastCaughtTurn+g.playerCount+1;
 case 'long_route':return e.kind==='move'&&e.to==='FIN'&&e.route==='outer';
 case 'lost_three_win':return e.kind==='win'&&caught>=3;
 case 'last_hope':return e.kind==='move'&&enemyMax>=3&&c.finished>=2;
 case 'revenge':return e.kind==='move'&&e.captured>0&&e.victims.some(v=>v.player===c.lastCapturePlayer);
 case 'retaliation':return e.kind==='move'&&e.captured>0&&caught>=2&&e.turn-c.lastCaughtTurn<=2;
 case 'back_late_capture':return e.kind==='move'&&enemyMax>=3&&e.steps===-1&&e.captured>0;
 case 'behind_double_capture':return e.kind==='move'&&caught>=2&&c.turnCaptures>=2;
 case 'first_finish_late_win':return e.kind==='win'&&c.firstFinished===false;
 case 'all_recaptured_win':return e.kind==='win'&&new Set(c.caughtPieces).size===4;
 case 'edge_capture':return e.kind==='move'&&enemyMax>=3&&e.captured>0;
 case 'more_caught_win':return e.kind==='win'&&caught>Math.min(...g.pieces.map((_,i)=>i===a?999:ctx.missions.counters[i].caught));
 default:return false;
 }
}
function record(missions,game,player,event){if(!missions)return [];
 const c=missions.counters[player];if(!c)return [];
 if(event.kind==='throw'&&!event.nak){c.throws.push(event.label);if(['윷','모'].includes(event.label))c.bonus++;}
 if(event.kind==='move'){
  if(event.turn!==c.lastTurn){c.lastTurn=event.turn;c.turnCaptures=0;c.runs={};}
  if(event.captured){c.captures+=event.captured;c.turnCaptures++;c.hasCapturePiece.push(event.piece);}
  if(event.to==='FIN'){if(c.finished===0)c.firstFinished=!game.pieces.some((pieces,i)=>i!==player&&pieces.some(p=>p.pos==='FIN'));c.finished+=event.moved;}
  if(event.route!=='outer'&&!c.usedRoutes.includes(event.route))c.usedRoutes.push(event.route);
  c.runs[event.piece]=(c.runs[event.piece]||0)+Math.max(0,event.steps);
 }
 if(event.kind==='caught'){c.caught+=event.caught;c.caughtPieces.push(...event.pieces);c.lastCaughtTurn=event.turn;c.lastCapturePlayer=event.by;}
 if(event.kind==='enemy_finished'&&c.finished===0)c.firstFinished=false;
 const achieved=[];for(const id of missions.common){if(missions.completedCommon[id]!==undefined)continue;if(grade(id,{event,self:player,counter:c,game,missions})){missions.completedCommon[id]=player;missions.scores[player]+=CATALOG_MAP.get(id).points;achieved.push({id,player,kind:'common'});}}
 for(const id of missions.secret[player]){if(missions.completedSecret[player].includes(id))continue;if(grade(id,{event,self:player,counter:c,game,missions})){missions.completedSecret[player].push(id);missions.scores[player]+=CATALOG_MAP.get(id).points;achieved.push({id,player,kind:'secret'});}}
 for(const item of achieved)missions.events.unshift({...item,serial:missions.nextEventId++});missions.events=missions.events.slice(0,30);return achieved;
}
function publicView(missions,player){if(!missions)return null;return {matchId:missions.matchId||null,common:missions.common.map(id=>({...CATALOG_MAP.get(id),winner:missions.completedCommon[id]??null})),secret:(missions.secret[player]||[]).map(id=>({...CATALOG_MAP.get(id),done:missions.completedSecret[player].includes(id)})),scores:missions.scores,events:missions.events.map(x=>({...x,title:CATALOG_MAP.get(x.id)?.title||x.id,points:CATALOG_MAP.get(x.id)?.points||0}))};}
function splitPool(pool,scores,winner){const total=scores.reduce((a,b)=>a+b,0);if(!total)return scores.map((_,i)=>i===winner?pool:0);const shares=scores.map(s=>Math.floor(pool*s/total));let remainder=pool-shares.reduce((a,b)=>a+b,0);const ranking=scores.map((s,i)=>({i,fraction:(pool*s)%total})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);for(let k=0;k<remainder;k++)shares[ranking[k].i]++;return shares;}
module.exports={CATALOG,CATALOG_MAP,selectMissions,record,publicView,splitPool};
