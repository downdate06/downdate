import assert from 'node:assert/strict';
import {makeCrossSection,buildHalfRoundHull,landingTargetIsValid,restingPose,validateFinalLanding} from './public/landing-physics.js';
class Vec3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 vsub(b){return new Vec3(this.x-b.x,this.y-b.y,this.z-b.z);}
 cross(b){return new Vec3(this.y*b.z-this.z*b.y,this.z*b.x-this.x*b.z,this.x*b.y-this.y*b.x);}
 dot(b){return this.x*b.x+this.y*b.y+this.z*b.z;}
 vadd(b,out){out.x=this.x+b.x;out.y=this.y+b.y;out.z=this.z+b.z;return out;}
 scale(t,out){out.x=this.x*t;out.y=this.y*t;out.z=this.z*t;return out;}
}
class ConvexPolyhedron {constructor(args){Object.assign(this,args);}}
const hull=buildHalfRoundHull({Vec3,ConvexPolyhedron});
assert.equal(hull.vertices.length,30);
assert.equal(hull.faces.length,17);
let checked=0;
for(const indices of hull.faces){
 const [a,b,c]=indices.slice(0,3).map(i=>hull.vertices[i]);
 const normal=b.vsub(a).cross(c.vsub(a));
 assert(normal.dot(normal)>1e-8,'non-degenerate face');
 for(const v of hull.vertices)assert(normal.dot(v.vsub(a))<1e-6,'convex outward face');
 checked++;
}
assert.equal(makeCrossSection(.245,14)[0][1],0);
assert(landingTargetIsValid({bits:[1,0,1,0],nak:false},[1,0,1,0].map(topFace=>({inside:true,topFace}))));
assert(!landingTargetIsValid({bits:[1,1,1,0],nak:false},[1,0,1,0].map(topFace=>({inside:true,topFace}))));
assert(landingTargetIsValid({nak:true},[true,true,true,false].map(inside=>({inside,topFace:0}))));
assert(!landingTargetIsValid({nak:true},[true,true,true,true].map(inside=>({inside,topFace:0}))));
for(let mask=0;mask<16;mask++){
 const bits=[0,1,2,3].map(i=>(mask>>i)&1);
 assert(validateFinalLanding({bits,nak:false}));
 for(let i=0;i<4;i++){
  const pose=restingPose(bits[i],i);
  assert(Math.hypot(pose.x,pose.z)<2);
  assert(Math.abs(Math.sin(pose.angle)+(bits[i]?1:-1))<1e-10);
 }
}
assert(validateFinalLanding({bits:[],nak:true}));
assert(!validateFinalLanding({bits:[1,0,0],nak:false}));
console.log(`물리 충돌체 ${checked}개 외향 면, 16개 모든 앞뒤 조합과 낙의 최종 착지 자세 검사 통과`);
