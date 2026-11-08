import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const canvas=document.getElementById('yut-canvas');
const loading=document.getElementById('yut-loading');
if(canvas){
 try{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b77a42');
 const camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(0,8.9,7.2);camera.lookAt(0,.18,0);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
 scene.add(new THREE.HemisphereLight(0xfff3d9,0x5d3e28,3));
 const light=new THREE.DirectionalLight(0xffe4b4,3.1);light.position.set(-2.5,7,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-7;light.shadow.camera.right=7;light.shadow.camera.top=7;light.shadow.camera.bottom=-7;light.shadow.bias=-.0008;scene.add(light);
 const area=new THREE.PointLight(0xffd4a2,120);area.position.set(2.5,3.8,-2);scene.add(area);
 const woodMat=new THREE.MeshStandardMaterial({color:'#c48a4f',roughness:.77,metalness:0});
 const board=new THREE.Mesh(new THREE.BoxGeometry(7.0,.26,5.5),new THREE.MeshStandardMaterial({color:'#9d5f34',roughness:.82}));board.position.y=-.17;board.receiveShadow=true;scene.add(board);
 const cloth=new THREE.Mesh(new THREE.BoxGeometry(6.45,.055,5.0),new THREE.MeshStandardMaterial({color:'#dfba84',roughness:1}));cloth.position.y=-.005;cloth.receiveShadow=true;scene.add(cloth);
 const trim=new THREE.MeshStandardMaterial({color:'#72431f',roughness:.8});
 for(const x of [-3.66,3.66]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.10,.20,5.75),trim);rail.position.set(x,.055,0);rail.castShadow=true;scene.add(rail)}
 for(const z of [-2.85,2.85]){const rail=new THREE.Mesh(new THREE.BoxGeometry(7.3,.20,.10),trim);rail.position.set(0,.055,z);rail.castShadow=true;scene.add(rail)}
 // Woodgrain strips across the throwing board.
 for(let i=0;i<16;i++){const z=-2.4+i*.33;const grain=new THREE.Mesh(new THREE.PlaneGeometry(6.6,.008),new THREE.MeshBasicMaterial({color:i%3===0?'#ad804e':'#ebc594',transparent:true,opacity:.22,depthWrite:false}));grain.rotation.x=-Math.PI/2;grain.position.set(0,.028,z);scene.add(grain)}
 const world=new CANNON.World({gravity:new CANNON.Vec3(0,-21,0),allowSleep:true});world.solver.iterations=15;world.defaultContactMaterial.friction=.46;world.defaultContactMaterial.restitution=.22;
 const floor=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(3.22,.12,2.5)),position:new CANNON.Vec3(0,-.15,0)});world.addBody(floor);
 // Very low rails: a high-energy throw can still travel outside the tray.
 const skins=[{position:[-3.66,.06,0],half:[.05,.12,2.8]},{position:[3.66,.06,0],half:[.05,.12,2.8]},{position:[0,.06,-2.85],half:[3.65,.12,.05]},{position:[0,.06,2.85],half:[3.65,.12,.05]}];
 for(const wall of skins){const body=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(...wall.half)),position:new CANNON.Vec3(...wall.position)});world.addBody(body)}
 const meshMaterial=new THREE.MeshStandardMaterial({color:0xf0ca8a,roughness:.56,metalness:0});
 const faceMaterial=new THREE.MeshStandardMaterial({color:0x694126,roughness:.9,side:THREE.DoubleSide});
 const sideMaterial=new THREE.MeshStandardMaterial({color:0xa96634,roughness:.78});
 const lineMaterial=new THREE.MeshStandardMaterial({color:0xffe8b5,roughness:.95});
 const dotMaterial=new THREE.MeshStandardMaterial({color:0xffd98d,roughness:.95});
 const sticks=[];let impacts=0,impactTime=0;let landing=null;
 const status=document.createElement('div');status.className='yut-stage-status';canvas.parentElement.appendChild(status);
 function showStatus(msg,nak=false){status.className='yut-stage-status'+(nak?' nak':'');status.innerHTML='<span>'+msg+'</span>';}
 showStatus('윷을 던져 주세요');
 for(let i=0;i<4;i++){
  const body=new CANNON.Body({mass:.36,shape:new CANNON.Box(new CANNON.Vec3(.205,.68,.18)),linearDamping:.17,angularDamping:.22,material:new CANNON.Material('hardwood')});
  body.position.set((i-1.5)*.58,1.5+i*.05,(i%2-.5)*.38);world.addBody(body);
  body.addEventListener('collide',ev=>{const impact=Math.abs(ev.contact?.getImpactVelocityAlongNormal?.()||0);const now=performance.now();if(impact>1.7&&now-impactTime>55){impactTime=now;impacts++;if(window.yutImpact)window.yutImpact(Math.min(1,impact/13),impacts%3);}});
  const group=new THREE.Group();
  // Truncated, rounded wooden pieces: each has rounded side + flat dark back + carved stripe.
  const core=new THREE.Mesh(new THREE.CapsuleGeometry(.185,1.0,10,18),meshMaterial);core.castShadow=true;core.receiveShadow=true;group.add(core);
  const flat=new THREE.Mesh(new THREE.BoxGeometry(.355,1.28,.04),faceMaterial);flat.position.z=.157;flat.castShadow=true;group.add(flat);
  const longLine=new THREE.Mesh(new THREE.BoxGeometry(.03,1.0,.009),lineMaterial);longLine.position.set(0,0,.183);group.add(longLine);
  if(i===0){const mark=new THREE.Mesh(new THREE.TorusGeometry(.085,.013,6,28),lineMaterial);mark.position.set(0,-.43,.193);group.add(mark);}
  for(let j=-1;j<=1;j++){const notch=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.014,18),dotMaterial);notch.rotation.x=Math.PI/2;notch.position.set(0,j*.31,.188);group.add(notch);}
  for(const side of [-1,1]){const grain=new THREE.Mesh(new THREE.BoxGeometry(.011,1.08,.012),sideMaterial);grain.position.set(side*.13,0,-.10);group.add(grain)}
  group.rotation.z=(i-1.5)*.12;scene.add(group);sticks.push({body,group});
 }
 function reset(){sticks.forEach(({body},i)=>{body.position.set((i-1.5)*.56,.72,(i%2-.5)*.42);body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.quaternion.setFromEuler(Math.PI/2,0,(i-1.5)*.20);body.wakeUp()});}
 reset();
 let nakEffect=false;
 function toss(result,power){
  landing={bits:Array.isArray(result?.bits)?result.bits.slice():[],nak:!!result?.nak,start:performance.now(),result:result?.label||'',settle:null};
  const force=.62+Math.min(100,Number(power)||0)/180;
  nakEffect=!!result?.nak;impacts=0;
  showStatus('던지는 중…');
  sticks.forEach(({body},i)=>{
   body.position.set((i-1.5)*.32,1.75+i*.14,((i%2)*2-1)*.24);
   body.quaternion.setFromEuler(Math.random()*6,Math.random()*6,Math.random()*6);
   body.velocity.set((Math.random()-.5)*1.45*force,3.8+Math.random()*2*force,(Math.random()-.5)*1.3*force);
   body.angularVelocity.set((Math.random()-.5)*18,(Math.random()-.5)*18,(Math.random()-.5)*18);
   body.wakeUp();
  });
  if(loading)loading.style.display='none';
 }
 window.yut3d={toss,reset};if(window.__latestYutThrow)window.yut3d.toss(window.__latestYutThrow.result,window.__latestYutThrow.power);
 window.yutImpact=(strength,variant)=>{if(localStorage.getItem('yut-muted')==='1')return;try{const AC=window.AudioContext||window.webkitAudioContext;const ac=window.__yutAudio||(window.__yutAudio=new AC());ac.resume();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type='triangle';o.frequency.setValueAtTime(170+variant*35,t);o.frequency.exponentialRampToValueAtTime(65,t+.085);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(Math.min(.27,.06+strength*.15),t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.15);}catch{}};
 const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};window.addEventListener('resize',resize);resize();
 let last=performance.now();const quaternion=(mesh,body)=>{mesh.position.set(body.position.x,body.position.y,body.position.z);mesh.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w)};
 const frontQuaternion=bit=>new THREE.Quaternion().setFromEuler(new THREE.Euler(bit?-Math.PI/2:Math.PI/2,0,0,'XYZ'));
 const settlePosition=(i,nak)=>new THREE.Vector3((i-1.5)*1.16+(nak&&i===3?1.8:0),.27,((i%2)-.5)*1.12);
 const frame=()=>{
  requestAnimationFrame(frame);
  const now=performance.now(),dt=Math.min(.045,(now-last)/1000);last=now;
  if(!landing||!landing.settle)world.step(1/60,dt,3);
  sticks.forEach(({group,body},i)=>{
   if(!landing){quaternion(group,body);return;}
   const elapsed=(now-landing.start)/1000;
   if(elapsed<.82){
    quaternion(group,body);
    group.position.x=Math.max(-2.1,Math.min(2.1,group.position.x));
    group.position.z=Math.max(-1.55,Math.min(1.55,group.position.z));
    return;
   }
   if(!landing.settle){
    landing.settle=sticks.map(({group,body})=>{
     body.sleep();
     return {pos:group.position.clone(),rot:group.quaternion.clone()};
    });
   }
   const t=Math.min(1,(elapsed-.82)/.48),ease=t*t*(3-2*t);
   const target=settlePosition(i,landing.nak);
   const bit=landing.bits[i]??0;
   const targetRotation=frontQuaternion(bit);
   group.position.copy(landing.settle[i].pos).lerp(target,ease);
   group.quaternion.copy(landing.settle[i].rot).slerp(targetRotation,ease);
   if(t>=1&&landing.statusShown!==true){
    landing.statusShown=true;
    showStatus(landing.nak?'낙! 판 밖에 윷이 떨어졌습니다':landing.result+' · 정상 착지',landing.nak);
   }
  });
  renderer.render(scene,camera);
 };
 frame();if(loading)loading.style.display='none';
 }catch(err){console.error('3D yut setup:',err);if(loading)loading.textContent='3D 모델 준비 중 오류가 발생했습니다.';}
}
