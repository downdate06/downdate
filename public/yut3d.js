import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const canvas=document.getElementById('yut-canvas');
const loading=document.getElementById('yut-loading');
if(canvas){
 try{
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#e2c69b');
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(0,8.7,7.4);camera.lookAt(0,.05,0);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.38;
  scene.add(new THREE.HemisphereLight(0xfff2da,0x49331d,2.8));
  const key=new THREE.DirectionalLight(0xffedc8,3.2);
  key.position.set(-2.5,9,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;
  key.shadow.bias=-.00065;scene.add(key);
  const fill=new THREE.PointLight(0xffdeb0,70);fill.position.set(3.5,3,-2.2);scene.add(fill);
  const oak=new THREE.MeshStandardMaterial({color:0xb67b40,roughness:.8});
  const edge=new THREE.MeshStandardMaterial({color:0x714222,roughness:.85});
  const surface=new THREE.MeshStandardMaterial({color:0xe3b877,roughness:.92});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(3.37,3.37,.29,96),edge);
  base.position.y=-.22;base.receiveShadow=true;scene.add(base);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,.22,96),oak);
  rim.position.y=-.052;rim.receiveShadow=true;scene.add(rim);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(3.04,3.04,.018,96),surface);
  top.position.y=.065;top.receiveShadow=true;scene.add(top);
  for(let i=0;i<9;i++){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.45+i*.28,.009,5,96),new THREE.MeshBasicMaterial({color:i%2?0x8f5e36:0xb68a57,transparent:true,opacity:.19}));
   ring.rotation.x=-Math.PI/2;ring.position.y=.078;scene.add(ring);
  }
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,-24,0),allowSleep:true});
  world.solver.iterations=18;world.defaultContactMaterial.friction=.58;world.defaultContactMaterial.restitution=.19;
  const floor=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(3.6,.12,3.6)),position:new CANNON.Vec3(0,-.085,0)});world.addBody(floor);
  const pale=new THREE.MeshStandardMaterial({color:0xf4d19b,roughness:.62});
  const flatMat=new THREE.MeshStandardMaterial({color:0x6e4126,roughness:.81});
  const scar=new THREE.MeshStandardMaterial({color:0xf8deb0,roughness:.83});
  const endMat=new THREE.MeshStandardMaterial({color:0x9a6039,roughness:.87});
  const sticks=[];let landing=null;let lastImpact=0;
  const status=document.createElement('div');status.className='yut-stage-status';canvas.parentElement.appendChild(status);
  function showStatus(text,nak=false){status.className='yut-stage-status'+(nak?' nak':'');status.textContent=text;}
  const geometry=(()=>{
   const profile=new THREE.Shape();
   profile.moveTo(-.21,.13);profile.lineTo(.21,.13);
   profile.bezierCurveTo(.22,-.10,.13,-.225,0,-.23);
   profile.bezierCurveTo(-.13,-.225,-.22,-.10,-.21,.13);
   const mesh=new THREE.ExtrudeGeometry(profile,{depth:1.22,steps:1,bevelEnabled:true,bevelThickness:.09,bevelSize:.045,bevelSegments:5,curveSegments:16});
   mesh.rotateX(Math.PI/2);mesh.translate(0,.61,0);mesh.computeVertexNormals();return mesh;
  })();
  for(let i=0;i<4;i++){
   const b=new CANNON.Body({mass:.38,shape:new CANNON.Box(new CANNON.Vec3(.22,.68,.22)),linearDamping:.2,angularDamping:.18});
   world.addBody(b);
   b.addEventListener('collide',ev=>{
    const strength=Math.abs(ev.contact?.getImpactVelocityAlongNormal?.()||0);
    const now=performance.now();
    if(strength>1.4&&now-lastImpact>65){lastImpact=now;window.yutImpact?.(Math.min(strength/11,1),i%3);}
   });
   const root=new THREE.Group();
   const half=new THREE.Mesh(geometry,[pale,endMat]);half.castShadow=true;half.receiveShadow=true;root.add(half);
   const face=new THREE.Mesh(new THREE.PlaneGeometry(.30,1.04),flatMat);
   face.position.z=.142;root.add(face);
   for(const y of [-.36,0,.36]){
    const nick=new THREE.Mesh(new THREE.BoxGeometry(.21,.018,.009),scar);nick.position.set(0,y,.15);root.add(nick);
   }
   const groove=new THREE.Mesh(new THREE.BoxGeometry(.025,.89,.009),scar);groove.position.set(0,0,.152);root.add(groove);
   if(i===0){const special=new THREE.Mesh(new THREE.TorusGeometry(.07,.015,6,24),scar);special.position.set(0,-.43,.157);root.add(special);}
   scene.add(root);sticks.push({body:b,mesh:root});
  }
  function reset(){
   landing=null;showStatus('윷을 던져 주세요');
   sticks.forEach(({body},i)=>{
    body.position.set((i-1.5)*.65,.38,(i%2-.5)*.62);
    body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);
    body.quaternion.setFromEuler(-Math.PI/2,0,(i-1.5)*.17);body.sleep();
   });
  }
  reset();
  const landingPos=i=>new THREE.Vector3((i-1.5)*.91,.28,i%2===0?-.55:.55);
  const landingRot=(bit,i)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(bit?-Math.PI/2:Math.PI/2,0,(i-1.5)*.17,'XYZ'));
  function toss(result,power=50){
   const bits=Array.isArray(result?.bits)?result.bits.slice():[];
   const isNak=!!result?.nak;
   landing={id:result?.id,bits,step:result?.steps,label:result?.label||'',nak:isNak,t:performance.now(),snapshot:null,shown:false};
   const p=Math.min(100,Math.max(0,Number(power)||0))/100;
   showStatus('투척 중 · 윷이 착지하고 있습니다');
   sticks.forEach(({body},i)=>{
    body.position.set((i-1.5)*.24,1.8+i*.17,(i%2-.5)*.25);
    body.quaternion.setFromEuler(Math.random()*5,Math.random()*6,Math.random()*6);
    body.velocity.set((Math.random()-.5)*1.1,3.1+p*2.4,(Math.random()-.5)*1.1);
    body.angularVelocity.set((Math.random()-.5)*13,(Math.random()-.5)*16,(Math.random()-.5)*13);
    body.wakeUp();
   });
   if(loading)loading.style.display='none';
  }
  window.yut3d={toss,reset};
  window.yutImpact=(strength,variant)=>{
   if(localStorage.getItem('yut-muted')==='1')return;
   try{
    const AC=window.AudioContext||window.webkitAudioContext;
    const ctx=window.__yutAudio||(window.__yutAudio=new AC());ctx.resume();
    const t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(190+variant*25,t);osc.frequency.exponentialRampToValueAtTime(70,t+.105);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.min(.22,.035+strength*.17),t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.15);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.16);
   }catch{}
  };
  const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};
  window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);resize();
  let last=performance.now();
  function frame(){
   requestAnimationFrame(frame);
   const now=performance.now(),dt=Math.min(.04,(now-last)/1000);last=now;
   if(!landing||!landing.snapshot)world.step(1/60,dt,3);
   const elapsed=landing?(now-landing.t)/1000:0;
   if(landing && elapsed>.72&&!landing.snapshot){
    landing.snapshot=sticks.map(({body})=>({position:new THREE.Vector3(body.position.x,body.position.y,body.position.z),rotation:new THREE.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w)}));
    sticks.forEach(({body})=>body.sleep());
   }
   sticks.forEach(({mesh,body},i)=>{
    if(!landing||!landing.snapshot){
     mesh.position.set(body.position.x,body.position.y,body.position.z);
     mesh.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);
     if(landing){mesh.position.x=THREE.MathUtils.clamp(mesh.position.x,-1.85,1.85);mesh.position.z=THREE.MathUtils.clamp(mesh.position.z,-1.85,1.85);}
     return;
    }
    const t=THREE.MathUtils.clamp((elapsed-.72)/.72,0,1);const smooth=t*t*(3-2*t);
    const target=landingPos(i);
    if(landing.nak&&i===3){target.set(3.47,.29,-.25);}
    mesh.position.copy(landing.snapshot[i].position).lerp(target,smooth);
    mesh.quaternion.copy(landing.snapshot[i].rotation).slerp(landingRot(landing.bits[i]||0,i),smooth);
   });
   if(landing&&!landing.shown&&elapsed>=1.48){
    landing.shown=true;
    showStatus(landing.nak?'낙 · 윷 1개가 원형판 밖으로 떨어짐':`${landing.label} · 네 개 모두 정상 착지`,landing.nak);
    window.yutThrowSettled?.({id:landing.id,label:landing.label,nak:landing.nak,bits:landing.bits});
   }
   renderer.render(scene,camera);
  }
  frame();if(loading)loading.style.display='none';
  if(window.__latestYutThrow)window.yut3d.toss(window.__latestYutThrow.result,window.__latestYutThrow.power);
 }catch(err){console.error('3D yut setup:',err);if(loading)loading.textContent='3D 화면을 불러오지 못했습니다. 아래의 공식 결과 표시를 확인해 주세요.';}
}
