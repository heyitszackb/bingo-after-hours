import {newStage,draw,choose,redraw} from './game.js';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state=newStage(),busy=false,drag=null,audio,tooltipAnchor=null;
const wait=ms=>new Promise(r=>setTimeout(r,reduced?15:ms));
const animate=(el,frames,options)=>el.animate(frames,{...options,duration:reduced?1:options.duration}).finished.catch(()=>{});
function sound(kind,step=0){if(!navigator.userActivation?.hasBeenActive)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime;const o=audio.createOscillator(),g=audio.createGain();o.type=kind==='score'?'triangle':'square';o.frequency.setValueAtTime(kind==='activate'?330*2**(Math.min(step,12)/12):kind==='score'?660:kind==='roll'?180:110,t);o.frequency.exponentialRampToValueAtTime(kind==='activate'?220*2**(Math.min(step,12)/12):kind==='score'?1320:40,t+.12);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.17);}catch{}}
function burst(rect,scoring=false){if(reduced)return;for(let i=0;i<(scoring?28:12);i++){const p=document.createElement('i');p.className='particle';p.style.left=`${rect.left+rect.width/2}px`;p.style.top=`${rect.top+rect.height/2}px`;p.style.background=scoring?'#f4c66c':i%2?'#f37868':'#f7dfaf';$('effects').append(p);const angle=Math.random()*Math.PI*2,d=25+Math.random()*(scoring?150:65);animate(p,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(angle)*d}px,${Math.sin(angle)*d+25}px) scale(0)`,opacity:0}],{duration:450+Math.random()*250,easing:'cubic-bezier(.1,.7,.3,1)'}).then(()=>p.remove());}}
for(let n=1;n<=25;n++){const c=document.createElement('button');c.type='button';c.id=`cell-${n}`;c.className='cell';c.innerHTML=`<span>${n}</span>`;c.onclick=()=>{if(!busy&&!drag)inspectSpace(n);};$('board').append(c);}
function render(){for(const k of ['score','target','calls','stage'])$(k).textContent=state[k];$('money').textContent=state.money;$('bag-count').textContent=state.bag.size;$('bag').setAttribute('aria-label',`Inspect bag, ${state.bag.size} balls remaining`);$('progress').style.width=`${Math.min(100,state.score/state.target*100)}%`;$('redraw').disabled=busy||state.money<1||state.status!=='playing';$('redraw').setAttribute('aria-label',state.money<1?'Reroll costs $1; not enough money':'Reroll for $1 without using a call');$('call-dots').innerHTML=Array.from({length:12},(_,i)=>`<i class="${i>=state.calls?'used':''}"></i>`).join('');document.querySelector('.call-meter').setAttribute('aria-label',`${state.calls} calls remaining`);for(let n=1;n<=25;n++){const c=$(`cell-${n}`);c.className=`cell${state.stamps.has(n)?' stamped':''}${state.offer.includes(n)?' offered':''}`;c.setAttribute('aria-label',`${n}${state.stamps.has(n)?', stamped':''}`);}}
function ball(n){const b=document.createElement('button');b.className='ball';b.innerHTML=`<span class="face">${n}</span>`;b.setAttribute('aria-label',`Inspect ball ${n}`);return b;}
function hideTooltip(){
  const tip=$('inspect-tooltip');
  if(tip.matches(':popover-open'))tip.hidePopover();
  tip.hidden=true;
  tooltipAnchor?.removeAttribute('aria-describedby');
  tooltipAnchor?.classList.remove('inspected');
  tooltipAnchor=null;
}
function positionTooltip(){
  if(!tooltipAnchor)return;
  if(!tooltipAnchor.isConnected){hideTooltip();return;}
  const tip=$('inspect-tooltip'),r=tooltipAnchor.getBoundingClientRect();
  const viewport=window.visualViewport;
  const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
  const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
  const w=tip.offsetWidth,h=tip.offsetHeight,gap=13,pad=10;
  const x=Math.max(left+pad,Math.min(r.left+r.width/2-w/2,left+width-w-pad));
  const below=r.top-h-gap<top+pad;
  const y=below?Math.min(r.bottom+gap,top+height-h-pad):r.top-h-gap;
  tip.style.left=`${x}px`;tip.style.top=`${Math.max(top+pad,y)}px`;
  tip.style.setProperty('--pointer-x',`${Math.max(15,Math.min(w-15,r.left+r.width/2-x))}px`);
  tip.classList.toggle('below',below);
}
function showTooltip(n,anchor,space=false){
  if(tooltipAnchor===anchor){hideTooltip();return;}
  hideTooltip();sound('roll');
  const tip=$('inspect-tooltip');
  (anchor.closest('dialog')||document.body).append(tip);
  $('tooltip-number').textContent=n;
  $('tooltip-effect').hidden=!space;
  tip.classList.toggle('space-tooltip',space);
  tooltipAnchor=anchor;
  anchor.setAttribute('aria-describedby','inspect-tooltip');
  anchor.classList.add('inspected');
  tip.hidden=false;
  tip.showPopover?.();
  positionTooltip();
  animate(tip,[{opacity:0,transform:'translateY(5px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:150,easing:'cubic-bezier(.2,.8,.25,1)'});
}
function inspectSpace(n){showTooltip(n,$(`cell-${n}`),true);}
function inspect(n,anchor){showTooltip(n,anchor);}
document.addEventListener('pointerdown',e=>{if(tooltipAnchor&&!tooltipAnchor.contains(e.target)&&!$('inspect-tooltip').contains(e.target))hideTooltip();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tooltipAnchor){e.preventDefault();e.stopPropagation();hideTooltip();}},true);
window.addEventListener('resize',positionTooltip);
window.visualViewport?.addEventListener('resize',positionTooltip);
document.addEventListener('scroll',()=>hideTooltip(),true);
function refreshBag(){if(tooltipAnchor?.closest('#bag-grid'))hideTooltip();$('bag-grid').replaceChildren();for(const n of state.bag){const b=ball(n);if(state.stamps.has(n))b.classList.add('stamped-ball');if(state.offer.includes(n))b.classList.add('on-track');b.setAttribute('aria-label',`Ball ${n}${state.stamps.has(n)?', stamped on card':''}${state.offer.includes(n)?', on track':''}; played ${state.played[n]} times`);b.onclick=()=>inspect(n,b);$('bag-grid').append(b);}}
function lock(){hideTooltip();busy=true;render();document.querySelectorAll('#balls .ball').forEach(b=>b.disabled=true);}
function unlock(){busy=false;render();document.querySelectorAll('#balls .ball').forEach(b=>{b.disabled=false;b.classList.remove('enter');});}
function showBalls(){$('balls').replaceChildren();state.offer.forEach((n,i)=>{const b=ball(n);b.classList.add('enter');b.style.setProperty('--i',i);b.disabled=true;b.setAttribute('aria-label',`Ball ${n}. Tap to inspect. Drag to card to play. Keyboard: Enter to inspect, Space to play.`);b.addEventListener('pointerdown',e=>startDrag(e,n,b));b.addEventListener('pointermove',moveDrag);b.addEventListener('pointerup',endDrag);b.addEventListener('pointercancel',cancelDrag);b.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});b.onclick=e=>{if(e.detail===0&&!busy)inspect(n,b);};b.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();if(!busy)play(n,b);} };$('balls').append(b);});refreshBag();}
async function nextDraw(){lock();state.offer=draw(state);render();showBalls();await wait(770);sound('roll');unlock();}
function startDrag(e,n,b){if(busy||drag||e.button!==0)return;e.preventDefault();sound('roll');b.setPointerCapture(e.pointerId);drag={n,b,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,ghost:null};}
function moveDrag(e){if(!drag||e.pointerId!==drag.id)return;const d=drag;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>7){d.moved=true;hideTooltip();d.ghost=d.b.cloneNode(true);d.ghost.className='ball drag-ghost';d.ghost.removeAttribute('disabled');d.ghost.setAttribute('aria-hidden','true');d.size=d.b.getBoundingClientRect().width;d.ghost.style.setProperty('--size',`${d.size}px`);document.body.append(d.ghost);d.b.classList.add('held');}if(!d.moved)return;d.ghost.style.transform=`translate(${e.clientX-d.size/2}px,${e.clientY-d.size/2}px) rotate(${(e.clientX-d.x)*.2}deg) scale(1.08)`;const r=$('board').getBoundingClientRect();const over=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;document.querySelector('.board-frame').classList.toggle('drag-over',over);$(`cell-${d.n}`).classList.toggle('destination',over);}
function cleanDrag(d){d.b.classList.remove('held');document.querySelector('.board-frame').classList.remove('drag-over');$(`cell-${d.n}`).classList.remove('destination');}
async function endDrag(e){if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;cleanDrag(d);if(!d.moved){inspect(d.n,d.b);return;}const r=$('board').getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){await play(d.n,d.b,d.ghost);}else{busy=true;const end=d.b.getBoundingClientRect();await animate(d.ghost,[{transform:d.ghost.style.transform},{transform:`translate(${end.left}px,${end.top}px) rotate(0deg) scale(1)`}],{duration:240,easing:'cubic-bezier(.2,.8,.3,1)'});d.ghost.remove();busy=false;}}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;cleanDrag(d);d.ghost?.remove();}
async function activateSpaces(result){
  let displayedScore=state.score-result.points;
  for(const [index,activation] of result.activations.entries()){
    const cell=$(`cell-${activation.number}`);
    cell.classList.add('activating','charged');
    sound('activate',index);
    navigator.vibrate?.(8);
    animate(cell,[{transform:'scale(1)'},{transform:'translateY(-4px) scale(1.1)',offset:.3},{transform:'scale(.98)',offset:.65},{transform:'scale(1)'}],{duration:250,easing:'cubic-bezier(.2,.8,.3,1)'});
    const r=cell.getBoundingClientRect();
    burst(r);
    const point=document.createElement('span');
    point.className='activation-point';
    point.textContent=`+${activation.points}`;
    point.style.left=`${r.left+r.width/2}px`;
    point.style.top=`${r.top+r.height/2}px`;
    $('effects').append(point);
    const scoreRect=$('score').getBoundingClientRect();
    const dx=scoreRect.left+scoreRect.width/2-r.left-r.width/2;
    const dy=scoreRect.top+scoreRect.height/2-r.top-r.height/2;
    await animate(point,[
      {transform:'translate(-50%,-35%) scale(.65)',opacity:0},
      {transform:'translate(-50%,-90%) scale(1.15)',opacity:1,offset:.25},
      {transform:'translate(-50%,-100%) scale(1)',opacity:1,offset:.55},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.45)`,opacity:0}
    ],{duration:330,easing:'cubic-bezier(.2,.7,.35,1)'});
    point.remove();
    displayedScore+=activation.points;
    $('score').textContent=displayedScore;
    $('progress').style.width=`${Math.min(100,displayedScore/state.target*100)}%`;
    animate($('score'),[{transform:'scale(1.3)',color:'#fff5d5'},{transform:'scale(1)',color:'#f4c66c'}],{duration:150});
    cell.classList.remove('activating');
    await wait(35);
  }
  sound('score');
  $('announcer').textContent=`${result.activations.length} spaces activated for ${result.points} points.`;
  await wait(160);
  result.cleared.forEach(n=>$(`cell-${n}`).classList.add('clearing'));
  await wait(250);
}
async function play(n,b,ghost){if(busy){ghost?.remove();return;}lock();const result=choose(state,n);if(!result){ghost?.remove();unlock();return;}$('calls').textContent=state.calls;$('bag-count').textContent=state.bag.size;$('call-dots').children[state.calls]?.classList.add('used');document.querySelector('.call-meter').setAttribute('aria-label',`${state.calls} calls remaining`);$('bag').setAttribute('aria-label',`Inspect bag, ${state.bag.size} balls remaining`);const cell=$(`cell-${n}`),r=cell.getBoundingClientRect();b.style.visibility='hidden';document.querySelectorAll('#balls .ball').forEach(other=>{if(other!==b)other.className='ball leave';});if(ghost){const size=parseFloat(ghost.style.getPropertyValue('--size'));await animate(ghost,[{transform:ghost.style.transform},{transform:`translate(${r.left+(r.width-size)/2}px,${r.top+(r.height-size)/2}px) scale(.72) rotate(-12deg)`}],{duration:190,easing:'cubic-bezier(.15,.8,.25,1)'});ghost.remove();}cell.classList.add('stamped','just-stamped');sound('stamp');navigator.vibrate?.(18);burst(r);animate(document.querySelector('.board-frame'),[{transform:'translate(0,0)'},{transform:'translate(0,3px)'},{transform:'translate(-1px,-1px)'},{transform:'translate(0,0)'}],{duration:190});$('announcer').textContent=result.duplicate?`${n} already stamped. One call used.`:`Stamped ${n}.`;await wait(370);if(result.points)await activateSpaces(result);await wait(120);render();refreshBag();if(state.status!=='playing'){showResult();return;}await nextDraw();}
function showStages(){hideTooltip();$('stage-grid').innerHTML=Array.from({length:10},(_,i)=>{const n=i+1,current=n===state.stage,done=n<state.stage;return `<div class="stage-node ${current?'current':done?'complete':'locked'}" ${current?'aria-current="step"':''} aria-label="Stage ${n}, ${current?'current':done?'completed':'locked'}"><span>${n}</span>${current?'<span>◆</span>':done?'<span>✓</span>':'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'}</div>`;}).join('');$('stage-dialog').showModal();}
function showResult(){hideTooltip();const passed=state.status==='passed',finished=passed&&state.stage===10;$('result-icon').textContent=finished?'♛':passed?'✦':'↻';$('result-score').textContent=`${state.score}/${state.target} pts`;$('continue').textContent=passed&&!finished?'→':'↻';$('continue').setAttribute('aria-label',passed&&!finished?'Next stage':'New run');$('result-dialog').setAttribute('aria-label',finished?'All ten stages complete':passed?'Stage complete':'Run ended');$('result-dialog').showModal();}
$('continue').onclick=async()=>{const next=state.status==='passed'&&state.stage<10?state.stage+1:1;state=newStage(next,next===1?5:state.money);$('result-dialog').close();await nextDraw();};
$('result-dialog').addEventListener('cancel',e=>e.preventDefault());
$('redraw').onclick=async()=>{if(busy||state.money<1)return;lock();if(!redraw(state)){unlock();return;}$('money').textContent=state.money;animate($('money'),[{transform:'scale(1.25)',color:'#fff1c2'},{transform:'scale(1)',color:'#f4c66c'}],{duration:180});sound('roll');document.querySelectorAll('#balls .ball').forEach(b=>b.className='ball leave');await wait(480);render();showBalls();await wait(770);unlock();};
$('bag').onclick=()=>{hideTooltip();refreshBag();$('bag-dialog').showModal();};$('stages').onclick=showStages;
for(const dialog of document.querySelectorAll('dialog:not(#result-dialog)')){dialog.addEventListener('close',hideTooltip);dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('pointerdown',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});}
nextDraw();
