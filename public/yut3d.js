import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import {buildHalfRoundHull,landingTargetIsValid,restingPose,validateFinalLanding} from './landing-physics.js?v=3.6';

const canvas=document.getElementById('yut-canvas');
const loading=document.getElementById('yut-loading');
if(canvas){
 try{
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d8ba92');
  const camera=new THREE.PerspectiveCamera(35,1,.1,90);
  camera.position.set(0,9.4,8.4);camera.lookAt(0,.14,0);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.37;
  scene.add(new THREE.HemisphereLight(0xfff4db,0x51351d,2.5));
  const key=new THREE.DirectionalLight(0xffe8be,3.15);key.position.set(-3,9,5);
  key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-6;
  key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;
  key.shadow.bias=-.0005;scene.add(key);
  const fill=new THREE.PointLight(0xffdda5,60);fill.position.set(3,4,-1);scene.add(fill);
  const edge=new THREE.MeshStandardMaterial({color:0x6e3c21,roughness:.88});
  const oak=new THREE.MeshStandardMaterial({color:0xab6e38,roughness:.83});
  const topMat=new THREE.MeshStandardMaterial({color:0xe0b47b,roughness:.93});
  for(const [rad,height,y,mat] of [[3.38,.3,-.24,edge],[3.19,.25,-.058,oak],[3.02,.035,.077,topMat]]){
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,height,96),mat);
   mesh.position.y=y;mesh.receiveShadow=true;scene.add(mesh);
  }
  for(let i=0;i<9;i++){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.43+i*.29,.007,4,96),new THREE.MeshBasicMaterial({color:i%2?0x975f32:0xc59760,transparent:true,opacity:.20,depthWrite:false}));
   ring.rotation.x=-Math.PI/2;ring.position.y=.099;scene.add(ring);
  }
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,-10.0,0),allowSleep:true});
  world.solver.iterations=22;world.defaultContactMaterial.friction=.91;
  world.defaultContactMaterial.restitution=.025;
  const floorBody=new CANNON.Body({mass:0,shape:new CANNON.Cylinder(3.06,3.06,.19,36)});
  floorBody.position.set(0,-.014,0);world.addBody(floorBody);
  // Physical rim: every normal throw is constrained inside the circular dish.
  const innerRadius=1.92;
  for(let k=0;k<36;k++){
   const a=k*Math.PI*2/36;
   const wall=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(.28,.17,.09))});
   wall.position.set(Math.sin(a)*3.04,.12,Math.cos(a)*3.04);
   wall.quaternion.setFromEuler(0,a,0);world.addBody(wall);
  }
  const frontMat=new THREE.MeshStandardMaterial({color:0x653b20,roughness:.83});
  const backMat=new THREE.MeshStandardMaterial({color:0xeec991,roughness:.63});
  const edgeMat=new THREE.MeshStandardMaterial({color:0xa66a3c,roughness:.81});
  const ivory=new THREE.MeshStandardMaterial({color:0xffe7b7,roughness:.84});
  const darkDot=new THREE.MeshStandardMaterial({color:0x3a271b,roughness:.9});
  // True half-round cross-section: one broad flat face and one arched wooden back.
  // The old extruded rectangle made all four side faces visually ambiguous.
  function halfRoundGeometry(radius=.245,length=1.28){
   const shape=new THREE.Shape();
   shape.moveTo(-radius,0);
   shape.lineTo(radius,0);
   const n=32;
   for(let j=1;j<=n;j++){
    const theta=Math.PI*j/n;
    shape.lineTo(radius*Math.cos(theta),-radius*Math.sin(theta));
   }
   shape.closePath();
   const geo=new THREE.ExtrudeGeometry(shape,{
    depth:length,steps:1,bevelEnabled:true,bevelThickness:.028,
    bevelSize:.020,bevelSegments:3,curveSegments:32
   });
   geo.translate(0,0,-length/2);
   geo.rotateX(Math.PI/2);
   geo.computeVertexNormals();
   return geo;
  }
  const pieceGeo=halfRoundGeometry();
  const flatInsetGeo=new THREE.PlaneGeometry(.405,1.14);
  const curvedBackMat=new THREE.MeshStandardMaterial({color:0xdca66b,roughness:.70});
  const sticks=[];let lastImpact=0;let landing=null;
  const status=document.createElement('div');status.className='yut-stage-status';canvas.parentElement.appendChild(status);
  const showStatus=(msg,nak=false)=>{status.textContent=msg;status.className='yut-stage-status'+(nak?' nak':'');};
  const faceStrip=document.createElement('div');faceStrip.className='throw-face-strip';canvas.parentElement.appendChild(faceStrip);
  function showFaces(result){
   faceStrip.replaceChildren();
   if(!result||result.nak){faceStrip.classList.remove('show');return;}
   result.bits.forEach((b,i)=>{
    const item=document.createElement('span');item.className='throw-face '+(b?'back':'front');
    item.textContent=(i===3?'★':'')+(b?'뒤':'앞');
    faceStrip.appendChild(item);
   });
   faceStrip.classList.add('show');
  }
  for(let i=0;i<4;i++){
   const body=new CANNON.Body({mass:.4,shape:buildHalfRoundHull(CANNON,.245,1.28),linearDamping:.46,angularDamping:.68,sleepSpeedLimit:.13,sleepTimeLimit:.4});
   world.addBody(body);
   body.addEventListener('collide',event=>{
    if(!landing||landing.phase!=='flight')return;
    const velocity=Math.abs(event.contact?.getImpactVelocityAlongNormal?.()||0);
    const now=performance.now();
    if(velocity>1.1&&now-lastImpact>65){lastImpact=now;window.yutImpact?.(Math.min(velocity/12,1),i%3);}
   });
   const group=new THREE.Group();
   const surfaceTexture=(face)=>{
    const c=document.createElement('canvas');c.width=256;c.height=512;
    const ctx=c.getContext('2d');
    const dark=face==='front';
    const gradient=ctx.createLinearGradient(0,0,256,0);
    gradient.addColorStop(0,dark?'#462514':'#b9854c');
    gradient.addColorStop(.45,dark?'#714223':'#ffe0a3');
    gradient.addColorStop(1,dark?'#3e2316':'#b37a42');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,256,512);
    ctx.strokeStyle=dark?'#eac98e':'#88512d';ctx.lineWidth=9;
    ctx.strokeRect(16,16,224,480);
    ctx.font='bold 140px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=dark?'#fff0c4':'#603618';ctx.fillText(dark?'뒤':'앞',128,245);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({map:t,roughness:.85,side:THREE.DoubleSide});
   };
   const bodyMesh=new THREE.Mesh(pieceGeo,curvedBackMat);bodyMesh.castShadow=true;bodyMesh.receiveShadow=true;group.add(bodyMesh);
   // Flat front is solid dark brown with visible ivory engravings.
   const front=new THREE.Mesh(flatInsetGeo,surfaceTexture('front'));
   front.position.z=.006;group.add(front);
   for(const y of [-.35,0,.35]){
    const notch=new THREE.Mesh(new THREE.BoxGeometry(.21,.022,.008),ivory);notch.position.set(0,y,.016);group.add(notch);
   }

   // Curved back intentionally has no rectangular plane stuck onto it.
   // Engraved marks sit on the flat side only, making the two landing faces obvious.
   if(i===3){
    const specialMat=new THREE.MeshStandardMaterial({color:0xffca37,roughness:.68,side:THREE.DoubleSide});
    const mark=new THREE.Mesh(new THREE.CircleGeometry(.10,32),specialMat);
    mark.position.set(0,-.42,.019);group.add(mark);
    const dot=new THREE.Mesh(new THREE.CircleGeometry(.04,20),darkDot);
    dot.position.set(0,-.42,.021);group.add(dot);
   }
   // Dark, flat face and pale curved back are distinct even while tumbling.
   for(const y of [-.38,.38]){
    const groove=[];
    for(let j=0;j<=28;j++){const a=Math.PI*j/28;groove.push(new THREE.Vector3(.247*Math.cos(a),y,-.247*Math.sin(a)-.003));}
    const line=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(groove),28,.008,5,false),edgeMat);
    group.add(line);
   }
   group.position.set((i-1.5)*.72,.34,(i%2-.5)*1.15);
   scene.add(group);sticks.push({body,mesh:group});
  }
  function placeAtRest(){
   landing=null;showStatus('윷을 던져 주세요');showFaces(null);
   sticks.forEach(({body,mesh},i)=>{
    const bit=i%2===0?1:0;
    const pose=targetRotation(bit,i);
    const restY=bit?.355:.110;
    body.position.set((i-1.5)*.75,restY,(i%2-.5)*1.10);
    body.velocity.setZero();body.angularVelocity.setZero();
    body.quaternion.set(pose.x,pose.y,pose.z,pose.w);body.sleep();
    mesh.position.set(body.position.x,restY,body.position.z);
    mesh.quaternion.copy(pose);
   });
  }
  placeAtRest();
  const totalFlight=2.35,settleDuration=2.65;
  function toss(result,power=50){
   const bits=Array.isArray(result?.bits)?[...result.bits]:[];
   const nak=!!result?.nak;
   if(!validateFinalLanding(result))throw Error('투척 결과와 착지 자세 불일치');
   landing={id:result?.id,bits,nak,label:result?.label||'',backdo:!!result?.backdo,
    start:performance.now(),phase:'flight',snapshot:null,shown:false};
   const charge=Math.max(0,Math.min(1,Number(power)/100||0));
   showStatus('윷을 던지는 중 · 앞뒷면 판정 대기');showFaces(null);
   sticks.forEach(({body},i)=>{
    body.position.set(nak&&i===3?1.42:(i-1.5)*.22,3.25+i*.24,(i%2-.5)*.23);
    body.quaternion.setFromEuler(Math.random()*3,Math.random()*3,Math.random()*3);
    body.velocity.set(nak&&i===3?4.2+charge*1.4:(Math.random()-.5)*2.6,2.3+charge*1.3,(Math.random()-.5)*2.6);
    body.angularVelocity.set((Math.random()-.5)*10,(Math.random()-.5)*10,(Math.random()-.5)*10);
    body.wakeUp();
   });
   if(loading)loading.style.display='none';
  }
  window.yut3d={toss,reset:placeAtRest};
  window.yutImpact=(strength,variant)=>{
   if(localStorage.getItem('yut-muted')==='1')return;
   try{
    const AC=window.AudioContext||window.webkitAudioContext;
    const ctx=window.__yutAudio||(window.__yutAudio=new AC());ctx.resume();
    const t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(190+variant*25,t);
    osc.frequency.exponentialRampToValueAtTime(65,t+.13);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.min(.30,.06+strength*.20),t+.014);
    gain.gain.exponentialRampToValueAtTime(.0001,t+.19);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.20);
   }catch{}
  };
  const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;
   if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};
  window.addEventListener('resize',resize);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(canvas);resize();
  // Server results map to a verified final pose, independent of transient physics motion.
  function targetPosition(i,result){
   const pose=restingPose(result.bits[i]??0,i,!!result.nak);
   return new THREE.Vector3(pose.x,pose.y,pose.z);
  }
  function targetRotation(bit,i){
   const pose=restingPose(bit,i,false);
   return new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.angle,0,0,'XYZ'));
  }
  let last=performance.now();
  function frame(){
   requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
   if(!landing||landing.phase==='flight')world.step(1/60,dt,4);
   const elapsed=landing?(now-landing.start)/1000:0;
   if(landing&&landing.phase==='flight'&&elapsed>=totalFlight){
    landing.phase='settle';
    landing.snapshot=sticks.map(({body})=>({
     position:new THREE.Vector3(body.position.x,body.position.y,body.position.z),
     quaternion:new THREE.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w)
    }));
    sticks.forEach(({body})=>body.sleep());
   }
   sticks.forEach(({body,mesh},i)=>{
    if(!landing||landing.phase==='flight'){
     if(landing){
      // Normal throws never look like a fall off the tray before the authoritative result.
      const radius=Math.hypot(body.position.x,body.position.z);
      if(radius>innerRadius&&!(landing.nak&&i===3)){body.position.x*=innerRadius/radius;body.position.z*=innerRadius/radius;
       body.velocity.x*=-.35;body.velocity.z*=-.35;}
     }
     mesh.position.set(body.position.x,body.position.y,body.position.z);
     mesh.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);
     return;
    }
    const t=Math.min(1,Math.max(0,(elapsed-totalFlight)/settleDuration));
    const smooth=t*t*t*(t*(6*t-15)+10);
    const snap=landing.snapshot[i];
    mesh.position.copy(snap.position).lerp(targetPosition(i,landing),smooth);
    mesh.quaternion.copy(snap.quaternion).slerp(targetRotation(landing.bits[i]||0,i),smooth);
    if(t>=1){mesh.position.copy(targetPosition(i,landing));mesh.quaternion.copy(targetRotation(landing.bits[i]||0,i));}
   });
   if(landing&&!landing.shown&&elapsed>=totalFlight+settleDuration){
    landing.shown=true;landing.phase='done';
    const up=new THREE.Vector3(0,1,0);
    const poses=sticks.map(({mesh},i)=>{
     const faceUp=new THREE.Vector3(0,0,1).applyQuaternion(mesh.quaternion).dot(up);
     const distance=Math.hypot(mesh.position.x,mesh.position.z);
     return {inside:distance<2.68,topFace:faceUp>.90?1:faceUp<-.90?0:null};
    });
    if(!landingTargetIsValid(landing,poses))console.warn('Yut landing mismatch',landing,poses);
    showFaces(landing);
    showStatus(landing.nak?'낙! 1개가 원형판 밖 · 무효':
     `${landing.label} · 앞면 ${4-landing.bits.filter(Boolean).length} / 뒷면 ${landing.bits.filter(Boolean).length} · 정상 착지`,landing.nak);
    window.yutThrowSettled?.({id:landing.id,label:landing.label,nak:landing.nak,bits:landing.bits});
   }
   renderer.render(scene,camera);
  }
  frame();if(loading)loading.style.display='none';
  if(window.__latestYutThrow)window.yut3d.toss(window.__latestYutThrow.result,window.__latestYutThrow.power);
 }catch(err){console.error('3D yut setup:',err);if(loading)loading.textContent='3D 로딩 오류 · 텍스트 판정을 확인해 주세요.';}
}
