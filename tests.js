const assert=require('node:assert/strict');
const {createGame,roll,move,movesFor,optionsFor}=require('./game');
let tests=0;
function test(name,fn){try{fn();console.log('PASS',name);tests++;}catch(e){console.error('FAIL',name);throw e;}}
const fill=g=>{g.players.forEach((p,i)=>{p.name='P'+i;p.connected=true;});return g;};

test('2/3/4인 개인전',()=>{for(const n of [2,3,4])assert.equal(createGame('individual',n).playerCount,n);});
test('팀전 4명 고정',()=>{assert.throws(()=>createGame('team',3));assert.equal(createGame('team',4).playerCount,4);});
test('윷 후 이동 전에 추가 던지기',()=>{const g=fill(createGame('individual',2));roll(g,0,66,[1,1,1,1]);assert.equal(g.phase,'roll');assert.equal(g.pending.length,1);roll(g,0,23,[1,0,0,0]);assert.equal(g.phase,'move');assert.deepEqual(g.pending.map(x=>x.steps),[4,1]);});
test('모 후 이동 전에 추가 던지기',()=>{const g=fill(createGame());roll(g,0,10,[0,0,0,0]);assert.equal(g.phase,'roll');roll(g,0,10,[1,0,0,0]);assert.equal(g.pending.length,2);assert.equal(g.phase,'move');});
test('누적 결과 중 선택하여 이동',()=>{const g=fill(createGame('individual',2));roll(g,0,10,[1,1,1,1]);roll(g,0,10,[1,0,0,0]);const moves=movesFor(g,0);assert(moves.some(m=>m.rollIndex===0&&m.steps===4));assert(moves.some(m=>m.rollIndex===1&&m.steps===1));move(g,0,0,'outer',1,1);assert.equal(g.pending.length,1);assert.equal(g.phase,'move');assert.equal(g.pieces[0][0].pos,1);move(g,0,1,'outer',0,4);assert.equal(g.turn,1);});
test('목적지 확인 불일치 시 거부',()=>{const g=fill(createGame('individual',2));roll(g,0,50,[1,0,0,0]);assert.throws(()=>move(g,0,0,'outer',0,3));assert.equal(g.pieces[0][0].pos,-1);});
test('상대 말 잡으면 추가 던지기',()=>{const g=fill(createGame('individual',2));g.pieces[1][0].pos=1;roll(g,0,20,[1,0,0,0]);const result=move(g,0,0,'outer',0,1);assert.equal(result.captured,1);assert.equal(g.pieces[1][0].pos,-1);assert.equal(g.phase,'roll');assert.equal(g.turn,0);});
test('윷으로 잡아도 추가 던지기 보너스 중복 없음',()=>{const g=fill(createGame('individual',2));g.pieces[1][0].pos=4;roll(g,0,20,[1,1,1,1]);roll(g,0,20,[1,0,0,0]);move(g,0,0,'outer',0,4);assert.equal(g.phase,'move');assert.equal(g.pending.length,1);assert.equal(g.pending[0].steps,1);});
test('같은 팀 말 잡기 금지',()=>{const g=fill(createGame('team',4));g.pieces[2][0].pos=1;roll(g,0,20,[1,0,0,0]);assert.equal(move(g,0,0,'outer',0,1).captured,0);});
test('모퉁이에서는 지름길 자동 선택',()=>{const o=optionsFor({pos:5,route:'outer'},1);assert.equal(o.length,1);assert.equal(o[0].to,21);assert.equal(o[0].route,'cut5');});
test('파워 게이지는 결과 조작하지 않음',()=>{const g=fill(createGame('individual',2));roll(g,0,99,[1,0,0,0]);assert.equal(g.lastPower,99);assert.equal(g.roll.steps,1);});
test('도착칸에 먼저 선 뒤 다음 이동으로 완주',()=>{const g=fill(createGame('individual',2));g.pieces[0][0].pos=19;roll(g,0,45,[1,0,0,0]);move(g,0,0,'outer',0,30);assert.equal(g.pieces[0][0].pos,30);roll(g,1,45,[1,0,0,0]);move(g,1,0,'outer',0,1); // dummy
 g.turn=0;g.phase='move';g.pending=[{id:99,steps:1,label:'도'}];
 const mv=move(g,0,0,'outer',0,'FIN');assert.equal(mv.choice.to,'FIN');assert.equal(g.pieces[0][0].pos,'FIN');});
test('도착 바로 전 칸에서는 도만 도착칸, 개·걸·윷·모는 완주',()=>{
 for(const [count,target] of [[1,30],[2,'FIN'],[3,'FIN'],[4,'FIN'],[5,'FIN']]){
  const g=fill(createGame('individual',2));g.pieces[0][0].pos=19;
  g.phase='move';g.pending=[{id:1,steps:count,label:'시험'}];
  assert.equal(movesFor(g,0).find(m=>m.piece===0).to,target);
  const r=move(g,0,0,'outer',0,target);assert.equal(r.choice.to,target);
  assert.equal(g.pieces[0][0].pos,target);
 }
});
test('도착 전전 칸에서는 개만 도착칸, 걸 이상은 완주',()=>{
 for(const [steps,target] of [[1,19],[2,30],[3,'FIN'],[4,'FIN'],[5,'FIN']]){
  const g=fill(createGame('individual',2));g.pieces[0][0].pos=18;
  g.phase='move';g.pending=[{id:1,steps,label:'시험'}];
  assert.equal(movesFor(g,0).find(m=>m.piece===0).to,target);
 }
});
test('중앙에서는 도·개·걸·윷·모별 목적지가 정확히 구분됨',()=>{
 const g=fill(createGame('individual',2));g.pieces[0][0]={pos:23,route:'cut5fast'};
 g.phase='move';g.pending=[1,2,3,4,5].map((steps,i)=>({id:i+1,steps,label:'시험'}));
 const choices=movesFor(g,0).filter(x=>x.piece===0);
 assert.deepEqual(choices.map(x=>x.to),[28,29,30,'FIN','FIN']);
 assert.equal(choices.filter(x=>x.to===30).length,1);
});
test('잡기 가능한 윷 결과만 상대 말이 있는 목적지와 일치',()=>{
 const g=fill(createGame('individual',2));g.pieces[0][0]={pos:23,route:'cut5fast'};
 g.pieces[1][0].pos=30;
 g.phase='move';g.pending=[1,2,3,4,5].map((steps,i)=>({id:i+1,steps,label:'시험'}));
 const capturing=movesFor(g,0).filter(x=>x.piece===0&&x.to===g.pieces[1][0].pos);
 assert.deepEqual(capturing.map(x=>x.steps),[3]);
 const invalid=movesFor(g,0).find(x=>x.piece===0&&x.steps===5);
 assert.equal(invalid.to,'FIN');
 assert.throws(()=>move(g,0,0,invalid.route,4,30));
});
test('낙 시 결과 누적 없이 차례 변경',()=>{const g=fill(createGame('individual',2));roll(g,0,50,undefined,true);assert.equal(g.turn,1);assert.equal(g.roll.label,'낙');assert.equal(g.pending.length,0);});
test('윷 추가 던지기의 낙은 이전 윷 결과 유지',()=>{const g=fill(createGame('individual',2));roll(g,0,50,[1,1,1,1]);roll(g,0,50,undefined,true);assert.equal(g.turn,0);assert.equal(g.phase,'move');assert.equal(g.pending.length,1);});

test('모·도 누적 후 도로 기존 내 말 업고 남은 모로 함께 이동',()=>{
 const g=fill(createGame('individual',2));g.pieces[0][0].pos=1;
 roll(g,0,50,[0,0,0,0]);roll(g,0,50,[1,0,0,0]);
 assert.deepEqual(g.pending.map(r=>r.steps),[5,1]);
 const up=move(g,0,1,'outer',1,1);assert.equal(up.captured,0);
 assert.equal(g.pieces[0][0].pos,1);assert.equal(g.pieces[0][1].pos,1);
 assert.equal(g.pending.length,1);
 const far=move(g,0,0,'outer',0,6);
 assert.equal(far.moved,2);assert.equal(g.pieces[0][0].pos,6);assert.equal(g.pieces[0][1].pos,6);
});
test('모·도 누적 후 도로 잡으면 추가 던지고 남은 모든 결과 유지',()=>{
 const g=fill(createGame('individual',2));g.pieces[1][0].pos=1;
 roll(g,0,50,[0,0,0,0]);roll(g,0,50,[1,0,0,0]);
 const capture=move(g,0,0,'outer',1,1);assert.equal(capture.captured,1);
 assert.equal(g.pending.length,1);assert.equal(g.pending[0].steps,5);assert.equal(g.phase,'roll');
 roll(g,0,50,[1,1,0,0]);assert.equal(g.pending.length,2);
 assert.deepEqual(g.pending.map(r=>r.steps),[5,2]);
 assert.equal(g.phase,'move');
 const advance=move(g,0,0,'outer',0,6);
 assert.equal(advance.choice.steps,5);assert.equal(g.pending.length,1);assert.equal(g.pending[0].steps,2);
});
test('말 이동은 새로운 투척으로 기록되지 않음',()=>{
 const g=fill(createGame('individual',2));roll(g,0,50,[0,0,0,0]);roll(g,0,50,[1,0,0,0]);
 const count=g.throwNo,id=g.roll.id;move(g,0,0,'outer',1,1);
 assert.equal(g.throwNo,count);assert.equal(g.roll.id,id);
});

test('모 윷 도 누적 시 도 → 모 → 윷 순서로 새 말과 기존 말 자유 선택',()=>{
 const g=fill(createGame('individual',2));
 roll(g,0,20,[0,0,0,0]);
 roll(g,0,20,[1,1,1,1]);
 roll(g,0,20,[1,0,0,0]);
 assert.deepEqual(g.pending.map(r=>r.steps),[5,4,1]);
 move(g,0,0,'outer',2,1);
 assert.equal(g.pieces[0][0].pos,1);
 assert.deepEqual(g.pending.map(r=>r.steps),[5,4]);
 move(g,0,1,'outer',0,5);
 assert.equal(g.pieces[0][1].pos,5);
 assert.equal(g.pending[0].steps,4);
 move(g,0,1,'cut5',0,28);
 assert.equal(g.pieces[0][1].pos,28);
 assert.equal(g.pending.length,0);
});
test('모 윷 도 누적 시 윷 → 도 → 모 순서로 기존 말과 새 말 자유 선택',()=>{
 const g=fill(createGame('individual',2));
 g.pieces[0][0].pos=2;
 roll(g,0,20,[0,0,0,0]);roll(g,0,20,[1,1,1,1]);roll(g,0,20,[1,0,0,0]);
 move(g,0,0,'outer',1,6);
 move(g,0,1,'outer',1,1);
 move(g,0,1,'outer',0,6);
 assert.equal(g.pieces[0][0].pos,6);
 assert.equal(g.pieces[0][1].pos,6);
 assert.equal(g.turn,1);
});

test('빽도: 출발 후 도 위치에서 도착칸으로 이동',()=>{const g=fill(createGame('individual',2));g.pieces[0][0].pos=1;g.phase='move';g.pending=[{id:5,label:'빽도',steps:-1}];const option=movesFor(g,0).find(m=>m.piece===0);assert.equal(option.to,30);move(g,0,0,'outer',0,30);assert.equal(g.pieces[0][0].pos,30);});
test('게임판 모퉁이 강제 지름길만 허용',()=>{const g=fill(createGame('individual',2));g.pieces[0][0].pos=5;g.phase='move';g.pending=[{id:4,label:'도',steps:1}];assert.deepEqual(movesFor(g,0).filter(x=>x.piece===0).map(x=>x.to),[21]);assert.throws(()=>move(g,0,0,'outer',0,6));move(g,0,0,'cut5',0,21);assert.equal(g.pieces[0][0].pos,21);});

test('오른쪽 위에서 중앙을 지나면 오른쪽 아래로 이어짐',()=>{
 const fromUpperRight={pos:22,route:'cut5'};
 assert.deepEqual(optionsFor(fromUpperRight,3).map(m=>m.to),[29]);
 const fromCenter={pos:23,route:'cut5'};
 assert.deepEqual(optionsFor(fromCenter,1).map(m=>m.to),[28]);
});
test('왼쪽 위에서 중앙을 지나면 왼쪽 아래로 이어짐',()=>{
 const fromUpperLeft={pos:27,route:'cut10'};
 assert.deepEqual(optionsFor(fromUpperLeft,3).map(m=>m.to),[25]);
 const fromCenter={pos:23,route:'cut10'};
 assert.deepEqual(optionsFor(fromCenter,1).map(m=>m.to),[24]);
});
test('중앙에서 오른쪽 아래로 도착할 때 이동과 잡기',()=>{
 const g=fill(createGame('individual',2));
 g.pieces[0][0]={pos:23,route:'cut5'};g.pieces[1][0].pos=28;
 roll(g,0,50,[1,0,0,0]);
 const opts=movesFor(g,0);assert.equal(opts.length>0,true);
 const option=opts.find(m=>m.piece===0&&m.to===28);assert(option);
 const result=move(g,0,0,option.route,option.rollIndex,option.to);
 assert.equal(result.captured,1);
 assert.equal(g.pieces[1][0].pos,-1);
});
console.log(tests+'개 테스트 통과');

