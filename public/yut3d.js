import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const canvas=document.getElementById('yut-canvas');
const loading=document.getElementById('yut-loading');
if(canvas){
 try{
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#e9dcc7');
  const camera=new THREE.PerspectiveCamera(35,1,.1,90);
  camera.position.set(0,9.4,8.4);camera.lookAt(0,.14,0);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
  scene.add(new THREE.HemisphereLight(0xfff4db,0x51351d,2.8));
  const key=new THREE.DirectionalLight(0xffe8be,3.3);key.position.set(-3,9,5);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;
  key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;
  scene.add(key);
  const fill=new THREE.PointLight(0xffdda5,58);fill.position.set(3,4,-1);scene.add(fill);
  const edge=new THREE.MeshStandardMaterial({color:0x7b6043,roughness:.88});
  const oak=new THREE.MeshStandardMaterial({color:0xcbb48d,roughness:.89});
  const topMat=new THREE.MeshStandardMaterial({color:0xf1e4ca,roughness:.98});
  for(const [radius,height,y,mat] of [[3.38,.3,-.24,edge],[3.19,.25,-.058,oak],[3.02,.035,.077,topMat]]){
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,96),mat);
   mesh.position.y=y;mesh.receiveShadow=true;scene.add(mesh);
  }
  for(let i=0;i<9;i++){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.43+i*.29,.007,4,96),new THREE.MeshBasicMaterial({color:i%2?0xb9a488:0xd4c3a4,transparent:true,opacity:.25,depthWrite:false}));
   ring.rotation.x=-Math.PI/2;ring.position.y=.099;scene.add(ring);
  }
  const curvedMat=new THREE.MeshStandardMaterial({color:0xa75a32,roughness:.75});
  const ivory=new THREE.MeshStandardMaterial({color:0xfff4d8,roughness:.82});
  const edgeMat=new THREE.MeshStandardMaterial({color:0x60412b,roughness:.81});
  const darkDot=new THREE.MeshStandardMaterial({color:0x15293c,roughness:.9});
  function halfRoundGeometry(radius=.245,length=1.28){
   const shape=new THREE.Shape();shape.moveTo(-radius,0);shape.lineTo(radius,0);
   for(let j=1;j<=32;j++){const a=Math.PI*j/32;shape.lineTo(radius*Math.cos(a),-radius*Math.sin(a));}
   shape.closePath();
   const geo=new THREE.ExtrudeGeometry(shape,{depth:length,steps:1,bevelEnabled:true,bevelThickness:.028,bevelSize:.020,bevelSegments:3,curveSegments:32});
   geo.translate(0,0,-length/2);geo.rotateX(Math.PI/2);geo.computeVertexNormals();return geo;
  }
  function frontMaterial(){
   const c=document.createElement('canvas');c.width=256;c.height=512;
   const ctx=c.getContext('2d');const gradient=ctx.createLinearGradient(0,0,256,0);
   gradient.addColorStop(0,'#182637');gradient.addColorStop(.45,'#33485d');gradient.addColorStop(1,'#172536');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,256,512);
   ctx.strokeStyle='#fff3cc';ctx.lineWidth=9;ctx.strokeRect(16,16,224,480);
   ctx.font='bold 140px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.fillText('뒤',128,245);
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
   return new THREE.MeshStandardMaterial({map:t,roughness:.85,side:THREE.DoubleSide});
  }
  const geometry=halfRoundGeometry(),frontGeo=new THREE.PlaneGeometry(.405,1.14),flatMat=frontMaterial();
  const sticks=[];
  const status=document.createElement('div');status.className='yut-stage-status';canvas.parentElement.appendChild(status);
  const showStatus=(value,nak=false)=>{status.textContent=value;status.className='yut-stage-status'+(nak?' nak':'');};
  const faceStrip=document.createElement('div');faceStrip.className='throw-face-strip';canvas.parentElement.appendChild(faceStrip);
  function showFaces(result){
   faceStrip.replaceChildren();
   if(!result||result.nak){faceStrip.classList.remove('show');return;}
   result.bits.forEach((bit,i)=>{const el=document.createElement('span');el.className='throw-face '+(bit?'back':'front');el.textContent=(i===3?'★':'')+(bit?'뒤':'앞');faceStrip.appendChild(el);});
   faceStrip.classList.add('show');
  }
  for(let i=0;i<4;i++){
   const group=new THREE.Group();
   const mesh=new THREE.Mesh(geometry,curvedMat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
   const flat=new THREE.Mesh(frontGeo,flatMat);flat.position.z=.006;group.add(flat);
   for(const y of [-.35,0,.35]){const notch=new THREE.Mesh(new THREE.BoxGeometry(.21,.022,.008),ivory);notch.position.set(0,y,.016);group.add(notch);}
   const stripeMat=new THREE.MeshStandardMaterial({color:0xffe5ae,roughness:.66});
   for(const angle of [-.64,0,.64]){
    const stripe=new THREE.Mesh(new THREE.CapsuleGeometry(.015,.88,5,8),stripeMat);
    stripe.position.set(.250*Math.sin(angle),0,-.250*Math.cos(angle)-.014);stripe.rotation.y=-angle;group.add(stripe);
   }
   for(const y of [-.38,.38]){
    const points=[];for(let j=0;j<=28;j++){const a=Math.PI*j/28;points.push(new THREE.Vector3(.247*Math.cos(a),y,-.247*Math.sin(a)-.003));}
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),28,.008,5,false),edgeMat));
   }
   if(i===3){const mark=new THREE.Mesh(new THREE.CircleGeometry(.10,32),new THREE.MeshStandardMaterial({color:0xffd341,side:THREE.DoubleSide}));mark.position.set(0,-.42,.019);group.add(mark);const dot=new THREE.Mesh(new THREE.CircleGeometry(.04,20),darkDot);dot.position.set(0,-.42,.021);group.add(dot);}
   group.position.set((i-1.5)*.7,.16,(i%2-.5)*1.12);
   group.rotation.set(-Math.PI/2,0,0);
   scene.add(group);sticks.push(group);
  }
  let throwState=null,lastAudioAt=0;
  function playImpact(volume=.3){
   if(localStorage.getItem('yut-muted')==='1')return;
   try{
    const AC=window.AudioContext||window.webkitAudioContext;
    const ctx=window.__yutAudio||(window.__yutAudio=new AC());ctx.resume();
    const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
    osc.type='triangle';osc.frequency.setValueAtTime(230,t);
    osc.frequency.exponentialRampToValueAtTime(65,t+.12);
    gain.gain.setValueAtTime(.001,t);
    gain.gain.exponentialRampToValueAtTime(.08+volume*.24,t+.01);
    gain.gain.exponentialRampToValueAtTime(.001,t+.16);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.17);
   }catch{}
  }
  const v1=new THREE.Quaternion(),v2=new THREE.Quaternion();
  function applyFrame(from,to,alpha){
   for(let i=0;i<4;i++){
    const a=from[i],b=to[i],mesh=sticks[i];
    mesh.position.set(a[0]+(b[0]-a[0])*alpha,a[1]+(b[1]-a[1])*alpha,a[2]+(b[2]-a[2])*alpha);
    v1.set(a[3],a[4],a[5],a[6]).normalize();v2.set(b[3],b[4],b[5],b[6]).normalize();
    mesh.quaternion.copy(v1).slerp(v2,alpha);
   }
  }
  function toss(result,power=50){
   if(!Array.isArray(result?.trajectory)||result.trajectory.length<2){
    showStatus('서버 물리 데이터가 없습니다 · 결과를 확인하세요');
    window.yutThrowSettled?.({id:result?.id,label:result?.label,nak:!!result?.nak,bits:result?.bits||[]});
    return;
   }
   throwState={result,frames:result.trajectory,start:performance.now(),duration:result.durationMs||5500,shown:false};
   applyFrame(result.trajectory[0],result.trajectory[0],0);
   showFaces(null);showStatus('실제 물리 착지 판정 중…');
   if(loading)loading.style.display='none';
  }
  window.yut3d={toss,reset:()=>{throwState=null;showStatus('윷을 던져 주세요');showFaces(null);}};
  const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};
  window.addEventListener('resize',resize);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(canvas);resize();
  const frame=()=>{
   requestAnimationFrame(frame);
   if(throwState){
    const {frames,start,duration,result}=throwState;
    const progress=Math.min(1,(performance.now()-start)/duration);
    const f=progress*(frames.length-1),a=Math.floor(f),b=Math.min(frames.length-1,a+1);
    applyFrame(frames[a],frames[b],f-a);
    if(b>a&&performance.now()-lastAudioAt>95){
     for(let i=0;i<4;i++){
      const yBefore=frames[a][i][1],yAfter=frames[b][i][1];
      const drop=yBefore-yAfter;
      if(yAfter<.55&&drop>.055){playImpact(Math.min(1,drop*5));lastAudioAt=performance.now();break;}
     }
    }
    if(progress>=1&&!throwState.shown){
     throwState.shown=true;
     // No late center alignment or forced rotations: the last frame IS the result.
     const dot=new THREE.Vector3(0,0,1),up=new THREE.Vector3(0,1,0);
     const actual=sticks.map(mesh=>dot.clone().applyQuaternion(mesh.quaternion).dot(up)>=0?1:0);
     const mismatched=!result.nak&&actual.some((v,i)=>v!==result.bits[i]);
     if(mismatched)console.error('Server replay mismatch',actual,result.bits);
     showFaces(result);
     showStatus(result.nak?'낙 · 윷이 실제로 판 밖에 떨어짐':`${result.label} · 물리 착지로 판정`,!!result.nak);
     window.yutThrowSettled?.({id:result.id,label:result.label,nak:result.nak,bits:result.bits});
    }
   }
   renderer.render(scene,camera);
  };
  frame();if(loading)loading.style.display='none';
  if(window.__latestYutThrow)window.yut3d.toss(window.__latestYutThrow.result,window.__latestYutThrow.power);
 }catch(err){console.error('3D viewer:',err);if(loading)loading.textContent='3D 재생 오류 · 새로고침해 주세요.';}
}
