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
test('같은 팀 말 잡기 금지',()=>{const g=fill(createGame('team',4));g.pieces[2][0].pos=1;roll(g,0,20,[1,0,0,0]);assert.equal(move(g,0,0,'outer',0,1).captured,0);});
test('갈림길 목적지 옵션',()=>{const o=optionsFor({pos:5,route:'outer'},1);assert.equal(o.length,2);assert.deepEqual(o.map(v=>v.to).sort((a,b)=>a-b),[6,21]);});
test('파워 게이지는 결과 조작하지 않음',()=>{const g=fill(createGame('individual',2));roll(g,0,99,[1,0,0,0]);assert.equal(g.lastPower,99);assert.equal(g.roll.steps,1);});
test('승리 판정',()=>{const g=fill(createGame('individual',2));for(const p of g.pieces[0]){p.pos='FIN';}g.pieces[0][0].pos=19;roll(g,0,45,[1,0,0,0]);move(g,0,0,'outer',0,'FIN');assert.equal(g.winner,0);});
console.log(tests+'개 테스트 통과');
