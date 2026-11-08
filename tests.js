const assert=require('node:assert/strict');const {createGame,teamOf,optionsFor,movesFor,move,roll}=require('./game');
function playable(mode='individual'){const g=createGame(mode);g.players.forEach((p,i)=>p.name=`선수${i+1}`);return g;}
function setMove(g,player,steps=1,bonus=false){g.turn=player;g.roll={steps,bonus};g.phase='move';}
{
 const g=playable();assert.equal(g.players.length,4);assert.equal(g.pieces.length,4);setMove(g,0);assert.equal(movesFor(g,0).length,4);move(g,0,0,'outer');assert.equal(g.pieces[0][0].pos,1);assert.equal(g.turn,1);
}
{
 const g=playable();g.pieces[0][0]={pos:5,route:'outer'};assert.equal(optionsFor(g.pieces[0][0],1).length,2);g.pieces[0][0]={pos:10,route:'outer'};assert.equal(optionsFor(g.pieces[0][0],2).length,2);
}
{
 const g=playable();g.pieces[0][0]={pos:3,route:'outer'};g.pieces[0][1]={pos:3,route:'outer'};g.pieces[2][0]={pos:5,route:'outer'};setMove(g,0,2);const result=move(g,0,0,'outer');assert.equal(result.moved,2);assert.equal(result.captured,1);assert.equal(g.pieces[2][0].pos,-1);assert.equal(g.turn,0);
}
{
 const g=playable();for(let i=0;i<3;i++)g.pieces[0][i]={pos:'FIN',route:'outer'};g.pieces[0][3]={pos:19,route:'outer'};setMove(g,0,4,true);move(g,0,3,'outer');assert.equal(g.winner,0);assert.equal(g.phase,'ended');
}
{
 const g=playable();setMove(g,0,4,true);move(g,0,0,'outer');assert.equal(g.turn,0);
}
{
 const g=playable();const r=roll(g,0);assert(r.steps>=1&&r.steps<=5);assert.equal(g.phase,'move');
}
{
 const g=playable('team');assert.equal(teamOf(g,0),teamOf(g,2));assert.notEqual(teamOf(g,0),teamOf(g,1));setMove(g,0);move(g,0,0,'outer');assert.equal(g.turn,1);
}
{
 const g=playable('team');g.pieces[0][0]={pos:3,route:'outer'};g.pieces[2][0]={pos:5,route:'outer'};g.pieces[1][0]={pos:5,route:'outer'};setMove(g,0,2);const r=move(g,0,0,'outer');assert.equal(r.captured,1);assert.equal(g.pieces[2][0].pos,5);assert.equal(g.pieces[1][0].pos,-1);
}
{
 const g=playable('team');for(const i of [0,2])for(let j=0;j<4;j++)g.pieces[i][j]={pos:'FIN',route:'outer'};g.pieces[2][3]={pos:19,route:'outer'};setMove(g,2,1);move(g,2,3,'outer');assert.equal(g.winner,0);
}
{
 const g=playable('team');for(let j=0;j<3;j++)g.pieces[0][j]={pos:'FIN',route:'outer'};g.pieces[0][3]={pos:19,route:'outer'};setMove(g,0,1);move(g,0,3,'outer');assert.equal(g.winner,null);
}
for(const count of [2,3,4]){
 const g=createGame('individual',count);
 assert.equal(g.players.length,count);
 assert.equal(g.pieces.length,count);
 g.players.forEach((p,i)=>p.name='선수'+i);
 setMove(g,count-1);
 move(g,count-1,0,'outer');
 assert.equal(g.turn,0);
}
{
 const g=createGame('individual',2);
 for(let j=0;j<3;j++)g.pieces[1][j]={pos:'FIN',route:'outer'};
 g.pieces[1][3]={pos:19,route:'outer'};
 setMove(g,1);move(g,1,3,'outer');assert.equal(g.winner,1);
}
assert.throws(()=>createGame('team',3));
assert.throws(()=>createGame('individual',5));
console.log('16개 게임 규칙 테스트 통과');
