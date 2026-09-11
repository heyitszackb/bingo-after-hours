import {pulseBackground} from './background.js';
import {newStage,draw,choose,redraw,settleStage,openShop,paintBall,redrawShop,STAGE_TARGETS} from './game.js';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state=newStage(),busy=false,drag=null,audio,tooltipAnchor=null,payingOut=false,hasRun=false,inMenu=true,muted=false,paintDrag=null,selectedPaint=null,shopping=false;
const wait=ms=>new Promise(r=>setTimeout(r,reduced?15:ms));
const animate=(el,frames,options)=>el.animate(frames,{...options,duration:reduced?1:options.duration}).finished.catch(()=>{});
function sound(kind,step=0){if(muted)return;if(!navigator.userActivation?.hasBeenActive)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const t=audio.currentTime;const o=audio.createOscillator(),g=audio.createGain();o.type=kind==='score'?'triangle':'square';o.frequency.setValueAtTime(kind==='activate'?330*2**(Math.min(step,12)/12):kind==='score'?660:kind==='roll'?180:110,t);o.frequency.exponentialRampToValueAtTime(kind==='activate'?220*2**(Math.min(step,12)/12):kind==='score'?1320:40,t+.12);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.17);}catch{}}
function burst(rect,scoring=false){if(reduced)return;for(let i=0;i<(scoring?28:12);i++){const p=document.createElement('i');p.className='particle';p.style.left=`${rect.left+rect.width/2}px`;p.style.top=`${rect.top+rect.height/2}px`;p.style.background=scoring?'#f4c66c':i%2?'#a9b7b8':'#e4e9dd';$('effects').append(p);const angle=Math.random()*Math.PI*2,d=25+Math.random()*(scoring?150:65);animate(p,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(angle)*d}px,${Math.sin(angle)*d+25}px) scale(0)`,opacity:0}],{duration:450+Math.random()*250,easing:'cubic-bezier(.1,.7,.3,1)'}).then(()=>p.remove());}}
for(let n=1;n<=25;n++){const c=document.createElement('button');c.type='button';c.id=`cell-${n}`;c.className='cell';c.innerHTML=`<span>${n}</span>`;c.onclick=()=>{if(!busy&&!drag)inspectSpace(n);};$('board').append(c);}
function render(){
  const boardKey=state.board.join(',');
  if($('board').dataset.layout!==boardKey){$('board').append(...state.board.map(n=>$(`cell-${n}`)));$('board').dataset.layout=boardKey;}
  $('pause-button').disabled=busy||payingOut||state.status!=='playing';document.querySelector('.score-panel').classList.toggle('large-score',state.target>=1000);for(const k of ['score','target','calls','stage'])$(k).textContent=state[k];$('money').textContent=state.money;$('bag-count').textContent=state.bag.size;$('bag').setAttribute('aria-label',`Inspect bag, ${state.bag.size} balls remaining`);$('progress').style.width=`${Math.min(100,state.score/state.target*100)}%`;$('redraw').disabled=busy||state.money<1||state.status!=='playing';$('redraw').setAttribute('aria-label',state.money<1?'Reroll costs $1; not enough money':'Reroll for $1 without using a call');renderCalls(state.calls);for(let n=1;n<=25;n++){const c=$(`cell-${n}`);c.className=`cell paint-${state.paints[n]||'grey'}${state.stamps.has(n)?' stamped':''}${state.offer.includes(n)?' offered':''}`;c.setAttribute('aria-label',`${n}${state.stamps.has(n)?', stamped':''}`);}}
function ball(n){const b=document.createElement('button');b.className=`ball paint-${state.paints[n]||'grey'}`;b.dataset.number=n;b.innerHTML=`<span class="face">${n}</span>`;b.setAttribute('aria-label',`Inspect ball ${n}`);return b;}
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
  const color=space?(state.stamps.has(n)?state.paints[n]:null):state.paints[n];
  $('tooltip-effect').textContent=color==='gold'?'+$1 when scored':color==='red'?'×2 to any scoring bingo · stacks':color==='blue'?'+3 draws when scored':space?'Nothing special':'';
  $('tooltip-effect').hidden=!space&&!color;
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
function refreshBag(){
  if(tooltipAnchor?.closest('#bag-grid'))hideTooltip();
  $('bag-grid').replaceChildren();
  for(let n=1;n<=25;n++){
    const b=ball(n),played=state.played[n]>0;
    if(played)b.classList.add('played-ball');
    if(state.offer.includes(n))b.classList.add('on-track');
    b.setAttribute('aria-label',`Ball ${n}${played?', already played, unavailable this stage':''}${state.offer.includes(n)?', on track':''}; played ${state.played[n]} times`);
    b.onclick=()=>inspect(n,b);$('bag-grid').append(b);
  }
}
function lock(){hideTooltip();busy=true;render();document.querySelectorAll('#balls .ball').forEach(b=>b.disabled=true);}
function unlock(){busy=false;saveRun();render();document.querySelectorAll('#balls .ball').forEach(b=>{b.disabled=false;b.classList.remove('enter');});}
function showBalls(){$('balls').replaceChildren();state.offer.forEach((n,i)=>{const b=ball(n);b.classList.add('enter');b.style.setProperty('--i',i);b.disabled=true;b.setAttribute('aria-label',`Ball ${n}. Tap to inspect. Drag along the track to reorder, or to the card to play. Keyboard: Enter to inspect, Space to play.`);b.addEventListener('pointerdown',e=>startDrag(e,n,b));b.addEventListener('pointermove',moveDrag);b.addEventListener('pointerup',endDrag);b.addEventListener('pointercancel',cancelDrag);b.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});b.onclick=e=>{if(e.detail===0&&!busy)inspect(n,b);};b.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();if(!busy&&!drag)play(n,b);} };$('balls').append(b);});refreshBag();}
async function nextDraw(){resetResultUI();lock();state.offer=draw(state);render();showBalls();await wait(770);sound('roll');unlock();}
function startDrag(e,n,b){
  if(busy||drag||e.button!==0)return;
  e.preventDefault();sound('roll');b.setPointerCapture(e.pointerId);
  const nodes=[...$('balls').children];
  drag={n,b,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,ghost:null,
    original:[...state.offer],order:[...state.offer],nodes,
    slots:nodes.map(node=>{const r=node.getBoundingClientRect();return r.left+r.width/2;}),
    scrollLeft:$('balls').scrollLeft};
}
function previewOrder(d,order){
  if(order.every((n,i)=>n===d.order[i]))return;
  const previous=new Map(d.nodes.map(node=>[node,node.getBoundingClientRect().left]));
  d.nodes.forEach(node=>node.getAnimations().forEach(a=>a.cancel()));
  d.order=order;
  d.nodes.forEach(node=>node.style.order=order.indexOf(Number(node.dataset.number)));
  for(const node of d.nodes){
    if(node===d.b)continue;
    const dx=previous.get(node)-node.getBoundingClientRect().left;
    if(dx)animate(node,[{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:210,easing:'cubic-bezier(.2,.85,.3,1)'});
  }
}
function isOnBoard(x,y){const r=$('board').getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function isOnTrack(x,y){const r=document.querySelector('.track').getBoundingClientRect();return x>=r.left-16&&x<=r.right+16&&y>=r.top-16&&y<=r.bottom+16;}
function moveDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>7){
    d.moved=true;hideTooltip();d.ghost=d.b.cloneNode(true);d.ghost.className=`ball drag-ghost paint-${state.paints[d.n]||'grey'}`;
    d.ghost.removeAttribute('disabled');d.ghost.setAttribute('aria-hidden','true');d.ghost.tabIndex=-1;
    d.size=d.b.getBoundingClientRect().width;d.ghost.style.setProperty('--size',`${d.size}px`);
    document.body.append(d.ghost);d.b.classList.add('held');
  }
  if(!d.moved)return;
  d.ghost.style.transform=`translate(${e.clientX-d.size/2}px,${e.clientY-d.size/2}px) rotate(${Math.max(-14,Math.min(14,(e.clientX-d.x)*.08))}deg) scale(1.08)`;
  const over=isOnBoard(e.clientX,e.clientY),onTrack=!over&&isOnTrack(e.clientX,e.clientY);
  document.querySelector('.board-frame').classList.toggle('drag-over',over);
  $('balls').classList.toggle('reordering',onTrack);
  $(`cell-${d.n}`).classList.toggle('destination',over);
  if(onTrack){
    const x=e.clientX+$('balls').scrollLeft-d.scrollLeft;
    let index=0;
    d.slots.forEach((center,i)=>{if(Math.abs(center-x)<Math.abs(d.slots[index]-x))index=i;});
    const order=d.order.filter(n=>n!==d.n);order.splice(index,0,d.n);previewOrder(d,order);
  }else previewOrder(d,d.original);
}
function cleanDrag(d){
  d.b.classList.remove('held');$('balls').classList.remove('reordering');
  document.querySelector('.board-frame').classList.remove('drag-over');$(`cell-${d.n}`).classList.remove('destination');
}
function commitOrder(d){
  for(const n of state.offer){const node=d.nodes.find(node=>Number(node.dataset.number)===n);$('balls').append(node);node.style.order='';node.style.setProperty('--i',state.offer.indexOf(n));}
}
async function endDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag;drag=null;
  if(!d.moved){cleanDrag(d);inspect(d.n,d.b);return;}
  if(isOnBoard(e.clientX,e.clientY)){
    cleanDrag(d);commitOrder(d);await play(d.n,d.b,d.ghost);return;
  }
  busy=true;
  const reordered=isOnTrack(e.clientX,e.clientY);
  if(reordered)state.offer=[...d.order];else previewOrder(d,d.original);
  const end=d.b.getBoundingClientRect();
  await animate(d.ghost,[{transform:d.ghost.style.transform},{transform:`translate(${end.left}px,${end.top}px) rotate(0deg) scale(1)`}],{duration:200,easing:'cubic-bezier(.15,.85,.3,1)'});
  d.ghost.remove();cleanDrag(d);commitOrder(d);busy=false;
  if(reordered){saveRun();sound('roll');$('announcer').textContent=`Ball ${d.n}, position ${state.offer.indexOf(d.n)+1} of ${state.offer.length}.`;}
}
function cancelDrag(){
  if(!drag)return;
  const d=drag;drag=null;previewOrder(d,d.original);cleanDrag(d);d.ghost?.remove();commitOrder(d);
}
function renderCalls(calls){
  $('calls').textContent=calls;
  $('call-dots').innerHTML=Array.from({length:12},(_,i)=>`<i class="${i>=Math.ceil(calls/state.callCapacity*12)?'used':''}"></i>`).join('');
  document.querySelector('.call-meter').setAttribute('aria-label',`${calls} calls remaining`);
}
async function awardDraws(cell,count,before){
  const from=cell.getBoundingClientRect(),to=$('calls').getBoundingClientRect();
  const token=document.createElement('span');token.className='draw-bonus';token.textContent=`+${count}`;
  token.style.left=`${from.left+from.width/2}px`;token.style.top=`${from.top+from.height/2}px`;$('effects').append(token);
  const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
  sound('score');cell.classList.add('blue-paying');
  await animate(token,[{transform:'translate(-50%,-50%) scale(.5)',opacity:0},{transform:'translate(-50%,-100%) scale(1.2)',opacity:1,offset:.25},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.6)`,opacity:1}],{duration:440,easing:'cubic-bezier(.2,.7,.35,1)'});
  token.remove();renderCalls(before+count);cell.classList.remove('blue-paying');
  animate(document.querySelector('.call-meter'),[{filter:'brightness(2)',transform:'scale(1.03)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:220});
  sound('activate');navigator.vibrate?.(12);
}
async function activateSpaces(result){
  let displayedScore=state.score-result.points,displayedMoney=state.money-result.gold,displayedCalls=state.calls-result.bonusDraws;
  for(const [index,activation] of result.activations.entries()){
    const cell=$(`cell-${activation.number}`);
    if(activation.patternMultiplier>1){
      const line=activation.pattern.map(n=>$(`cell-${n}`));
      line.forEach(c=>c.classList.add('multiplied'));
      const badge=document.createElement('span');badge.className='pattern-multiplier';badge.textContent=`×${activation.patternMultiplier}`;
      const r=line[2].getBoundingClientRect();badge.style.left=`${r.left+r.width/2}px`;badge.style.top=`${r.top+r.height/2}px`;$('effects').append(badge);
      sound('score');pulseBackground();
      await animate(badge,[{transform:'translate(-50%,-50%) scale(.5)',opacity:0},{transform:'translate(-50%,-70%) scale(1.2)',opacity:1,offset:.25},{transform:'translate(-50%,-100%) scale(1)',opacity:0}],{duration:550});
      badge.remove();line.forEach(c=>c.classList.remove('multiplied'));
    }
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
    if(activation.gold){cell.classList.add('gold-paying');await cashInCall(cell,index,displayedMoney,()=>1,false);displayedMoney++;cell.classList.remove('gold-paying');}
    if(activation.draws){await awardDraws(cell,activation.draws,displayedCalls);displayedCalls+=activation.draws;}
    cell.classList.remove('activating');
    await wait(35);
  }
  sound('score');
  $('announcer').textContent=`${result.activations.length} spaces activated for ${result.points} points.`;
  await wait(160);
  result.cleared.forEach(n=>$(`cell-${n}`).classList.add('clearing'));
  await wait(250);
}
async function play(n,b,ghost){if(busy){ghost?.remove();return;}lock();const result=choose(state,n);if(!result){ghost?.remove();unlock();return;}saveRun();renderCalls(state.calls-result.bonusDraws);$('bag-count').textContent=state.bag.size;$('bag').setAttribute('aria-label',`Inspect bag, ${state.bag.size} balls remaining`);const cell=$(`cell-${n}`),r=cell.getBoundingClientRect();b.style.visibility='hidden';document.querySelectorAll('#balls .ball').forEach(other=>{if(other!==b)other.classList.add('leave');});if(ghost){const size=parseFloat(ghost.style.getPropertyValue('--size'));await animate(ghost,[{transform:ghost.style.transform},{transform:`translate(${r.left+(r.width-size)/2}px,${r.top+(r.height-size)/2}px) scale(.72) rotate(-12deg)`}],{duration:190,easing:'cubic-bezier(.15,.8,.25,1)'});ghost.remove();}cell.classList.add('stamped','just-stamped');pulseBackground();sound('stamp');navigator.vibrate?.(18);burst(r);animate(document.querySelector('.board-frame'),[{transform:'translate(0,0)'},{transform:'translate(0,3px)'},{transform:'translate(-1px,-1px)'},{transform:'translate(0,0)'}],{duration:190});$('announcer').textContent=result.duplicate?`${n} already stamped. One call used.`:`Stamped ${n}.`;await wait(370);if(result.points)await activateSpaces(result);await wait(120);render();refreshBag();if(state.status!=='playing'){showResult();return;}await nextDraw();}
function showStages(){hideTooltip();$('stage-grid').innerHTML=Array.from({length:10},(_,i)=>{const n=i+1,current=n===state.stage,done=n<state.stage;return `<div class="stage-node ${current?'current':done?'complete':'locked'}" ${current?'aria-current="step"':''} aria-label="Stage ${n}, ${current?'current':done?'completed':'locked'}"><span>${n}<small>${STAGE_TARGETS[i].toLocaleString()} pts</small></span>${current?'<span>◆</span>':done?'<span>✓</span>':'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'}</div>`;}).join('');$('stage-dialog').showModal();}
function resetResultUI(){
  $('stage-result').hidden=true;
  document.querySelector('.track').hidden=false;
  $('bag').disabled=false;$('stages').disabled=false;
}
function finishResult(){
  payingOut=false;
  if(state.status==='passed'&&state.stage<10){showShop();return;}
  $('continue').disabled=false;$('result-menu').disabled=false;
  $('result-actions').hidden=false;
  $('bag').disabled=false;$('stages').disabled=false;
}
async function cashInCall(dot,index,before,onArrival,payout=true){
  const from=dot.getBoundingClientRect(),to=document.querySelector('.money-panel').getBoundingClientRect();
  const token=document.createElement('span');token.className='cash-flight';token.textContent='$';
  token.style.left=`${from.left+from.width/2}px`;token.style.top=`${from.top+from.height/2}px`;
  $('effects').append(token);
  const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
  if(payout)dot.classList.add('used');
  await animate(token,[
    {transform:'translate(-50%,-50%) scale(.45)',opacity:.7,filter:'hue-rotate(65deg)'},
    {transform:'translate(-50%,calc(-50% - 18px)) scale(1.12)',opacity:1,filter:'hue-rotate(0deg)',offset:.2},
    {transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy-24}px)) scale(1)`,opacity:1,offset:.6},
    {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.25)`,opacity:.6}
  ],{duration:440,easing:'cubic-bezier(.2,.5,.35,1)'});
  token.remove();
  const collected=onArrival();
  $('money').textContent=before+collected;
  if(payout)$('payout-earned').textContent=`+$${collected}`;
  sound('activate',index);navigator.vibrate?.(8);
  animate(document.querySelector('.money-panel'),[{transform:'scale(1.08)',boxShadow:'0 0 22px #f4c66c99',borderColor:'#fff2bd'},{transform:'scale(1)',boxShadow:'3px 4px #00191e',borderColor:'#a68a58'}],{duration:170});
  animate($('money'),[{transform:'translateY(-3px) scale(1.2)',color:'#fff4c9'},{transform:'translateY(0) scale(1)',color:'#f4c66c'}],{duration:170});
  for(let i=0;i<5&&!reduced;i++){
    const spark=document.createElement('i');spark.className='cash-spark';spark.style.left=`${to.left+to.width/2}px`;spark.style.top=`${to.top+to.height/2}px`;$('effects').append(spark);
    const angle=i*Math.PI*.4;
    animate(spark,[{transform:'translate(0,0)',opacity:1},{transform:`translate(${Math.cos(angle)*25}px,${Math.sin(angle)*20}px) scale(0)`,opacity:0}],{duration:250}).then(()=>spark.remove());
  }
}
async function showResult(){
  hideTooltip();
  const passed=state.status==='passed',finished=passed&&state.stage===10;
  $('result-icon').textContent=finished?'♛':passed?'✦':'↻';
  $('result-score').textContent=`${state.score}/${state.target} pts`;
  $('continue').textContent=passed&&!finished?'→':'↻';
  $('continue').setAttribute('aria-label',passed&&!finished?'Next stage':'New run');
  $('stage-result').setAttribute('aria-label',finished?'All ten stages complete':passed?'Stage complete':'Run ended');
  $('payout-earned').hidden=!passed;
  $('result-actions').hidden=true;
  $('continue').disabled=true;$('result-menu').disabled=true;
  document.querySelector('.track').hidden=true;$('stage-result').hidden=false;
  const alreadyPaid=passed&&state.bonusPaid,bonus=passed?state.calls:0;
  const before=state.money;
  if(passed)settleStage(state);
  saveRun();
  if(!passed){finishResult();return;}
  payingOut=true;$('bag').disabled=true;$('stages').disabled=true;
  $('payout-earned').textContent=alreadyPaid?`+$${bonus}`:'+$0';
  if(alreadyPaid){
    [...$('call-dots').children].forEach(dot=>dot.classList.add('used'));$('calls').textContent=0;
    finishResult();return;
  }
  await wait(250);
  let collected=0;
  const flights=[];
  for(let i=0;i<bonus;i++){
    const dot=$('call-dots').children[Math.min(11,Math.floor((bonus-i-1)/state.callCapacity*12))];
    flights.push(cashInCall(dot,i,before,()=>++collected));
    renderCalls(bonus-i-1);
    await wait(110);
  }
  await Promise.all(flights);
  document.querySelector('.call-meter').setAttribute('aria-label',`${bonus} unused calls converted to dollars`);
  sound('score');
  $('announcer').textContent=`${bonus} unused calls paid $${bonus}. Balance $${state.money}.`;
  await wait(250);
  finishResult();
}
$('continue').onclick=async()=>{if(payingOut)return;const next=state.status==='passed'&&state.stage<10?state.stage+1:1;state=newStage(next,next===1?5:state.money,next===1?{}:state.paints);hasRun=true;saveRun();resetResultUI();await nextDraw();};
$('redraw').onclick=async()=>{if(busy||drag||state.money<1)return;lock();if(!redraw(state)){unlock();return;}saveRun();$('money').textContent=state.money;animate($('money'),[{transform:'scale(1.25)',color:'#fff1c2'},{transform:'scale(1)',color:'#f4c66c'}],{duration:180});sound('roll');document.querySelectorAll('#balls .ball').forEach(b=>b.classList.add('leave'));await wait(480);render();showBalls();await wait(770);unlock();};
$('bag').onclick=()=>{hideTooltip();refreshBag();$('bag-dialog').showModal();};$('stages').onclick=showStages;
for(const dialog of document.querySelectorAll('#bag-dialog,#stage-dialog,#help-dialog')){dialog.addEventListener('close',hideTooltip);dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('pointerdown',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});}


function renderShop(){
  hideTooltip();$('money').textContent=state.money;
  $('shop-balls').replaceChildren();
  state.shopOffer.forEach(n=>{
    const b=ball(n);b.setAttribute('aria-label',`Ball ${n}, ${state.paints[n]||'grey'}. Drop paint here, or select paint then select this ball.`);
    b.onclick=()=>{if(busy)return;if(selectedPaint)applyPaint(n,selectedPaint,b);else inspect(n,b);};
    $('shop-balls').append(b);
  });
  document.querySelectorAll('.paint-can').forEach(b=>{b.disabled=busy||state.money<3;b.classList.toggle('selected',b.dataset.paint===selectedPaint);b.setAttribute('aria-pressed',String(b.dataset.paint===selectedPaint));});
  $('shop-redraw').disabled=busy||state.money<2;$('shop-next').disabled=busy;$('shop-menu').disabled=busy;$('shop-bag').disabled=busy;
  $('shop-hint').textContent=state.money<3?'NEXT →':selectedPaint?'CHOOSE A BALL ↓':'DRAG PAINT ↓ BALL';
}
function showShop(){
  openShop(state);shopping=true;busy=false;selectedPaint=null;
  hideTooltip();$('game-screen').classList.add('shopping');$('shop-screen').hidden=false;
  $('bag').disabled=false;$('stages').disabled=false;renderShop();saveRun();
  animate($('shop-screen'),[{transform:'translateY(24px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:350,easing:'cubic-bezier(.2,.8,.3,1)'});
}
function paintTarget(x,y){return [...$('shop-balls').children].find(b=>{const r=b.getBoundingClientRect();return x>=r.left-8&&x<=r.right+8&&y>=r.top-12&&y<=r.bottom+12;});}
function cancelPaintDrag(){
  if(!paintDrag)return;
  const d=paintDrag;paintDrag=null;d.ghost?.remove();d.button.classList.remove('held');
  document.querySelectorAll('.paint-target').forEach(b=>b.classList.remove('paint-target'));
  if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);
}
for(const button of document.querySelectorAll('.paint-can')){
  button.addEventListener('pointerdown',e=>{
    if(busy||paintDrag||e.button!==0||state.money<3)return;
    e.preventDefault();hideTooltip();button.setPointerCapture(e.pointerId);
    paintDrag={button,color:button.dataset.paint,id:e.pointerId,x:e.clientX,y:e.clientY,ghost:null,moved:false};
  });
  button.addEventListener('pointermove',e=>{
    const d=paintDrag;if(!d||d.id!==e.pointerId)return;
    if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>6){
      d.moved=true;d.ghost=d.button.querySelector('.paint-tin').cloneNode(true);d.ghost.classList.add('paint-ghost',d.color);d.ghost.setAttribute('aria-hidden','true');document.body.append(d.ghost);d.button.classList.add('held');
    }
    if(!d.moved)return;
    d.ghost.style.transform=`translate(${e.clientX-28}px,${e.clientY-32}px) rotate(-12deg)`;
    const target=paintTarget(e.clientX,e.clientY);
    [...$('shop-balls').children].forEach(b=>b.classList.toggle('paint-target',b===target));
  });
  button.addEventListener('pointerup',e=>{
    const d=paintDrag;if(!d||d.id!==e.pointerId)return;
    const target=d.moved?paintTarget(e.clientX,e.clientY):null;
    cancelPaintDrag();
    if(target)applyPaint(Number(target.dataset.number),d.color,target);
    else if(!d.moved){selectedPaint=selectedPaint===d.color?null:d.color;renderShop();sound('roll');}
  });
  button.addEventListener('pointercancel',cancelPaintDrag);
  button.addEventListener('lostpointercapture',cancelPaintDrag);
  button.onclick=e=>{if(e.detail===0&&!busy&&state.money>=3){selectedPaint=selectedPaint===button.dataset.paint?null:button.dataset.paint;renderShop();}};
}
async function applyPaint(n,color,target){
  if(busy)return;
  if(!paintBall(state,n,color)){
    $('shop-hint').textContent=state.paints[n]===color?'ALREADY PAINTED': 'NEED $3';
    animate(target,[{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:180});return;
  }
  busy=true;selectedPaint=null;saveRun();
  document.querySelectorAll('#shop-screen button').forEach(b=>b.disabled=true);
  target.classList.remove('paint-grey','paint-gold','paint-red','paint-blue');target.classList.add(`paint-${color}`);
  const r=target.getBoundingClientRect();
  for(let i=0;i<18&&!reduced;i++){
    const drop=document.createElement('i');drop.className=`paint-splash ${color}`;drop.style.left=`${r.left+r.width/2}px`;drop.style.top=`${r.top+r.height/2}px`;$('effects').append(drop);
    const a=i*Math.PI/9,d=25+Math.random()*45;
    animate(drop,[{transform:'scale(.3)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) rotate(90deg)`,opacity:0}],{duration:420}).then(()=>drop.remove());
  }
  sound('stamp');pulseBackground();navigator.vibrate?.([12,20,8]);$('money').textContent=state.money;
  await animate(target,[{transform:'scale(1)'},{transform:'scale(1.17,.85)',offset:.2},{transform:'scale(.94,1.08)',offset:.55},{transform:'scale(1)'}],{duration:380});
  busy=false;renderShop();refreshBag();render();
  $('shop-hint').textContent=`${n} · ${color.toUpperCase()} ✓`;
  $('announcer').textContent=`Ball ${n} painted ${color} for $3. Balance $${state.money}.`;
}
$('shop-redraw').onclick=async()=>{
  if(busy||paintDrag||!redrawShop(state))return;
  busy=true;selectedPaint=null;saveRun();
  document.querySelectorAll('#shop-screen button').forEach(b=>b.disabled=true);$('money').textContent=state.money;
  const balls=[...$('shop-balls').children];balls.forEach((b,i)=>{b.style.setProperty('--i',i);b.classList.add('leave');});
  sound('roll');await wait(420);renderShop();
  [...$('shop-balls').children].forEach((b,i)=>{b.style.setProperty('--i',i);b.classList.add('enter');b.disabled=true;});
  await wait(770);busy=false;renderShop();
};
$('shop-next').onclick=async()=>{
  if(busy||paintDrag)return;
  hideTooltip();shopping=false;$('game-screen').classList.remove('shopping');$('shop-screen').hidden=true;
  state=newStage(state.stage+1,state.money,state.paints);saveRun();await nextDraw();
};
$('shop-menu').onclick=()=>{if(!busy&&!paintDrag)showMenu();};
$('shop-bag').onclick=()=>{if(busy)return;refreshBag();$('bag-dialog').showModal();};

const SAVE_KEY='binglatro.run.v1';
function saveRun(){
  if(!hasRun)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({...state,stamps:[...state.stamps],bag:[...state.bag]}));}catch{}
}
function loadRun(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!saved)return;
    const numbers=a=>Array.isArray(a)&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=25)&&new Set(a).size===a.length;
    if(!Number.isInteger(saved.stage)||saved.stage<1||saved.stage>10||!numbers(saved.stamps)||!numbers(saved.bag)||!numbers(saved.offer)||!saved.offer.every(n=>saved.bag.includes(n))||!Number.isInteger(saved.calls)||saved.calls<0||saved.calls>192||!Number.isInteger(saved.money)||saved.money<0||!Number.isInteger(saved.score)||saved.score<0||!['playing','passed','over'].includes(saved.status)||!Array.isArray(saved.played)||saved.played.length!==26)throw new Error('Invalid save');
    if(saved.paints&&typeof saved.paints==='object'){for(const n of Object.keys(saved.paints))if(saved.paints[n]==='orange')saved.paints[n]='red';}
    saved.board??=Array.from({length:25},(_,i)=>i+1);
    if(!numbers(saved.board)||saved.board.length!==25)throw new Error('Invalid board');
    delete saved.goldSeals;
    saved.callCapacity??=Math.max(12,saved.calls);
    if(!Number.isInteger(saved.callCapacity)||saved.callCapacity<12||saved.callCapacity>192||saved.calls>saved.callCapacity)throw new Error('Invalid call capacity');
    if(saved.paints!==undefined&&(!saved.paints||Array.isArray(saved.paints)||typeof saved.paints!=='object'||!Object.entries(saved.paints).every(([n,c])=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=25&&['gold','red','blue'].includes(c))))throw new Error('Invalid paint');
    if(saved.shopOffer!=null&&(!numbers(saved.shopOffer)||saved.shopOffer.length!==3||saved.status!=='passed'||!saved.bonusPaid))throw new Error('Invalid shop');
    state={...newStage(saved.stage,saved.money),...saved,target:STAGE_TARGETS[saved.stage-1],stamps:new Set(saved.stamps),bag:new Set(saved.bag)};
    hasRun=true;
  }catch{try{localStorage.removeItem(SAVE_KEY);}catch{}}
}
function updateMenu(){
  $('play-button').innerHTML=hasRun?'RESUME <span>▶</span>':'PLAY <span>▶</span>';
  $('new-run-button').hidden=!hasRun;
  $('saved-stage').hidden=!hasRun;
  $('saved-stage').textContent=`STAGE ${state.stage} · ${state.score}/${state.target.toLocaleString()} pts · $${state.money}`;
}
function showMenu(){
  hideTooltip();cancelDrag();cancelPaintDrag();saveRun();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  $('game-screen').hidden=true;$('title-screen').hidden=false;inMenu=true;
  updateMenu();$('play-button').focus();
}
async function enterGame(fresh=false){
  if(!inMenu&&!fresh)return;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  if(fresh||!hasRun){state=newStage();hasRun=true;}
  shopping=false;$('game-screen').classList.remove('shopping');$('shop-screen').hidden=true;
  inMenu=false;resetResultUI();$('title-screen').hidden=true;$('game-screen').hidden=false;
  render();
  if(state.status!=='playing'){busy=true;showBalls();showResult();}
  else if(state.offer.length){lock();showBalls();await wait(770);unlock();}
  else await nextDraw();
}
function pauseGame(){
  if(shopping&&!paintDrag&&!busy){showMenu();return;}
  if(inMenu||busy||payingOut||document.querySelector('dialog[open]'))return;
  cancelDrag();hideTooltip();saveRun();
  $('pause-summary').textContent=`STAGE ${state.stage} · ${state.score}/${state.target.toLocaleString()} pts`;
  $('pause-dialog').showModal();
}
function resumeGame(){$('pause-dialog').close();$('pause-button').focus();}
function confirmRestart(){$('restart-dialog').showModal();}
$('play-button').onclick=()=>enterGame();
$('new-run-button').onclick=confirmRestart;
$('pause-button').onclick=pauseGame;
$('resume-button').onclick=resumeGame;
$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resumeGame();});
$('restart-button').onclick=confirmRestart;
$('confirm-restart').onclick=()=>enterGame(true);
$('cancel-restart').onclick=()=>$('restart-dialog').close();
$('main-menu-button').onclick=showMenu;
$('result-menu').onclick=()=>{if(payingOut)return;if(state.status==='over'||state.stage===10){hasRun=false;try{localStorage.removeItem(SAVE_KEY);}catch{}}showMenu();};
$('help-button').onclick=()=>$('help-dialog').showModal();
$('help-done').onclick=()=>$('help-dialog').close();
try{muted=localStorage.getItem('binglatro.muted')==='true';}catch{}
function renderSound(){$('sound-button').textContent=muted?'SOUND OFF':'SOUND ON';$('sound-button').setAttribute('aria-pressed',String(muted));}
$('sound-button').onclick=()=>{muted=!muted;try{localStorage.setItem('binglatro.muted',String(muted));}catch{}renderSound();};
renderSound();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('dialog[open]')&&!inMenu){e.preventDefault();pauseGame();}});
window.addEventListener('pagehide',saveRun);
loadRun();updateMenu();
