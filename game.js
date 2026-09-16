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
function adjacentPatterns(length,type){
  return [[0,1,'h'],[1,0,'v'],[1,1,'dr'],[1,-1,'dl']].flatMap(([dr,dc,direction])=>Array.from({length:25},(_,i)=>{
    const row=Math.floor(i/5),col=i%5,endRow=row+dr*(length-1),endCol=col+dc*(length-1);
    if(endRow>=5||endCol<0||endCol>=5)return null;
    return {id:type==='mars'&&direction==='h'?`mars-${i+1}`:`${type}-${direction}-${i+1}`,type,tiles:Array.from({length},(_,step)=>i+1+step*(dr*5+dc))};
  }).filter(Boolean));
}
export const BLACKJACK_PATTERNS=adjacentPatterns(3,'blackjack');
export const MARS_PATTERNS=BLACKJACK_PATTERNS; // Historical import compatibility.
export const MOON_PATTERNS=adjacentPatterns(2,'moon').filter(p=>p.id.startsWith('moon-h-')||p.id.startsWith('moon-v-'));
export const JUPITER_PATTERNS=adjacentPatterns(3,'jupiter');
export const FEATHER_PATTERNS=EXTRA_PATTERNS.filter(p=>p.type==='square').map(p=>({...p,id:p.id.replace('square','feather'),type:'feather'}));
export const CROSS_PATTERNS=['crown','valley'].flatMap(type=>[7,8,9,12,13,14,17,18,19].map(t=>({id:`${type}-${t}`,type,tiles:[t,t-5,t+1,t+5,t-1]})));
export const CONDITION_PATTERNS=[...BLACKJACK_PATTERNS,...MOON_PATTERNS,...JUPITER_PATTERNS,...FEATHER_PATTERNS,...CROSS_PATTERNS];
export const BINGO_TOKEN={name:'Bingo Token',text:'Scores its value in ★'};
export const isBingoToken=(state,id)=>id!=null&&(!state.items?.[id]||state.items[id]==='bingo');
export const planetPairMatches=(state,[a,b])=>{
  return isBingoToken(state,state.stampBalls[a])&&isBingoToken(state,state.stampBalls[b])&&Number.isFinite(state.stampValues[a])&&state.stampValues[a]===state.stampValues[b];
};
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
export const ITEM_TYPES={
  tornado:{name:'Tornado',text:'When played: randomize every other item’s position',startingValue:0,price:0},
  prism:{name:'Prism',text:'While on board: diagonal bingos score twice',startingValue:0,price:0},
  phoenix:{name:'Phoenix',text:'When destroyed: return to the bag with +10 ★',startingValue:10,price:0},
  anchor:{name:'Anchor',text:'While on board: adjacent items cannot move',startingValue:0,price:0},
  potion20:{name:'+20 Potion',text:'When played: give an item +20 ★ permanently',kind:'potion',startingValue:null,price:0},
  potion2:{name:'×2 Potion',text:'When played: x2 to total when scoring',kind:'potion',startingValue:null,price:0},
  potionCopy:{name:'Copy Potion',text:'When played: copy an item and all its effects into the bag',kind:'potion',startingValue:null,price:0},
  potionMelt:{name:'Melt Potion',text:'When played: permanently destroy an item',kind:'potion',startingValue:null,price:0},
  doubleball:{name:'×2 Ball',text:'x2 to total when scoring',startingValue:0,price:0},
  trash:{name:'Destroy Item',text:'When scored: destroy item on this tile',startingValue:null,price:0},
  potionSticky:{name:'Sticky Potion',text:'When played: permanently stick this item to the board. −1 play',details:'One fewer play each future round per stuck item.',kind:'potion',startingValue:null,price:0},
  glass:{name:'Glass Ball',text:'When scored: doubles its ★ and has a 20% chance of breaking',startingValue:1,price:0},
  king:{name:'Wandering King',text:'Each turn: move to a random empty adjacent tile',startingValue:0,price:0},
  question:{name:'Question Mark',text:'When played: become your last played item for this turn',details:'Reverts after the turn. No effect before your first item.',startingValue:'?',price:0},
  ...Object.fromEntries([10,50,100].map(n=>[`plus${n}`,{name:`+${n}`,text:`+${n} ★`,startingValue:null,price:0}])),
  copier:{name:'Copier',text:'When scored: copy this item into the bag',startingValue:null,price:0},
  x2:{name:'×2',text:'x2 to this tile’s score',startingValue:null,price:0},
  x3:{name:'×3',text:'x3 to this tile’s score',startingValue:null,price:0},
  seed:{name:'Seed',text:'When played: increases by 1 ★ each turn',startingValue:1,price:0},
  bomb:{name:'Bomb',text:'Permanently destroy all adjacent items',details:'Also destroys itself. Tile stamps stay.',startingValue:0,price:0},
  d20:{name:'20-Sided Die',text:'Rolls a random value between 1–20 ★',startingValue:'?',price:0},
  moon:{name:'Moon',text:'While on board: score identical adjacent bingo tokens, +100 ★',details:'Each pair once per round.',startingValue:0,price:0},
  blackjack:{name:'Blackjack',text:'While on board: score lines of 3 Bingo Tokens totaling 21 or less',startingValue:0,price:0},
  feather:{name:'Feather',text:'While on board: score 2×2 squares of Bingo Tokens totaling 25 or less',startingValue:0,price:0},
  oddball:{name:'Odd Ball',text:'While on board: score groups of only odd Bingo Tokens again',startingValue:0,price:0},
  sun:{name:'Sun',text:'While on board: negative Bingo Tokens score as positive',startingValue:0,price:0},
  crown:{name:'Crown',text:'While on board: score a Bingo Token and its four adjacent Bingo Tokens if the center is highest',details:'The center must be strictly higher than all four neighbors.',startingValue:0,price:0},
  valley:{name:'Valley',text:'While on board: score a Bingo Token and its four adjacent Bingo Tokens if the center is lowest',details:'The center must be strictly lower than all four neighbors.',startingValue:0,price:0},
  potionGravity:{name:'Gravity Potion',text:'When played: this item always falls into empty tiles below it',kind:'potion',startingValue:null,price:0},
  potionTiny:{name:'Tiny Potion',text:'When played: set a Bingo Token’s number to 1',kind:'potion',startingValue:null,price:0},
  potionGiant:{name:'Giant Potion',text:'When played: double a Bingo Token’s number',kind:'potion',startingValue:null,price:0},
  potionPolish:{name:'Polish Potion',text:'When played: add 1 to a Bingo Token’s number',kind:'potion',startingValue:null,price:0},
  potionChisel:{name:'Chisel Potion',text:'When played: subtract 1 from a Bingo Token’s number',kind:'potion',startingValue:null,price:0},
  earth:{name:'Earth',text:'When played: all items respond to gravity',details:'Stamps stay put. Score before and after the fall.',startingValue:0,price:0},
  jupiter:{name:'Jupiter',text:'While on board: score 3 non-bingo tokens in a line, +100 ★',details:'Each trio once per round.',startingValue:0,price:0}
};
export const isPotion=(state,id)=>ITEM_TYPES[state.items?.[id]]?.kind==='potion';
export const PERSISTENT_POTIONS=['potion20','potion2','potionSticky','potionGravity','potionTiny','potionGiant','potionPolish','potionChisel'];
export const NUMBER_POTIONS=['potionTiny','potionGiant','potionPolish','potionChisel'];
export const SCORING_ITEMS=['blackjack','feather','crown','valley','moon','jupiter','prism','oddball','sun'];
export const shopCategory=type=>ITEM_TYPES[type]?.kind==='potion'?'potion':SCORING_ITEMS.includes(type)?'scoring':'item';
export const shopItemTypes=()=>Object.keys(ITEM_TYPES).filter(type=>!isStamp({items:{1:type}},1));
// Retire Anvils from serialized runs without losing the rest of the run or tile ink.
export function removeRetiredItems(saved){
  for(const id of Object.keys(saved.items||{}))if(saved.items[id]==='mars')saved.items[id]='blackjack';
  if(saved.lastPlayed?.type==='mars')saved.lastPlayed.type='blackjack';
  if(saved.shopOffer?.items)saved.shopOffer.items=saved.shopOffer.items.map(t=>t==='mars'?'blackjack':t);
  const migratePattern=id=>id.replace(/^mars-(\d+)/,'blackjack-h-$1').replace(/^mars-/,'blackjack-');
  if(saved.scoredLines)saved.scoredLines=saved.scoredLines.map(migratePattern);
  if(saved.scoredGroups)saved.scoredGroups=saved.scoredGroups.map(migratePattern);
  const retired=new Set(Object.keys(saved.items||{}).filter(id=>['hundred','rock','statue'].includes(saved.items[id])).map(Number));
  for(const key of ['collection','bag','offer'])if(Array.isArray(saved[key]))saved[key]=saved[key].filter(id=>!retired.has(id));
  for(const [tile,id] of Object.entries(saved.stampBalls||{}))if(retired.has(id)){
    saved.stamps=saved.stamps.filter(t=>t!==Number(tile));delete saved.stampBalls[tile];delete saved.stampValues[tile];
  }
  for(const id of retired)for(const key of ['items','ballValues','valueModifiers','destinations','upgrades','itemEffects'])if(saved[key])delete saved[key][id];
  if(saved.shopOffer?.items?.some(type=>['hundred','rock','statue'].includes(type))){saved.shopOffer.items=saved.shopOffer.items.filter(type=>!['hundred','rock','statue'].includes(type));for(const type of shopItemTypes())if(saved.shopOffer.items.length<3&&!saved.shopOffer.items.includes(type))saved.shopOffer.items.push(type);}
  if(saved.lastPlayed&&['hundred','rock','statue'].includes(saved.lastPlayed.type))saved.lastPlayed=null;
  if(saved.kingVersion!==1){for(const [id,type] of Object.entries(saved.items||{}))if(type==='king'){if(saved.ballValues?.[id]===10)delete saved.ballValues[id];for(const [tile,occupant] of Object.entries(saved.stampBalls||{}))if(occupant===Number(id))saved.stampValues[tile]=(saved.ballValues?.[id]??0)+(saved.valueModifiers?.[id]||0);}saved.kingVersion=1;}
  if(retired.size)saved.handVersion=0;
  if(retired.size&&saved.status==='playing'&&saved.bag?.length===0)saved.status='over';
}

export const stampFactor=(state,id)=>state.items?.[id]==='x2'?2:state.items?.[id]==='x3'?3:1;
export const isStamp=(state,id)=>['x2','x3','copier','trash','plus10','plus50','plus100'].includes(state.items?.[id]);
export function tileStampList(state,tile){
  if(state.tileStamps?.[tile])return state.tileStamps[tile];
  const list=state.tileCopiers?.[tile]?['copier']:[];let value=state.tileMultipliers?.[tile]||1;
  for(const [factor,type] of [[2,'x2'],[3,'x3']])while(value>1&&value%factor===0){list.push(type);value/=factor;}
  return list;
}
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
export const ballValue=(state,number)=>number==null||isPotion(state,number)||state.items?.[number]==='doubleball'||state.items?.[number]==='question'||isBomb(state,number)||isDie(state,number)||isStamp(state,number)?null:((state.ballValues?.[number]??(state.items?.[number]==='phoenix'?10:state.items?.[number]==='hundred'?50:['seed','glass'].includes(state.items?.[number])?1:['earth','blackjack','moon','jupiter','king','tornado','prism','anchor','feather','crown','valley','oddball','sun'].includes(state.items?.[number])?0:number))+(state.valueModifiers?.[number]||0));
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
export const isSticky=(state,id)=>(state.itemEffects?.[id]||[]).includes('potionSticky');
export function newStage(stage=1,money=5,upgrades={},patternCounts={},jokers=['bingo','face-value'],inventory=null) {
  const collection=inventory?[...inventory.collection]:Array.from({length:25},(_,i)=>i+1),items={...inventory?.items},nextItemId=inventory?.nextItemId??26;
  const fixed=Object.entries(inventory?.stampBalls||{}).filter(([,id])=>isSticky(inventory,id)&&collection.includes(id));
  const stampBalls=Object.fromEntries(fixed),stampValues=Object.fromEntries(fixed.map(([tile,id])=>[tile,inventory.stampValues?.[tile]??ballValue(inventory,id)]));
  const fixedIds=new Set(fixed.map(([,id])=>id)),capacity=Math.max(0,17-fixed.length);
  return {stickyVersion:1,kingVersion:1,lastPlayed:structuredClone(inventory?.lastPlayed||null),itemEffects:structuredClone(inventory?.itemEffects||{}),tileStamps:Object.fromEntries(Array.from({length:25},(_,i)=>[i+1,[...tileStampList(inventory||{},i+1)]]).filter(([,list])=>list.length)),tileCopiers:{...inventory?.tileCopiers},tileMultipliers:{...inventory?.tileMultipliers},activeUses:{},handVersion:1,inventoryVersion:1,collection,items,nextItemId,shopVersion:1,turnVersion:1,passes:10,rulesVersion:3,upgradeVersion:2,ballValues:{...inventory?.ballValues},valueModifiers:{...inventory?.valueModifiers},jokerVersion:4,scoredGroups:[],scoredLines:[],jokers:normalizeJokers(jokers),patternCounts:{...freshPatternCounts(),...patternCounts},stampBalls,stampValues,destinations:{},upgrades:Object.fromEntries(Object.entries(upgrades).filter(([,type])=>Object.hasOwn(BALL_UPGRADES,type))),callCapacity:capacity,shopOffer:null,stage,target:targetFor(stage),score:0,calls:capacity,money,bonusPaid:false,stamps:new Set(fixed.map(([tile])=>Number(tile))),bag:new Set(collection.filter(id=>!fixedIds.has(id))),played:Array(nextItemId).fill(0),status:collection.length&&capacity>0?'playing':'over',offer:[]};
}
const shuffled=(values,random)=>{
  const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
};
export function deal(state,random=Math.random,count=3,exclude=null){
  state.offer=(state.offer||[]).filter(n=>state.bag.has(n));
  const held=new Set(state.offer),candidates=shuffled([...state.bag].filter(n=>!held.has(n)&&n!==exclude),random);
  if(exclude!==null&&state.bag.has(exclude)&&!held.has(exclude))candidates.push(exclude);
  const additions=candidates.slice(0,Math.max(0,count-state.offer.length));
  state.offer.splice(state.refillSlot??state.offer.length,0,...additions);delete state.refillSlot;
  const previous=new Set(Object.values(state.destinations||{}));
  const empty=Array.from({length:25},(_,i)=>i+1).filter(tile=>!state.stamps.has(tile));
  const compatible=empty.filter(tile=>!state.offer.some(n=>isStamp(state,n)||(state.items[n]==='question'&&isStamp({items:{[n]:state.lastPlayed?.type}},n)))||tileStampList(state,tile).length<4);
  const choices=compatible.length?compatible:empty,fresh=choices.filter(tile=>!previous.has(tile));
  const pool=fresh.length?fresh:choices,tile=pool.length?pool[Math.floor(random()*pool.length)]:null;
  state.destinations=Object.fromEntries(state.offer.map(n=>[n,tile]));
  state.handVersion=1;return state.offer;
}
export function draw(state=newStage(),random=Math.random,count=1) {
  const bag=[...state.bag];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag.slice(0,Math.min(count,bag.length));
}
function cloneItem(state,number,tile){
  const id=state.nextItemId++,type=state.items[number];
  if(type)state.items[id]=type;
  if(!type||Object.hasOwn(state.ballValues,number))state.ballValues[id]=state.ballValues[number]??number;
  if(Object.hasOwn(state.valueModifiers,number))state.valueModifiers[id]=state.valueModifiers[number];
  if(state.upgrades[number])state.upgrades[id]=state.upgrades[number];
  state.itemEffects??={};state.itemEffects[id]=structuredClone(state.itemEffects[number]||[]);
  state.collection.push(id);state.bag.add(id);state.played[id]=0;
  return {id,source:number,tile};
}
function copyOnTile(state,number,tile){
  return tileStampList(state,tile).filter(type=>type==='copier').map(()=>cloneItem(state,number,tile));
}
function destroyItem(state,id,tile){
  if(tile!=null){state.stamps.delete(tile);delete state.stampBalls[tile];delete state.stampValues[tile];}
  if(state.items[id]==='phoenix'){
    const before=ballValue(state,id);state.valueModifiers??={};state.valueModifiers[id]=(state.valueModifiers[id]||0)+10;state.bag.add(id);
    return {id,tile,before,after:ballValue(state,id)};
  }
  state.collection=state.collection.filter(n=>n!==id);state.bag.delete(id);
  for(const map of ['ballValues','valueModifiers','upgrades','itemEffects'])if(state[map])delete state[map][id];
  return null;
}
export const kingNeighbors=tile=>orthogonalNeighbors(tile).sort((a,b)=>a-b);
export const isAnchored=(state,tile)=>orthogonalNeighbors(tile).some(t=>state.stamps.has(t)&&state.items[state.stampBalls[t]]==='anchor');
const cannotMove=(state,tile)=>isSticky(state,state.stampBalls[tile])||isAnchored(state,tile);
export function itemBlueprint(state,id){return {type:state.items[id]||'bingo',base:state.ballValues[id]??(isBingoToken(state,id)?id:null),modifier:state.valueModifiers[id]||0,effects:structuredClone(state.itemEffects?.[id]||[])};}
function applyBlueprint(state,id,blueprint){
  if(blueprint.type==='bingo')delete state.items[id];else state.items[id]=blueprint.type;
  if(blueprint.base===null)delete state.ballValues[id];else state.ballValues[id]=blueprint.base;
  state.valueModifiers[id]=blueprint.modifier;state.itemEffects??={};state.itemEffects[id]=structuredClone(blueprint.effects);
}
export const isTargetedPotion=(state,id)=>isPotion(state,id)||(state.items[id]==='question'&&ITEM_TYPES[state.lastPlayed?.type]?.kind==='potion');
const allScoringPatterns=[...PATTERN_DEFINITIONS,...EXTRA_PATTERNS,...CONDITION_PATTERNS];
const groupKey=(state,p)=>`${p.id}:${p.tiles.map(t=>state.stampBalls[t]).sort((a,b)=>a-b).join(',')}`;
const planetEligible=(state,p)=>{
  if(!p.tiles.every(t=>state.stamps.has(t)))return false;
  if(p.type==='jupiter')return p.tiles.every(t=>!isBingoToken(state,state.stampBalls[t]));
  if(!p.tiles.every(t=>isBingoToken(state,state.stampBalls[t])&&Number.isFinite(state.stampValues[t])))return false;
  const values=p.tiles.map(t=>state.stampValues[t]);
  if(p.type==='blackjack'||p.type==='feather')return values.reduce((a,b)=>a+b,0)<=(p.type==='blackjack'?21:25);
  if(p.type==='moon')return values[0]===values[1];
  return values.slice(1).every(v=>p.type==='crown'?values[0]>v:values[0]<v);
};
export const canPotionTarget=(state,id,tile)=>{
  if(!state.stamps.has(tile))return false;
  const type=state.items[id]==='question'?state.lastPlayed?.type:state.items[id];
  return !NUMBER_POTIONS.includes(type)||isBingoToken(state,state.stampBalls[tile]);
};
export function choose(state,number,tile=state.destinations[number],random=Math.random) {
  // Migrate location-only history before placement changes its occupants.
  state.scoredGroups??=allScoringPatterns.filter(p=>state.scoredLines.includes(p.id)).map(p=>groupKey(state,p));
  const activePlanets=new Set([...state.stamps].map(t=>state.items[state.stampBalls[t]]));
  const potion=isTargetedPotion(state,number);
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)||!Number.isInteger(tile)||tile<1||tile>25||(potion?!canPotionTarget(state,number,tile):(!Object.values(state.destinations).includes(tile)||state.stamps.has(tile))))return null;
  const mimic=state.items[number]==='question'&&state.lastPlayed&&state.lastPlayed.type!=='question'?{id:number,original:itemBlueprint(state,number),applied:structuredClone(state.lastPlayed)}:null;
  const validation=mimic?{items:{[number]:mimic.applied.type}}:state;
  if(isStamp(validation,number)&&tileStampList(state,tile).length>=4)return null;
  if(mimic){if(mimic.original.effects.includes('potionSticky')&&!mimic.applied.effects.includes('potionSticky'))mimic.applied.effects.push('potionSticky');applyBlueprint(state,number,mimic.applied);}
  state.lastPlayed=itemBlueprint(state,number);
  const refillSlot=state.offer.indexOf(number);
  const copies=[],rebirths=[],copied=null;
  let roll=isDie(state,number)?1+Math.floor(random()*20)+(state.valueModifiers?.[number]||0):null;
  const playCost=1;
  let potionApplied=null;
  if(potion){
    const target=state.stampBalls[tile],type=state.items[number];
    potionApplied={type,target,tile,before:boardSnapshot(state)};
    state.itemEffects??={};
    if(PERSISTENT_POTIONS.includes(type))(state.itemEffects[target]??=[]).push(type);
    if(NUMBER_POTIONS.includes(type)){
      const before=state.stampValues[tile],after=type==='potionTiny'?1:type==='potionGiant'?before*2:before+(type==='potionPolish'?1:-1);
      potionApplied.valueChange=changeTileValue(state,tile,after-before,tile);
    }
    if(type==='potionCopy')copies.push({...cloneItem(state,target,tile),potion:true});
    if(type==='potionMelt'){const rebirth=destroyItem(state,target,tile);if(rebirth)rebirths.push(rebirth);}
    destroyItem(state,number);
  }else{state.stamps.add(tile);state.stampBalls[tile]=number;state.stampValues[tile]=roll??ballValue(state,number);state.bag.delete(number);}
  state.played[number]=(state.played[number]||0)+1;state.calls-=playCost;
  const swap=null,effectNumber=number;
  const factor=stampFactor(state,number),stampApplied=isStamp(state,number)?{tile,factor,before:state.tileMultipliers?.[tile]||1}:null;
  if(stampApplied){
    const previous=tileStampList(state,tile);state.tileStamps??={};state.tileStamps[tile]=[...previous,state.items[number]];
    if(state.items[number]==='copier'){state.tileCopiers??={};state.tileCopiers[tile]=true;}
    else{state.tileMultipliers??={};state.tileMultipliers[tile]=(state.tileMultipliers[tile]||1)*factor;}
    state.stamps.delete(tile);delete state.stampBalls[tile];delete state.stampValues[tile];
    state.collection=state.collection.filter(id=>id!==number);delete state.ballValues[number];delete state.valueModifiers[number];
  }
  const seeds=[...state.stamps].filter(t=>(potion||t!==tile)&&state.items[state.stampBalls[t]]==='seed');
  const effectBoard=(isBomb(state,effectNumber)||state.items[effectNumber]==='hundred'||seeds.length||[...state.stamps].some(t=>state.items[state.stampBalls[t]]==='king'&&state.stampBalls[t]!==number))?boardSnapshot(state):null,valueChanges=[];
  if(state.items[effectNumber]==='hundred')for(const neighbor of orthogonalNeighbors(tile)){
    const change=changeTileValue(state,neighbor,-1,tile);if(change)valueChanges.push(change);
  }
  for(const seed of seeds){const change=changeTileValue(state,seed,1,tile);if(change)valueChanges.push(change);}
  const destroyed=[];
  if(isBomb(state,effectNumber)){
    for(const occupied of [tile,...orthogonalNeighbors(tile)].filter(t=>state.stamps.has(t))){
      const id=state.stampBalls[occupied];destroyed.push({tile:occupied,id,value:state.stampValues[occupied]});
      const rebirth=destroyItem(state,id,occupied);if(rebirth)rebirths.push(rebirth);
    }
  }

  const callsBeforeBonuses=state.calls,kingMoves=[],timeline=[];

  // A newly enabled condition starts from the current board, without retroactive rewards.
  const newPlanet=state.items[number];
  if(CONDITION_PATTERNS.some(p=>p.type===newPlanet)&&!activePlanets.has(newPlanet)){
    for(const p of allScoringPatterns.filter(p=>p.type===newPlanet&&planetEligible(state,p)))state.scoredGroups.push(groupKey(state,p));
  }
  function evaluateAt(changedTiles,placement=false){
    // Gravity items only score from settled positions, except their original placement.
    const unsettled=new Set([...state.stamps].filter(t=>{
      const id=state.stampBalls[t];
      return (state.itemEffects?.[id]||[]).includes('potionGravity')&&!cannotMove(state,t)&&t+5<=25&&!state.stamps.has(t+5)&&!(placement&&!potion&&t===tile&&id===number);
    }));
    const scoreBefore=state.score;
  const scoredPatterns=[...completedPatterns(state.stamps),...EXTRA_PATTERNS.filter(p=>p.tiles.every(t=>state.stamps.has(t)))].filter(p=>!p.tiles.some(t=>unsettled.has(t))&&!state.scoredGroups.includes(groupKey(state,p))&&p.tiles.some(t=>changedTiles.has(t))&&(p.type==='square'||p.type==='corners'?!state.plainRules&&state.jokers.some(id=>cardType(id)===p.type):(state.plainRules||state.jokers.includes('bingo'))));
  const patterns=scoredPatterns.map(p=>p.tiles);
  for(const {type} of scoredPatterns)state.patternCounts[type]=(state.patternCounts[type]||0)+1;
  state.scoredGroups.push(...scoredPatterns.map(p=>groupKey(state,p)));
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
    // Recheck source presence and occupants after destructive scoring effects.
    for(const pattern of CONDITION_PATTERNS){
      const source=[...state.stamps].find(t=>state.items[state.stampBalls[t]]===pattern.type);
      if(source===undefined)continue;
      if(state.scoredGroups.includes(groupKey(state,pattern))||!pattern.tiles.every(t=>state.stamps.has(t)))continue;
      if(pattern.tiles.some(t=>unsettled.has(t))||!planetEligible(state,pattern))continue;
      state.scoredGroups.push(groupKey(state,pattern));
      const group={trigger:pattern.type,retriggers:[],type:pattern.type,tiles:pattern.tiles,flatBonus:['moon','jupiter'].includes(pattern.type)?100:0,source};
      const before=state.score,mars=scoreGroups(state,[group],events,random);
      state.scoredLines.push(pattern.id);
      timeline.push({kind:'score',...mars,scoreBefore:before,callsBeforeBonuses,patterns:[pattern.tiles],scoredPatterns:[pattern],scoringGroups:[group]});
    }
    return phase;
  }
  if(state.items[effectNumber]==='tornado'){
    const before=boardSnapshot(state),fixed=new Set([...state.stamps].filter(t=>t===tile||cannotMove(state,t))),moves=[];
    const locations=shuffled(Array.from({length:25},(_,i)=>i+1).filter(t=>!fixed.has(t)),random);
    const movable=[...state.stamps].filter(t=>!fixed.has(t));
    for(const from of movable){state.stamps.delete(from);delete state.stampBalls[from];delete state.stampValues[from];}
    movable.forEach((from,i)=>{const to=locations[i],id=before.stampBalls[from],value=before.stampValues[from];state.stamps.add(to);state.stampBalls[to]=id;state.stampValues[to]=value;if(from!==to)moves.push({id,from,to,value});});
    timeline.push({kind:'tornado',before,after:boardSnapshot(state),moves,scoreBefore:state.score});
  }
  function settleGravity(){
    // Every pass moves at least one item downward; a finite board bounds the chain.
    for(let pass=0;pass<125;pass++){
      const before=boardSnapshot(state),moves=[];
      for(const from of [...state.stamps].sort((a,b)=>b-a)){
        const id=state.stampBalls[from];
        if(!(state.itemEffects?.[id]||[]).includes('potionGravity')||cannotMove(state,from))continue;
        let to=from;while(to+5<=25&&!state.stamps.has(to+5))to+=5;
        if(to===from)continue;
        const value=state.stampValues[from];state.stamps.delete(from);delete state.stampBalls[from];delete state.stampValues[from];
        state.stamps.add(to);state.stampBalls[to]=id;state.stampValues[to]=value;moves.push({id,from,to,value});
      }
      if(!moves.length)return;
      timeline.push({kind:'gravity',personal:true,before,after:boardSnapshot(state),moves,scoreBefore:state.score});
      evaluateAt(new Set(moves.map(m=>m.to)));
    }
  }
  // Score placement first, then each King's destination before the next King moves.
  const initial=evaluateAt(new Set(state.items[effectNumber]==='tornado'?[...state.stamps]:[tile]),true);
  settleGravity();
  if(state.items[effectNumber]==='earth'){
    const before=boardSnapshot(state),moves=[],fixed=new Set([...state.stamps].filter(t=>cannotMove(state,t)));
    state.stamps=new Set();state.stampBalls={};state.stampValues={};
    for(let col=1;col<=5;col++){
      let to=col+20;
      for(let from=col+20;from>=col;from-=5)if(before.stamps.has(from)){
        const id=before.stampBalls[from],value=before.stampValues[from];
        if(fixed.has(from))to=from;
        state.stamps.add(to);state.stampBalls[to]=id;state.stampValues[to]=value;
        if(from!==to)moves.push({id,from,to,value});to-=5;
      }
    }
    timeline.push({kind:'gravity',before,after:boardSnapshot(state),moves,scoreBefore:state.score});
    evaluateAt(new Set(moves.map(move=>move.to)));
    settleGravity();
  }
  const kings=[...state.stamps].sort((a,b)=>a-b).filter(t=>state.items[state.stampBalls[t]]==='king'&&state.stampBalls[t]!==(swap?.to??number)).map(from=>({from,id:state.stampBalls[from]}));
  const movementBoard=boardSnapshot(state);
  for(const king of kings){
    const id=king.id,from=Number(Object.entries(state.stampBalls).find(([,n])=>n===id)?.[0]);
    if(!from)continue; // A scoring Trash stamp may have destroyed it.
    const available=cannotMove(state,from)?[]:kingNeighbors(from).filter(t=>!state.stamps.has(t));
    if(!available.length){timeline.push({kind:'blocked',reason:isSticky(state,id)?'sticky':isAnchored(state,from)?'anchor':'occupied',tile:from,id,board:boardSnapshot(state),scoreBefore:state.score});continue;}
    const to=available[Math.floor(random()*available.length)],value=state.stampValues[from],before=boardSnapshot(state),scoreBefore=state.score;
    state.stamps.delete(from);delete state.stampBalls[from];delete state.stampValues[from];
    state.stamps.add(to);state.stampBalls[to]=id;state.stampValues[to]=value;
    const move={id,from,to,value,before,after:boardSnapshot(state),copies:[]};
    kingMoves.push(move);timeline.push({kind:'move',move,scoreBefore});
    evaluateAt(new Set([to]));
    settleGravity();
  }
  const phases=timeline.filter(phase=>phase.kind==='score');
  const patterns=phases.flatMap(p=>p.patterns),scoredPatterns=phases.flatMap(p=>p.scoredPatterns),scoringGroups=phases.flatMap(p=>p.scoringGroups),activations=phases.flatMap(p=>p.activations);
  const points=phases.reduce((sum,p)=>sum+p.points,0),scoringBoard=initial.scoringBoard;

  if(mimic){
    // Keep the Question Mark identity, even if its borrowed effect consumed it.
    if(state.collection.includes(number)){applyBlueprint(state,number,mimic.original);for(const [location,id] of Object.entries(state.stampBalls))if(id===number)state.stampValues[location]=ballValue(state,number);}
    else state.items[number]='question';
  }
  state.offer=state.offer.filter(n=>n!==number&&state.bag.has(n));state.refillSlot=refillSlot;
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0||state.bag.size===0||state.stamps.size===25)state.status='over';
  if(state.status==='playing')deal(state,random,3,number);
  else{state.offer=[];state.destinations={};delete state.refillSlot;}
  return {rebirths,mimic,potionApplied,timeline,tile,swap,playedNumber:swap?.to??number,movementBoard,kingMoves,scoringBoard,copied,copies,stampApplied,playCost,roll,effectBoard,valueChanges,destroyed,callsBeforeBonuses,patterns,scoredPatterns,scoringGroups,activations,points};
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
    const prism=group.type==='diagonal'?[...state.stamps].find(t=>state.items[state.stampBalls[t]]==='prism'):undefined;
    const oddball=[...state.stamps].find(t=>state.items[state.stampBalls[t]]==='oddball');
    const odd=oddball!==undefined&&group.tiles.length>0&&group.tiles.every(t=>state.stamps.has(t)&&isBingoToken(state,state.stampBalls[t])&&Math.abs(state.stampValues[t]%2)===1);
    const passes=prism===undefined?[group]:[group,{...group,prism}];
    return odd?passes.flatMap(g=>[g,{...g,oddball}]):passes;
  }).flatMap(group=>{
    if(group.prism!==undefined&&state.items[state.stampBalls[group.prism]]!=='prism')return [];
    if(group.oddball!==undefined&&state.items[state.stampBalls[group.oddball]]!=='oddball')return [];
    const tiles=group.tiles.filter(tile=>state.stamps.has(tile));
    const sources=tiles.flatMap(tile=>Array((state.items[state.stampBalls[tile]]==='doubleball'?1:0)+(state.itemEffects?.[state.stampBalls[tile]]||[]).filter(e=>e==='potion2').length).fill(tile));
    const factor=2**sources.length;
    const entries=tiles.map((tile,j)=>{
    let reveal=null;
    const current=state.stampBalls[tile];
    const number=state.stampValues[tile],bonuses=[],sun=[...state.stamps].find(t=>state.items[state.stampBalls[t]]==='sun'),scoringNumber=sun!==undefined&&isBingoToken(state,current)?Math.abs(number):number;
    const contributions=events.flatMap(e=>cardType(e.joker)==='crowd'?[{...e,points:state.stamps.size}]:e.joker==='face-value'?[{...e,points:scoringNumber??0}]:cardType(e.joker)==='silver-lining'&&Number.isFinite(number)&&number<0?[{...e,points:30}]:[]);
    const potionBonus=(state.itemEffects?.[current]||[]).filter(e=>e==='potion20').length*20;
    if(potionBonus)contributions.push({joker:'potion20',retriggers:[],points:potionBonus});
    const stampBonus=tileStampList(state,tile).reduce((sum,type)=>sum+(type.startsWith('plus')?Number(type.slice(4)):0),0);
    const basePoints=(state.plainRules||state.jokers.includes('face-value'))?(scoringNumber??0):0;
    const id=state.stampBalls[tile],copies=copyOnTile(state,id,tile);
    const trashed=tileStampList(state,tile).includes('trash')?id:null;
    const rebirth=trashed!==null?destroyItem(state,id,tile):null;
    let glassGrowth=null;
    if(trashed===null&&state.items[id]==='glass'){
      const change=changeTileValue(state,tile,number,tile);
      const broken=random()<.2;glassGrowth={...change,broken};
      if(broken)destroyItem(state,id,tile);
    }
    return {oddball:group.oddball,sun:number<0&&scoringNumber>0?sun:undefined,prism:group.prism,rebirth,glassGrowth,tile,reveal,copies,trashed,number,basePoints,bonuses,contributions,stampBonus,multiplier:state.tileMultipliers?.[tile]||1,points:(contributions.reduce((sum,c)=>sum+c.points,0)+stampBonus)*(state.tileMultipliers?.[tile]||1),trigger:group.trigger,retriggers:group.retriggers,type:group.type,source:group.source,pattern:j===0?tiles:null};
    });
    if(entries.length){const flatBonus=group.flatBonus||0,subtotal=entries.reduce((sum,a)=>sum+a.points,0)+flatBonus;entries.at(-1).groupEnd={subtotal,factor,total:subtotal*factor,sources,...(flatBonus?{flatBonus,source:group.source}:{})};entries.at(-1).groupBonus=flatBonus+subtotal*(factor-1);}
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
export function redraw(state,random=Math.random,number=state.offer[0]) {
  if(state.status!=='playing'||state.passes<1||!state.offer.includes(number))return false;
  state.passes--;state.refillSlot=state.offer.indexOf(number);
  state.offer=state.offer.filter(n=>n!==number);
  deal(state,random,3,number);
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
  if(state.shopOffer?.rewardVersion===2&&state.shopOffer.items.length===3&&['potion','scoring','item'].every((category,i)=>shopCategory(state.shopOffer.items[i])===category)&&state.shopOffer.items.every(type=>shopItemTypes().includes(type)))return true;
  const claimed=state.shopOffer?.claimed===true;
  state.shopOffer={rewardVersion:2,cards:[],items:['potion','scoring','item'].map(category=>shuffled(shopItemTypes().filter(t=>shopCategory(t)===category),random)[0]),balls:[null,null],claimed};
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
