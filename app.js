import {baseBagRecipe,bagRecipe,buildDebugBag} from './debug-bag.js?v=bfb7e7ccf9db';
import {pulseBackground} from './background.js?v=64709a33df06';
import {newStage,deal,choose,tileStampList,activateCard,migrateShop,migrateInventory,isRuleCard,isBomb,isDie,ITEM_TYPES,CARD_TYPES,removeJoker,normalizeJokers,redraw,settleStage,openRewardShop as openShop,claimReward,BALL_UPGRADES,cardType,cardDetails,ballValue,STAGE_TARGETS,PATTERN_TYPES} from './game.js?v=e4a472006c1e';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state=newStage(),busy=false,drag=null,tooltipAnchor=null,payingOut=false,hasRun=false,inMenu=true,shopping=false;
// One tempo for animation and sequencing keeps effects and input locks aligned.
const motionScale=.4;
document.documentElement.style.setProperty('--motion-scale',motionScale);
const wait=ms=>new Promise(r=>setTimeout(r,reduced?15:ms*motionScale));
const signed=n=>n>=0?`+${n}`:String(n);
const animate=(el,frames,options)=>el.animate(frames,{...options,duration:reduced?1:options.duration*motionScale}).finished.catch(()=>{});
function burst(rect,scoring=false){if(reduced)return;for(let i=0;i<(scoring?28:12);i++){const p=document.createElement('i');p.className='particle';p.style.left=`${rect.left+rect.width/2}px`;p.style.top=`${rect.top+rect.height/2}px`;p.style.background=scoring?'#f4c66c':i%2?'#a9b7b8':'#e4e9dd';$('effects').append(p);const angle=Math.random()*Math.PI*2,d=25+Math.random()*(scoring?150:65);animate(p,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(angle)*d}px,${Math.sin(angle)*d+25}px) scale(0)`,opacity:0}],{duration:450+Math.random()*250,easing:'cubic-bezier(.1,.7,.3,1)'}).then(()=>p.remove());}}
for(let n=1;n<=25;n++){const c=document.createElement('button');c.type='button';c.id=`cell-${n}`;c.className='cell';c.innerHTML='<i class=board-ink aria-hidden=true></i><span></span>';c.onclick=()=>{if(!busy&&!drag)inspectSpace(n);};$('board').append(c);}
function renderScore(value=state.score){
  $('score').textContent=value;$('target').textContent=state.target;
  $('score-meter').setAttribute('aria-label',`${value} of ${state.target} points`);
  $('score-meter').classList.toggle('target-met',value>=state.target);
  $('progress').style.width=`${Math.max(0,Math.min(100,value/state.target*100))}%`;
}
function render(boardState=state){
  renderJokers();$('bag').disabled=busy;
  const freePlay=state.items[state.offer[0]]==='rock';$('play-ball').querySelector('span').textContent=freePlay?'↑ FREE PLAY':'↑ PLAY';$('play-ball').classList.toggle('free-play',freePlay);
  $('redraw').classList.toggle('exhausted',state.passes===0);$('play-ball').disabled=busy||!!drag||state.status!=='playing'||!state.offer.length;$('play-ball').setAttribute('aria-label',`Play ball ${pieceLabel(state.offer[0])} on the highlighted space. ${state.calls} plays remaining.`);
  $('patterns-button').disabled=busy||payingOut;$('score-patterns').disabled=busy||payingOut;
  $('score-patterns').setAttribute('aria-label',`${state.score} of ${state.target} points. View scoring patterns and run counts`);
  $('pause-button').disabled=busy||payingOut||state.status!=='playing';document.querySelector('.score-panel').classList.toggle('large-score',state.target>=1000);renderScore();for(const k of ['calls','stage'])$(k).textContent=state[k];$('money').textContent=state.money;$('bag-count').textContent=state.bag.size;$('bag').setAttribute('aria-label',`Inspect bag, ${state.bag.size} balls remaining`);$('progress').style.width=`${Math.max(0,Math.min(100,state.score/state.target*100))}%`;$('redraw-cost').textContent=state.passes;$('redraw').disabled=busy||state.passes<1||state.status!=='playing';$('redraw').setAttribute('aria-label',`Pass: ${state.passes} remaining. Return this ball and draw a new ball and space without spending a play.`);renderCalls(state.calls);for(let tile=1;tile<=25;tile++){
    const c=$(`cell-${tile}`),offered=Object.values(state.destinations).includes(tile),number=boardState.stampBalls[tile];
    c.className=`cell paint-grey upgrade-${state.upgrades[number]||'plain'}${itemClass(number)}${boardState.stamps.has(tile)?' stamped':''}${offered?' offered':''}`;
    c.querySelector('span').textContent=boardState.stamps.has(tile)?(boardState.stampValues[tile]??''):'';
    const multiplier=state.tileMultipliers?.[tile]||1;c.querySelector('.board-ink').textContent=[state.tileCopiers?.[tile]?'▣':'',multiplier>1?`×${multiplier}`:''].filter(Boolean).join(' ');c.classList.toggle('inked',multiplier>1||!!state.tileCopiers?.[tile]);
    c.classList.toggle('large-value',String(boardState.stampValues[tile]).length>2);
    c.setAttribute('aria-label',`Row ${Math.floor((tile-1)/5)+1}, column ${(tile-1)%5+1}${boardState.stamps.has(tile)?`, stamped ${boardState.stampValues[tile]??pieceLabel(number)}`:offered?', available for any drawn ball':', empty'}. ${multiplier>1?`Tile multiplier ×${multiplier}. `:''}Scoring is determined by your active cards.`);
  }}

let jokerDrag=null;
function renderJokers(){
  const ids=normalizeJokers(state.jokers),rack=$('joker-rack');
  const signature=ids.join('|')+JSON.stringify(state.activeUses||{});
  if(rack.dataset.cards===signature)return;
  rack.dataset.cards=signature;rack.style.setProperty('--card-count',ids.length);rack.style.setProperty('--slot-count',Math.max(5,ids.length));rack.replaceChildren();
  for(const id of ids){
    const type=cardType(id),item=cardDetails(id),description=item.text,card=document.createElement('button'),pattern={previewTiles:[3,8,11,12,13,14,15,18,23,1,7,19,25]};
    card.className=`joker-card joker-${type}${item.active?' active-joker':''}${state.activeUses?.[id]?' spent':''}`;card.dataset.joker=id;
    card.setAttribute('aria-label',`${description}. Drag to reorder or trash. Use Left and Right arrows to reorder, or Delete to remove.`);
    card.innerHTML=`<span class="joker-heading">${type==='bingo'?'BINGO':item.name.toUpperCase()}</span><span class="joker-art ${type!=='bingo'?'digits-art':''}" aria-hidden="true">${type!=='bingo'?`<b>${item.icon}</b>`:Array.from({length:25},(_,i)=>`<i class="${pattern.previewTiles.includes(i+1)?'filled':''}"></i>`).join('')}</span><span class="joker-description">${type==='bingo'?'Lines of 5':type==='face-value'?'Number → pts':state.activeUses?.[id]?'USED':item.short||description}</span>`;
    card.onpointerdown=e=>{
      if(busy||e.button!==0||jokerDrag||drag)return;
      const selected=tooltipAnchor===card;
      e.preventDefault();hideTooltip();card.setPointerCapture(e.pointerId);
      jokerDrag={card,id,pointer:e.pointerId,x:e.clientX,y:e.clientY,ghost:null,selected,originalOrder:[...state.jokers]};
    };
    card.onpointermove=e=>{
      const d=jokerDrag;if(!d||d.pointer!==e.pointerId)return;
      const dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(!d.ghost&&Math.hypot(dx,dy)>6){
        const r=card.getBoundingClientRect();d.ghost=card.cloneNode(true);d.ghost.removeAttribute('data-joker');d.ghost.classList.add('joker-ghost');d.ghost.setAttribute('aria-hidden','true');d.ghost.style.width=`${r.width}px`;d.ghost.style.height=`${r.height}px`;d.w=r.width;d.h=r.height;document.body.append(d.ghost);card.classList.add('held');$('joker-trash').hidden=false;
      }
      if(d.ghost){
        const bounds=rack.getBoundingClientRect();
        if(e.clientY>=bounds.top-30&&e.clientY<=bounds.bottom+30){
          if(e.clientX<bounds.left+28)rack.scrollLeft-=12;
          if(e.clientX>bounds.right-28)rack.scrollLeft+=12;
          const others=[...rack.querySelectorAll('[data-joker]')].filter(c=>c!==card);
          const before=others.find(c=>{const r=c.getBoundingClientRect();return e.clientX<r.left+r.width/2;});
          const positions=new Map(others.map(c=>[c,c.getBoundingClientRect().left]));
          const order=[...others];order.splice(before?others.indexOf(before):others.length,0,card);
          // Keep the captured card attached; moving it would cancel touch capture.
          let anchor=rack.querySelector('.joker-slot');
          for(const sibling of order.reverse()){if(sibling!==card)rack.insertBefore(sibling,anchor);anchor=sibling;}
          for(const c of others){const dx=positions.get(c)-c.getBoundingClientRect().left;if(dx)animate(c,[{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:150,easing:'ease-out'});}
        }
        d.ghost.style.transform=`translate(${e.clientX-d.w/2}px,${e.clientY-d.h/2}px) rotate(${Math.max(-12,Math.min(12,(e.clientX-d.x)*.04))}deg)`;$('joker-trash').classList.toggle('ready',overTrash(e.clientX,e.clientY));}
    };
    card.onpointerup=async e=>{
      const d=jokerDrag;if(!d||d.pointer!==e.pointerId)return;
      if(!d.ghost)inspectCard(id,card);
      const discard=d.ghost&&overTrash(e.clientX,e.clientY),ghost=d.ghost;
      if(ghost){state.jokers=[...rack.querySelectorAll('[data-joker]')].map(c=>c.dataset.joker);saveRun();}
      if(discard){removeJoker(state,id);saveRun();if(shopping)renderShop();}
      cancelJokerDrag(false);renderJokers();
      if(ghost){if(discard){navigator.vibrate?.(20);await animate(ghost,[{transform:ghost.style.transform,opacity:1},{transform:ghost.style.transform+' scale(.05)',opacity:0}],{duration:220});}else{const r=rack.querySelector(`[data-joker="${id}"]`).getBoundingClientRect();await animate(ghost,[{transform:ghost.style.transform},{transform:`translate(${r.left}px,${r.top}px) rotate(0)`}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)'});}ghost.remove();}
      if(discard)$('announcer').textContent=`${id} card removed.`;
    };
    card.onpointercancel=()=>cancelJokerDrag();card.onlostpointercapture=()=>{if(jokerDrag)cancelJokerDrag();};
    card.onkeydown=e=>{if(busy)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectCard(id,card);return;}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const from=state.jokers.indexOf(id),to=from+(e.key==='ArrowLeft'?-1:1);if(to>=0&&to<state.jokers.length){[state.jokers[from],state.jokers[to]]=[state.jokers[to],state.jokers[from]];saveRun();renderJokers();rack.querySelector(`[data-joker="${id}"]`).focus();}return;}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeJoker(state,id);saveRun();renderJokers();if(shopping)renderShop();}};
    rack.append(card);
  }
  for(let i=ids.length;i<5;i++){const slot=document.createElement('div');slot.className='joker-slot';slot.setAttribute('aria-hidden','true');rack.append(slot);}
}
function overTrash(x,y){const r=$('joker-trash').getBoundingClientRect();return x>=r.left-12&&x<=r.right+12&&y>=r.top-12&&y<=r.bottom+12;}
function cancelJokerDrag(removeGhost=true){if(!jokerDrag)return;const d=jokerDrag;jokerDrag=null;if(removeGhost){const rack=$('joker-rack');for(const id of d.originalOrder){const c=rack.querySelector(`[data-joker="${id}"]`);if(c)rack.insertBefore(c,rack.querySelector('.joker-slot'));}}d.card.classList.remove('held');if(removeGhost)d.ghost?.remove();$('joker-trash').hidden=true;$('joker-trash').classList.remove('ready');if(d.card.hasPointerCapture(d.pointer))d.card.releasePointerCapture(d.pointer);}

const itemClass=n=>isBomb(state,n)?' bomb-item':isDie(state,n)?' die-item':state.items[n]==='hundred'?' hundred-item':state.items[n]==='rock'?' rock-item':state.items[n]==='seed'?' seed-item':['x2','x3','copier'].includes(state.items[n])?' stamp-item':'';
const pieceLabel=n=>state.items[n]?`${ITEM_TYPES[state.items[n]].name}${ballValue(state,n)!==null?` (${ballValue(state,n)})`:''}`:ballValue(state,n)??'';
const pieceFace=n=>state.items[n]==='copier'?'▣':['x2','x3'].includes(state.items[n])?`×${state.items[n].slice(1)}`:isDie(state,n)?'?':ballValue(state,n)??'';
function ball(n){const b=document.createElement('button');b.className=`ball paint-grey upgrade-${state.upgrades[n]||'plain'}${itemClass(n)}`;b.classList.toggle('large-value',String(pieceFace(n)).length>2);b.dataset.number=n;b.innerHTML=`<span class="face">${pieceFace(n)}</span>`;b.setAttribute('aria-label',`Inspect ${pieceLabel(n)}`);return b;}
function hideTooltip(){
  const tip=$('inspect-tooltip');
  if(tip.matches(':popover-open'))tip.hidePopover();
  tip.hidden=true;$('activate-card').hidden=true;tip.setAttribute('role','tooltip');
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
  hideTooltip();
  const tip=$('inspect-tooltip');
  (anchor.closest('dialog')||document.body).append(tip);
  $('tooltip-number').textContent=space?(state.stamps.has(Number(anchor.id.replace('cell-','')))?state.stampValues[Number(anchor.id.replace('cell-',''))]??pieceLabel(n):'EMPTY'):(n==null?'':isDie(state,n)?'?':ballValue(state,n)??pieceLabel(n));
  const upgrade=state.upgrades[n],item=ITEM_TYPES[state.items?.[n]];
  $('tooltip-effect').textContent=item?item.text:upgrade?BALL_UPGRADES[upgrade].text:space?'Nothing special':'';
  const modifier=state.valueModifiers?.[n]||0;if(modifier)$('tooltip-effect').textContent+=`${$('tooltip-effect').textContent?' ':''}Permanent value change: ${signed(modifier)}.${isDie(state,n)?` Future rolls: ${1+modifier}–${20+modifier}.`:''}`;
  if(space){
    const tile=Number(anchor.id.replace('cell-','')),list=tileStampList(state,tile),mult=state.tileMultipliers?.[tile]||1;
    const details=[state.stamps.has(tile)?`ITEM: ${item?.name||'Ball'}${state.stampValues[tile]!=null?` · ${state.stampValues[tile]}`:''}
${$('tooltip-effect').textContent}`:'ITEM: Empty'];
    details.push(`STAMPS · ${list.length}/4`);
    list.forEach((type,i)=>details.push(`${i+1}. ${type==='copier'?'Copier · add one copy to the bag on placement':type==='x2'?'×2 · double this tile’s points':'×3 · triple this tile’s points'}`));
    if(!list.length)details.push('None');
    if(mult>1)details.push(`Combined multiplier: ×${mult}`);
    $('tooltip-effect').textContent=details.join('\n');
  }

  $('tooltip-effect').hidden=!space&&!upgrade&&!item&&!modifier;
  tip.classList.toggle('space-tooltip',space);
  tooltipAnchor=anchor;
  anchor.setAttribute('aria-describedby','inspect-tooltip');
  anchor.classList.add('inspected');
  tip.hidden=false;
  tip.showPopover?.();
  positionTooltip();
  animate(tip,[{opacity:0,transform:'translateY(5px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:150,easing:'cubic-bezier(.2,.8,.25,1)'});
}
function inspectCard(id,card){
  const item=cardDetails(id);showTooltip(null,card);$('tooltip-number').textContent=item.name;$('tooltip-effect').textContent=item.text;$('tooltip-effect').hidden=false;
  if(item.active){
    const button=$('activate-card'),used=state.activeUses?.[id];button.hidden=false;button.disabled=!!used||!state.stamps.size||busy||state.status!=='playing'||shopping;
    button.textContent=used?'USED · NEXT ROUND':!state.stamps.size?'PLACE A PIECE FIRST':'ACTIVATE';button.onclick=()=>useActiveCard(id);$('inspect-tooltip').setAttribute('role','dialog');
  }
  positionTooltip();
}
async function useActiveCard(id){
  if(busy||drag||jokerDrag||shopping||inMenu)return;
  const result=activateCard(state,id);if(!result)return;
  hideTooltip();lock();saveRun();
  await activateSpaces(result);render();refreshBag();
  if(state.status!=='playing'){showResult();return;}unlock();
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
  for(const n of state.collection){
    const b=ball(n),played=!state.bag.has(n);
    if(played)b.classList.add('played-ball');
    if(state.offer.includes(n))b.classList.add('on-track');
    b.setAttribute('aria-label',`Ball ${pieceLabel(n)}${played?', already played, unavailable this stage':''}${state.offer.includes(n)?', on track':''}; played ${state.played[n]} times`);
    b.onclick=()=>inspect(n,b);$('bag-grid').append(b);
  }
}
let debugDraft=null;
function debugRows(){
  const list=$('debug-rows');list.replaceChildren();
  debugDraft.forEach((row,index)=>{
    const line=document.createElement('div');line.className='debug-row';
    const select=document.createElement('select');select.setAttribute('aria-label',`Piece ${index+1} type`);
    for(const [type,name] of [['number','Number'],...Object.entries(ITEM_TYPES).map(([type,item])=>[type,item.name])]){const option=document.createElement('option');option.value=type;option.textContent=name;select.append(option);}select.value=row.type;
    const value=document.createElement('input');value.type='number';value.step='1';value.inputMode='text';value.value=row.value??'';value.disabled=['bomb','rock','x2','x3','copier'].includes(row.type);value.setAttribute('aria-label',`Piece ${index+1} ${row.type==='d20'?'roll modifier':'value'}`);
    const count=document.createElement('input');count.type='number';count.step='1';count.min='1';count.max='500';count.inputMode='numeric';count.value=row.count;count.setAttribute('aria-label',`Piece ${index+1} copies`);
    const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Remove piece ${index+1}`);
    select.onchange=()=>{row.type=select.value;row.value=['bomb','rock','x2','x3','copier'].includes(row.type)?null:row.type==='d20'?0:row.type==='hundred'?50:1;debugRows();$('debug-rows').children[index].querySelector('select').focus();};
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
for(const [id,recipe] of [['debug-base',baseBagRecipe],['debug-current',()=>bagRecipe(state)],['debug-clear',()=>[]]])$(id).onclick=()=>{debugDraft=recipe();debugRows();};
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
function showBalls(){$('balls').replaceChildren();state.offer.forEach((n,i)=>{const b=ball(n);b.classList.add('enter');b.style.setProperty('--i',i);b.disabled=true;b.setAttribute('aria-label',`Ball ${pieceLabel(n)}. Tap to inspect. Drag along the track to reorder, or to the card to play. Keyboard: Enter to inspect, Space to play.`);b.addEventListener('pointerdown',e=>startDrag(e,n,b));b.addEventListener('pointermove',moveDrag);b.addEventListener('pointerup',endDrag);b.addEventListener('pointercancel',cancelDrag);b.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});b.onclick=e=>{if(e.detail===0&&!busy)inspect(n,b);};b.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();if(!busy&&!drag)play(n,b);} };$('balls').append(b);});refreshBag();}
async function nextDraw(){resetResultUI();lock();deal(state);render();showBalls();await wait(770);unlock();}
function startDrag(e,n,b){
  if(busy||drag||jokerDrag||e.button!==0)return;
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
  if(over){d.tile=isOnBoard(e.clientX,e.clientY)?nearestDestination(e.clientX,e.clientY,d.n):state.destinations[d.n];$(`cell-${d.tile}`)?.classList.add('destination');}
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
    d.tile=isOnBoard(e.clientX,e.clientY)?nearestDestination(e.clientX,e.clientY,d.n):state.destinations[d.n];cleanDrag(d);commitOrder(d);await play(d.n,d.b,d.ghost,d.tile);return;
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
async function cardImpact(card,payout,color,trigger=false){
  if(!card)return;
  card.classList.add('scoring-card');card.dataset.payout=payout;
  card.style.setProperty('--scoring-color',color);
  const frames=reduced?[{opacity:.7},{opacity:1}]:[
    {transform:'rotate(-1deg) scale(1)'},
    {transform:'translateY(2px) rotate(-4deg) scale(1.04,.91)',offset:.12},
    {transform:`translateY(-8px) rotate(4deg) scale(${trigger?1.24:1.18})`,offset:.29},
    {transform:'translateY(-5px) rotate(-2deg) scale(1.12)',offset:.48},
    {transform:'translateY(-5px) rotate(1deg) scale(1.12)',offset:.8},
    {transform:'translateY(-4px) rotate(-1deg) scale(1.07)'}
  ];
  await animate(card,frames,{duration:trigger?660:270,easing:'linear'});
}
function releaseCard(card){
  card?.classList.remove('scoring-card');if(card)delete card.dataset.payout;
}
async function scoreLink(from,to,color){
  if(reduced||!from)return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),spark=document.createElement('i');
  spark.className='score-spark';spark.style.background=color;
  spark.style.left=`${a.left+a.width/2}px`;spark.style.top=`${a.bottom-5}px`;$('effects').append(spark);
  await animate(spark,[{transform:'scale(1.6)',opacity:1},{transform:`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.bottom+5}px) scale(.6)`,opacity:1}],{duration:125,easing:'cubic-bezier(.5,0,.8,.4)'});
  spark.remove();
}
async function animateRetriggers(ids,target,color){
  for(const id of ids||[]){const source=document.querySelector(`[data-joker="${id}"]`);await cardImpact(source,'AGAIN',color,true);await scoreLink(source,target,color);releaseCard(source);}
}
async function activateSpaces(result){
  let displayedScore=state.score-result.points,displayedCalls=result.callsBeforeBonuses,total=0,lineIndex=0;
  let activePattern=[];
  const rack=$('joker-rack'),board=$('board'),area=document.querySelector('.draw-area'),readout=$('score-meter');
  const colors={row:'#83e0b5',column:'#91c6ff',diagonal:'#ffb18b',cross:'#eab6f3',all:'#ffe094'};
  const allTiles=[...new Set(result.activations.map(a=>a.tile))].map(n=>$(`cell-${n}`));
  rack.classList.add('scoring-rack');board.classList.add('scoring-board');area.classList.add('scoring-draw');
  readout.classList.add('scoring-total');$('score-line-label').hidden=false;renderScore(displayedScore);

  try{
    for(const [index,activation] of result.activations.entries()){
      const cell=$(`cell-${activation.tile}`),color=colors[activation.type];
      if(activation.pattern){
        lineIndex++;
        activePattern.forEach(c=>c.classList.remove('pattern-active','charged','score-pending'));
        activePattern=activation.pattern.map(n=>$(`cell-${n}`));
        activePattern.forEach(c=>{c.style.setProperty('--scoring-color',color);c.classList.add('pattern-active','score-pending');});
        $('score-line-label').textContent=`${activation.type.toUpperCase()}${result.scoringGroups.length>1?` ${lineIndex}/${result.scoringGroups.length}`:''}`;
        const trigger=document.querySelector(`[data-joker="${activation.trigger}"]`);
        pulseBackground();
        // Light this entire group while its trigger card announces it, before any points.
        await animateRetriggers(activation.retriggers,trigger,color);
        await cardImpact(trigger,`SCORE ${activePattern.length}`,color,true);
        await Promise.all(activePattern.map(target=>scoreLink(trigger,target,color)));
        releaseCard(trigger);
        await wait(70);
      }
      cell.classList.add('activating','charged');
      navigator.vibrate?.(12);
      const tileImpact=animate(cell,reduced?[{opacity:.75},{opacity:1}]:[
        {transform:'scale(1)'},{transform:'scale(1.03,.94)',offset:.15},
        {transform:'translateY(-5px) scale(1.1)',offset:.35},
        {transform:'translateY(1px) scale(.98,1.02)',offset:.7},{transform:'scale(1)'}
      ],{duration:300,easing:'linear'});
      const r=cell.getBoundingClientRect(),point=document.createElement('span');
      point.className='activation-point';point.style.color=color;point.style.left=`${r.left+r.width/2}px`;point.style.top=`${r.top+r.height/2}px`;
      point.style.transform='translate(-50%,-65%)';point.textContent='0';point.hidden=true;$('effects').append(point);
      let tilePoints=0;
      for(const contribution of activation.contributions){
        const card=document.querySelector(`[data-joker="${contribution.joker}"]`),calls=contribution.calls;
        const accent=contribution.joker==='face-value'?'#91c6ff':calls!==undefined?'#83e0b5':'#f4c66c';
        const label=calls!==undefined?(calls?'+1 PLAY':'15 MAX'):signed(contribution.points);
        await animateRetriggers(contribution.retriggers,card,accent);
        await cardImpact(card,label,accent);
        await scoreLink(card,cell,accent);
        if(calls!==undefined){
          const meter=$('play-ball'),to=meter.getBoundingClientRect(),token=document.createElement('span');
          token.className='activation-point call-point';token.textContent=label;token.style.left=`${r.left+r.width/2}px`;token.style.top=`${r.top}px`;$('effects').append(token);
          await animate(token,[{transform:'translate(-50%,-100%)',opacity:1},{transform:`translate(calc(-50% + ${to.left+to.width/2-r.left-r.width/2}px),${to.top-r.top}px) scale(.5)`,opacity:0}],{duration:220});
          token.remove();displayedCalls+=calls;renderCalls(displayedCalls);
        }else{
          tilePoints+=contribution.points;point.hidden=false;point.textContent=signed(tilePoints);
          await animate(point,reduced?[{opacity:.7},{opacity:1}]:[{transform:'translate(-50%,-65%) scale(.7)',opacity:.7},{transform:'translate(-50%,-95%) scale(1.28)',opacity:1,offset:.35},{transform:'translate(-50%,-85%) scale(1)',opacity:1}],{duration:170,easing:'cubic-bezier(.2,.8,.3,1)'});
        }
        releaseCard(card);
      }
      await tileImpact;
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
      displayedScore+=activation.points;total+=activation.points;
      renderScore(displayedScore);
      await animate($('score'),reduced?[{opacity:.75},{opacity:1}]:[{transform:'scale(1.22,1.08) rotate(-2deg)'},{transform:'scale(.97,1.03)',offset:.55},{transform:'scale(1)'}],{duration:130});
      cell.classList.remove('activating');
    }
    $('score-line-label').textContent=result.activations.some(a=>a.contributions.length)?'SCORED':'NO POINTS RULE';
    if(total>0){pulseBackground();navigator.vibrate?.([15,25,25]);burst($('score').getBoundingClientRect(),true);}
    await animate(readout,reduced?[{opacity:.85},{opacity:1}]:[{transform:'scale(1)'},{transform:'scale(1.08) rotate(-1deg)',offset:.25},{transform:'scale(1)',offset:.65},{transform:'scale(1)'}],{duration:360});
    await wait(600);
    const names=result.scoringGroups.map(g=>['cross','all'].includes(g.type)?cardDetails(g.trigger).name:PATTERN_TYPES.find(type=>type.id===g.type).label);
    $('announcer').textContent=`${names.join(', ')}. ${result.activations.length} spaces activated for ${result.points} points.`;
  }finally{
    rack.classList.remove('scoring-rack');board.classList.remove('scoring-board');area.classList.remove('scoring-draw');readout.classList.remove('scoring-total');$('score-line-label').hidden=true;
    rack.querySelectorAll('.scoring-card').forEach(releaseCard);
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
    cell.classList.remove('stamped','bomb-item','die-item','hundred-item','rock-item','seed-item','just-stamped');cell.querySelector('span').textContent='';
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
  const board=$('board'),source=$(`cell-${result.tile}`),changes=result.valueChanges;
  board.classList.add('value-effects');source.classList.add('effect-source');
  const targets=changes.map(change=>$(`cell-${change.tile}`));
  targets.forEach(cell=>cell.classList.add('value-target'));
  try{
    pulseBackground();
    await animate(source,reduced?[{opacity:.7},{opacity:1}]:[{transform:'scale(1)'},{transform:'scale(.94)',offset:.2},{transform:'scale(1.13) rotate(-3deg)',offset:.5},{transform:'scale(1)'}],{duration:300});
    await Promise.all([...new Set(changes.map(c=>c.tile))].map(async(tile,index)=>{
      for(const change of changes.filter(c=>c.tile===tile)){
      const cell=$(`cell-${change.tile}`),face=cell.querySelector('span'),color=change.delta<0?'#ffaf94':'#99e6bb';
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
  await animate(ink,[{opacity:.5},{opacity:1,transform:'scale(1.4)',offset:.5},{opacity:.7,transform:'scale(1)'}],{duration:250});
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
async function play(n,b,ghost,tile=state.destinations[n]){
  if(busy){ghost?.remove();return;}lock();const result=choose(state,n,tile);if(!result){ghost?.remove();unlock();return;}
  saveRun();renderCalls(result.callsBeforeBonuses);$('bag-count').textContent=state.bag.size;
  const cell=$(`cell-${tile}`),r=cell.getBoundingClientRect();b.style.visibility='hidden';document.querySelectorAll('#balls .ball').forEach(other=>{if(other!==b)other.classList.add('leave');});
  if(ghost&&state.items[n]==='hundred'){ghost.remove();ghost=null;}
  if(ghost){const size=parseFloat(ghost.style.getPropertyValue('--size'));await animate(ghost,[{transform:ghost.style.transform},{transform:`translate(${r.left+(r.width-size)/2}px,${r.top+(r.height-size)/2}px) scale(.72) rotate(-12deg)`}],{duration:190,easing:'cubic-bezier(.15,.8,.25,1)'});ghost.remove();}
  document.querySelectorAll('.cell.offered').forEach(c=>{c.className='cell paint-grey';c.querySelector('span').textContent='';});
  // Board stamps leave ink, never a temporary occupied ball face.
  if(!result.stampApplied){
  cell.className=`cell paint-grey upgrade-${state.upgrades[n]||'plain'}${itemClass(n)} stamped just-stamped`;cell.querySelector('span').textContent=pieceFace(n);cell.classList.toggle('large-value',String(pieceFace(n)).length>2);
  }
  if(state.items[n]==='hundred')await dropAnvil(n,cell);
  pulseBackground();navigator.vibrate?.(18);burst(r);
  await animate(document.querySelector('.board-frame'),[{transform:'translateY(0)'},{transform:'translateY(3px)'},{transform:'translate(-1px,-1px)'},{transform:'translate(0,0)'}],{duration:190});
  await wait(180);
  render(result.effectBoard||state);if(result.roll!==null)cell.querySelector('span').textContent='?';renderCalls(result.callsBeforeBonuses);renderScore(state.score-result.points);
  if(result.roll!==null)await rollDie(cell,result.roll);
  for(const copy of result.copies||[])await animateCopy(copy);
  if(result.stampApplied){const ink=cell.querySelector('.board-ink');await animate(ink,[{transform:'scale(2) rotate(-12deg)',opacity:0},{transform:'scale(.9)',opacity:1,offset:.6},{transform:'scale(1)',opacity:.65}],{duration:400});}
  if(result.valueChanges.length)await animateValueChanges(result);
  $('announcer').textContent=`${pieceLabel(n)} played.${result.roll!==null?` Rolled ${result.roll}.`:''} ${result.playCost===0?'No play used.':'One play used.'}`;
  if(result.destroyed.length){await explodeBomb(result);render();renderScore(state.score-result.points);}
  if(result.activations.length)await activateSpaces(result);
  await wait(120);render();refreshBag();
  if(state.status!=='playing'){showResult();return;}await nextDraw();
}
function showStages(){hideTooltip();$('stage-grid').innerHTML=Array.from({length:10},(_,i)=>{const n=i+1,current=n===state.stage,done=n<state.stage;return `<div class="stage-node ${current?'current':done?'complete':'locked'}" ${current?'aria-current="step"':''} aria-label="Stage ${n}, ${current?'current':done?'completed':'locked'}"><span>${n}<small>${STAGE_TARGETS[i].toLocaleString()} pts</small></span>${current?'<span>◆</span>':done?'<span>✓</span>':'<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'}</div>`;}).join('');$('stage-dialog').showModal();}
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
  if(state.status==='passed'&&state.stage<10){showShop();return;}
  $('continue').disabled=false;$('result-menu').disabled=false;
  $('result-actions').hidden=false;
  $('bag').disabled=false;$('stages').disabled=false;
}
async function cashInCall(dot,index,before,onArrival,payout=true){
  const from=$('play-ball').getBoundingClientRect(),to=document.querySelector('.money-panel').getBoundingClientRect();
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
  navigator.vibrate?.(8);
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
    const dot=$('call-dots').children[Math.min(14,Math.floor((bonus-i-1)/state.callCapacity*15))];
    flights.push(cashInCall(dot,i,before,()=>++collected));
    renderCalls(bonus-i-1);
    await wait(110);
  }
  await Promise.all(flights);
  document.querySelector('.call-meter').setAttribute('aria-label',`${bonus} unused plays converted to dollars`);

  $('announcer').textContent=`${bonus} unused plays paid $${bonus}. Balance $${state.money}.`;
  await wait(250);
  finishResult();
}
$('continue').onclick=async()=>{if(payingOut)return;const next=state.status==='passed'&&state.stage<10?state.stage+1:1;state=newStage(next,next===1?5:state.money,next===1?{}:state.upgrades,next===1?{}:state.patternCounts,next===1?undefined:state.jokers,next===1?null:state);hasRun=true;saveRun();resetResultUI();await nextDraw();};
function playOfferedBall(){
  if(busy||drag||jokerDrag||state.status!=='playing'||!state.offer.length)return;
  const n=state.offer[0],b=$('balls').querySelector(`[data-number="${n}"]`);if(!b)return;
  const r=b.getBoundingClientRect(),ghost=b.cloneNode(true);ghost.className=b.className.replace(/enter|leave/g,'')+' drag-ghost';ghost.removeAttribute('data-number');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--size',`${r.width}px`);ghost.style.transform=`translate(${r.left}px,${r.top}px)`;document.body.append(ghost);
  play(n,b,ghost);
};
async function passTurn(ghost=null){
  if(busy||drag||state.passes<1||state.status!=='playing'){ghost?.remove();return;}
  const b=ghost?$('balls').querySelector(`[data-number="${ghost.dataset.number}"]`):$('balls').firstElementChild,r=b?.getBoundingClientRect();
  if(!ghost&&b){ghost=b.cloneNode(true);ghost.classList.add('drag-ghost');ghost.classList.remove('enter');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('--size',`${r.width}px`);ghost.style.transform=`translate(${r.left}px,${r.top}px)`;document.body.append(ghost);}
  lock();if(!redraw(state)){ghost?.remove();unlock();return;}saveRun();$('redraw-cost').textContent=state.passes;if(b)b.style.visibility='hidden';
  document.querySelectorAll('#balls .ball').forEach(ball=>ball.classList.add('leave'));
  if(ghost){const to=$('bag').getBoundingClientRect(),size=parseFloat(ghost.style.getPropertyValue('--size'));await animate(ghost,[{transform:ghost.style.transform,opacity:1},{transform:`translate(${to.left+(to.width-size)/2}px,${to.top}px) scale(.15) rotate(90deg)`,opacity:0}],{duration:330,easing:'cubic-bezier(.4,0,.8,.4)'});ghost.remove();}
  animate($('bag'),[{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:190});render();showBalls();await wait(770);unlock();$('announcer').textContent=`Passed. ${state.passes} passes and ${state.calls} plays remaining.`;
}
document.addEventListener('keydown',e=>{if(inMenu||shopping||busy||document.querySelector('dialog[open]')||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowDown'){e.preventDefault();passTurn();}else if(e.key==='ArrowUp'){e.preventDefault();playOfferedBall();}});
$('bag').onclick=()=>{hideTooltip();refreshBag();$('bag-dialog').showModal();};$('stages').onclick=showStages;
$('patterns-button').onclick=showPatterns;$('score-patterns').onclick=showPatterns;
for(const dialog of document.querySelectorAll('#bag-dialog,#stage-dialog,#help-dialog,#patterns-dialog')){dialog.addEventListener('close',hideTooltip);dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('pointerdown',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});}


const shopCopy={
  crowd:'Scored tiles: +1 per board item',
  'silver-lining':'Negative scores: +30',
  'full-sweep':'Score all · once per round',
  encore:'Retrigger the card to the right',
  'high-five':'Play 1–5: score it + 4 neighbors',
  seed:'Starts at 1 · grows with each play',
  bomb:'Destroy itself + 8 neighboring pieces',
  d20:'Roll 1–20 when placed',
  hundred:'Worth 50 · crush 4 neighbors by 1',
  rock:'Free play · scores 0',
  copier:'Play here → copy into bag',
  x2:'×2 tile points · permanent',
  x3:'×3 tile points · permanent'
};
function renderShop(){
  hideTooltip();$('money').textContent=state.money;
  const shelf=$('shop-shelf'),focused=document.activeElement?.id;
  shelf.innerHTML='<section class=reward-row aria-label=Cards><h3>CARDS</h3><div id=shop-cards class=reward-options></div></section><section class=reward-row aria-label=Tokens><h3>TOKENS</h3><div id=shop-tokens class=reward-options></div></section>';
  const full=state.jokers.filter(id=>!isRuleCard(id)).length>=5;
  for(const type of [...state.shopOffer.cards,...state.shopOffer.items].filter(Boolean)){
    const definition=CARD_TYPES[type]||ITEM_TYPES[type];
    const isCard=Object.hasOwn(CARD_TYPES,type),item=isCard?cardDetails(type):definition,index=state.shopOffer.cards.indexOf(type),sold=isCard&&index<0;
    const card=document.createElement('button');card.id=`shop-${type}`;card.className=`shop-product${isCard?' shop-rule-card':''}`;
    if(isCard)card.dataset.shopCard=type;
    const owned=isCard?state.jokers.filter(id=>cardType(id)===type).length:state.collection.filter(id=>state.items[id]===type).length;
    const action=sold?'ADDED':isCard&&full?'5 / 5 CARDS':'FREE · CHOOSE';
    card.disabled=busy||sold||(isCard&&full);card.setAttribute('aria-label',`${item.name}. ${item.text} ${action}. ${owned} owned.`);
    const art=isCard?`<i class="shelf-joker-art" aria-hidden="true">${item.icon}</i>`:type==='hundred'?'<i class="hundred-art" aria-hidden="true">50</i>':`<i class="${type==='d20'?'die-art':`${type}-art`}" aria-hidden="true">${type==='copier'?'▣':type==='d20'?'?':type==='seed'?'1':['x2','x3'].includes(type)?`×${type.slice(1)}`:''}</i>`;
    card.innerHTML=`<strong class="product-name">${item.name.toUpperCase()}</strong>${art}<span class="product-description">${shopCopy[type]||item.short||item.text}</span><span class="product-owned"><span id="${type==='bomb'?'shop-item-count':`shop-${type}-count`}">${owned}</span> OWNED</span><b class="product-action">${action}</b>`;
    card.onclick=async()=>{
      if(busy||!claimReward(state,type))return;
      busy=true;saveRun();shelf.querySelectorAll('button').forEach(b=>b.disabled=true);$('shop-menu').disabled=true;
      $('announcer').textContent=`${item.name} chosen. Next round.`;
      await animate(card,[{transform:'scale(.96)'},{transform:'scale(1.06)',offset:.4},{transform:'scale(1)',opacity:.4}],{duration:400});
      await finishShop();
    };
    $(isCard?'shop-cards':'shop-tokens').append(card);
  }
  if(focused?.startsWith('shop-')&&$(focused)&&!$(focused).disabled)$(focused).focus({preventScroll:true});
  $('shop-menu').disabled=busy;
}
function showShop(){
  openShop(state);if(state.shopOffer.claimed){finishShop();return;}shopping=true;busy=false;
  $('patterns-button').disabled=false;$('score-patterns').disabled=false;
  hideTooltip();$('game-screen').classList.add('shopping');$('shop-screen').hidden=false;
  $('bag').disabled=false;$('stages').disabled=false;renderShop();saveRun();
  animate($('shop-screen'),[{transform:'translateY(24px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:350,easing:'cubic-bezier(.2,.8,.3,1)'});
}
async function finishShop(){
  hideTooltip();shopping=false;$('game-screen').classList.remove('shopping');$('shop-screen').hidden=true;
  state=newStage(state.stage+1,state.money,state.upgrades,state.patternCounts,state.jokers,state);saveRun();await nextDraw();
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
    const numbers=a=>Array.isArray(a)&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=25)&&new Set(a).size===a.length;
    const ids=a=>Array.isArray(a)&&a.every(n=>Number.isSafeInteger(n)&&n>=1&&n<saved.nextItemId)&&new Set(a).size===a.length;
    if(!Number.isSafeInteger(saved.nextItemId)||saved.nextItemId<26||saved.nextItemId>10000||!ids(saved.collection)||!saved.items||Array.isArray(saved.items)||!Object.entries(saved.items).every(([id,type])=>Number.isInteger(Number(id))&&Number(id)>=26&&Number(id)<saved.nextItemId&&Object.hasOwn(ITEM_TYPES,type))||!saved.collection.every(id=>id<=25||saved.items[id]||Object.hasOwn(saved.ballValues||{},id)))throw new Error('Invalid collection');
    if(!Number.isInteger(saved.stage)||saved.stage<1||saved.stage>10||!numbers(saved.stamps)||!ids(saved.bag)||!ids(saved.offer)||!saved.bag.every(id=>saved.collection.includes(id))||!saved.offer.every(n=>saved.bag.includes(n))||!Number.isInteger(saved.calls)||saved.calls<0||saved.calls>192||!Number.isInteger(saved.money)||saved.money<0||!Number.isInteger(saved.score)||!['playing','passed','over'].includes(saved.status)||!Array.isArray(saved.played)||saved.played.length<26||saved.played.length>saved.nextItemId)throw new Error('Invalid save');
    const old=saved.rulesVersion!==3;
    delete saved.paints;delete saved.goldSeals;
    const oldTurn=saved.turnVersion!==1;
    if(oldTurn){if(saved.status==='playing')saved.calls=Math.max(0,15-Math.max(0,(saved.callCapacity??12)-saved.calls));saved.passes=10;}
    saved.calls=Math.min(saved.calls,15);saved.callCapacity=15;saved.turnVersion=1;
    if(!Number.isInteger(saved.passes)||saved.passes<0||saved.passes>10)throw new Error('Invalid passes');
    migrateShop(saved);
    if(!Number.isInteger(saved.callCapacity)||saved.callCapacity<15||saved.callCapacity>192||saved.calls>saved.callCapacity)throw new Error('Invalid call capacity');
    if(old){
      saved.upgrades={};saved.shopOffer=null;
      saved.jokers=normalizeJokers(saved.jokers).filter(id=>id==='bingo');
      saved.stampValues=Object.fromEntries(Object.entries(saved.stampBalls||{}));
    }
    saved.upgrades??={};
    if(!old&&saved.upgradeVersion!==2){
      for(const n of Object.keys(saved.upgrades))if(saved.upgrades[n]==='dynamite')saved.upgrades[n]='tornado';
      if(saved.shopOffer?.balls)saved.shopOffer.balls=saved.shopOffer.balls.map(type=>type==='dynamite'?'tornado':type);
    }
    saved.upgradeVersion=2;
    saved.tileStamps??=Object.fromEntries(Array.from({length:25},(_,i)=>[i+1,tileStampList(saved,i+1)]).filter(([,list])=>list.length));
    if(typeof saved.tileStamps!=='object'||Array.isArray(saved.tileStamps)||!Object.entries(saved.tileStamps).every(([tile,list])=>Number.isInteger(Number(tile))&&Number(tile)>=1&&Number(tile)<=25&&Array.isArray(list)&&list.every(type=>['x2','x3','copier'].includes(type))))throw new Error('Invalid tile stamps');
    saved.tileCopiers??={};
    if(typeof saved.tileCopiers!=='object'||Array.isArray(saved.tileCopiers)||!Object.entries(saved.tileCopiers).every(([tile,value])=>Number.isInteger(Number(tile))&&Number(tile)>=1&&Number(tile)<=25&&value===true))throw new Error('Invalid copier tiles');
    saved.tileMultipliers??={};
    if(typeof saved.tileMultipliers!=='object'||Array.isArray(saved.tileMultipliers)||!Object.entries(saved.tileMultipliers).every(([tile,value])=>Number.isInteger(Number(tile))&&Number(tile)>=1&&Number(tile)<=25&&Number.isSafeInteger(value)&&value>=1))throw new Error('Invalid tile multipliers');
    saved.valueModifiers??={};
    if(typeof saved.valueModifiers!=='object'||Array.isArray(saved.valueModifiers)||!Object.entries(saved.valueModifiers).every(([id,value])=>saved.collection.includes(Number(id))&&Number.isSafeInteger(value)))throw new Error('Invalid value modifiers');
    saved.ballValues??={};
    for(const [tile,id] of Object.entries(saved.stampBalls||{}))if(saved.items[id]==='hundred')saved.stampValues[tile]=ballValue(saved,Number(id));
    if(typeof saved.ballValues!=='object'||Array.isArray(saved.ballValues)||!Object.entries(saved.ballValues).every(([n,value])=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<saved.nextItemId&&saved.collection.includes(Number(n))&&Number.isSafeInteger(value)))throw new Error('Invalid ball values');
    if(typeof saved.upgrades!=='object'||Array.isArray(saved.upgrades)||!Object.entries(saved.upgrades).every(([n,type])=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=25&&BALL_UPGRADES[type]))throw new Error('Invalid upgrades');
    if(saved.shopOffer!=null&&(!['cards','balls'].every(kind=>Array.isArray(saved.shopOffer[kind])&&saved.shopOffer[kind].length===2&&saved.shopOffer[kind].every(type=>type===null||(kind==='cards'?cardDetails(type):BALL_UPGRADES[type])))||saved.status!=='passed'||!saved.bonusPaid))throw new Error('Invalid shop');
    if(saved.shopOffer?.items&&!saved.shopOffer.items.every(type=>Object.hasOwn(ITEM_TYPES,type)))throw new Error('Invalid shop items');
    saved.scoredLines=Array.isArray(saved.scoredLines)?[...new Set(saved.scoredLines.filter(id=>typeof id==='string'&&/^(row-[1-5]|column-[1-5]|diagonal-[12])$/.test(id)))]:[];
    saved.jokers=normalizeJokers(saved.jokers);
    // Add the newly introduced rule once; an intentionally trashed rule stays removed.
    if(saved.jokerVersion!==4&&!saved.jokers.includes('face-value'))saved.jokers.push('face-value');
    saved.jokers=normalizeJokers(saved.jokers);saved.jokerVersion=4;
    saved.patternCounts=Object.fromEntries(PATTERN_TYPES.map(({id})=>[id,Number.isSafeInteger(saved.patternCounts?.[id])&&saved.patternCounts[id]>=0?saved.patternCounts[id]:0]));
    if(saved.rulesVersion!==2&&saved.rulesVersion!==3){
      state=newStage(saved.stage,saved.money,{},saved.patternCounts,saved.jokers);
      if(saved.status==='passed'){state.status='passed';state.bonusPaid=saved.bonusPaid;state.calls=saved.calls;state.callCapacity=saved.callCapacity;state.score=state.target;}
    }else{
      const {stampBalls,destinations,stampValues}=saved;
      if(!stampBalls||typeof stampBalls!=='object'||Array.isArray(stampBalls)||!destinations||typeof destinations!=='object'||Array.isArray(destinations)||!stampValues||typeof stampValues!=='object'||Array.isArray(stampValues))throw new Error('Invalid placements');
      if(Object.keys(stampBalls).length!==saved.stamps.length||!ids(Object.values(stampBalls))||!saved.stamps.every(tile=>stampBalls[tile]&&saved.collection.includes(stampBalls[tile])&&!saved.bag.includes(stampBalls[tile])))throw new Error('Invalid stamps');
      if(Object.keys(stampValues).length!==saved.stamps.length||!saved.stamps.every(tile=>stampValues[tile]===null||Number.isSafeInteger(stampValues[tile])))throw new Error('Invalid values');
      if(Object.keys(destinations).length!==saved.offer.length||!numbers(Object.values(destinations))||!saved.offer.every(n=>destinations[n]&&!saved.stamps.includes(destinations[n])))throw new Error('Invalid destinations');
      state={...newStage(saved.stage,saved.money),...saved,rulesVersion:3,target:STAGE_TARGETS[saved.stage-1],stamps:new Set(saved.stamps),bag:new Set(saved.bag)};
    }
    if(oldTurn&&state.status==='playing'){state.offer=[];state.destinations={};}
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
  hideTooltip();cancelDrag();cancelJokerDrag();saveRun();
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
  if(shopping&&!busy){showMenu();return;}
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('dialog[open]')&&!inMenu){e.preventDefault();pauseGame();}});
window.addEventListener('pagehide',saveRun);
loadRun();updateMenu();
