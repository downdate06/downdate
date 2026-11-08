import assert from 'node:assert/strict';
import {simulateThrow} from './throw-physics.mjs';
for(let n=0;n<3;n++){
 const r=simulateThrow(15+n*30);
 assert(r.frames.length>=50);
 assert(r.frames.every(f=>f.length===4&&f.every(v=>v.length===7&&v.every(Number.isFinite))));
 assert(r.nak||r.bits.length===4);
 const final=r.frames.at(-1);
 for(let i=0;i<4;i++){
  const [x,y,z,qx,qy,qz,qw]=final[i];
  const normalY=2*(qy*qz-qw*qx);
  if(!r.nak){
   assert(Math.abs(normalY)>.70,`stick ${i} landed on side`);
   assert.equal(normalY>=0?1:0,r.bits[i]);
  }
  assert(Number.isFinite(x+y+z+qx+qy+qz+qw));
 }
}
console.log('Server 3D throw simulation sanity tests passed');
