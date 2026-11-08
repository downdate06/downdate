import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const canvas=document.getElementById('yut-canvas');
const loading=document.getElementById('yut-loading');
if(canvas){
 try{
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d8ba92');
  const camera=new THREE.PerspectiveCamera(35,1,.1,90);
  camera.position.set(0,8.5,7.7);camera.lookAt(0,.18,0);
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
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,-10.5,0),allowSleep:true});
  world.solver.iterations=20;world.defaultContactMaterial.friction=.68;
  world.defaultContactMaterial.restitution=.42;
  const floorBody=new CANNON.Body({mass:0,shape:new CANNON.Cylinder(3.06,3.06,.19,36)});
  floorBody.position.set(0,-.014,0);world.addBody(floorBody);
  // Physical rim: every normal throw is constrained inside the circular dish.
  const innerRadius=2.86;
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
  const stickShape=new THREE.Shape();
  stickShape.moveTo(-.18,-.64);stickShape.quadraticCurveTo(-.25,-.64,-.25,-.52);
  stickShape.lineTo(-.25,.52);stickShape.quadraticCurveTo(-.25,.64,-.17,.64);
  stickShape.lineTo(.17,.64);stickShape.quadraticCurveTo(.25,.64,.25,.52);
  stickShape.lineTo(.25,-.52);stickShape.quadraticCurveTo(.25,-.64,.18,-.64);
  stickShape.closePath();
  const pieceGeo=new THREE.ExtrudeGeometry(stickShape,{depth:.30,bevelEnabled:true,bevelSize:.035,bevelThickness:.055,bevelSegments:4,curveSegments:10});
  pieceGeo.translate(0,0,-.15);
  const sticks=[];let lastImpact=0;let landing=null;
  const status=document.createElement('div');status.className='yut-stage-status';canvas.parentElement.appendChild(status);
  const showStatus=(msg,nak=false)=>{status.textContent=msg;status.className='yut-stage-status'+(nak?' nak':'');};
  for(let i=0;i<4;i++){
   const body=new CANNON.Body({mass:.4,shape:new CANNON.Box(new CANNON.Vec3(.23,.63,.17)),linearDamping:.21,angularDamping:.19});
   world.addBody(body);
   body.addEventListener('collide',event=>{
    if(!landing||landing.phase!=='flight')return;
    const velocity=Math.abs(event.contact?.getImpactVelocityAlongNormal?.()||0);
    const now=performance.now();
    if(velocity>1.1&&now-lastImpact>65){lastImpact=now;window.yutImpact?.(Math.min(velocity/12,1),i%3);}
   });
   const group=new THREE.Group();
   const bodyMesh=new THREE.Mesh(pieceGeo,edgeMat);bodyMesh.castShadow=true;bodyMesh.receiveShadow=true;group.add(bodyMesh);
   // Flat front is solid dark brown with visible ivory engravings.
   const front=new THREE.Mesh(new THREE.PlaneGeometry(.39,1.14),frontMat);
   front.position.z=.207;group.add(front);
   for(const y of [-.35,0,.35]){
    const notch=new THREE.Mesh(new THREE.BoxGeometry(.21,.022,.008),ivory);notch.position.set(0,y,.216);group.add(notch);
   }
   const stripe=new THREE.Mesh(new THREE.BoxGeometry(.027,1.0,.008),ivory);
   stripe.position.set(0,0,.217);group.add(stripe);
   // Pale back: distinctly different from the front and slightly curved.
   const back=new THREE.Mesh(new THREE.PlaneGeometry(.39,1.14),backMat);
   back.rotation.y=Math.PI;back.position.z=-.212;group.add(back);
   if(i===0){const specialMat=new THREE.MeshStandardMaterial({color:0xedb92d,roughness:.76});
    const mark=new THREE.Mesh(new THREE.CircleGeometry(.12,32),specialMat);
    mark.position.set(0,-.43,.227);group.add(mark);
    const dot=new THREE.Mesh(new THREE.CircleGeometry(.045,20),darkDot);
    dot.position.set(0,-.43,.229);group.add(dot);}
   group.position.set((i-1.5)*.72,.34,(i%2-.5)*1.15);
   scene.add(group);sticks.push({body,mesh:group});
  }
  function placeAtRest(){
   landing=null;showStatus('윷을 던져 주세요');
   sticks.forEach(({body,mesh},i)=>{
    body.position.set((i-1.5)*.75,.35,(i%2-.5)*1.10);
    body.velocity.setZero();body.angularVelocity.setZero();body.sleep();
    mesh.position.set(body.position.x,.32,body.position.z);
    mesh.rotation.set(Math.PI/2,0,(i-1.5)*.12);
   });
  }
  placeAtRest();
  const totalFlight=3.65,settleDuration=1.35;
  function toss(result,power=50){
   const bits=Array.isArray(result?.bits)?[...result.bits]:[];
   const nak=!!result?.nak;
   landing={id:result?.id,bits,nak,label:result?.label||'',backdo:!!result?.backdo,
    start:performance.now(),phase:'flight',snapshot:null,shown:false,nudges:0};
   const charge=Math.max(0,Math.min(1,Number(power)/100||0));
   showStatus('윷을 던지는 중 · 착지 대기');
   sticks.forEach(({body},i)=>{
    body.position.set((i-1.5)*.23,3.65+i*.2,(i%2-.5)*.25);
    body.quaternion.setFromEuler(Math.random()*3,Math.random()*3,Math.random()*3);
    body.velocity.set((Math.random()-.5)*2.1,2.2+charge*1.2,(Math.random()-.5)*2.1);
    body.angularVelocity.set((Math.random()-.5)*20,(Math.random()-.5)*16,(Math.random()-.5)*20);
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
  function targetPosition(i,nak){
   if(nak&&i===3)return new THREE.Vector3(3.72,.235,.10);
   const x=[-.85,.85,-.82,.85][i],z=[-.95,-.88,.85,.98][i];
   return new THREE.Vector3(x,.235,z);
  }
  function targetRotation(bit,i){
   // Flat face is at local +Z; bit=1 faces upward, bit=0 exposes the pale back.
   return new THREE.Quaternion().setFromEuler(new THREE.Euler(bit?-Math.PI/2:Math.PI/2,0,(i-1.5)*.14));
  }
  let last=performance.now();
  function frame(){
   requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
   if(!landing||landing.phase==='flight')world.step(1/60,dt,4);
   const elapsed=landing?(now-landing.start)/1000:0;
   if(landing&&landing.phase==='flight'&&landing.nudges<2&&elapsed>1.45+landing.nudges*.86){
    landing.nudges++;
    sticks.forEach(({body},i)=>{
     // A pair of rolling impulses simulates the staggered clatter seen in the reference clips.
     body.wakeUp();
     const a=i*2.399+landing.nudges*.65;
     body.applyImpulse(new CANNON.Vec3(Math.cos(a)*.37,.22,Math.sin(a)*.37),body.position);
     body.angularVelocity.x+=(i%2?1:-1)*4;
     body.angularVelocity.z+=(i%2?-1:1)*3.4;
    });
   }
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
      if(radius>innerRadius){body.position.x*=innerRadius/radius;body.position.z*=innerRadius/radius;
       body.velocity.x*=-.35;body.velocity.z*=-.35;}
     }
     mesh.position.set(body.position.x,body.position.y,body.position.z);
     mesh.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);
     return;
    }
    const t=Math.min(1,Math.max(0,(elapsed-totalFlight)/settleDuration));
    const smooth=t*t*(3-2*t);
    const snap=landing.snapshot[i];
    mesh.position.copy(snap.position).lerp(targetPosition(i,landing.nak),smooth);
    mesh.quaternion.copy(snap.quaternion).slerp(targetRotation(landing.bits[i]||0,i),smooth);
   });
   if(landing&&!landing.shown&&elapsed>=totalFlight+settleDuration){
    landing.shown=true;landing.phase='done';
    showStatus(landing.nak?'낙! 1개가 원형판 밖 · 무효':
     `${landing.label} · 네 개 모두 판 안에 정상 착지`,landing.nak);
    window.yutThrowSettled?.({id:landing.id,label:landing.label,nak:landing.nak,bits:landing.bits});
   }
   renderer.render(scene,camera);
  }
  frame();if(loading)loading.style.display='none';
  if(window.__latestYutThrow)window.yut3d.toss(window.__latestYutThrow.result,window.__latestYutThrow.power);
 }catch(err){console.error('3D yut setup:',err);if(loading)loading.textContent='3D 로딩 오류 · 텍스트 판정을 확인해 주세요.';}
}
