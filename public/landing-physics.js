// Browser-safe numeric helpers used by the physics renderer and by Node tests.
export function makeCrossSection(radius = .245, segments = 12) {
  const points = [[-radius, 0], [radius, 0]];
  for (let i = 1; i < segments; i++) {
    const theta = Math.PI * i / segments;
    points.push([radius * Math.cos(theta), -radius * Math.sin(theta)]);
  }
  return points;
}

export function buildHalfRoundHull(CANNON, radius = .245, length = 1.28) {
  const cross = makeCrossSection(radius, 14);
  const n = cross.length;
  const vertices = [];
  for (const y of [-length / 2, length / 2]) {
    for (const [x, z] of cross) vertices.push(new CANNON.Vec3(x, y, z));
  }
  const faces = [];
  const addFace = (indices) => {
    const a = vertices[indices[0]], b = vertices[indices[1]], c = vertices[indices[2]];
    const ab = b.vsub(a), ac = c.vsub(a), normal = ab.cross(ac);
    const center = new CANNON.Vec3();
    for (const index of indices) center.vadd(vertices[index], center);
    center.scale(1 / indices.length, center);
    if (normal.dot(center) < 0) indices.reverse();
    faces.push(indices);
  };
  addFace(Array.from({length:n},(_,i)=>i));
  addFace(Array.from({length:n},(_,i)=>n+i));
  for (let i=0; i<n; i++) {
    const j=(i+1)%n;
    addFace([i,j,n+j,n+i]);
  }
  return new CANNON.ConvexPolyhedron({vertices,faces});
}

export function landingTargetIsValid(result, poses) {
  if (!result || !Array.isArray(poses) || poses.length!==4) return false;
  if (result.nak) return poses.filter(p=>!p.inside).length===1;
  return result.bits?.length===4 && poses.every(p=>p.inside && (p.topFace===0 || p.topFace===1)) &&
    poses.every((p,i)=>p.topFace===result.bits[i]);
}

// Server-facing results and the 3D scene share one final-position contract.
// Flat dark back is bit 1, curved pale front is bit 0.
export function restingPose(bit,index,nak=false){
  if(!Number.isInteger(index)||index<0||index>3)throw Error('윷 번호 오류');
  if(bit!==0&&bit!==1)throw Error('윷 면 오류');
  const slots=[[-1.25,-.52],[-.40,.55],[.44,-.52],[1.26,.55]];
  if(nak&&index===3)return {x:3.88,y:.14,z:.15,angle:Math.PI/2,inside:false,topFace:0};
  const [x,z]=slots[index];
  return {x,y:bit===1?.35:.11,z,angle:bit===1?-Math.PI/2:Math.PI/2,inside:true,topFace:bit};
}

export function validateFinalLanding(result){
  if(!result)return false;
  if(result.nak){
    return landingTargetIsValid(result,[0,1,2,3].map(i=>restingPose(0,i,true)));
  }
  if(!Array.isArray(result.bits)||result.bits.length!==4)return false;
  return landingTargetIsValid(result,result.bits.map((bit,i)=>restingPose(bit,i,false)));
}
