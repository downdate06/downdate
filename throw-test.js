const assert=require('node:assert/strict');
const {powerAt,facesFor}=require('./public/throw-logic.js');
for(const [ms,expected] of [[0,0],[350,25],[700,50],[1050,75],[1400,100],[1750,75],[2100,50],[2450,25],[2800,0],[3150,25],[4200,100]]){
 assert.equal(Math.round(powerAt(ms)),expected,`게이지 ${ms}ms`);
}
const backdo=facesFor({bits:[0,0,0,1],nak:false});
assert.deepEqual(backdo.faces.map(({name})=>name),['앞','앞','앞','뒤']);
assert.equal(backdo.front,3);assert.equal(backdo.back,1);
assert.equal(backdo.faces[3].special,true);
assert.equal(facesFor({bits:[],nak:true}).nak,true);
for(let mask=0;mask<16;mask++){
 const bits=[0,1,2,3].map(i=>(mask>>i)&1);
 const faces=facesFor({bits,nak:false});
 assert.equal(faces.front+faces.back,4);
 assert.equal(faces.back,bits.reduce((a,b)=>a+b,0));
}
console.log('파워 게이지 왕복 및 16개 윷 결과 앞뒷면 표시 테스트 통과');
