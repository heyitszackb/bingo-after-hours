import {baseBagRecipe,bagRecipe,buildDebugBag} from './debug-bag.js?v=486b81cf668f';
import {pulseBackground} from './background.js?v=64709a33df06';
import {MARS_PATTERNS,MOON_PATTERNS,JUPITER_PATTERNS,isTargetedPotion,BINGO_TOKEN,isPotion,shopItemTypes,removeRetiredItems,defaultBag,newStage as legacyNewStage,deal,choose,tileStampList,migrateShop,migrateInventory,isBomb,isDie,ITEM_TYPES,redraw,openRewardShop as openShop,claimReward,BALL_UPGRADES,ballValue,targetFor,PATTERN_TYPES} from './game.js?v=48c65f95136d';
function newStage(...args){const round=legacyNewStage(...args);round.plainRules=true;round.jokers=[];return round;}
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state=newStage(1,5,{}, {},undefined,defaultBag()),busy=false,drag=null,tooltipAnchor=null,payingOut=false,hasRun=false,inMenu=true,shopping=false;
// One tempo for animation and sequencing keeps effects and input locks aligned.
const motionScale=.4;
document.documentElement.style.setProperty('--motion-scale',motionScale);
const wait=ms=>new Promise(r=>setTimeout(r,reduced?15:ms*motionScale));
const signed=n=>n>=0?`+${n}`:String(n);
const animate=(el,frames,options)=>el.animate(frames,{...options,duration:reduced?1:options.duration*motionScale}).finished.catch(()=>{});
function burst(rect,scoring=false){if(reduced)return;for(let i=0;i<(scoring?28:12);i++){const p=document.createElement('i');p.className='particle';p.style.left=`${rect.left+rect.width/2}px`;p.style.top=`${rect.top+rect.height/2}px`;p.style.background=scoring?'#f4c66c':i%2?'#a9b7b8':'#e4e9dd';$('effects').append(p);const angle=Math.random()*Math.PI*2,d=25+Math.random()*(scoring?150:65);animate(p,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(angle)*d}px,${Math.sin(angle)*d+25}px) scale(0)`,opacity:0}],{duration:450+Math.random()*250,easing:'cubic-bezier(.1,.7,.3,1)'}).then(()=>p.remove());}}
for(let n=1;n<=25;n++){const c=document.createElement('button');c.type='button';c.id=`cell-${n}`;c.className='cell';c.innerHTML='<i class=board-ink aria-hidden=true></i><span></span>';c.onclick=()=>{if(!busy&&!drag)inspectSpace(n);};$('board').append(c);}
const star='<span class="star" role="img" aria-label="stars"></span>';
function flipNumber(el,value){
  const text=String(value);if(el.dataset.value===text)return;
  const old=el.dataset.value||'';el.dataset.value=text;
  el.replaceChildren(...[...text].map((digit,i)=>{
    const card=document.createElement('span');card.className='flip-digit';card.textContent=digit;
    if(old&&old[i+old.length-text.length]!==digit&&!reduced)animate(card,[{transform:'perspective(180px) rotateX(-75deg)',filter:'brightness(.55)'},{transform:'perspective(180px) rotateX(8deg)',filter:'brightness(1.2)',offset:.7},{transform:'perspective(180px) rotateX(0)',filter:'brightness(1)'}],{duration:500,easing:'ease-out'});
    return card;
  }));
}
function renderScore(value=state.score){
  flipNumber($('score'),value);flipNumber($('target'),state.target);
  $('score-meter').setAttribute('aria-label',`Goal: ${value} of ${state.target} stars`);
  $('score-meter').classList.toggle('target-met',value>=state.target);
  $('progress').style.width=`${Math.max(0,Math.min(100,value/state.target*100))}%`;
}
function render(boardState=state){
  $('bag').disabled=busy;
  const freePlay=false;$('play-ball').querySelector('span').textContent=freePlay?'↑ PLAY · 0 PLAYS':'↑ PLAY';$('play-ball').classList.toggle('free-play',freePlay);
  $('redraw').classList.toggle('exhausted',state.passes===0);$('play-ball').disabled=busy||!!drag||state.status!=='playing'||!state.offer.length;$('play-ball').setAttribute('aria-label',`Swipe any offered ball up to play it on the highlighted space. ${state.calls} plays remaining.`);
  $('patterns-button').disabled=busy||payingOut;$('score-patterns').disabled=busy||payingOut;
  $('score-patterns').setAttribute('aria-label',`${state.score} of ${state.target} stars. View scoring patterns and run counts`);
  $('pause-button').disabled=busy||payingOut||state.status!=='playing';document.querySelector('.score-panel').classList.toggle('large-score',state.target>=1000);renderScore();for(const k of ['calls','stage'])$(k).textContent=state[k];$('bag-count').textContent=state.bag.size;$('bag').setAttribute('aria-label',`Inspect bag, ${state.bag.size} balls remaining`);$('progress').style.width=`${Math.max(0,Math.min(100,state.score/state.target*100))}%`;$('redraw-cost').textContent=state.passes;$('redraw').disabled=busy||state.passes<1||state.status!=='playing';$('redraw').setAttribute('aria-label',`Pass: ${state.passes} remaining. Return this ball and draw a new ball and space without spending a play.`);renderCalls(state.calls);for(let tile=1;tile<=25;tile++){
    const c=$(`cell-${tile}`),offered=Object.values(state.destinations).includes(tile),number=boardState.stampBalls[tile];
    c.className=`cell paint-grey upgrade-${state.upgrades[number]||'plain'}${itemClass(number)}${boardState.stamps.has(tile)?' stamped':''}${offered?' offered':''}`;
    c.querySelector('span').textContent=boardState.stamps.has(tile)?(boardState.stampValues[tile]??pieceFace(number)):'';
    const multiplier=state.tileMultipliers?.[tile]||1;c.querySelector('.board-ink').innerHTML=[...tileStampList(state,tile).filter(t=>t==='copier').map(()=>'<b class=copy-mark title=Copier>COPY</b>'),...tileStampList(state,tile).filter(t=>t==='trash').map(()=>'<b class=trash-mark title=Trash></b>'),...tileStampList(state,tile).filter(t=>t.startsWith('plus')).map(t=>'+'+t.slice(4)),multiplier>1?`×${multiplier}`:''].filter(Boolean).join(' ');c.classList.toggle('inked',tileStampList(state,tile).length>0);
    if(!c.querySelector('.potion-sheen')){const sheen=document.createElement('i');sheen.className='potion-sheen';sheen.setAttribute('aria-hidden','true');c.append(sheen);}
    let badges=c.querySelector('.potion-badges');if(!badges){badges=document.createElement('div');badges.className='potion-badges';c.append(badges);}badges.innerHTML=boardState.stamps.has(tile)?potionBadges(number):'';
    c.classList.toggle('large-value',String(boardState.stampValues[tile]).length>2);
    c.setAttribute('aria-label',`Row ${Math.floor((tile-1)/5)+1}, column ${(tile-1)%5+1}${boardState.stamps.has(tile)?`, stamped ${boardState.stampValues[tile]??pieceLabel(number)}`:offered?', available for any drawn ball':', empty'}. ${multiplier>1?`Tile multiplier ×${multiplier}. `:''}Complete a row, column, or diagonal to score item values and tile stamps.`);
  }}

let mimicAppearance=null;
function appearanceState(){if(!mimicAppearance)return state;const {id,applied}=mimicAppearance;return {...state,items:{...state.items,[id]:applied.type==='bingo'?undefined:applied.type},ballValues:{...state.ballValues,[id]:applied.base??undefined},valueModifiers:{...state.valueModifiers,[id]:applied.modifier},itemEffects:{...state.itemEffects,[id]:applied.effects}};}
const baseItemClass=n=>{const state=appearanceState();return state.items[n]==='jupiter'?' jupiter-item':state.items[n]==='moon'?' moon-item':state.items[n]==='mars'?' mars-item':state.items[n]==='earth'?' earth-item':state.items[n]==='doubleball'?' doubleball-item':state.items[n]==='trash'?' stamp-item trash-item':state.items[n]==='statue'?' statue-item':state.items[n]==='king'?' king-item':state.items[n]==='copier'?' stamp-item copier-item':state.items[n]==='question'?' question-item':isBomb(state,n)?' bomb-item':isDie(state,n)?' die-item':state.items[n]==='hundred'?' hundred-item':state.items[n]==='seed'?' seed-item':['x2','x3','copier','trash','plus10','plus50','plus100'].includes(state.items[n])?' stamp-item':'';};
const itemClass=n=>{const state=appearanceState();return (isPotion(state,n)?` potion-item ${state.items[n]}-item`:baseItemClass(n))+((state.itemEffects?.[n]||[]).includes('potion20')?' potion-gold':'')+((state.itemEffects?.[n]||[]).includes('potion2')?' potion-striped':'');};
const potionFace=type=>({potion20:'+20',potion2:'×2',potionCopy:'COPY',potionMelt:'×'})[type];
const pieceLabel=n=>{const state=appearanceState();return state.items[n]?`${ITEM_TYPES[state.items[n]].name}${ballValue(state,n)!==null?` (${ballValue(state,n)})`:''}`:`${BINGO_TOKEN.name} (${ballValue(state,n)??0})`;};
const pieceFace=n=>{const state=appearanceState();return isPotion(state,n)?potionFace(state.items[n]):state.items[n]==='doubleball'?'×2':state.items[n]==='trash'?'':state.items[n]==='question'?'?':state.items[n]?.startsWith('plus')?`+${state.items[n].slice(4)}`:state.items[n]==='copier'?'COPY':['x2','x3'].includes(state.items[n])?`×${state.items[n].slice(1)}`:isDie(state,n)?'?':ballValue(state,n)??'';};
function potionBadges(n){
  const state=appearanceState();
  const effects=state.itemEffects?.[n]||[],double=effects.filter(e=>e==='potion2').length,gold=effects.filter(e=>e==='potion20').length;
  return `${gold?`<b class="potion-badge gold" aria-label="${gold} plus-20 potions">+${gold*20}<small>${gold>1?`${gold}`:''}</small></b>`:''}${double?`<b class="potion-badge red" aria-label="${double} doubling potions, times ${2**double}">×${2**double}<small>${double>1?`${double}`:''}</small></b>`:''}`;
}
function ball(n){const b=document.createElement('button');b.className=`ball paint-grey upgrade-${state.upgrades[n]||'plain'}${itemClass(n)}`;b.classList.toggle('large-value',String(pieceFace(n)).length>2);b.dataset.number=n;b.dataset.kind=state.items[n]||'number';b.innerHTML=`<span class="face">${pieceFace(n)}</span><i class="potion-sheen" aria-hidden="true"></i><div class="potion-badges">${potionBadges(n)}</div>`;b.setAttribute('aria-label',`Inspect ${pieceLabel(n)}`);return b;}
function hideTooltip(){
  const tip=$('inspect-tooltip');
  if(tip.matches(':popover-open'))tip.hidePopover();
  tip.hidden=true;tip.setAttribute('role','tooltip');
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
  tip.classList.toggle('stamps-left',r.left+r.width/2>left+width/2);
  tip.style.maxHeight=`${height-20}px`;
  const w=tip.offsetWidth,h=tip.offsetHeight,gap=13,pad=10;
  const x=Math.max(left+pad,Math.min(r.left+r.width/2-w/2,left+width-w-pad));
  const below=r.top-h-gap<top+pad;
  const y=below?Math.min(r.bottom+gap,top+height-h-pad):r.top-h-gap;
  tip.style.left=`${x}px`;tip.style.top=`${Math.max(top+pad,y)}px`;
  const main=tip.querySelector('.tooltip-main'),mainX=main.offsetLeft,mainW=main.offsetWidth;
  tip.style.setProperty('--pointer-x',`${Math.max(15,Math.min(mainW-15,r.left+r.width/2-x-mainX))}px`);
  tip.classList.toggle('below',below);
}
function showTooltip(n,anchor,space=false,catalogType=null){
  if(tooltipAnchor===anchor){hideTooltip();return;}
  hideTooltip();
  const tip=$('inspect-tooltip');
  (anchor.closest('dialog')||document.body).append(tip);
  const upgrade=state.upgrades[n],item=ITEM_TYPES[catalogType||state.items?.[n]],tile=space?Number(anchor.id.replace('cell-','')):null;
  const occupied=!space||state.stamps.has(tile);
  const value=catalogType?item.startingValue:space&&occupied?state.stampValues[tile]:ballValue(state,n);
  $('tooltip-number').textContent=occupied?(item?.name||BINGO_TOKEN.name):'Nothing here';
  $('tooltip-value').hidden=!occupied;
  $('tooltip-value').innerHTML=item?.startingValue===null?`<span class=stamp-tag>${item.kind==='potion'?'POTION':'STAMP'}</span>`:`${value??(item?.startingValue==='?'?'?':0)} ${star}`;
  $('tooltip-effect').textContent=item?[item.text,item.details,item.kind==='potion'?'Drag onto an item. One use · 1 play':null].filter(Boolean).join('. '):upgrade?BALL_UPGRADES[upgrade].text:occupied?BINGO_TOKEN.text:'';
  const stamps=space?tileStampList(state,tile):[];
  $('tooltip-stamps').replaceChildren(...[...new Set(stamps)].map(type=>{
    const count=stamps.filter(stamp=>stamp===type).length;
    const effect=document.createElement('div');effect.className='tooltip-stamp-effect';
    effect.innerHTML=`<span class="stamp-effect-mark" aria-label="${count} ${ITEM_TYPES[type].name} stamp${count>1?'s':''}"><span class="stamp-symbol" aria-hidden="true"></span>${count>1?`<small class="stamp-repeat">×${count}</small>`:''}</span><div>${pointCopy(ITEM_TYPES[type].text)}</div>`;
    return effect;
  }));
  $('tooltip-stamps').hidden=stamps.length===0;
  tip.classList.toggle('has-stamps',stamps.length>0);

  $('tooltip-effect').innerHTML=pointCopy($('tooltip-effect').textContent);
  $('tooltip-effect').hidden=!$('tooltip-effect').textContent.trim();
  let effects=$('tooltip-potions');if(!effects){effects=document.createElement('div');effects.id='tooltip-potions';$('tooltip-effect').after(effects);}
  const applied=!catalogType&&occupied?(state.itemEffects?.[n]||[]):[];
  effects.innerHTML=[...new Set(applied)].map(type=>{const count=applied.filter(e=>e===type).length;return `<div class="potion-effect ${type}">${type==='potion20'?pointCopy(`+${count*20} ★`):pointCopy(`×${2**count} to total bingo score`)}<small class="potion-count">${count} ${count===1?'potion':'potions'}${count>1?type==='potion20'?` · ${count} × +20`:` · ${Array(count).fill('×2').join(' ')}`:''}</small></div>`;}).join('');effects.hidden=!applied.length;

  tip.classList.toggle('space-tooltip',space);
  tooltipAnchor=anchor;
  anchor.setAttribute('aria-describedby','inspect-tooltip');
  anchor.classList.add('inspected');
  tip.hidden=false;
  tip.showPopover?.();
  positionTooltip();
  animate(tip,[{opacity:0,transform:'translateY(5px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:150,easing:'cubic-bezier(.2,.8,.25,1)'});
}
function inspectSpace(tile){showTooltip(state.stampBalls[tile],$(`cell-${tile}`),true);}
function inspect(n,anchor){showTooltip(n,anchor);}
document.addEventListener('pointerdown',e=>{if(tooltipAnchor&&!tooltipAnchor.contains(e.target)&&!$('inspect-tooltip').contains(e.target))hideTooltip();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tooltipAnchor){e.preventDefault();e.stopPropagation();hideTooltip();}},true);
window.addEventListener('resize',positionTooltip);
window.visualViewport?.addEventListener('resize',positionTooltip);
document.addEventListener('scroll',()=>hideTooltip(),true);
function refreshBag(){
  if(tooltipAnchor?.closest('#bag-grid'))hideTooltip();
  $('bag-grid').replaceChildren();$('bag-dialog').setAttribute('aria-label',`${state.collection.length} items in your collection; played items are greyed out`);
  const typeOrder=['number',...Object.keys(ITEM_TYPES)];
  const ordered=[...state.collection].sort((a,b)=>{
    const typeA=state.items[a]||'number',typeB=state.items[b]||'number';
    return typeOrder.indexOf(typeA)-typeOrder.indexOf(typeB)||(ballValue(state,a)??0)-(ballValue(state,b)??0)||a-b;
  });
  for(const n of ordered){
    const b=ball(n),played=!state.bag.has(n);
    if(played)b.classList.add('played-ball');
    if(state.offer.includes(n))b.classList.add('on-track');
    b.setAttribute('aria-label',`${pieceLabel(n)}${played?', already played, unavailable this stage':''}${state.offer.includes(n)?', on track':''}; played ${state.played[n]} times`);
    b.onclick=()=>inspect(n,b);$('bag-grid').append(b);
  }
}
let debugDraft=null;
function debugRows(){
  const list=$('debug-rows');list.replaceChildren();
  debugDraft.forEach((row,index)=>{
    const line=document.createElement('div');line.className='debug-row';
    const select=document.createElement('select');select.setAttribute('aria-label',`Piece ${index+1} type`);
    for(const [type,name] of [['number','Bingo Token'],...Object.entries(ITEM_TYPES).map(([type,item])=>[type,item.name])]){const option=document.createElement('option');option.value=type;option.textContent=name;select.append(option);}select.value=row.type;
    const value=document.createElement('input');value.type='number';value.step='1';value.inputMode='text';value.value=row.value??'';value.disabled=['potion20','potion2','potionCopy','potionMelt','doubleball','question','bomb','x2','x3','copier','trash','plus10','plus50','plus100'].includes(row.type);value.setAttribute('aria-label',`Piece ${index+1} ${row.type==='d20'?'roll modifier':'value'}`);
    const count=document.createElement('input');count.type='number';count.step='1';count.min='1';count.max='500';count.inputMode='numeric';count.value=row.count;count.setAttribute('aria-label',`Piece ${index+1} copies`);
    const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Remove piece ${index+1}`);
    select.onchange=()=>{row.type=select.value;row.value=['potion20','potion2','potionCopy','potionMelt','doubleball','question','bomb','x2','x3','copier','trash','plus10','plus50','plus100'].includes(row.type)?null:['d20','earth','mars','moon','jupiter','king'].includes(row.type)?0:row.type==='hundred'?50:row.type==='statue'?10:1;debugRows();$('debug-rows').children[index].querySelector('select').focus();};
    value.oninput=()=>{row.value=value.value===''?null:value.valueAsNumber;validateDebugDraft();};count.oninput=()=>{row.count=count.value===''?null:count.valueAsNumber;validateDebugDraft();};
    remove.onclick=()=>{debugDraft.splice(index,1);debugRows();const next=$('debug-rows').children[Math.min(index,debugDraft.length-1)];(next?.querySelector('select')||$('debug-add')).focus();};
    line.append(select,value,count,remove);list.append(line);
  });validateDebugDraft();
}
function validateDebugDraft(){
  const count=debugDraft.reduce((n,row)=>n+(Number.isInteger(row.count)&&row.count>0?row.count:0),0);$('debug-count').textContent=`${count} pieces`;
  try{buildDebugBag(debugDraft);$('debug-error').hidden=true;$('debug-error').textContent='';$('debug-apply').disabled=false;}
  catch(error){$('debug-error').textContent=error.message;$('debug-error').hidden=false;$('debug-apply').disabled=true;}
}
function closeDebugBag(){debugDraft=null;$('bag-dialog').classList.remove('debug-editing');$('bag-debug').hidden=true;$('bag-grid').hidden=false;$('bag-heading').textContent='BAG';$('bag-debug-toggle').textContent='DEBUG';$('bag-debug-toggle').setAttribute('aria-expanded','false');}
$('bag-debug-toggle').onclick=()=>{
  if(busy)return;hideTooltip();
  if(debugDraft){closeDebugBag();refreshBag();return;}
  debugDraft=bagRecipe(state);$('bag-dialog').setAttribute('aria-label','Developer bag editor');$('bag-dialog').classList.add('debug-editing');$('bag-grid').hidden=true;$('bag-debug').hidden=false;$('bag-heading').textContent='DEBUG BAG';$('bag-debug-toggle').textContent='BACK';$('bag-debug-toggle').setAttribute('aria-expanded','true');debugRows();
};
$('bag-dialog').addEventListener('close',closeDebugBag);
for(const [id,recipe] of [['debug-current',()=>bagRecipe(state)],['debug-clear',()=>[]]])$(id).onclick=()=>{debugDraft=recipe();debugRows();};
$('debug-base').onclick=()=>{if(busy)return;debugDraft=baseBagRecipe();debugRows();$('debug-apply').click();};
$('debug-add').onclick=()=>{debugDraft.push({type:'number',value:1,count:1});debugRows();const last=$('debug-rows').lastElementChild;last.scrollIntoView({block:'nearest'});last.querySelector('select').focus();};
$('debug-apply').onclick=async()=>{
  if(busy||!debugDraft)return;
  let inventory;try{inventory=buildDebugBag(debugDraft);}catch{validateDebugDraft();return;}
  hideTooltip();state=newStage(state.stage,state.money,state.upgrades,state.patternCounts,state.jokers,inventory);hasRun=true;
  shopping=false;$('game-screen').classList.remove('shopping');$('shop-screen').hidden=true;$('bag-dialog').close();closeDebugBag();saveRun();
  $('announcer').textContent=`Test bag applied: ${state.collection.length} pieces. Round restarted.`;await nextDraw();
};
function lock(){hideTooltip();busy=true;render();document.querySelectorAll('#balls .ball').forEach(b=>b.disabled=true);}
function unlock(){busy=false;saveRun();render();document.querySelectorAll('#balls .ball').forEach(b=>{b.disabled=false;b.classList.remove('enter');});}
function showBalls(){const held=new Map([...$('balls').children].map(b=>[Number(b.dataset.number),b]));const nodes=[];state.offer.forEach((n,i)=>{if(held.has(n)&&held.get(n).style.visibility!=='hidden'&&held.get(n).dataset.kind===(state.items[n]||'number')&&held.get(n).querySelector('.face').textContent===String(pieceFace(n))){const b=held.get(n);b.style.order='';b.disabled=true;nodes.push(b);return;}const b=ball(n);b.classList.add('enter');b.style.setProperty('--i',i);b.disabled=true;b.setAttribute('aria-label',`${pieceLabel(n)}. Tap to inspect. Swipe up to play, down to pass, or drag sideways to reorder. Keyboard: Enter to inspect, Space to play.`);b.addEventListener('pointerdown',e=>startDrag(e,n,b));b.addEventListener('pointermove',moveDrag);b.addEventListener('pointerup',endDrag);b.addEventListener('pointercancel',cancelDrag);b.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});b.onclick=e=>{if(e.detail===0&&!busy)inspect(n,b);};b.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();if(!busy&&!drag)play(n,b);} };nodes.push(b);});$('balls').replaceChildren(...nodes);refreshBag();}
async function nextDraw(){resetResultUI();lock();if(!state.offer.length)deal(state);render();showBalls();await wait(770);unlock();}
function startDrag(e,n,b){
  if(busy||drag||e.button!==0)return;
  e.preventDefault();b.setPointerCapture(e.pointerId);
  const nodes=[...$('balls').children];
  drag={n,tile:state.destinations[n],b,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,ghost:null,
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
function nearestDestination(x,y,number){
  if(isTargetedPotion(state,number))return [...state.stamps].find(tile=>{const r=$(`cell-${tile}`).getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})??null;
  let nearest=null,distance=Infinity;
  for(const tile of Object.values(state.destinations)){
    if(state.stamps.has(tile))continue;
    const r=$(`cell-${tile}`).getBoundingClientRect(),d=Math.hypot(x-r.left-r.width/2,y-r.top-r.height/2);
    if(d<distance){nearest=tile;distance=d;}
  }
  return nearest;
}
function isOnTrack(x,y){const r=document.querySelector('.track').getBoundingClientRect();return x>=r.left-16&&x<=r.right+16&&y>=r.top-16&&y<=r.bottom+16;}
function swipeAction(d,e){
  const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(dy>26&&dy>Math.abs(dx)*.35)return state.passes>0?'pass':null;
  if(Math.abs(dy)<Math.max(28,Math.min(40,(d.size||48)*.5))||Math.abs(dy)<Math.abs(dx)*1.3)return null;
  return dy<0?'play':state.passes>0?'pass':null;
}
function moveDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag;
  if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>7){
    d.moved=true;hideTooltip();d.ghost=d.b.cloneNode(true);d.ghost.className=`ball drag-ghost paint-grey upgrade-${state.upgrades[d.n]||'plain'}${itemClass(d.n)}`;
    d.ghost.classList.toggle('large-value',String(pieceFace(d.n)).length>2);d.ghost.removeAttribute('disabled');d.ghost.setAttribute('aria-hidden','true');d.ghost.tabIndex=-1;
    d.size=d.b.getBoundingClientRect().width;d.ghost.style.setProperty('--size',`${d.size}px`);
    document.body.append(d.ghost);d.b.classList.add('held');
  }
  if(!d.moved)return;
  d.ghost.style.transform=`translate(${e.clientX-d.size/2}px,${e.clientY-d.size/2}px) rotate(${Math.max(-14,Math.min(14,(e.clientX-d.x)*.08))}deg) scale(1.08)`;
  const action=swipeAction(d,e),over=isOnBoard(e.clientX,e.clientY)||action==='play',onTrack=!over&&!action&&isOnTrack(e.clientX,e.clientY);
  $('bag').classList.toggle('drop-ready',action==='pass');$('gesture-hint').textContent=state.passes===0&&e.clientY>d.y+36?'NO PASSES LEFT':'';
  document.querySelector('.board-frame').classList.toggle('drag-over',over);
  $('balls').classList.toggle('reordering',onTrack);
  document.querySelectorAll('.cell.destination').forEach(c=>c.classList.remove('destination'));
  if(isTargetedPotion(state,d.n))$('gesture-hint').textContent='DROP ON AN ITEM';
  if(over){d.tile=isOnBoard(e.clientX,e.clientY)?nearestDestination(e.clientX,e.clientY,d.n):isTargetedPotion(state,d.n)?null:state.destinations[d.n];$(`cell-${d.tile}`)?.classList.add('destination');}
  if(onTrack){
    const x=e.clientX+$('balls').scrollLeft-d.scrollLeft;
    let index=0;
    d.slots.forEach((center,i)=>{if(Math.abs(center-x)<Math.abs(d.slots[index]-x))index=i;});
    const order=d.order.filter(n=>n!==d.n);order.splice(index,0,d.n);previewOrder(d,order);
  }else previewOrder(d,d.original);
}
function cleanDrag(d){
  $('bag').classList.remove('drop-ready');$('gesture-hint').textContent='';
  $('board').classList.remove('free-placement');
  d.b.classList.remove('held');$('balls').classList.remove('reordering');
  document.querySelector('.board-frame').classList.remove('drag-over');document.querySelectorAll('.cell.destination').forEach(c=>c.classList.remove('destination'));
}
function commitOrder(d){
  for(const n of state.offer){const node=d.nodes.find(node=>Number(node.dataset.number)===n);$('balls').append(node);node.style.order='';node.style.setProperty('--i',state.offer.indexOf(n));}
}
async function endDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag;drag=null;
  if(!d.moved){cleanDrag(d);inspect(d.n,d.b);return;}
  const action=swipeAction(d,e);
  if(action==='pass'&&!isOnBoard(e.clientX,e.clientY)){cleanDrag(d);commitOrder(d);await passTurn(d.ghost);return;}
  if(isOnBoard(e.clientX,e.clientY)||action==='play'){
    d.tile=isOnBoard(e.clientX,e.clientY)?nearestDestination(e.clientX,e.clientY,d.n):isTargetedPotion(state,d.n)?null:state.destinations[d.n];cleanDrag(d);commitOrder(d);await play(d.n,d.b,d.ghost,d.tile);return;
  }
  busy=true;
  const reordered=isOnTrack(e.clientX,e.clientY);
  if(reordered)state.offer=[...d.order];else previewOrder(d,d.original);
  const end=d.b.getBoundingClientRect();
  await animate(d.ghost,[{transform:d.ghost.style.transform},{transform:`translate(${end.left}px,${end.top}px) rotate(0deg) scale(1)`}],{duration:200,easing:'cubic-bezier(.15,.85,.3,1)'});
  d.ghost.remove();cleanDrag(d);commitOrder(d);busy=false;
  if(reordered){saveRun();$('announcer').textContent=`Ball ${d.n}, position ${state.offer.indexOf(d.n)+1} of ${state.offer.length}.`;}
}
function cancelDrag(){
  if(!drag)return;
  const d=drag;drag=null;previewOrder(d,d.original);cleanDrag(d);d.ghost?.remove();commitOrder(d);
}
function renderCalls(calls){
  $('calls').textContent=calls;$('play-count').textContent=calls;
  $('call-dots').innerHTML=Array.from({length:15},(_,i)=>`<i class="${i>=Math.ceil(calls/state.callCapacity*15)?'used':''}"></i>`).join('');
  document.querySelector('.call-meter').setAttribute('aria-label',`${calls} plays remaining`);
}
// Each visible activation follows the engine's ordered contribution list.
async function scoreLink(from,to,color){
  if(reduced||!from)return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),spark=document.createElement('i');
  spark.className='score-spark';spark.style.background=color;
  spark.style.left=`${a.left+a.width/2}px`;spark.style.top=`${a.bottom-5}px`;$('effects').append(spark);
  await animate(spark,[{transform:'scale(1.6)',opacity:1},{transform:`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.bottom+5}px) scale(.6)`,opacity:1}],{duration:125,easing:'cubic-bezier(.5,0,.8,.4)'});
  spark.remove();
}
async function showBingoMultiplier(group,onApply){
  const panel=document.createElement('div'),lane=document.querySelector('.track').getBoundingClientRect();
  panel.className='bingo-multiplier';panel.setAttribute('role','status');
  panel.style.top=`${Math.min(innerHeight-120,lane.top+5)}px`;
  panel.innerHTML=`<small>BINGO ${star}</small><div><span>${group.subtotal}</span><b class="multiplier-factor">×${group.factor}</b><span>=</span><strong>${group.total}</strong></div>`;
  document.body.append(panel);
  const sources=group.sources.map(tile=>$(`cell-${tile}`));
  try{
    await animate(panel,[{opacity:0,transform:'translateX(-50%) scale(.9)'},{opacity:1,transform:'translateX(-50%) scale(1)'}],{duration:250,easing:'cubic-bezier(.16,1,.3,1)'});
    for(const source of sources){
      source.classList.add('multiplier-source');
      const rect=source.getBoundingClientRect(),tag=document.createElement('span');tag.className='multiplier-pop';tag.textContent='×2';tag.style.left=`${rect.left+rect.width/2}px`;tag.style.top=`${rect.top}px`;document.body.append(tag);
      await Promise.all([
        animate(source,[{transform:'scale(1)'},{transform:'scale(1.2) rotate(-4deg)',offset:.35},{transform:'scale(.97)',offset:.7},{transform:'scale(1)'}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)'}),
        animate(tag,[{opacity:0,transform:'translate(-50%,0) scale(.6)'},{opacity:1,transform:'translate(-50%,-65%) scale(1.1)',offset:.4},{opacity:0,transform:'translate(-50%,-110%) scale(1)'}],{duration:650}).finally(()=>tag.remove())
      ]);
      await scoreLink(source,panel,'#f6d36b');
    }
    await animate(panel.querySelector('.multiplier-factor'),[{transform:'scale(.75)'},{transform:'scale(1.3)',offset:.4},{transform:'scale(1)'}],{duration:370});
    await wait(1400);
    onApply();pulseBackground();navigator.vibrate?.([18,25,30]);
    await animate($('score-meter'),[{transform:'scale(.96)'},{transform:'scale(1.12)',offset:.35},{transform:'scale(1)'}],{duration:450});
    await wait(650);
    await animate(panel,[{opacity:1},{opacity:0}],{duration:250});
  }finally{sources.forEach(source=>source.classList.remove('multiplier-source'));panel.remove();}
}
async function activateSpaces(result){
  let displayedScore=result.scoreBefore??state.score-result.points,displayedCalls=result.callsBeforeBonuses,total=0,lineIndex=0;
  let activePattern=[],groupSubtotal=0;
  const board=$('board'),area=document.querySelector('.draw-area'),readout=$('score-meter');
  const colors=Object.fromEntries(['square','corners','row','column','diagonal','cross','all','mars','moon','jupiter'].map(type=>[type,'#f6d36b']));
  const allTiles=[...new Set(result.activations.map(a=>a.tile))].map(n=>$(`cell-${n}`));
  board.classList.add('scoring-board');area.classList.add('scoring-draw');
  readout.classList.add('scoring-total');$('score-line-label').hidden=false;renderScore(displayedScore);

  try{
    for(const [index,activation] of result.activations.entries()){
      const cell=$(`cell-${activation.tile}`),color=colors[activation.type];
      if(activation.pattern){
        lineIndex++;groupSubtotal=0;
        activePattern.forEach(c=>c.classList.remove('pattern-active','charged','score-pending'));
        activePattern=activation.pattern.map(n=>$(`cell-${n}`));
        activePattern.forEach(c=>{c.style.setProperty('--scoring-color',color);c.classList.add('pattern-active','score-pending');});
        $('score-line-label').textContent=`${activation.type.toUpperCase()}${result.scoringGroups.length>1?` ${lineIndex}/${result.scoringGroups.length}`:''}`;
        if(['mars','moon','jupiter'].includes(activation.type)){
          const source=$(`cell-${activation.source}`);source.classList.add('mars-awake');
          await animate(source,[{transform:'scale(1)'},{transform:'scale(1.18) rotate(-7deg)',offset:.4},{transform:'scale(1)'}],{duration:360});
          source.classList.remove('mars-awake');
        }
        pulseBackground();
        await animate(readout,[{transform:'scale(1)'},{transform:'scale(1.08)',offset:.4},{transform:'scale(1)'}],{duration:220});
        await Promise.all(activePattern.map(target=>animate(target,[{filter:'brightness(1)'},{filter:'brightness(1.5)',offset:.4},{filter:'brightness(1)'}],{duration:220})));
        await wait(70);
      }
      if(activation.reveal){
        const face=cell.querySelector('span');
        await animate(face,[{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:180});
        cell.classList.remove('question-item');cell.classList.add(...itemClass(activation.reveal.to).trim().split(' ').filter(Boolean));
        face.textContent=activation.number??'';cell.classList.toggle('large-value',String(activation.number).length>2);
        await animate(face,[{transform:'scaleX(0)'},{transform:'scaleX(1.2)',offset:.6},{transform:'scaleX(1)'}],{duration:240});
      }
      cell.classList.add('activating','charged');
      navigator.vibrate?.(12);
      const tileImpact=animate(cell,reduced?[{opacity:.75},{opacity:1}]:[
        {transform:'scale(1)'},{transform:'scale(1.03,.94)',offset:.15},
        {transform:'translateY(-5px) scale(1.1)',offset:.35},
        {transform:'translateY(1px) scale(.98,1.02)',offset:.7},{transform:'scale(1)'}
      ],{duration:320-index%5*18,easing:'cubic-bezier(.16,1,.3,1)'});
      const r=cell.getBoundingClientRect(),point=document.createElement('span');
      point.className='activation-point';point.style.color=color;point.style.fontSize='34px';point.style.background='#102c29';point.style.padding='3px 8px';point.style.border='2px solid #f6d36b';point.style.left=`${r.left+r.width/2}px`;point.style.top=`${r.top+r.height/2}px`;
      point.style.transform='translate(-50%,-65%)';point.textContent='0';point.hidden=true;$('effects').append(point);
      let tilePoints=0;
      for(const contribution of activation.contributions){
        const calls=contribution.calls;
        const accent=contribution.joker==='face-value'?'#91c6ff':calls!==undefined?'#83e0b5':'#f4c66c';
        const label=calls!==undefined?(calls?'+1 PLAY':'17 MAX'):signed(contribution.points);

        if(calls!==undefined){
          const meter=$('play-ball'),to=meter.getBoundingClientRect(),token=document.createElement('span');
          token.className='activation-point call-point';token.textContent=label;token.style.left=`${r.left+r.width/2}px`;token.style.top=`${r.top}px`;$('effects').append(token);
          await animate(token,[{transform:'translate(-50%,-100%)',opacity:1},{transform:`translate(calc(-50% + ${to.left+to.width/2-r.left-r.width/2}px),${to.top-r.top}px) scale(.5)`,opacity:0}],{duration:220});
          token.remove();displayedCalls+=calls;renderCalls(displayedCalls);
        }else{
          tilePoints+=contribution.points;point.hidden=false;point.textContent=signed(tilePoints);
          await animate(point,reduced?[{opacity:.7},{opacity:1}]:[{transform:'translate(-50%,-65%) scale(.7)',opacity:.7},{transform:'translate(-50%,-95%) scale(1.28)',opacity:1,offset:.35},{transform:'translate(-50%,-85%) scale(1)',opacity:1}],{duration:170,easing:'cubic-bezier(.2,.8,.3,1)'});
        }

      }
      await tileImpact;
      if(activation.stampBonus){point.hidden=false;point.textContent=`${signed(tilePoints)} +${activation.stampBonus}`;await animate(cell.querySelector('.board-ink'),[{opacity:.5},{opacity:1,transform:'scale(1.4)',offset:.4},{opacity:.7,transform:'scale(1)'}],{duration:300});tilePoints+=activation.stampBonus;}
      if(activation.multiplier>1){
        const ink=cell.querySelector('.board-ink');point.hidden=false;point.textContent=`${signed(tilePoints)} ×${activation.multiplier}`;
        await animate(ink,[{opacity:.5,transform:'scale(1)'},{opacity:1,transform:'scale(1.5)',offset:.4},{opacity:.7,transform:'scale(1)'}],{duration:320});
        tilePoints*=activation.multiplier;
      }
      point.hidden=false;point.textContent=signed(tilePoints);
      if(tilePoints>0)burst(r);
      const to=$('score').getBoundingClientRect();
      await animate(point,[{transform:'translate(-50%,-85%) scale(1)',opacity:1},{transform:'translate(-50%,-105%) scale(1.12)',opacity:1,offset:.25},{transform:`translate(calc(-50% + ${to.left+to.width/2-r.left-r.width/2}px),calc(-50% + ${to.top+to.height/2-r.top-r.height/2}px)) scale(.5)`,opacity:0}],{duration:Math.max(180,270-index%5*18),easing:'cubic-bezier(.4,0,.7,.4)'});
      point.remove();
      displayedScore+=activation.points;total+=activation.points;groupSubtotal+=activation.points;
      $('score-line-label').textContent=`${['mars','moon','jupiter'].includes(activation.type)?activation.type.toUpperCase():'BINGO'} +${groupSubtotal}`;
      renderScore(displayedScore);
      await animate($('score'),reduced?[{opacity:.75},{opacity:1}]:[{transform:'scale(1.22,1.08) rotate(-2deg)'},{transform:'scale(.97,1.03)',offset:.55},{transform:'scale(1)'}],{duration:130});
      for(const copy of activation.copies||[])await animateCopy(copy);
      if(activation.trashed!==null&&activation.trashed!==undefined){
        const face=cell.querySelector('span'),ink=cell.querySelector('.board-ink');
        await animate(ink,[{transform:'scale(1)'},{transform:'scale(1.5)',offset:.4},{transform:'scale(1)'}],{duration:260});
        await animate(cell,[{opacity:1},{opacity:.25,transform:'scale(.8)'},{opacity:1,transform:'scale(1)'}],{duration:280});
        cell.className='cell paint-grey inked';face.textContent='';
      }
      if(activation.groupEnd){
        const g=activation.groupEnd;
        if(g.flatBonus){
          const source=$(`cell-${g.source}`),r=source.getBoundingClientRect(),bonus=document.createElement('span');
          bonus.className='activation-point mars-bonus';bonus.innerHTML=`+${g.flatBonus} ${star}`;bonus.style.left=`${r.left+r.width/2}px`;bonus.style.top=`${r.top}px`;$('effects').append(bonus);
          $('score-line-label').textContent=`${activation.type.toUpperCase()} ${g.subtotal-g.flatBonus} +${g.flatBonus}`;
          await animate(bonus,[{opacity:0,transform:'translate(-50%,0) scale(.6)'},{opacity:1,transform:'translate(-50%,-60%) scale(1.1)',offset:.35},{opacity:1,transform:'translate(-50%,-75%) scale(1)'}],{duration:450});
          await scoreLink(source,readout,'#f6d36b');bonus.remove();displayedScore+=g.flatBonus;total+=g.flatBonus;renderScore(displayedScore);pulseBackground();
        }
        if(g.factor>1){
          $('score-line-label').textContent=`${g.subtotal} ×${g.factor} = ${g.total}`;
          await showBingoMultiplier(g,()=>{displayedScore+=activation.groupBonus-(g.flatBonus||0);total+=activation.groupBonus-(g.flatBonus||0);renderScore(displayedScore);});
        }
        await wait(240);
      }
      cell.classList.remove('activating');
    }
    $('score-line-label').textContent=result.activations.some(a=>a.contributions.length)?'SCORED':'SCORED';
    if(total>0){pulseBackground();navigator.vibrate?.([15,25,25]);burst($('score').getBoundingClientRect(),true);}
    await animate(readout,reduced?[{opacity:.85},{opacity:1}]:[{transform:'scale(1)'},{transform:'scale(1.08) rotate(-1deg)',offset:.25},{transform:'scale(1)',offset:.65},{transform:'scale(1)'}],{duration:360});
    await wait(600);
    const names=result.scoringGroups.map(g=>PATTERN_TYPES.find(type=>type.id===g.type)?.label||(g.type==='mars'?'Mars trio':g.type==='moon'?'Moon pair':g.type==='jupiter'?'Jupiter trio':'Bingo'));
    $('announcer').textContent=`${names.join(', ')}. ${result.activations.length} spaces activated for ${result.points} stars.`;
  }finally{
    board.classList.remove('scoring-board');area.classList.remove('scoring-draw');readout.classList.remove('scoring-total');$('score-line-label').hidden=true;
    allTiles.forEach(c=>c.classList.remove('score-pending','pattern-active','charged','activating'));
  }
}
async function explodeBomb(result){
  const center=$(`cell-${result.tile}`),frame=document.querySelector('.board-frame'),r=center.getBoundingClientRect();
  const row=Math.floor((result.tile-1)/5),col=(result.tile-1)%5;
  const affected=Array.from({length:25},(_,i)=>i+1).filter(t=>Math.abs(Math.floor((t-1)/5)-row)<=1&&Math.abs((t-1)%5-col)<=1).map(t=>$(`cell-${t}`));
  frame.classList.add('bomb-exploding');affected.forEach(c=>c.classList.add('blast-zone'));center.classList.add('bomb-armed');
  await animate(center,reduced?[{opacity:.6},{opacity:1}]:[{transform:'scale(1)'},{transform:'scale(.9)',offset:.25},{transform:'scale(1.13)',offset:.65},{transform:'scale(.96)'}],{duration:360,easing:'cubic-bezier(.5,0,.7,1)'});
  const fragments=[];
  for(const item of result.destroyed){
    const cell=$(`cell-${item.tile}`),rect=cell.getBoundingClientRect();
    if(!reduced){for(let i=0;i<6;i++){
      const chip=document.createElement('i');chip.className='bomb-chip';chip.style.left=`${rect.left+rect.width/2}px`;chip.style.top=`${rect.top+rect.height/2}px`;chip.style.background=isBomb(state,item.id)?'#293740':i%2?'#d4d7bc':'#85968c';$('effects').append(chip);
      const angle=Math.atan2(rect.top-r.top,rect.left-r.left)+(i-2.5)*.45,d=30+Math.random()*70;
      fragments.push(animate(chip,[{transform:'scale(1.3)',opacity:1},{transform:`translate(${Math.cos(angle)*d}px,${Math.sin(angle)*d+20}px) rotate(${i*65}deg) scale(.2)`,opacity:0}],{duration:360+i*20,easing:'cubic-bezier(.1,.65,.2,1)'}).then(()=>chip.remove()));
    }}
    cell.classList.remove('stamped','bomb-item','die-item','hundred-item','seed-item','king-item','statue-item','just-stamped');cell.querySelector('span').textContent='';
  }
  if(!reduced){
    const ring=document.createElement('i');ring.className='bomb-wave';ring.style.left=`${r.left+r.width/2}px`;ring.style.top=`${r.top+r.height/2}px`;ring.style.width=`${r.width*2.6}px`;ring.style.height=`${r.height*2.6}px`;$('effects').append(ring);
    fragments.push(animate(ring,[{transform:'translate(-50%,-50%) scale(.15)',opacity:1},{transform:'translate(-50%,-50%) scale(1.15)',opacity:0}],{duration:380,easing:'cubic-bezier(.1,.7,.2,1)'}).then(()=>ring.remove()));
  }
  pulseBackground();navigator.vibrate?.([30,25,15]);
  await animate(frame,reduced?[{opacity:.8},{opacity:1}]:[{transform:'translate(0,0)'},{transform:'translate(-4px,3px)',offset:.15},{transform:'translate(4px,-2px)',offset:.3},{transform:'translate(-2px,1px)',offset:.5},{transform:'translate(0,0)'}],{duration:320});
  await Promise.all(fragments);await wait(100);
  affected.forEach(c=>c.classList.remove('blast-zone'));center.classList.remove('bomb-armed');frame.classList.remove('bomb-exploding');
  $('announcer').textContent=`Bomb exploded. ${result.destroyed.length} items permanently removed from this run.`;
}
// Shared number-change language: source pulse → travel → old value out → new
// value snaps in. This phase always finishes before any scoring card activates.
async function animateValueChanges(result){
  if(result.valueChanges.every(change=>state.items[change.id]==='seed')){
    await Promise.all(result.valueChanges.map(async change=>{
      const cell=$(`cell-${change.tile}`),face=cell.querySelector('span');
      face.textContent=change.after;cell.classList.toggle('large-value',String(change.after).length>2);
      await animate(cell,[{transform:'rotate(0) translateX(0)'},{transform:'rotate(-5deg) translateX(3px)',offset:.35},{transform:'rotate(2deg) translateX(-1px)',offset:.7},{transform:'rotate(0) translateX(0)'}],{duration:360,easing:'ease-out'});
    }));
    return;
  }

  const board=$('board'),source=$(`cell-${result.tile}`),changes=result.valueChanges;
  board.classList.add('value-effects');source.classList.add('effect-source');
  const targets=changes.map(change=>$(`cell-${change.tile}`));
  targets.forEach(cell=>cell.classList.add('value-target'));
  try{
    pulseBackground();
    await animate(source,reduced?[{opacity:.7},{opacity:1}]:[{transform:'scale(1)'},{transform:'scale(.94)',offset:.2},{transform:'scale(1.13) rotate(-3deg)',offset:.5},{transform:'scale(1)'}],{duration:300});
    await Promise.all([...new Set(changes.map(c=>c.tile))].map(async(tile,index)=>{
      for(const change of changes.filter(c=>c.tile===tile)){
      const cell=$(`cell-${change.tile}`),face=cell.querySelector('span'),color='#f6d36b';
      await wait(index*65);await scoreLink(source,cell,color);
      cell.style.setProperty('--value-color',color);cell.classList.add('value-changing');
      const rect=cell.getBoundingClientRect(),badge=document.createElement('b');badge.className='value-delta';badge.textContent=signed(change.delta);badge.style.color=color;badge.style.left=`${rect.left+rect.width/2}px`;badge.style.top=`${rect.top+5}px`;$('effects').append(badge);
      try{
        face.textContent=change.before;
        await animate(face,reduced?[{opacity:1},{opacity:.3}]:[{transform:'rotate(-12deg) translateY(0) scale(1)',opacity:1},{transform:'rotate(-12deg) translateY(10px) scale(.65)',opacity:0}],{duration:140,easing:'ease-in'});
        face.textContent=change.after;cell.classList.toggle('large-value',String(change.after).length>2);cell.dataset.valueAfter=change.after;
        navigator.vibrate?.(10);
        await animate(face,reduced?[{opacity:.3},{opacity:1}]:[{transform:'rotate(-12deg) translateY(-9px) scale(1.25)',opacity:0},{transform:'rotate(-12deg) translateY(0) scale(1.15)',opacity:1,offset:.4},{transform:'rotate(-12deg) scale(1)',opacity:1}],{duration:230,easing:'cubic-bezier(.15,.8,.3,1)'});
        await animate(badge,[{transform:'translate(-50%,-100%) scale(1)',opacity:1},{transform:'translate(-50%,-145%) scale(.85)',opacity:0}],{duration:200});
      }finally{badge.remove();face.textContent=change.after;cell.classList.remove('value-changing');delete cell.dataset.valueAfter;}
      }
    }));
    await wait(180);
  }finally{board.classList.remove('value-effects');source.classList.remove('effect-source');targets.forEach(cell=>cell.classList.remove('value-target'));}
}
async function rollDie(cell,value){
  const face=cell.querySelector('span');cell.classList.add('die-rolling');
  try{
    if(!reduced){
      // Cosmetic faces never change the committed result or consume another play.
      for(const [i,ms] of [55,65,80,105,140].entries()){
        face.textContent=1+((value+i*7)%20+20)%20;
        await animate(cell,[{transform:`rotate(${i%2?-13:13}deg) scale(1.06)`},{transform:`rotate(${i%2?9:-9}deg) scale(.96)`}],{duration:ms,easing:'ease-out'});
      }
    }
    face.textContent=value;cell.classList.add('die-settled');
    pulseBackground();burst(cell.getBoundingClientRect());navigator.vibrate?.(16);
    await animate(cell,reduced?[{opacity:.7},{opacity:1}]:[{transform:'scale(1.16) rotate(-3deg)'},{transform:'scale(.95) rotate(1deg)',offset:.55},{transform:'scale(1) rotate(0deg)'}],{duration:260,easing:'cubic-bezier(.15,.8,.25,1)'});
    await wait(180);
  }finally{cell.classList.remove('die-rolling','die-settled');face.textContent=value;}
}
async function animateCopy(copy){
  const cell=$(`cell-${copy.tile}`),ink=cell.querySelector('.board-ink'),r=cell.getBoundingClientRect(),to=$('bag').getBoundingClientRect();
  await animate(copy.potion?cell:ink,[{opacity:.5},{opacity:1,transform:'scale(1.4)',offset:.5},{opacity:.7,transform:'scale(1)'}],{duration:250});
  const ghost=ball(copy.id);ghost.classList.add('drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--size','48px');document.body.append(ghost);
  await animate(ghost,[{transform:`translate(${r.left+r.width/2-24}px,${r.top}px) scale(.8)`,opacity:0},{transform:`translate(${r.left+r.width/2-24}px,${r.top-20}px) scale(1.1)`,opacity:1,offset:.3},{transform:`translate(${to.left+to.width/2-24}px,${to.top}px) scale(.25)`,opacity:0}],{duration:650,easing:'cubic-bezier(.3,.7,.3,1)'});
  ghost.remove();await animate($('bag'),[{transform:'scale(1)'},{transform:'scale(1.15)',offset:.4},{transform:'scale(1)'}],{duration:200});
  $('announcer').textContent='Copier added an exact copy to the bag.';
}
async function dropAnvil(id,cell){
  const r=cell.getBoundingClientRect(),size=r.width*.95,ghost=ball(id);ghost.classList.add('drag-ghost','anvil-drop');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--size',`${size}px`);document.body.append(ghost);cell.classList.add('anvil-pending');
  const x=r.left+(r.width-size)/2,y=r.top+(r.height-size)/2;
  await animate(ghost,[{transform:`translate(${x}px,${y-180}px) scale(1.15)`,opacity:0},{transform:`translate(${x}px,${y-165}px) scale(1.12)`,opacity:1,offset:.15},{transform:`translate(${x}px,${y}px) scale(1)`,opacity:1}],{duration:700,easing:'cubic-bezier(.65,0,1,.5)'});
  cell.classList.remove('anvil-pending');ghost.remove();
  await animate(cell.querySelector('span'),[{transform:'scale(1.25,.6)'},{transform:'scale(.95,1.1)',offset:.6},{transform:'scale(1)'}],{duration:180});
}
async function animateGravity(phase){
  render(phase.before);renderScore(phase.scoreBefore);
  const ghosts=phase.moves.map(move=>{
    const source=$(`cell-${move.from}`),a=source.getBoundingClientRect(),b=$(`cell-${move.to}`).getBoundingClientRect();
    const ghost=ball(move.id),size=a.width*.88;
    ghost.classList.add('drag-ghost','gravity-item');ghost.style.setProperty('--size',`${size}px`);ghost.setAttribute('aria-hidden','true');
    if(move.value!==null)ghost.querySelector('.face').textContent=move.value;
    const x=a.left+(a.width-size)/2,y=a.top+(a.height-size)/2,end=b.top+(b.height-size)/2;
    ghost.style.transform=`translate(${x}px,${y}px)`;document.body.append(ghost);
    source.classList.remove('stamped');source.querySelector('span').textContent='';
    return {ghost,x,y,end,move};
  });
  try{
    await Promise.all(ghosts.map(async({ghost,x,y,end,move})=>{
      await animate(ghost,[{transform:`translate(${x}px,${y}px)`},{transform:`translate(${x}px,${end}px) scale(1.08,.88)`,offset:.8},{transform:`translate(${x}px,${end-3}px) scale(.97,1.03)`,offset:.92},{transform:`translate(${x}px,${end}px)`}],{duration:650+(move.to-move.from)*10,easing:'cubic-bezier(.4,0,.8,1)'});
    }));
  }finally{ghosts.forEach(({ghost})=>ghost.remove());render(phase.after);renderScore(phase.scoreBefore);}
  $('announcer').textContent='Earth: all items settled downward.';
}
async function animateBlockedKing(phase){
  render(phase.board);renderScore(phase.scoreBefore);
  const cell=$(`cell-${phase.tile}`),r=cell.getBoundingClientRect(),cue=document.createElement('div');
  cue.className='king-blocked-cue';cue.textContent='No move';
  cue.style.left=`${r.left+r.width/2}px`;cue.style.top=`${r.top+4}px`;
  document.body.append(cue);cell.classList.add('king-blocked');
  $('announcer').textContent='King cannot move: no empty adjacent space.';
  try{
    await Promise.all([
      animate(cell,[{transform:'translateX(0)'},{transform:'translateX(-3px)',offset:.2},{transform:'translateX(3px)',offset:.4},{transform:'translateX(-2px)',offset:.6},{transform:'translateX(0)'}],{duration:650,easing:'ease-in-out'}),
      animate(cue,[{opacity:0,transform:'translate(-50%,4px)'},{opacity:1,transform:'translate(-50%,0)',offset:.15},{opacity:1,transform:'translate(-50%,0)',offset:.85},{opacity:0,transform:'translate(-50%,-3px)'}],{duration:1700,easing:'ease-out'})
    ]);
  }finally{cue.remove();cell.classList.remove('king-blocked');}
}
async function animateKings(result){
  for(const move of result.kingMoves){
    render(move.before);renderScore(result.scoreBefore??state.score-result.points);
    const from=$(`cell-${move.from}`),to=$(`cell-${move.to}`),a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
    const ghost=ball(move.id),size=a.width*.9;ghost.classList.add('drag-ghost','king-moving');ghost.style.setProperty('--size',`${size}px`);ghost.setAttribute('aria-hidden','true');document.body.append(ghost);
    from.classList.remove('stamped','king-item');from.querySelector('span').textContent='';to.classList.add('king-destination');
    await animate(ghost,[{transform:`translate(${a.left}px,${a.top}px)`},{transform:`translate(${(a.left+b.left)/2}px,${Math.min(a.top,b.top)-18}px) rotate(-5deg)`,offset:.5},{transform:`translate(${b.left}px,${b.top}px)`}],{duration:620,easing:'ease-in-out'});
    ghost.remove();to.classList.remove('king-destination');render(move.after);renderScore(result.scoreBefore??state.score-result.points);navigator.vibrate?.(10);
    await animate(to.querySelector('span'),[{transform:'scale(1.1,.85)'},{transform:'scale(1)'}],{duration:150});
    for(const copy of move.copies)await animateCopy(copy);
  }
}
async function play(n,b,ghost,tile=state.destinations[n]){
  if(busy){ghost?.remove();return;}lock();const result=choose(state,n,tile);if(!result){ghost?.remove();unlock();return;}
  saveRun();mimicAppearance=result.mimic;renderCalls(result.callsBeforeBonuses);$('bag-count').textContent=state.bag.size;
  const cell=$(`cell-${tile}`),r=cell.getBoundingClientRect();b.style.visibility='hidden';
  if(result.potionApplied){
    const before=result.potionApplied.before;render(before);renderCalls(result.callsBeforeBonuses);
    if(ghost){await animate(ghost,[{transform:ghost.style.transform,opacity:1},{transform:`translate(${r.left}px,${r.top}px) rotate(-65deg) scale(.6)`,opacity:1,offset:.65},{transform:`translate(${r.left}px,${r.top+12}px) rotate(-65deg) scale(.2)`,opacity:0}],{duration:650});ghost.remove();ghost=null;}
    if(['potion20','potion2'].includes(result.potionApplied.type)){
      const type=result.potionApplied.type,count=state.itemEffects[result.potionApplied.target].filter(e=>e===type).length,tag=document.createElement('span');tag.className='activation-point mars-bonus';tag.textContent=type==='potion2'?`×${2**(count-1)} → ×${2**count}`:`+${(count-1)*20} → +${count*20}`;tag.style.left=`${r.left+r.width/2}px`;tag.style.top=`${r.top}px`;$('effects').append(tag);
      await animate(tag,[{opacity:0,transform:'translate(-50%,0) scale(.7)'},{opacity:1,transform:'translate(-50%,-70%) scale(1.1)',offset:.3},{opacity:1,transform:'translate(-50%,-90%) scale(1)'}],{duration:650});tag.remove();
    }
    burst(r);await animate(cell,[{filter:'brightness(1)'},{filter:'brightness(1.8)',transform:'scale(1.08)',offset:.4},{filter:'brightness(1)',transform:'scale(1)'}],{duration:420});
    if(result.potionApplied.type==='potionMelt'){const melted=ball(result.potionApplied.target);melted.classList.add('drag-ghost');melted.style.setProperty('--size',`${r.width*.85}px`);document.body.append(melted);cell.classList.remove('stamped');cell.querySelector('span').textContent='';await animate(melted,[{transform:`translate(${r.left}px,${r.top}px)`,opacity:1},{transform:`translate(${r.left}px,${r.bottom-10}px) scale(1.2,.05)`,opacity:0}],{duration:500});melted.remove();}
  }
  if(ghost&&state.items[n]==='hundred'){ghost.remove();ghost=null;}
  if(ghost){const size=parseFloat(ghost.style.getPropertyValue('--size'));await animate(ghost,[{transform:ghost.style.transform},{transform:`translate(${r.left+(r.width-size)/2}px,${r.top+(r.height-size)/2}px) scale(.72) rotate(-12deg)`}],{duration:190,easing:'cubic-bezier(.15,.8,.25,1)'});ghost.remove();}
  document.querySelectorAll('.cell.offered').forEach(c=>{c.className='cell paint-grey';c.querySelector('span').textContent='';});
  // Board stamps leave ink, never a temporary occupied ball face.
  if(!result.stampApplied&&!result.potionApplied){
  cell.className=`cell paint-grey upgrade-${state.upgrades[n]||'plain'}${itemClass(n)} stamped just-stamped`;cell.querySelector('span').textContent=pieceFace(n);cell.classList.toggle('large-value',String(pieceFace(n)).length>2);
  }
  if(result.mimic&&!result.potionApplied&&!result.stampApplied)await animate(cell,[{transform:'scaleX(0)'},{transform:'scaleX(1.12)',offset:.65},{transform:'scaleX(1)'}],{duration:300});
  if(result.swap){
    await animate(cell.querySelector('span'),[{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:210});
    cell.className=`cell paint-grey stamped${itemClass(result.swap.to)}`;cell.querySelector('span').textContent=result.swap.value??pieceFace(result.swap.to);
    await animate(cell.querySelector('span'),[{transform:'scaleX(0)'},{transform:'scaleX(1.15)',offset:.6},{transform:'scaleX(1)'}],{duration:250});
  }
  if(state.items[n]==='hundred')await dropAnvil(n,cell);
  pulseBackground();navigator.vibrate?.(18);burst(r);
  await animate(document.querySelector('.board-frame'),[{transform:'translateY(0)'},{transform:'translateY(3px)'},{transform:'translate(-1px,-1px)'},{transform:'translate(0,0)'}],{duration:190});
  await wait(180);
  render(result.effectBoard||result.scoringBoard||state);if(result.roll!==null)cell.querySelector('span').textContent='?';renderCalls(result.callsBeforeBonuses);renderScore(state.score-result.points);
  if(result.roll!==null)await rollDie(cell,result.roll);
  for(const copy of result.copies||[])await animateCopy(copy);
  if(result.stampApplied){const ink=cell.querySelector('.board-ink');await animate(ink,[{transform:'scale(2) rotate(-12deg)',opacity:0},{transform:'scale(.9)',opacity:1,offset:.6},{transform:'scale(1)',opacity:.65}],{duration:400});}
  if(result.valueChanges.length)await animateValueChanges(result);
  $('announcer').textContent=`${pieceLabel(n)} played.${result.roll!==null?` Rolled ${result.roll}.`:''} ${result.playCost===0?'No play used.':'One play used.'}`;
  if(result.destroyed.length){await explodeBomb(result);render(result.scoringBoard||state);renderScore(state.score-result.points);}
  for(const phase of result.timeline){
    if(phase.kind==='gravity')await animateGravity(phase);
    else if(phase.kind==='blocked')await animateBlockedKing(phase);
    else if(phase.kind==='move')await animateKings({kingMoves:[phase.move],scoreBefore:phase.scoreBefore});
    else{render(phase.scoringBoard);renderScore(phase.scoreBefore);await activateSpaces(phase);}
  }
  if(result.mimic){const location=Object.entries(state.stampBalls).find(([,id])=>id===n)?.[0];if(location){const face=$(`cell-${location}`).querySelector('span');await animate(face,[{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:180});mimicAppearance=null;render();await animate(face,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:180});}}
  mimicAppearance=null;await wait(120);render();refreshBag();
  if(state.status!=='playing'){showResult();return;}await nextDraw();
}
function showStages(){hideTooltip();$('stage-grid').innerHTML=Array.from({length:10},(_,i)=>{const n=Math.max(1,state.stage-4)+i,current=n===state.stage,done=n<state.stage;return `<div class="stage-node ${current?'current':done?'complete':'locked'}" ${current?'aria-current="step"':''} aria-label="Stage ${n}, ${current?'current':done?'completed':'locked'}"><span>${n}<small>${targetFor(n).toLocaleString()} ${star}</small></span>${current?'<span>◆</span>':done?'<span>✓</span>':'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'}</div>`;}).join('');$('stage-dialog').showModal();}
function showPatterns(){
  if(busy||drag||payingOut)return;
  hideTooltip();
  const counts=state.patternCounts||{},most=Math.max(0,...PATTERN_TYPES.map(p=>counts[p.id]||0));
  $('patterns-total').textContent=PATTERN_TYPES.reduce((sum,p)=>sum+(counts[p.id]||0),0).toLocaleString();
  $('patterns-list').innerHTML=PATTERN_TYPES.map(p=>{
    const count=counts[p.id]||0;
    const preview=Array.from({length:25},(_,i)=>`<i${p.previewTiles.includes(i+1)?' class="filled"':''}></i>`).join('');
    return `<div class="pattern-row${count?' has-scored':''}${count&&count===most?' most-scored':''}" data-pattern="${p.id}" role="listitem" aria-label="${p.label}, ${p.tileCount} tiles, scored ${count} ${count===1?'time':'times'} this run"><span class="pattern-name"><span class="pattern-preview" aria-hidden="true">${preview}</span><span>${p.label}</span></span><span class="pattern-base">${p.tileCount}<small>tiles</small></span><strong class="pattern-count"><span aria-hidden="true">×</span>${count.toLocaleString()}</strong></div>`;
  }).join('');
  $('patterns-dialog').showModal();
}
function resetResultUI(){
  $('stage-result').hidden=true;
  document.querySelector('.track').hidden=false;
  $('bag').disabled=false;$('stages').disabled=false;
}
function finishResult(){
  payingOut=false;busy=false;
  $('patterns-button').disabled=false;$('score-patterns').disabled=false;
  if(state.status==='passed'){showShop();return;}
  $('continue').disabled=false;$('result-menu').disabled=false;
  $('result-actions').hidden=false;
  $('bag').disabled=false;$('stages').disabled=false;
}
async function showResult(){
  hideTooltip();
  const passed=state.status==='passed';
  $('result-icon').textContent=passed?'✦':'↻';
  $('result-score').innerHTML=`${state.score}/${state.target} ${star}`;
  $('continue').textContent=passed?'→':'↻';
  $('continue').setAttribute('aria-label',passed?'Next stage':'New run');
  $('stage-result').setAttribute('aria-label',passed?'Stage complete':'Run ended');
  $('result-actions').hidden=true;
  $('continue').disabled=true;$('result-menu').disabled=true;
  document.querySelector('.track').hidden=true;$('stage-result').hidden=false;
  if(passed)state.bonusPaid=true;
  saveRun();
  finishResult();
}
$('continue').onclick=async()=>{if(payingOut)return;const next=state.status==='passed'?state.stage+1:1;state=newStage(next,next===1?5:state.money,next===1?{}:state.upgrades,next===1?{}:state.patternCounts,next===1?undefined:state.jokers,next===1?defaultBag():state);hasRun=true;saveRun();resetResultUI();await nextDraw();};
function playOfferedBall(){
  if(busy||drag||state.status!=='playing'||!state.offer.length)return;
  const n=Number(document.activeElement?.closest('#balls .ball')?.dataset.number)||state.offer[0],b=$('balls').querySelector(`[data-number="${n}"]`);if(!b)return;
  const r=b.getBoundingClientRect(),ghost=b.cloneNode(true);ghost.className=b.className.replace(/enter|leave/g,'')+' drag-ghost';ghost.removeAttribute('data-number');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--size',`${r.width}px`);ghost.style.transform=`translate(${r.left}px,${r.top}px)`;document.body.append(ghost);
  play(n,b,ghost);
};
async function passTurn(ghost=null){
  if(busy||drag||state.passes<1||state.status!=='playing'){ghost?.remove();return;}
  const b=ghost?$('balls').querySelector(`[data-number="${ghost.dataset.number}"]`):(document.activeElement?.closest('#balls .ball')||$('balls').firstElementChild),r=b?.getBoundingClientRect();
  if(!ghost&&b){ghost=b.cloneNode(true);ghost.classList.add('drag-ghost');ghost.classList.remove('enter');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--size',`${r.width}px`);ghost.style.transform=`translate(${r.left}px,${r.top}px)`;document.body.append(ghost);}
  lock();if(!redraw(state,Math.random,Number(b.dataset.number))){ghost?.remove();unlock();return;}saveRun();$('redraw-cost').textContent=state.passes;if(b)b.style.visibility='hidden';

  if(ghost){const to=$('bag').getBoundingClientRect(),size=parseFloat(ghost.style.getPropertyValue('--size'));await animate(ghost,[{transform:ghost.style.transform,opacity:1},{transform:`translate(${to.left+(to.width-size)/2}px,${to.top}px) scale(.15) rotate(90deg)`,opacity:0}],{duration:330,easing:'cubic-bezier(.4,0,.8,.4)'});ghost.remove();}
  animate($('bag'),[{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:190});render();showBalls();await wait(770);unlock();$('announcer').textContent=`Passed. ${state.passes} passes and ${state.calls} plays remaining.`;
}
document.addEventListener('keydown',e=>{if(inMenu||shopping||busy||document.querySelector('dialog[open]')||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowDown'){e.preventDefault();passTurn();}else if(e.key==='ArrowUp'){e.preventDefault();playOfferedBall();}});
$('bag').onclick=()=>{hideTooltip();refreshBag();$('bag-dialog').showModal();};$('stages').onclick=showStages;
$('patterns-button').onclick=showPatterns;$('score-patterns').onclick=showPatterns;
for(const dialog of document.querySelectorAll('#bag-dialog,#stage-dialog,#patterns-dialog,#catalog-dialog')){dialog.addEventListener('close',hideTooltip);dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('pointerdown',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});}


function pointCopy(text){
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/([+×−]\d+|x[23]|1–20|\d+(?= ★))/g,'<em class="point-text">$1</em>')
    .replace(/destroy(?:s)?/gi,'<em class="destroy-text">$&</em>')
    .replace(/(When played:|When scored:|Each play:|Each turn:|While on board:)/g,'<b class="effect-trigger">$1</b>')
    .replace(/★/g,star);
}
function itemArt(type){if(ITEM_TYPES[type]?.kind==='potion')return `<i class="potion-art ${type}-art" aria-hidden="true">${potionFace(type)}</i>`;return type==='statue'?'<i class=statue-art aria-hidden=true>10</i>':type==='king'?'<i class=king-art aria-hidden=true>0</i>':type==='hundred'?'<i class="hundred-art" aria-hidden="true">50</i>':`<i class="${type==='d20'?'die-art':`${type}-art`}" aria-hidden="true">${type==='doubleball'?'×2':type==='question'?'?':type.startsWith('plus')?`+${type.slice(4)}`:type==='copier'?'COPY':type==='d20'?'?':type==='seed'?'1':['x2','x3'].includes(type)?`×${type.slice(1)}`:''}</i>`;}
function showCatalog(){
  if(busy)return;hideTooltip();
  $('catalog-grid').replaceChildren(...shopItemTypes().map(type=>{const item=ITEM_TYPES[type];
    const owned=state.collection.filter(id=>state.items[id]===type).length,button=document.createElement('button');
    button.className=`catalog-item${owned?' owned':''}`;button.dataset.type=type;
    button.setAttribute('aria-label',`${item.name}. ${owned?'In your bag':'Not in your bag'}. Inspect effect.`);
    button.innerHTML=`${itemArt(type)}<strong>${pointCopy(item.name)}</strong>${owned?`<small>×${owned}</small>`:''}`;
    button.onclick=()=>showTooltip(null,button,false,type);return button;
  }));
  $('catalog-dialog').showModal();
}
$('see-all').onclick=showCatalog;
$('catalog-dialog').addEventListener('close',hideTooltip);
function renderShop(){
  hideTooltip();
  const shelf=$('shop-shelf'),focused=document.activeElement?.id;
  shelf.innerHTML='<section class=reward-row aria-label=Tokens><div id=shop-tokens class=reward-options></div></section>';
  for(const type of state.shopOffer.items.filter(Boolean)){
    const item=ITEM_TYPES[type],card=document.createElement('button');card.id=`shop-${type}`;card.className='shop-product';
    const owned=state.collection.filter(id=>state.items[id]===type).length;
    const action='CHOOSE';card.disabled=busy;card.setAttribute('aria-label',`${item.name}. ${item.startingValue===null?(item.kind==='potion'?'Potion.':'Stamp.'):`Starting stars: ${item.startingValue}.`} ${item.text} ${owned} owned.`);
    const art=itemArt(type);
    const badge=item.startingValue===null?`<span class="stamp-tag shop-stamp-tag">${item.kind==='potion'?'POTION':'STAMP'}</span>`:`<span class="starting-points" aria-label="Starting stars: ${item.startingValue}">${item.startingValue} ${star}</span>`;
    card.innerHTML=`<span class="product-art-well">${art}</span><span class="product-body"><span class="product-top"><strong class="product-name">${pointCopy(item.name.toUpperCase())}</strong>${badge}</span><span class="product-description">${pointCopy(item.text)}</span></span><span class="product-owned"><span id="${type==='bomb'?'shop-item-count':`shop-${type}-count`}">${owned}</span> OWNED</span>`;
    card.onclick=async()=>{
      if(busy)return;
      const id=state.nextItemId;
      if(!claimReward(state,type))return;
      busy=true;saveRun();shelf.querySelectorAll('button').forEach(b=>b.disabled=true);$('shop-menu').disabled=true;$('see-all').disabled=true;$('bag').disabled=true;
      $('announcer').textContent=`${item.name} chosen. Next round.`;
      await collectShopItem(card,id);
      await finishShop();
    };
    $('shop-tokens').append(card);
  }
  if(focused?.startsWith('shop-')&&$(focused)&&!$(focused).disabled)$(focused).focus({preventScroll:true});
  $('shop-menu').disabled=busy;$('see-all').disabled=busy;
}
const playSurface=()=>[$('score-meter'),document.querySelector('.board-frame'),document.querySelector('.draw-area')];
async function slideSurface(elements,entering,direction){
  $('game-screen').classList.add('screen-sliding');
  try{await Promise.all(elements.map(el=>animate(el,reduced?[{opacity:entering?0:1},{opacity:entering?1:0}]:[
    {transform:`translateX(${entering?direction*innerWidth:0}px)`,opacity:entering?0:1},
    {transform:`translateX(${entering?0:direction*innerWidth}px)`,opacity:entering?1:0}
  ],{duration:800,easing:'cubic-bezier(.22,.8,.25,1)'})));}
  finally{$('game-screen').classList.remove('screen-sliding');}
}
async function showShop(){
  openShop(state);if(state.shopOffer.claimed){await finishShop();return;}
  busy=true;hideTooltip();$('bag').disabled=true;$('pause-button').disabled=true;
  await slideSurface(playSurface(),false,-1);
  shopping=true;$('game-screen').classList.add('shopping');$('shop-screen').hidden=false;
  $('bag-count').textContent=state.collection.length;$('bag').setAttribute('aria-label',`View bag, ${state.collection.length} items`);renderShop();saveRun();
  await slideSurface([$('shop-screen')],true,1);
  busy=false;$('bag').disabled=false;$('patterns-button').disabled=false;$('score-patterns').disabled=false;$('stages').disabled=false;renderShop();
}
async function collectShopItem(card,id){
  const source=card.querySelector('.product-art-well i'),from=source.getBoundingClientRect(),bag=$('bag'),to=bag.querySelector('svg').getBoundingClientRect();
  const ghost=ball(id),size=Math.min(80,from.width);
  ghost.classList.add('drag-ghost','shop-reward-flight');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--size',`${size}px`);
  const x=from.left+(from.width-size)/2,y=from.top+(from.height-size)/2,dx=to.left+to.width/2-size/2,dy=to.top+to.height/2-size/2;
  ghost.style.transform=`translate(${x}px,${y}px)`;document.body.append(ghost);source.style.opacity='.2';bag.classList.add('receiving');
  try{
    await animate(ghost,[{transform:`translate(${x}px,${y}px) scale(.95)`},{transform:`translate(${x}px,${y-15}px) scale(1.25) rotate(-8deg)`}],{duration:350,easing:'ease-out'});
    await animate(ghost,[{transform:`translate(${x}px,${y-15}px) scale(1.25) rotate(-8deg)`,opacity:1},{transform:`translate(${dx}px,${dy-30}px) scale(.7) rotate(10deg)`,opacity:1,offset:.8},{transform:`translate(${dx}px,${dy}px) scale(.12)`,opacity:0}],{duration:1150,easing:'cubic-bezier(.4,0,.65,1)'});
    $('bag-count').textContent=state.collection.length;refreshBag();
    await animate(bag.querySelector('svg'),[{transform:'scale(1)'},{transform:'scale(1.22,.88)',offset:.35},{transform:'scale(.96,1.06)',offset:.7},{transform:'scale(1)'}],{duration:450,easing:'ease-out'});
    $('announcer').textContent=`${ITEM_TYPES[state.items[id]].name} added to your bag.`;
    await wait(250);
  }finally{ghost.remove();bag.classList.remove('receiving');}
}
async function finishShop(){
  hideTooltip();busy=true;$('bag').disabled=true;
  if(shopping)await slideSurface([$('shop-screen')],false,1);
  shopping=false;$('game-screen').classList.remove('shopping');$('shop-screen').hidden=true;
  state=newStage(state.stage+1,state.money,state.upgrades,state.patternCounts,state.jokers,state);
  $('balls').replaceChildren();resetResultUI();deal(state);render();showBalls();saveRun();
  await slideSurface(playSurface(),true,-1);
  unlock();
}
$('shop-menu').onclick=()=>{if(!busy)showMenu();};

const SAVE_KEY='binglatro.run.v1';
function saveRun(){
  if(!hasRun)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({...state,stamps:[...state.stamps],bag:[...state.bag]}));}catch{}
}
function loadRun(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!saved)return;
    migrateInventory(saved);
    removeRetiredItems(saved);
    const numbers=a=>Array.isArray(a)&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=25)&&new Set(a).size===a.length;
    const ids=a=>Array.isArray(a)&&a.every(n=>Number.isSafeInteger(n)&&n>=1&&n<saved.nextItemId)&&new Set(a).size===a.length;
    if(!Number.isSafeInteger(saved.nextItemId)||saved.nextItemId<26||saved.nextItemId>10000||!ids(saved.collection)||!saved.items||Array.isArray(saved.items)||!Object.entries(saved.items).every(([id,type])=>Number.isInteger(Number(id))&&Number(id)>=26&&Number(id)<saved.nextItemId&&Object.hasOwn(ITEM_TYPES,type))||!saved.collection.every(id=>id<=25||saved.items[id]||Object.hasOwn(saved.ballValues||{},id)))throw new Error('Invalid collection');
    if(!Number.isSafeInteger(saved.stage)||saved.stage<1||!numbers(saved.stamps)||!ids(saved.bag)||!ids(saved.offer)||!saved.bag.every(id=>saved.collection.includes(id))||!saved.offer.every(n=>saved.bag.includes(n))||!Number.isInteger(saved.calls)||saved.calls<0||saved.calls>192||!Number.isInteger(saved.money)||saved.money<0||!Number.isInteger(saved.score)||!['playing','passed','over'].includes(saved.status)||!Array.isArray(saved.played)||saved.played.length<26||saved.played.length>saved.nextItemId)throw new Error('Invalid save');
    const old=saved.rulesVersion!==3;
    delete saved.paints;delete saved.goldSeals;
    const oldTurn=saved.turnVersion!==1;
    if(oldTurn){if(saved.status==='playing')saved.calls=Math.max(0,17-Math.max(0,(saved.callCapacity??12)-saved.calls));saved.passes=10;}
    if(!oldTurn&&saved.status==='playing'&&saved.callCapacity!==17)saved.calls=Math.max(0,17-Math.max(0,(saved.callCapacity??15)-saved.calls));
    saved.calls=Math.min(saved.calls,17);saved.callCapacity=17;saved.turnVersion=1;
    if(saved.status==='playing'&&saved.calls===0)saved.status='over';
    if(!Number.isInteger(saved.passes)||saved.passes<0||saved.passes>10)throw new Error('Invalid passes');
    migrateShop(saved);
    if(!Number.isInteger(saved.callCapacity)||saved.callCapacity<15||saved.callCapacity>192||saved.calls>saved.callCapacity)throw new Error('Invalid call capacity');
    if(old){
      saved.upgrades={};saved.shopOffer=null;
      saved.jokers=[];
      saved.stampValues=Object.fromEntries(Object.entries(saved.stampBalls||{}));
    }
    saved.upgrades??={};
    if(!old&&saved.upgradeVersion!==2){
      for(const n of Object.keys(saved.upgrades))if(saved.upgrades[n]==='dynamite')saved.upgrades[n]='tornado';
      if(saved.shopOffer?.balls)saved.shopOffer.balls=saved.shopOffer.balls.map(type=>type==='dynamite'?'tornado':type);
    }
    saved.upgradeVersion=2;
    saved.tileStamps??=Object.fromEntries(Array.from({length:25},(_,i)=>[i+1,tileStampList(saved,i+1)]).filter(([,list])=>list.length));
    if(typeof saved.tileStamps!=='object'||Array.isArray(saved.tileStamps)||!Object.entries(saved.tileStamps).every(([tile,list])=>Number.isInteger(Number(tile))&&Number(tile)>=1&&Number(tile)<=25&&Array.isArray(list)&&list.every(type=>['x2','x3','copier','trash','plus10','plus50','plus100'].includes(type))))throw new Error('Invalid tile stamps');
    saved.tileCopiers??={};
    if(typeof saved.tileCopiers!=='object'||Array.isArray(saved.tileCopiers)||!Object.entries(saved.tileCopiers).every(([tile,value])=>Number.isInteger(Number(tile))&&Number(tile)>=1&&Number(tile)<=25&&value===true))throw new Error('Invalid copier tiles');
    saved.tileMultipliers??={};
    if(typeof saved.tileMultipliers!=='object'||Array.isArray(saved.tileMultipliers)||!Object.entries(saved.tileMultipliers).every(([tile,value])=>Number.isInteger(Number(tile))&&Number(tile)>=1&&Number(tile)<=25&&Number.isSafeInteger(value)&&value>=1))throw new Error('Invalid tile multipliers');
    if(saved.lastPlayed){const p=saved.lastPlayed;if(!(p.type==='bingo'||Object.hasOwn(ITEM_TYPES,p.type))||!(p.base===null||Number.isSafeInteger(p.base))||!Number.isSafeInteger(p.modifier)||!Array.isArray(p.effects)||!p.effects.every(e=>['potion20','potion2'].includes(e)))saved.lastPlayed=null;}
    saved.itemEffects??={};
    if(typeof saved.itemEffects!=='object'||Array.isArray(saved.itemEffects)||!Object.entries(saved.itemEffects).every(([id,effects])=>saved.collection.includes(Number(id))&&Array.isArray(effects)&&effects.every(e=>['potion20','potion2'].includes(e))))throw new Error('Invalid item effects');
    saved.valueModifiers??={};
    if(typeof saved.valueModifiers!=='object'||Array.isArray(saved.valueModifiers)||!Object.entries(saved.valueModifiers).every(([id,value])=>saved.collection.includes(Number(id))&&Number.isSafeInteger(value)))throw new Error('Invalid value modifiers');
    saved.ballValues??={};
    for(const [tile,id] of Object.entries(saved.stampBalls||{}))if(saved.items[id]==='hundred')saved.stampValues[tile]=ballValue(saved,Number(id));
    if(typeof saved.ballValues!=='object'||Array.isArray(saved.ballValues)||!Object.entries(saved.ballValues).every(([n,value])=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<saved.nextItemId&&saved.collection.includes(Number(n))&&Number.isSafeInteger(value)))throw new Error('Invalid ball values');
    if(typeof saved.upgrades!=='object'||Array.isArray(saved.upgrades)||!Object.entries(saved.upgrades).every(([n,type])=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=25&&BALL_UPGRADES[type]))throw new Error('Invalid upgrades');
    if(saved.shopOffer!=null&&(saved.status!=='passed'||!saved.bonusPaid||!Array.isArray(saved.shopOffer.items)))throw new Error('Invalid shop');
    if(saved.shopOffer?.items&&!saved.shopOffer.items.every(type=>Object.hasOwn(ITEM_TYPES,type)))throw new Error('Invalid shop items');
    saved.scoredLines=Array.isArray(saved.scoredLines)?[...new Set(saved.scoredLines.filter(id=>typeof id==='string'&&([...MARS_PATTERNS,...MOON_PATTERNS,...JUPITER_PATTERNS].some(p=>p.id===id)||/^(row-[1-5]|column-[1-5]|diagonal-[12]|square-(?:[1-9]|1[0-6])|corners-1|mars-(?:[1-3]|[6-8]|1[1-3]|1[6-8]|2[1-3]))$/.test(id))))]:[];
    saved.jokers=[];
    saved.jokerVersion=4;saved.plainRules=true;
    saved.patternCounts=Object.fromEntries(PATTERN_TYPES.map(({id})=>[id,Number.isSafeInteger(saved.patternCounts?.[id])&&saved.patternCounts[id]>=0?saved.patternCounts[id]:0]));
    if(saved.rulesVersion!==2&&saved.rulesVersion!==3){
      state=newStage(saved.stage,saved.money,{},saved.patternCounts,saved.jokers);
      if(saved.status==='passed'){state.status='passed';state.bonusPaid=saved.bonusPaid;state.calls=saved.calls;state.callCapacity=saved.callCapacity;state.score=state.target;}
    }else{
      const {stampBalls,destinations,stampValues}=saved;
      if(!stampBalls||typeof stampBalls!=='object'||Array.isArray(stampBalls)||!destinations||typeof destinations!=='object'||Array.isArray(destinations)||!stampValues||typeof stampValues!=='object'||Array.isArray(stampValues))throw new Error('Invalid placements');
      if(Object.keys(stampBalls).length!==saved.stamps.length||!ids(Object.values(stampBalls))||!saved.stamps.every(tile=>stampBalls[tile]&&saved.collection.includes(stampBalls[tile])&&!saved.bag.includes(stampBalls[tile])))throw new Error('Invalid stamps');
      if(Object.keys(stampValues).length!==saved.stamps.length||!saved.stamps.every(tile=>stampValues[tile]===null||Number.isSafeInteger(stampValues[tile])))throw new Error('Invalid values');
      if(Object.keys(destinations).length!==saved.offer.length||!Object.values(destinations).every(t=>Number.isInteger(t)&&t>=1&&t<=25)||!saved.offer.every(n=>destinations[n]&&!saved.stamps.includes(destinations[n])))throw new Error('Invalid destinations');
      state={...newStage(saved.stage,saved.money),...saved,rulesVersion:3,target:targetFor(saved.stage),stamps:new Set(saved.stamps),bag:new Set(saved.bag)};
    }
    if(oldTurn&&state.status==='playing'){state.offer=[];state.destinations={};}
    if(saved.handVersion!==1&&state.status==='playing')deal(state);
    hasRun=true;
  }catch{try{localStorage.removeItem(SAVE_KEY);}catch{}}
}
function updateMenu(){
  $('play-button').innerHTML=hasRun?'RESUME <span>▶</span>':'PLAY <span>▶</span>';
  $('new-run-button').hidden=!hasRun;
  $('saved-stage').hidden=!hasRun;
  $('saved-stage').innerHTML=`STAGE ${state.stage} · ${state.score}/${state.target.toLocaleString()} ${star}`;
}
function showMenu(){
  hideTooltip();cancelDrag();saveRun();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  $('game-screen').hidden=true;$('title-screen').hidden=false;inMenu=true;
  updateMenu();$('play-button').focus();
}
async function enterGame(fresh=false){
  if(!inMenu&&!fresh)return;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  if(fresh||!hasRun){state=newStage(1,5,{}, {},undefined,defaultBag());hasRun=true;}
  shopping=false;$('game-screen').classList.remove('shopping');$('shop-screen').hidden=true;
  inMenu=false;resetResultUI();$('title-screen').hidden=true;$('game-screen').hidden=false;
  render();
  if(state.status!=='playing'){busy=true;showBalls();showResult();}
  else if(state.offer.length){lock();showBalls();await wait(770);unlock();}
  else await nextDraw();
}
function pauseGame(){
  if(shopping&&!busy){showMenu();return;}
  if(inMenu||busy||payingOut||document.querySelector('dialog[open]'))return;
  cancelDrag();hideTooltip();saveRun();
  $('pause-summary').innerHTML=`STAGE ${state.stage} · ${state.score}/${state.target.toLocaleString()} ${star}`;
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
$('result-menu').onclick=()=>{if(payingOut)return;if(state.status==='over'){hasRun=false;try{localStorage.removeItem(SAVE_KEY);}catch{}}showMenu();};


document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('dialog[open]')&&!inMenu){e.preventDefault();pauseGame();}});
window.addEventListener('pagehide',saveRun);
loadRun();updateMenu();
