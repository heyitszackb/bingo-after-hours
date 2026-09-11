// Low-resolution, palette-limited felt motion; the game UI stays stationary.
const canvas=document.getElementById('felt-background');
const ctx=canvas.getContext('2d',{alpha:false});
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let pixels,field=[],lastPaint=0,lastPulse=-10000,phase=0,raf=0;
function resize(){
  const scale=Math.max(5,innerWidth/256,innerHeight/256);
  canvas.width=Math.ceil(innerWidth/scale);
  canvas.height=Math.ceil(innerHeight/scale);
  pixels=ctx.createImageData(canvas.width,canvas.height);
  field=[];
  const aspect=canvas.width/canvas.height;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const u=(x/canvas.width-.5)*aspect,v=y/canvas.height-.45;
    const r=Math.hypot(u,v),angle=Math.atan2(v,u);
    field.push({swirl:angle*2+r*13,u:u*7,v:v*8,r,dither:((x*17+y*23)%13)/13});
  }
  paint(performance.now());
}
function paint(now){
  const elapsed=Math.max(0,(now-lastPulse)/1000);
  const impact=motion.matches?0:Math.exp(-elapsed*3)*Math.min(1,elapsed*20);
  const time=motion.matches?0:now/1000;
  const drift=time*.11+phase;
  for(let i=0;i<field.length;i++){
    const f=field[i];
    const wave=Math.sin(f.swirl-drift-impact*1.7+Math.sin(f.u+time*.08)*.65);
    const fold=Math.sin(f.v+f.u*.6-drift*.5+wave*1.6);
    const shade=Math.max(0,Math.min(1,Math.round(((wave+fold*.35+1.35)/2.7+f.dither*.045)*7)/7));
    const blue=impact*(.55+.45*Math.sin(f.swirl+1));
    const edge=Math.max(.6,1-f.r*.2);
    const p=i*4;
    pixels.data[p]=(5+shade*10+blue*8)*edge;
    pixels.data[p+1]=(31+shade*34+impact*shade*11-blue*7)*edge;
    pixels.data[p+2]=(36+shade*29+blue*47)*edge;
    pixels.data[p+3]=255;
  }
  ctx.putImageData(pixels,0,0);
}
function frame(now){
  if(now-lastPaint>1000/24){paint(now);lastPaint=now;}
  if(!motion.matches)raf=requestAnimationFrame(frame);
}
export function pulseBackground(){
  if(motion.matches)return;
  lastPulse=performance.now();
  phase+=.14;
  canvas.getAnimations().forEach(a=>a.cancel());
  canvas.animate([
    {transform:'translate(0,0) scale(1.06)'},
    {transform:'translate(-5px,3px) scale(1.07)',offset:.1},
    {transform:'translate(4px,-2px) scale(1.065)',offset:.22},
    {transform:'translate(-2px,1px) scale(1.06)',offset:.36},
    {transform:'translate(1px,-1px) scale(1.06)',offset:.52},
    {transform:'translate(0,0) scale(1.06)'}
  ],{duration:620,easing:'ease-out'});
}
window.addEventListener('resize',resize);
motion.addEventListener('change',()=>{cancelAnimationFrame(raf);canvas.getAnimations().forEach(a=>a.cancel());paint(performance.now());if(!motion.matches)raf=requestAnimationFrame(frame);});
resize();
if(!motion.matches)raf=requestAnimationFrame(frame);
