(function(root){
  'use strict';
  const HALF_CYCLE_MS=1400;
  function powerAt(elapsed){
    const elapsedMs=Math.max(0,Number(elapsed)||0);
    const progress=(elapsedMs%(HALF_CYCLE_MS*2))/HALF_CYCLE_MS;
    return Math.max(0,Math.min(100,(progress<=1?progress:2-progress)*100));
  }
  // bit 1 = dark flat back; bit 0 = pale curved front.
  function facesFor(result){
    if(!result||result.nak)return {faces:[],front:0,back:0,nak:!!result?.nak};
    const faces=result.bits.map((bit,i)=>({name:bit===1?'뒤':'앞',bit,special:i===3}));
    return {faces,front:faces.filter(f=>f.bit===0).length,back:faces.filter(f=>f.bit===1).length,nak:false};
  }
  const api={powerAt,facesFor};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.YutThrowLogic=api;
})(typeof window!=='undefined'?window:globalThis);
