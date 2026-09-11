import {newStage,draw,choose,redraw} from './game.js';
const $=id=>document.getElementById(id);
let state=newStage(),busy=false,drawNumber=0,runScore=0;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?20:ms));
for(let n=1;n<=25;n++){const cell=document.createElement('div');cell.className='cell';cell.id=`cell-${n}`;cell.innerHTML=`<span>${n}</span>`;$('board').append(cell);}
function render(){
  for(const key of ['score','target','calls'])$(key).textContent=state[key];
  $('stage').textContent=String(state.stage).padStart(2,'0');
  $('progress').style.width=`${Math.min(100,state.score/state.target*100)}%`;
  $('redraw-count').textContent=state.redraws;
  $('redraw').disabled=busy||!state.redraws||state.status!=='playing';
  $('call-dots').innerHTML=Array.from({length:12},(_,i)=>`<i class="${i>=state.calls?'used':''}"></i>`).join('');
  for(let n=1;n<=25;n++){const c=$(`cell-${n}`);c.className=`cell${state.stamps.has(n)?' stamped':''}${state.offer.includes(n)?' offered':''}`;c.setAttribute('aria-label',`${n}${state.stamps.has(n)?', stamped':''}`);}
}
function showBalls(){
  drawNumber++;$('draw-number').textContent=String(drawNumber).padStart(2,'0');
  $('balls').replaceChildren();
  state.offer.forEach((n,i)=>{const b=document.createElement('button');b.className='ball enter';b.style.setProperty('--i',i);b.innerHTML=`<span class="face">${n}</span>${state.stamps.has(n)?'<span class="repeat" aria-hidden="true">✓</span>':''}`;b.setAttribute('aria-label',`Choose ${n}${state.stamps.has(n)?', already stamped, uses one call':''}`);b.disabled=true;b.onclick=()=>play(n,b);$('balls').append(b);});
  refreshBag();
}
function unlock(){busy=false;render();document.querySelectorAll('.ball').forEach(b=>{b.disabled=false;b.classList.remove('enter');});}
function refreshBag(){
  $('bag-grid').innerHTML=Array.from({length:25},(_,i)=>{const n=i+1;return `<div class="bag-item${state.offer.includes(n)?' on-track':''}" aria-label="${n}, played ${state.played[n]} times${state.offer.includes(n)?', on track':''}">${n}<small>×${state.played[n]}</small></div>`;}).join('');
}
function lock(){busy=true;render();document.querySelectorAll('.ball').forEach(b=>b.disabled=true);}
async function nextDraw(){lock();state.offer=draw();render();showBalls();await wait(850);unlock();}
async function play(n,button){
  if(busy)return;
  lock();
  const result=choose(state,n);if(!result)return;
  button.className='ball selected';
  document.querySelectorAll('.ball').forEach(b=>{if(b!==button)b.className='ball leave';});
  const cell=$(`cell-${n}`);cell.classList.add('stamped','just-stamped');
  $('message').textContent=result.duplicate?'ALREADY STAMPED · ONE CALL USED':`NUMBER ${n} · STAMPED`;
  await wait(380);
  if(result.points){
    result.cleared.forEach(v=>$(`cell-${v}`).classList.add('scoring'));
    $('celebration').innerHTML=`<div><small>${result.patterns.length>1?`${result.patterns.length} LINES AT ONCE`:'BINGO!'}</small><strong>+${result.points} PTS</strong></div>`;
    $('celebration').classList.add('show');runScore+=result.points;
    $('message').textContent=`${result.patterns.length} LINE${result.patterns.length>1?'S':''} COMPLETE · STAMPS CLEARED`;
    await wait(1100);$('celebration').classList.remove('show');
  }else await wait(220);
  render();refreshBag();
  if(state.status!=='playing'){showResult();return;}
  await nextDraw();$('message').textContent='PICK A BALL TO STAMP YOUR CARD';
}
function showResult(){
  const passed=state.status==='passed';
  $('result-eyebrow').textContent=passed?`STAGE ${String(state.stage).padStart(2,'0')} COMPLETE`:'NO CALLS LEFT';
  $('result-title').textContent=passed?'NICE CALL.':'THAT’S A WRAP.';
  $('result-copy').textContent=passed?`${state.score} / ${state.target} points. Next up: ${state.target+10} points, 12 calls, and a fresh card.`:`You reached stage ${state.stage} with ${runScore} total points. This stage: ${state.score} / ${state.target}. The next good run is in the bag.`;
  $('continue').textContent=passed?'NEXT STAGE →':'PLAY AGAIN ↻';$('result-dialog').showModal();
}
$('continue').onclick=async()=>{const stage=state.status==='passed'?state.stage+1:1;if(stage===1)runScore=0;state=newStage(stage);drawNumber=0;$('result-dialog').close();$('message').textContent='PICK A BALL TO STAMP YOUR CARD';await nextDraw();};
$('result-dialog').addEventListener('cancel',e=>e.preventDefault());
$('redraw').onclick=async()=>{if(busy||!state.redraws)return;lock();document.querySelectorAll('.ball').forEach(b=>b.className='ball leave');$('message').textContent='BACK IN THE BAG · NO CALL SPENT';await wait(650);redraw(state);render();showBalls();await wait(850);unlock();$('message').textContent='FRESH DRAW · PICK A BALL';};
$('bag').onclick=()=>{refreshBag();$('bag-dialog').showModal();};
$('bag-dialog').querySelector('.close').onclick=()=>$('bag-dialog').close();
$('bag-dialog').addEventListener('click',e=>{if(e.target===$('bag-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
nextDraw();
