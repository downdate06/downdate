import assert from 'node:assert/strict';
import {simulateThrow,checkLanding} from './throw-physics.mjs';
let naks=0,fronts=0,throws=240;
for(let n=0;n<throws;n++){
 const r=simulateThrow([0,50,100][n%3],n+1337);
 assert(r.frames.length>=2&&r.frames.length<111,'Static end frames should be trimmed');
 assert.equal(r.durationMs,(r.frames.length-1)*50);
 assert.equal(r.frames.at(-1).length,4);
 assert(r.frames.every(f=>f.every(v=>v.length===7&&v.every(Number.isFinite))));
 assert.equal(r.nak,r.outside.some(Boolean));
 const evaluation=checkLanding(r);
 assert(evaluation.valid);
 for(const f of evaluation.disc){
  assert(Math.abs(f.normalY)>.85,'Final stick must lie on front/back face');
  assert.equal(f.normalY>=0?1:0,f.bit,'Visual face must match ruling');
  fronts+=f.bit;
 }
 const first=r.frames.at(-2),last=r.frames.at(-1);
 for(let i=0;i<4;i++)assert(Math.hypot(last[i][0]-first[i][0],last[i][1]-first[i][1],last[i][2]-first[i][2])<.03,'Throw has not settled');
 naks+=r.nak;
}
assert(naks<throws*.18,`Excessive nak rate: ${naks}/${throws}`);
assert(naks>0,'The edge case should still be possible');
assert(fronts>50&&fronts<throws*4-50,'Throw faces should vary');
console.log(`PASS ${throws} simulated throws · nak ${naks} (${(naks/throws*100).toFixed(1)}%) · visible faces/official outcomes/settling consistent`);
