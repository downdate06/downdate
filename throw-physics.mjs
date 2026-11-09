import { randomBytes } from 'node:crypto';

const RADIUS=2.95;
const STEP=1/60;
const TOTAL=330;
const ROUND=n=>Math.round(n*10000)/10000;
const TWO_PI=2*Math.PI;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const wrap=a=>((a+Math.PI)%TWO_PI+TWO_PI)%TWO_PI-Math.PI;
function seeded(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function quat(yaw,spin,lean=0){
  // World yaw, then longitudinal end-over-end tumble, then slight lean.
  const a=yaw/2,b=spin/2,c=lean/2;
  const qy=[0,Math.sin(a),0,Math.cos(a)],qx=[Math.sin(b),0,0,Math.cos(b)],qz=[0,0,Math.sin(c),Math.cos(c)];
  const mul=(u,v)=>[
    u[3]*v[0]+u[0]*v[3]+u[1]*v[2]-u[2]*v[1],
    u[3]*v[1]-u[0]*v[2]+u[1]*v[3]+u[2]*v[0],
    u[3]*v[2]+u[0]*v[1]-u[1]*v[0]+u[2]*v[3],
    u[3]*v[3]-u[0]*v[0]-u[1]*v[1]-u[2]*v[2]
  ];
  return mul(mul(qy,qx),qz);
}
function restingSpin(angle){
  // Both flat and curved sides are stable; the narrow edge between them is not.
  // Move to the nearest physically stable half-cylinder resting orientation.
  return Math.round((angle-Math.PI/2)/Math.PI)*Math.PI+Math.PI/2;
}
function pose(stick){
  const q=quat(stick.yaw,stick.spin,stick.lean);
  return [ROUND(stick.x),ROUND(stick.y),ROUND(stick.z),...q.map(ROUND)];
}
function endsOutside(stick){
  const half=.64;
  const dx=Math.sin(stick.yaw)*half,dz=Math.cos(stick.yaw)*half;
  return Math.hypot(stick.x+dx,stick.z+dz)>RADIUS || Math.hypot(stick.x-dx,stick.z-dz)>RADIUS;
}
function throwOnce(power,seed){
  const random=seeded(seed),range=(lo,hi)=>lo+(hi-lo)*random();
  const force=clamp(Number(power)||0,0,100)/100;
  const sticks=Array.from({length:4},(_,i)=>({
    x:(i-1.5)*.47,z:(i%2-.5)*.58,y:range(1.4,1.85)+i*.07,
    vx:range(-.85,.85)*(1+force*.7),vz:range(-.85,.85)*(1+force*.7),vy:range(2.2,3.5)+force*1.0,
    spin:range(-2.7,2.7),omega:range(-14,-9)*(random()<.5?-1:1),yaw:range(-1.5,1.5),yawRate:range(-3.8,3.8),lean:range(-.12,.12),
    off:false,settled:false,bounces:0
  }));
  const frames=[];
  for(let step=0;step<=TOTAL;step++){
    if(step>0){
      const t=step*STEP;
      for(const b of sticks){
        b.vy-=13.5*STEP;
        b.x+=b.vx*STEP;b.z+=b.vz*STEP;b.y+=b.vy*STEP;
        b.yaw+=b.yawRate*STEP;b.spin+=b.omega*STEP;
        // The circular lip is lower than the playable surface: once off the disc,
        // the piece drops to the catch surface rather than being labelled 'nak' by a random chance.
        if(!b.off && b.y<=.27 && endsOutside(b))b.off=true;
        const orientationHeight=.115+.13*(1-Math.sin(b.spin))/2;
        const contactY=b.off?-.56:orientationHeight;
        if(b.y<=contactY){
          b.y=contactY;
          if(b.vy<-.29){
            b.vy=-b.vy*(b.off?.12:.21);
            b.bounces++;
            b.omega+=range(-.7,.7);
            b.vx*=.80;b.vz*=.80;
          }else b.vy=0;
          const friction=b.off?.965:.955;
          b.vx*=friction;b.vz*=friction;
          b.yawRate*=.94;
          b.omega*=.965;
          // A half-round stick rolls off its narrow side until either the flat face
          // or convex back lies horizontal. Integrate a damped restoring torque;
          // never translate or rotate pieces after the simulation to fake a result.
          const target=restingSpin(b.spin);
          const displacement=wrap(target-b.spin);
          b.omega+=displacement*13*STEP;
          b.omega*=.955;
          b.spin+=displacement*.025;
          b.lean*=.94;
          if(Math.abs(displacement)<.009 && Math.abs(b.omega)<.024){b.spin=target;b.omega=0;}
        }else{
          b.omega*=.999;b.yawRate*=.999;
        }
      }
      // Approximated lateral collision between wooden sticks while near tray level.
      // This gives visible knock-on contact without an artificial second bounce impulse.
      for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
        const a=sticks[i],b=sticks[j];
        if(Math.abs(a.y-b.y)>.30)continue;
        const dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz);
        if(dist>=.39||dist<1e-7)continue;
        const nx=dx/dist,nz=dz/dist,overlap=(.39-dist)*.5;
        a.x-=nx*overlap;b.x+=nx*overlap;
        a.z-=nz*overlap;b.z+=nz*overlap;
        const rel=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;
        if(rel<0){const impulse=-.19*rel;
          a.vx-=nx*impulse;b.vx+=nx*impulse;
          a.vz-=nz*impulse;b.vz+=nz*impulse;
          a.omega+=impulse*.25;b.omega-=impulse*.25;
        }
      }
    }
    if(step%3===0)frames.push(sticks.map(pose));
  }
  const outside=sticks.map(b=>b.off||endsOutside(b));
  const bits=sticks.map(b=>-Math.sin(b.spin)>=0?1:0);
  return {frames,bits,nak:outside.some(Boolean),outside,durationMs:TOTAL*1000/60,
    physics:'server-ground-contact',seed};
}
export function simulateThrow(power=50,seed=randomBytes(4).readUInt32LE(0)){
  return throwOnce(power,seed);
}
export function checkLanding(result){
  if(!result?.frames?.length)return {valid:false,error:'missing trajectory'};
  const last=result.frames.at(-1),disc=last.map((a,i)=>({
    inside:!result.outside[i],
    // For pure X/Y rotation, the face normal's vertical component is -sin(spin).
    normalY:2*(a[4]*a[5]-a[6]*a[3]),
    bit:result.bits[i]
  }));
  return {valid:disc.every(a=>Number.isFinite(a.normalY)),outsideCount:result.outside.filter(Boolean).length,disc};
}
