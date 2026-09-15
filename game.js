export const PATTERN_TYPES = [
  {id:'square',label:'2×2 square',previewTiles:[7,8,12,13],tileCount:4},
  {id:'corners',label:'Four corners',previewTiles:[1,5,21,25],tileCount:4},
  {id:'row',label:'5 in a row',previewTiles:[11,12,13,14,15],tileCount:5},
  {id:'column',label:'5 in a col',previewTiles:[3,8,13,18,23],tileCount:5},
  {id:'diagonal',label:'Diagonals',previewTiles:[1,7,13,19,25],tileCount:5},
];
export const PATTERN_DEFINITIONS = [
  ...Array.from({length:5},(_,r)=>({id:`row-${r+1}`,type:'row',tiles:Array.from({length:5},(_,c)=>r*5+c+1)})),
  ...Array.from({length:5},(_,c)=>({id:`column-${c+1}`,type:'column',tiles:Array.from({length:5},(_,r)=>r*5+c+1)})),
  {id:'diagonal-1',type:'diagonal',tiles:[1,7,13,19,25]},
  {id:'diagonal-2',type:'diagonal',tiles:[5,9,13,17,21]},
];
export const EXTRA_PATTERNS=[...Array.from({length:16},(_,i)=>{const t=Math.floor(i/4)*5+i%4+1;return {id:`square-${i+1}`,type:'square',tiles:[t,t+1,t+5,t+6]};}),{id:'corners-1',type:'corners',tiles:[1,5,21,25]}];
export const PATTERNS = PATTERN_DEFINITIONS.map(pattern=>pattern.tiles);
export const freshPatternCounts=()=>Object.fromEntries(PATTERN_TYPES.map(({id})=>[id,0]));
export const completedPatterns=stamps=>PATTERN_DEFINITIONS.filter(({tiles})=>tiles.every(tile=>stamps.has(tile)));
export const targetFor = stage => 30+(stage-1)*10;
export const STAGE_TARGETS = Array.from({length:10},(_,i)=>targetFor(i+1));
export const RULE_CARDS={
  bingo:{name:'Bingo',text:'Score rows, columns, and diagonals of 5.',icon:'▦'},
  'face-value':{name:'Face Value',text:'Scored tiles earn their ball’s number in points.',icon:'#'}
};
export const isRuleCard=id=>Object.hasOwn(RULE_CARDS,id);
// Add new definitions here as the shop grows. Empty slots cannot be purchased.
export const CARD_TYPES={square:{name:'Square',text:'Score each completed 2×2 block of four items. Each block scores once per round.',icon:'▦',short:'Score 2×2 blocks'},corners:{name:'Four Corners',text:'When all four corners are filled, score every occupied tile on the board. Once per round.',icon:'⌗',short:'4 corners → score all'},crowd:{name:'Crowd',text:'Each scored tile earns +1 point for every item on the board. Tile stamps do not count.',icon:'•••',short:'+1 per board item'},'silver-lining':{name:'Silver Lining',text:'Scored negative numbers earn +30 extra points. Their negative value still applies.',icon:'+30',short:'Negative → +30'},'full-sweep':{name:'Full Sweep',text:'Activate once per round to score every occupied tile using your point cards. Costs no play.',icon:'▦',short:'USE · Score all',active:true},encore:{name:'Encore',text:'Retrigger the card immediately to the right. No effect without a card to its right.',icon:'↻',short:'Retrigger right →'},'high-five':{name:'High Five',text:'Play a 1–5, including a die roll, to score it and its occupied orthogonal neighbors.',icon:'✚',short:'Play 1–5: score ✚'}};
export const BALL_UPGRADES={};
export const ITEM_TYPES={doubleball:{name:'×2 Ball',text:'x2 to total bingo score',details:'Scores 0 itself. Tile stamps affect only its tile; this ball multiplies the whole bingo. Multiple ×2 balls multiply together.',startingValue:0,price:0},
  trash:{name:'Trash Stamp',text:'When played: permanently stamp this space. When scored: destroy its item. One use.',details:'Points and Copier effects resolve before destruction. The stamp stays.',startingValue:null,price:0},
  statue:{name:'Statue',text:'When played: stays on this space between rounds.',details:'Bombs and Trash stamps can destroy it.',startingValue:10,price:0},
  king:{name:'Wandering King',text:'On the board, after another item is played: move to a random empty adjacent space.',details:'Moves one space horizontally, vertically, or diagonally. Bingos score before and after it moves. Stays still if blocked. Passing does not move it.',startingValue:10,price:0},
  question:{name:'Question Mark',text:'When played: swap places with a random item in the bag.',details:'Excludes stamps and other Question Marks. The replacement’s when-played effect does not activate.',startingValue:'?',price:0},
  ...Object.fromEntries([10,50,100].map(n=>[`plus${n}`,{name:`+${n} Stamp`,text:`When played: permanently stamp a +${n} point modifier onto this tile. One use.`,details:'Adds points when this space scores, before multipliers. Leaves the space empty.',startingValue:null,price:0}])),
  copier:{name:'Copier Stamp',text:'When played: permanently stamp this space. When scored: copy its item into the bag. One use.',details:'Each Copier makes one copy. The original stays on the board unless destroyed.',startingValue:null,price:0},
  x2:{name:'×2 Stamp',text:'When played: permanently double this tile’s score. One use.',details:'Multiplies this tile’s score when scored. Stacks with other stamps.',startingValue:null,price:0},
  x3:{name:'×3 Stamp',text:'When played: permanently triple this tile’s score. One use.',details:'Multiplies this tile’s score when scored. Stacks with other stamps.',startingValue:null,price:0},
  seed:{name:'Seed',text:'On the board, after another item is played: permanently gain +1 value.',details:'Grows before scoring. Passing does not grow it.',startingValue:1,price:0},
  bomb:{name:'Bomb',text:'When played: destroy itself and all items in the 8 adjacent spaces.',details:'Destroyed items leave the run permanently. Stamps remain. Explodes before scoring.',startingValue:0,price:0},
  d20:{name:'20-Sided Die',text:'When played: gain a random value from 1–20.',details:'Keeps its rolled value for the round. Permanent value changes also affect future rolls.',startingValue:'?',price:0},
  hundred:{name:'Anvil',text:'When played: permanently give −1 value to the 4 orthogonal neighbors.',details:'Affects the spaces above, below, left, and right before scoring. Only numbered items are affected.',startingValue:50,price:0},
  rock:{name:'Rock',text:'Free to play.',details:'Uses no play. Fills a space for bingos, but has no number.',startingValue:0,price:0}
};

export const stampFactor=(state,id)=>state.items?.[id]==='x2'?2:state.items?.[id]==='x3'?3:1;
export const isStamp=(state,id)=>['x2','x3','copier','trash','plus10','plus50','plus100'].includes(state.items?.[id]);
export function tileStampList(state,tile){
  if(state.tileStamps?.[tile])return state.tileStamps[tile];
  const list=state.tileCopiers?.[tile]?['copier']:[];let value=state.tileMultipliers?.[tile]||1;
  for(const [factor,type] of [[2,'x2'],[3,'x3']])while(value>1&&value%factor===0){list.push(type);value/=factor;}
  return list;
}
export const isRock=(state,id)=>state.items?.[id]==='rock';
export const isDie=(state,id)=>state.items?.[id]==='d20';
export const isBomb=(state,id)=>state.items?.[id]==='bomb';
export const cardType=id=>id.split(':')[0];
export function cardDetails(id){
  if(typeof id!=='string')return null;
  const type=cardType(id),base=RULE_CARDS[id]||CARD_TYPES[type];if(!base)return null;
  if(type==='high-five'){
    const match=id.match(/:range(\d+)(?::|$)/),start=match?Number(match[1]):1;
    if(start<1||start>16)return null;
    const range=`${start}–${start+4}`;
    return {...base,price:0,start,end:start+4,range,text:`Play a ${range}, including a die roll, to score it and its occupied orthogonal neighbors.`,short:`Play ${range}: score ✚`};
  }
  return {...base,price:0};
}
export const normalizeJokers=jokers=>{
  if(!Array.isArray(jokers))return ['bingo','face-value'];
  let purchased=0;
  return [...new Set(jokers.map(id=>['row','column','diagonal'].includes(id)?'bingo':id))].filter(id=>{
    if(typeof id!=='string')return false;
    if(isRuleCard(id))return true;
    return CARD_TYPES[cardType(id)]&&cardDetails(id)&&purchased++<5;
  });
};
export const ballValue=(state,number)=>number==null||state.items?.[number]==='doubleball'||state.items?.[number]==='question'||isBomb(state,number)||isDie(state,number)||isRock(state,number)||isStamp(state,number)?null:((state.ballValues?.[number]??(['king','statue'].includes(state.items?.[number])?10:state.items?.[number]==='hundred'?50:state.items?.[number]==='seed'?1:number))+(state.valueModifiers?.[number]||0));
const boardSnapshot=state=>({stamps:new Set(state.stamps),stampBalls:{...state.stampBalls},stampValues:{...state.stampValues}});
export const orthogonalNeighbors=tile=>[tile-5,tile+1,tile+5,tile-1].filter(t=>t>=1&&t<=25&&Math.abs(Math.floor((t-1)/5)-Math.floor((tile-1)/5))+Math.abs((t-1)%5-(tile-1)%5)===1);
// Effects produce a common before/after event for the UI, independent of scoring.
export function changeTileValue(state,tile,delta,source){
  const before=state.stampValues[tile];if(!state.stamps.has(tile)||!Number.isSafeInteger(before))return null;
  const id=state.stampBalls[tile],after=before+delta;
  state.valueModifiers??={};state.valueModifiers[id]=(state.valueModifiers[id]||0)+delta;state.stampValues[tile]=after;
  return {source,tile,id,before,after,delta};
}
// The app's testing preset; existing inventories carry forward unchanged.
export function defaultBag(){
  const collection=Array.from({length:25},(_,i)=>i+1),items={};let nextItemId=26;
  for(const type of Object.keys(ITEM_TYPES))for(let copy=0;copy<5;copy++){
    const id=nextItemId++;collection.push(id);items[id]=type;
  }
  return {collection,items,nextItemId};
}
export function newStage(stage=1,money=5,upgrades={},patternCounts={},jokers=['bingo','face-value'],inventory=null) {
  const collection=inventory?[...inventory.collection]:Array.from({length:25},(_,i)=>i+1),items={...inventory?.items},nextItemId=inventory?.nextItemId??26;
  const fixed=Object.entries(inventory?.stampBalls||{}).filter(([,id])=>items[id]==='statue'&&collection.includes(id));
  const stampBalls=Object.fromEntries(fixed),stampValues=Object.fromEntries(fixed.map(([tile,id])=>[tile,inventory.stampValues?.[tile]??ballValue(inventory,id)]));
  const fixedIds=new Set(fixed.map(([,id])=>id));
  return {tileStamps:Object.fromEntries(Array.from({length:25},(_,i)=>[i+1,[...tileStampList(inventory||{},i+1)]]).filter(([,list])=>list.length)),tileCopiers:{...inventory?.tileCopiers},tileMultipliers:{...inventory?.tileMultipliers},activeUses:{},inventoryVersion:1,collection,items,nextItemId,shopVersion:1,turnVersion:1,passes:10,rulesVersion:3,upgradeVersion:2,ballValues:{...inventory?.ballValues},valueModifiers:{...inventory?.valueModifiers},jokerVersion:4,scoredLines:[],jokers:normalizeJokers(jokers),patternCounts:{...freshPatternCounts(),...patternCounts},stampBalls,stampValues,destinations:{},upgrades:Object.fromEntries(Object.entries(upgrades).filter(([,type])=>Object.hasOwn(BALL_UPGRADES,type))),callCapacity:17,shopOffer:null,stage,target:targetFor(stage),score:0,calls:17,money,bonusPaid:false,stamps:new Set(fixed.map(([tile])=>Number(tile))),bag:new Set(collection.filter(id=>!fixedIds.has(id))),played:Array(nextItemId).fill(0),status:collection.length?'playing':'over',offer:[]};
}
const shuffled=(values,random)=>{
  const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
};
export function deal(state,random=Math.random,count=1){
  const empty=Array.from({length:25},(_,i)=>i+1).filter(tile=>!state.stamps.has(tile));
  state.offer=draw(state,random,Math.min(count,empty.length));
  for(let i=empty.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[empty[i],empty[j]]=[empty[j],empty[i]];}
  state.destinations=Object.fromEntries(state.offer.map((number,i)=>{const available=empty.filter(t=>!isStamp(state,number)||tileStampList(state,t).length<4);return [number,available.length?available[i%available.length]:null];}));
  return state.offer;
}
export function draw(state=newStage(),random=Math.random,count=1) {
  const bag=[...state.bag];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag.slice(0,Math.min(count,bag.length));
}
function copyOnTile(state,number,tile){
  const copies=[];
  const copyCount=tileStampList(state,tile).filter(type=>type==='copier').length;
  for(let copyIndex=0;copyIndex<copyCount;copyIndex++){
    const id=state.nextItemId++,type=state.items[number];
    if(type)state.items[id]=type;
    // Normal numbers need an explicit base value: their new ID is not their number.
    if(!type||Object.hasOwn(state.ballValues,number))state.ballValues[id]=state.ballValues[number]??number;
    if(Object.hasOwn(state.valueModifiers,number))state.valueModifiers[id]=state.valueModifiers[number];
    if(state.upgrades[number])state.upgrades[id]=state.upgrades[number];
    state.collection.push(id);state.bag.add(id);state.played[id]=0;copies.push({id,source:number,tile});
  }
  return copies;
}
export const kingNeighbors=tile=>Array.from({length:25},(_,i)=>i+1).filter(t=>t!==tile&&Math.abs(Math.floor((t-1)/5)-Math.floor((tile-1)/5))<=1&&Math.abs((t-1)%5-(tile-1)%5)<=1);
export function choose(state,number,tile=state.destinations[number],random=Math.random) {
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)||!Number.isInteger(tile)||!Object.values(state.destinations).includes(tile)||tile<1||tile>25||state.stamps.has(tile))return null;
  if(isStamp(state,number)&&tileStampList(state,tile).length>=4)return null;
  const copies=[],copied=null;
  const roll=isDie(state,number)?1+Math.floor(random()*20)+(state.valueModifiers?.[number]||0):null;
  const playCost=isRock(state,number)?0:1;
  state.stamps.add(tile);state.stampBalls[tile]=number;state.stampValues[tile]=roll??ballValue(state,number);state.bag.delete(number);state.played[number]=(state.played[number]||0)+1;state.calls-=playCost;
  let swap=null;
  if(state.items[number]==='question'){
    const available=[...state.bag].filter(id=>state.items[id]!=='question'&&!isStamp(state,id));
    if(available.length){
      const id=available[Math.floor(random()*available.length)];
      state.bag.delete(id);state.bag.add(number);state.stampBalls[tile]=id;state.played[id]=(state.played[id]||0)+1;
      state.stampValues[tile]=isDie(state,id)?1+Math.floor(random()*20)+(state.valueModifiers[id]||0):ballValue(state,id);
      swap={from:number,to:id,value:state.stampValues[tile]};
    }
  }
  const factor=stampFactor(state,number),stampApplied=isStamp(state,number)?{tile,factor,before:state.tileMultipliers?.[tile]||1}:null;
  if(stampApplied){
    const previous=tileStampList(state,tile);state.tileStamps??={};state.tileStamps[tile]=[...previous,state.items[number]];
    if(state.items[number]==='copier'){state.tileCopiers??={};state.tileCopiers[tile]=true;}
    else{state.tileMultipliers??={};state.tileMultipliers[tile]=(state.tileMultipliers[tile]||1)*factor;}
    state.stamps.delete(tile);delete state.stampBalls[tile];delete state.stampValues[tile];
    state.collection=state.collection.filter(id=>id!==number);delete state.ballValues[number];delete state.valueModifiers[number];
  }
  const seeds=[...state.stamps].filter(t=>t!==tile&&state.items[state.stampBalls[t]]==='seed');
  const effectBoard=(isBomb(state,number)||state.items[number]==='hundred'||seeds.length||[...state.stamps].some(t=>state.items[state.stampBalls[t]]==='king'&&state.stampBalls[t]!==number))?boardSnapshot(state):null,valueChanges=[];
  if(state.items[number]==='hundred')for(const neighbor of orthogonalNeighbors(tile)){
    const change=changeTileValue(state,neighbor,-1,tile);if(change)valueChanges.push(change);
  }
  for(const seed of seeds){const change=changeTileValue(state,seed,1,tile);if(change)valueChanges.push(change);}
  const destroyed=[];
  if(isBomb(state,number)){
    const row=Math.floor((tile-1)/5),col=(tile-1)%5;
    for(const occupied of [...state.stamps]){
      if(Math.abs(Math.floor((occupied-1)/5)-row)>1||Math.abs((occupied-1)%5-col)>1)continue;
      const id=state.stampBalls[occupied];destroyed.push({tile:occupied,id,value:state.stampValues[occupied]});
      state.collection=state.collection.filter(n=>n!==id);state.bag.delete(id);
      state.stamps.delete(occupied);delete state.stampBalls[occupied];delete state.stampValues[occupied];delete state.ballValues[id];delete state.valueModifiers[id];delete state.upgrades[id];
    }
  }

  const callsBeforeBonuses=state.calls,kingMoves=[],timeline=[];
  const kings=[...state.stamps].sort((a,b)=>a-b).filter(t=>state.items[state.stampBalls[t]]==='king'&&state.stampBalls[t]!==(swap?.to??number)).map(from=>({from,id:state.stampBalls[from]}));
  function evaluateAt(changedTiles,placement=false){
    const scoreBefore=state.score;
  const scoredPatterns=[...completedPatterns(state.stamps),...EXTRA_PATTERNS.filter(p=>p.tiles.every(t=>state.stamps.has(t)))].filter(p=>!state.scoredLines.includes(p.id)&&p.tiles.some(t=>changedTiles.has(t))&&(p.type==='square'||p.type==='corners'?!state.plainRules&&state.jokers.some(id=>cardType(id)===p.type):(state.plainRules||state.jokers.includes('bingo'))));
  const patterns=scoredPatterns.map(p=>p.tiles);
  for(const {type} of scoredPatterns)state.patternCounts[type]=(state.patternCounts[type]||0)+1;
  state.scoredLines.push(...scoredPatterns.map(p=>p.id));
  // Trigger cards build independent groups in rack order. Scoring a tile never
  // counts as playing it, so neighboring low numbers cannot trigger a cascade.
  // Resolve only toward the right, so Encore chains are finite. Preserve the
  // source chain for both group triggers and per-tile points animations.
  const events=cardEvents(state);
  const scoringGroups=[];
  for(const {joker,retriggers} of events){
    if(joker==='bingo'||['square','corners'].includes(cardType(joker)))scoringGroups.push(...scoredPatterns.filter(p=>joker==='bingo'?['row','column','diagonal'].includes(p.type):p.type===cardType(joker)).map(p=>({trigger:joker,retriggers,type:p.type,tiles:p.type==='corners'?[...state.stamps].sort((a,b)=>a-b):p.tiles})));
    if(cardType(joker)==='high-five'&&placement&&state.stampBalls[tile]===number&&state.stampValues[tile]>=cardDetails(joker).start&&state.stampValues[tile]<=cardDetails(joker).end){
      const neighbors=[tile,...orthogonalNeighbors(tile)].filter(t=>state.stamps.has(t));
      scoringGroups.push({trigger:joker,retriggers,type:'cross',tiles:neighbors});
    }
  }
    const scored=scoreGroups(state,scoringGroups,events,random);
    const phase={kind:'score',...scored,scoreBefore,callsBeforeBonuses,patterns,scoredPatterns,scoringGroups};
    if(scored.activations.length)timeline.push(phase);
    return phase;
  }
  // Score placement first, then each King's destination before the next King moves.
  const initial=evaluateAt(new Set([tile]),true);
  const movementBoard=boardSnapshot(state);
  for(const {from,id} of kings){
    if(state.stampBalls[from]!==id)continue; // A scoring Trash stamp may have destroyed it.
    const available=kingNeighbors(from).filter(t=>!state.stamps.has(t));
    if(!available.length){timeline.push({kind:'blocked',tile:from,id,board:boardSnapshot(state),scoreBefore:state.score});continue;}
    const to=available[Math.floor(random()*available.length)],value=state.stampValues[from],before=boardSnapshot(state),scoreBefore=state.score;
    state.stamps.delete(from);delete state.stampBalls[from];delete state.stampValues[from];
    state.stamps.add(to);state.stampBalls[to]=id;state.stampValues[to]=value;
    const move={id,from,to,value,before,after:boardSnapshot(state),copies:[]};
    kingMoves.push(move);timeline.push({kind:'move',move,scoreBefore});
    evaluateAt(new Set([to]));
  }
  const phases=timeline.filter(phase=>phase.kind==='score');
  const patterns=phases.flatMap(p=>p.patterns),scoredPatterns=phases.flatMap(p=>p.scoredPatterns),scoringGroups=phases.flatMap(p=>p.scoringGroups),activations=phases.flatMap(p=>p.activations);
  const points=phases.reduce((sum,p)=>sum+p.points,0),scoringBoard=initial.scoringBoard;

  state.offer=[];state.destinations={};
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0||state.bag.size===0||state.stamps.size===25)state.status='over';
  return {timeline,tile,swap,playedNumber:swap?.to??number,movementBoard,kingMoves,scoringBoard,copied,copies,stampApplied,playCost,roll,effectBoard,valueChanges,destroyed,callsBeforeBonuses,patterns,scoredPatterns,scoringGroups,activations,points};
}
function cardEvents(state){
  if(state.plainRules)return [{joker:'bingo',retriggers:[]},{joker:'face-value',retriggers:[]}];
  const events=[];
  function resolveCard(index,retriggers=[]){
    const joker=state.jokers[index];if(!joker)return;
    if(cardType(joker)==='encore')resolveCard(index+1,[...retriggers,joker]);
    else events.push({joker,retriggers});
  }
  state.jokers.forEach((_,index)=>resolveCard(index));
  return events;
}
function scoreGroups(state,scoringGroups,events=cardEvents(state),random=Math.random){
  const scoringBoard=boardSnapshot(state);
  const activations=scoringGroups.flatMap(group=>{
    const tiles=group.tiles.filter(tile=>state.stamps.has(tile));
    const sources=tiles.filter(tile=>state.items[state.stampBalls[tile]]==='doubleball');
    const factor=2**sources.length;
    const entries=tiles.map((tile,j)=>{
    let reveal=null;
    const current=state.stampBalls[tile];
    const number=state.stampValues[tile],bonuses=[];
    const contributions=events.flatMap(e=>cardType(e.joker)==='crowd'?[{...e,points:state.stamps.size}]:e.joker==='face-value'?[{...e,points:number??0}]:cardType(e.joker)==='silver-lining'&&Number.isFinite(number)&&number<0?[{...e,points:30}]:[]);
    const stampBonus=tileStampList(state,tile).reduce((sum,type)=>sum+(type.startsWith('plus')?Number(type.slice(4)):0),0);
    const basePoints=(state.plainRules||state.jokers.includes('face-value'))?(number??0):0;
    const id=state.stampBalls[tile],copies=copyOnTile(state,id,tile);
    const trashed=tileStampList(state,tile).includes('trash')?id:null;
    if(trashed!==null){
      state.stamps.delete(tile);delete state.stampBalls[tile];delete state.stampValues[tile];
      state.collection=state.collection.filter(n=>n!==id);state.bag.delete(id);
      delete state.valueModifiers[id];delete state.ballValues[id];
    }
    return {tile,reveal,copies,trashed,number,basePoints,bonuses,contributions,stampBonus,multiplier:state.tileMultipliers?.[tile]||1,points:(contributions.reduce((sum,c)=>sum+c.points,0)+stampBonus)*(state.tileMultipliers?.[tile]||1),trigger:group.trigger,retriggers:group.retriggers,type:group.type,pattern:j===0?tiles:null};
    });
    if(entries.length){const subtotal=entries.reduce((sum,a)=>sum+a.points,0);entries.at(-1).groupEnd={subtotal,factor,total:subtotal*factor,sources};entries.at(-1).groupBonus=subtotal*(factor-1);}
    return entries;
  });
  const points=activations.reduce((sum,a)=>sum+a.points+(a.groupBonus||0),0);state.score+=points;

  return {activations,points,scoringBoard};
}
export function activateCard(state,id,random=Math.random){
  if(state.status!=='playing'||!state.jokers.includes(id)||!cardDetails(id)?.active||state.activeUses?.[id]||!state.stamps.size)return null;
  state.activeUses??={};state.activeUses[id]=true;
  const events=cardEvents(state),tiles=[...state.stamps].sort((a,b)=>a-b);
  const scoringGroups=events.filter(e=>e.joker===id).map(e=>({trigger:id,retriggers:e.retriggers,type:'all',tiles}));
  const {activations,points,scoringBoard}=scoreGroups(state,scoringGroups,events,random);
  if(state.score>=state.target)state.status='passed';
  return {scoringBoard,scoringGroups,activations,points,callsBeforeBonuses:state.calls};
}
export function redraw(state,random=Math.random) {
  if(state.status!=='playing'||state.passes<1||!state.offer.length)return false;
  const oldBalls=new Set(state.offer),oldTiles=new Set(Object.values(state.destinations));
  state.passes--;deal(state,random);
  // The offered ball is still in the bag. Prefer a fresh ball and space when possible.
  const candidates=[...state.bag].filter(n=>!oldBalls.has(n));
  if(candidates.length)state.offer=[candidates[Math.floor(random()*candidates.length)]];
  const empty=Array.from({length:25},(_,i)=>i+1).filter(t=>!state.stamps.has(t)&&!oldTiles.has(t));
  const available=empty.filter(t=>!isStamp(state,state.offer[0])||tileStampList(state,t).length<4);
  const tile=available.length?available[Math.floor(random()*available.length)]:Object.values(state.destinations)[0];
  state.destinations=Object.fromEntries(state.offer.map(n=>[n,tile]));
  return true;
}

export function settleStage(state){
  if(state.status!=='passed'||state.bonusPaid)return 0;
  const bonus=state.calls;
  state.money+=bonus;
  state.bonusPaid=true;
  return bonus;
}

export function openShop(state,random=Math.random){
  if(state.status!=='passed'||!state.bonusPaid)return false;
  state.shopOffer??=Object.fromEntries([['cards',CARD_TYPES],['balls',BALL_UPGRADES]].map(([kind,catalog])=>{const choices=shuffled(Object.keys(catalog),random);return [kind,[choices[0]??null,choices[1]??null]];}));state.shopOffer.items=Object.keys(ITEM_TYPES);
  // Introduce this card once to existing blank shops, without refilling a bought slot.
  if(state.shopOffer.cardCatalogVersion!==1){
    if(!state.shopOffer.cards.includes('high-five')){const slot=state.shopOffer.cards.indexOf(null);if(slot>=0)state.shopOffer.cards[slot]='high-five';}
    state.shopOffer.cardCatalogVersion=1;
  }
  if(state.shopOffer.encoreVersion!==1){
    if(!state.shopOffer.cards.includes('encore')){const slot=state.shopOffer.cards.indexOf(null);if(slot>=0)state.shopOffer.cards[slot]='encore';else state.shopOffer.cards.push('encore');}
    state.shopOffer.encoreVersion=1;
  }
  return true;
}
// The live shop is a persisted, one-pick reward draft. Inventory helpers below
// remain usable for fixtures and tools; all player selections go through this gate.
export function openRewardShop(state,random=Math.random){
  if(state.status!=='passed'||!state.bonusPaid)return false;
  if(state.shopOffer?.rewardVersion===2)return true;
  const claimed=state.shopOffer?.claimed===true;
  state.shopOffer={rewardVersion:2,cards:[],items:shuffled(Object.keys(ITEM_TYPES),random).slice(0,3),balls:[null,null],claimed};
  return true;
}
export function claimReward(state,type){
  const offer=state.shopOffer;
  if(offer?.rewardVersion!==2||offer.claimed)return false;
  const added=offer.items.includes(type)?buyItem(state,type):false;
  if(added===false)return false;
  offer.claimed=true;return true;
}
export function buyItem(state,type){
  if(state.status!=='passed'||!state.bonusPaid||!Object.hasOwn(ITEM_TYPES,type)||!state.shopOffer?.items?.includes(type))return false;
  const id=state.nextItemId++;state.items[id]=type;state.collection.push(id);state.bag.add(id);state.played[id]=0;return id;
}
export function buyCard(state,index){
  const type=state.shopOffer?.cards[index],item=cardDetails(type);
  if(state.status!=='passed'||!state.bonusPaid||!item||!CARD_TYPES[cardType(type)]||state.jokers.filter(id=>!isRuleCard(id)).length>=5)return false;
  let serial=1;while(state.jokers.includes(`${type}:${serial}`))serial++;
  state.jokers.push(`${type}:${serial}`);state.shopOffer.cards[index]=null;return true;
}
export function upgradeBall(state,index,number){
  const type=state.shopOffer?.balls[index];
  if(state.status!=='passed'||!state.bonusPaid||!BALL_UPGRADES[type]||!Number.isInteger(number)||number<1||number>25||state.upgrades[number]===type)return false;
  state.upgrades[number]=type;state.shopOffer.balls[index]=null;return true;
}
export function redrawShop(state,random=Math.random){
  if(!Object.keys(CARD_TYPES).length&&!Object.keys(BALL_UPGRADES).length)return false;
  if(state.status!=='passed'||!state.bonusPaid||!state.shopOffer)return false;
  state.shopOffer=null;return openShop(state,random);
}

export function removeJoker(state,type){
  if(!state.jokers?.includes(type))return false;
  state.jokers=state.jokers.filter(id=>id!==type);return true;
}

// Retire the old shop without resetting a player's run or restoring trashed rules.
export function migrateShop(state){
  if(state.shopVersion===1)return;
  state.jokers=normalizeJokers(state.jokers);
  state.upgrades={};state.ballValues={};
  state.stampValues=Object.fromEntries(Object.entries(state.stampBalls||{}).map(([tile,number])=>[tile,number]));
  state.shopOffer=state.status==='passed'&&state.bonusPaid?{cards:[null,null],balls:[null,null]}:null;
  state.offer=state.offer.slice(0,1);
  state.destinations=Object.fromEntries(state.offer.map(n=>[n,state.destinations?.[n]]));
  delete state.plasmaPending;delete state.plasmaActive;
  state.shopVersion=1;
}

export function migrateInventory(state){
  if(state.inventoryVersion===1)return;
  state.collection=Array.from({length:25},(_,i)=>i+1);state.items={};state.nextItemId=26;state.inventoryVersion=1;
}
