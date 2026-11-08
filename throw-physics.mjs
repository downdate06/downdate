import * as CANNON from 'cannon-es';
import { randomBytes } from 'node:crypto';

const RADIUS=2.95;
const MIN_STEPS=180;
const MAX_STEPS=480;
const DT=1/60;
const ROUND=n=>Math.round(n*10000)/10000;
const random=()=>randomBytes(4).readUInt32LE(0)/0x100000000;
const between=(a,b)=>a+(b-a)*random();

function halfRoundShape(radius=.245,length=1.28){
  const cross=[[-radius,0],[radius,0]];
  for(let i=1;i<14;i++){const a=Math.PI*i/14;cross.push([radius*Math.cos(a),-radius*Math.sin(a)]);}
  const n=cross.length;
  const vertices=[];
  for(const y of [-length/2,length/2])for(const [x,z] of cross)vertices.push(new CANNON.Vec3(x,y,z));
  const faces=[];
  function add(indices){
    const a=vertices[indices[0]],b=vertices[indices[1]],c=vertices[indices[2]];
    const normal=b.vsub(a).cross(c.vsub(a));
    const center=new CANNON.Vec3();
    indices.forEach(k=>center.vadd(vertices[k],center));center.scale(1/indices.length,center);
    if(normal.dot(center)<0)indices.reverse();faces.push(indices);
  }
  add(Array.from({length:n},(_,i)=>i));add(Array.from({length:n},(_,i)=>n+i));
  for(let i=0;i<n;i++)add([i,(i+1)%n,n+(i+1)%n,n+i]);
  return new CANNON.ConvexPolyhedron({vertices,faces});
}
function evaluate(bodies){
  const faces=[],outside=[],standing=[];
  for(const body of bodies){
    const up=body.quaternion.vmult(new CANNON.Vec3(0,0,1));
    const long=body.quaternion.vmult(new CANNON.Vec3(0,1,0));
    const longAxis=body.quaternion.vmult(new CANNON.Vec3(0,.64,0));
    const endA=Math.hypot(body.position.x+longAxis.x,body.position.z+longAxis.z);
    const endB=Math.hypot(body.position.x-longAxis.x,body.position.z-longAxis.z);
    const off=Math.max(endA,endB)>RADIUS+.03 || body.position.y<-.45;
    outside.push(off);
    const flat=Math.abs(up.y);
    const invalid=flat<.74||Math.abs(long.y)>.80;
    standing.push(invalid);
    faces.push(up.y>=0?1:0);
  }
  return {bits:faces,nak:outside.some(Boolean),standing:standing.some(Boolean),outside};
}
export function simulateOne(power=50){
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,-11.7,0),allowSleep:false});
  world.solver.iterations=22;
  const floorMaterial=new CANNON.Material('tray');const woodMaterial=new CANNON.Material('stick');
  world.addContactMaterial(new CANNON.ContactMaterial(woodMaterial,floorMaterial,{friction:.92,restitution:.10}));
  world.addContactMaterial(new CANNON.ContactMaterial(woodMaterial,woodMaterial,{friction:.62,restitution:.16}));
  const floor=new CANNON.Body({mass:0,material:floorMaterial,shape:new CANNON.Cylinder(RADIUS,RADIUS,.20,48)});
  floor.position.set(0,-.03,0);world.addBody(floor);
  // A catch surface below the wooden tray allows a real physical off-tray landing.
  const catchFloor=new CANNON.Body({mass:0,material:floorMaterial,
    shape:new CANNON.Box(new CANNON.Vec3(7,.10,7))});
  catchFloor.position.set(0,-.72,0);world.addBody(catchFloor);
  // Outside the throwing tray there is no supporting floor. A stick can truly fall off.
  const hull=halfRoundShape();const bodies=[];
  const intensity=Math.max(0,Math.min(1,Number(power)/100||0));
  for(let i=0;i<4;i++){
    const body=new CANNON.Body({mass:.38,material:woodMaterial,shape:hull,linearDamping:.30,angularDamping:.52});
    body.position.set((i-1.5)*.36,2.15+i*.16,between(-.18,.18));
    body.quaternion.setFromEuler(between(-2.7,2.7),between(-2.7,2.7),between(-2.7,2.7));
    body.velocity.set(between(-1.9,1.9)*(0.7+intensity),between(1.7,3.1)+intensity*1.5,between(-1.9,1.9)*(0.7+intensity));
    body.angularVelocity.set(between(-11,11),between(-13,13),between(-10,10));
    world.addBody(body);bodies.push(body);
  }
  const frames=[];
  const snapshot=()=>bodies.map(b=>[
    ROUND(b.position.x),ROUND(b.position.y),ROUND(b.position.z),
    ROUND(b.quaternion.x),ROUND(b.quaternion.y),ROUND(b.quaternion.z),ROUND(b.quaternion.w)
  ]);
  let stableFrames=0;
  let settled=false,lastStep=0;
  for(let step=0;step<=MAX_STEPS;step++){
    lastStep=step;
    if(step>0)world.step(DT);
    if(step%3===0)frames.push(snapshot());
    if(step>=MIN_STEPS){
      const stable=bodies.every(b=>b.velocity.length()<.23&&b.angularVelocity.length()<.25);
      stableFrames=stable?stableFrames+1:0;
      if(stableFrames>=30){settled=true;break;}
    }
  }
  if(lastStep%3!==0)frames.push(snapshot());
  return {frames,landing:evaluate(bodies),settled};
}
export function simulateThrow(power=50){
  // A real edge-stand is not counted as a front/back result. Re-simulate a fresh throw
  // rather than rotating or translating the landed sticks to fabricate a result.
  for(let attempt=0;attempt<12;attempt++){
    const attemptResult=simulateOne(power);
    if(attemptResult.settled && (attemptResult.landing.nak||!attemptResult.landing.standing))return {
      frames:attemptResult.frames,bits:attemptResult.landing.bits,nak:attemptResult.landing.nak,
      durationMs:(attemptResult.frames.length-1)*50,physics:'server-simulated',attempts:attempt+1
    };
  }
  throw Error('윷이 옆면에서 멈춰 판정할 수 없습니다. 다시 던져 주세요.');
}
