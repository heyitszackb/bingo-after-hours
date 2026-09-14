export const PATTERN_TYPES = [
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
export const PATTERNS = PATTERN_DEFINITIONS.map(pattern=>pattern.tiles);
export const freshPatternCounts=()=>Object.fromEntries(PATTERN_TYPES.map(({id})=>[id,0]));
export const completedPatterns=stamps=>PATTERN_DEFINITIONS.filter(({tiles})=>tiles.every(tile=>stamps.has(tile)));
export const STAGE_TARGETS = [5,10,15,20,30,40,55,70,90,120];
export const targetFor = stage => STAGE_TARGETS[stage-1];
export const RULE_CARDS={
  bingo:{name:'Bingo',text:'Score rows, columns, and diagonals of 5.',icon:'▦'},
  'face-value':{name:'Face Value',text:'Scored tiles earn their ball’s number in points.',icon:'#'}
};
export const isRuleCard=id=>Object.hasOwn(RULE_CARDS,id);
// Add new definitions here as the shop grows. Empty slots cannot be purchased.
export const CARD_TYPES={'high-five':{name:'High Five',text:'When you play a 1–5, score it and its occupied orthogonal neighbors.',icon:'✚',short:'Play 1–5: score ✚'}};
export const BALL_UPGRADES={};
export const ITEM_TYPES={bomb:{name:'Bomb',text:'After scoring, destroy this bomb and all items in the 8 neighboring spaces for the rest of the run.',price:0},d20:{name:'20-Sided Die',text:'Roll 1–20 when placed. Keep that number on this space for the round.',price:0}};
export const isDie=(state,id)=>state.items?.[id]==='d20';
export const isBomb=(state,id)=>state.items?.[id]==='bomb';
export const cardType=id=>id.split(':')[0];
export function cardDetails(id){
  if(typeof id!=='string')return null;
  const type=cardType(id),base=RULE_CARDS[id]||CARD_TYPES[type];if(!base)return null;
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
export const ballValue=(state,number)=>state.items?.[number]?null:(state.ballValues?.[number]??number);
export function newStage(stage=1,money=5,upgrades={},patternCounts={},jokers=['bingo','face-value'],inventory=null) {
  const collection=inventory?[...inventory.collection]:Array.from({length:25},(_,i)=>i+1),items={...inventory?.items},nextItemId=inventory?.nextItemId??26;
  return {inventoryVersion:1,collection,items,nextItemId,shopVersion:1,turnVersion:1,passes:10,rulesVersion:3,upgradeVersion:2,ballValues:{},jokerVersion:4,scoredLines:[],jokers:normalizeJokers(jokers),patternCounts:{...freshPatternCounts(),...patternCounts},stampBalls:{},stampValues:{},destinations:{},upgrades:Object.fromEntries(Object.entries(upgrades).filter(([,type])=>Object.hasOwn(BALL_UPGRADES,type))),callCapacity:15,shopOffer:null,stage,target:targetFor(stage),score:0,calls:15,money,bonusPaid:false,stamps:new Set(),bag:new Set(collection),played:Array(nextItemId).fill(0),status:collection.length?'playing':'over',offer:[]};
}
const shuffled=(values,random)=>{
  const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
};
export function deal(state,random=Math.random,count=1){
  const empty=Array.from({length:25},(_,i)=>i+1).filter(tile=>!state.stamps.has(tile));
  state.offer=draw(state,random,Math.min(count,empty.length));
  for(let i=empty.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[empty[i],empty[j]]=[empty[j],empty[i]];}
  state.destinations=Object.fromEntries(state.offer.map((number,i)=>[number,empty[i%Math.min(count,empty.length)]]));
  return state.offer;
}
export function draw(state=newStage(),random=Math.random,count=1) {
  const bag=[...state.bag];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag.slice(0,Math.min(count,bag.length));
}
export function choose(state,number,tile=state.destinations[number],random=Math.random) {
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)||!Number.isInteger(tile)||!Object.values(state.destinations).includes(tile)||tile<1||tile>25||state.stamps.has(tile))return null;
  const roll=isDie(state,number)?1+Math.floor(random()*20):null;
  state.stamps.add(tile);state.stampBalls[tile]=number;state.stampValues[tile]=roll??ballValue(state,number);state.bag.delete(number);state.played[number]=(state.played[number]||0)+1;state.calls--;
  const callsBeforeBonuses=state.calls;
  const scoredPatterns=completedPatterns(state.stamps).filter(p=>!state.scoredLines.includes(p.id)&&p.tiles.includes(tile)&&state.jokers.includes('bingo'));
  const patterns=scoredPatterns.map(p=>p.tiles);
  for(const {type} of scoredPatterns)state.patternCounts[type]=(state.patternCounts[type]||0)+1;
  state.scoredLines.push(...scoredPatterns.map(p=>p.id));
  // Trigger cards build independent groups in rack order. Scoring a tile never
  // counts as playing it, so neighboring low numbers cannot trigger a cascade.
  const scoringGroups=[];
  for(const joker of state.jokers){
    if(joker==='bingo')scoringGroups.push(...scoredPatterns.map(p=>({trigger:joker,type:p.type,tiles:p.tiles})));
    if(cardType(joker)==='high-five'&&state.stampValues[tile]>=1&&state.stampValues[tile]<=5){
      const row=Math.floor((tile-1)/5),col=(tile-1)%5;
      const neighbors=[tile,tile-5,tile+1,tile+5,tile-1].filter(t=>state.stamps.has(t)&&Math.abs(Math.floor((t-1)/5)-row)+Math.abs((t-1)%5-col)<=1);
      scoringGroups.push({trigger:joker,type:'cross',tiles:neighbors});
    }
  }
  const hasPointsRule=state.jokers.includes('face-value');
  const activations=scoringGroups.flatMap(group=>group.tiles.map((tile,j)=>{
    const number=state.stampValues[tile],bonuses=[];
    const basePoints=hasPointsRule?(number??0):0;
    const contributions=hasPointsRule?[{joker:'face-value',points:basePoints}]:[];
    return {tile,number,basePoints,bonuses,contributions,points:basePoints,trigger:group.trigger,type:group.type,pattern:j===0?group.tiles:null};
  }));
  const points=activations.reduce((sum,a)=>sum+a.points,0);state.score+=points;
  // Snapshot scoring before removing any items: the UI plays these phases in order.
  const scoringBoard=isBomb(state,number)?{stamps:new Set(state.stamps),stampBalls:{...state.stampBalls},stampValues:{...state.stampValues}}:null;
  const destroyed=[];
  if(isBomb(state,number)){
    const row=Math.floor((tile-1)/5),col=(tile-1)%5;
    for(const occupied of [...state.stamps]){
      if(Math.abs(Math.floor((occupied-1)/5)-row)>1||Math.abs((occupied-1)%5-col)>1)continue;
      const id=state.stampBalls[occupied];destroyed.push({tile:occupied,id,value:state.stampValues[occupied]});
      state.collection=state.collection.filter(n=>n!==id);state.bag.delete(id);
      state.stamps.delete(occupied);delete state.stampBalls[occupied];delete state.stampValues[occupied];delete state.ballValues[id];delete state.upgrades[id];
    }
  }

  state.offer=[];state.destinations={};
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0||state.bag.size===0||state.stamps.size===25)state.status='over';
  return {tile,roll,scoringBoard,destroyed,callsBeforeBonuses,patterns,scoredPatterns,scoringGroups,activations,points};
}
export function redraw(state,random=Math.random) {
  if(state.status!=='playing'||state.passes<1||!state.offer.length)return false;
  const oldBalls=new Set(state.offer),oldTiles=new Set(Object.values(state.destinations));
  state.passes--;deal(state,random);
  // The offered ball is still in the bag. Prefer a fresh ball and space when possible.
  const candidates=[...state.bag].filter(n=>!oldBalls.has(n));
  if(candidates.length)state.offer=[candidates[Math.floor(random()*candidates.length)]];
  const empty=Array.from({length:25},(_,i)=>i+1).filter(t=>!state.stamps.has(t)&&!oldTiles.has(t));
  const tile=empty.length?empty[Math.floor(random()*empty.length)]:Object.values(state.destinations)[0];
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
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10)return false;
  state.shopOffer??=Object.fromEntries([['cards',CARD_TYPES],['balls',BALL_UPGRADES]].map(([kind,catalog])=>{const choices=shuffled(Object.keys(catalog),random);return [kind,[choices[0]??null,choices[1]??null]];}));state.shopOffer.items=Object.keys(ITEM_TYPES);
  // Introduce this card once to existing blank shops, without refilling a bought slot.
  if(state.shopOffer.cardCatalogVersion!==1){
    if(!state.shopOffer.cards.includes('high-five')){const slot=state.shopOffer.cards.indexOf(null);if(slot>=0)state.shopOffer.cards[slot]='high-five';}
    state.shopOffer.cardCatalogVersion=1;
  }
  return true;
}
export function buyItem(state,type){
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!Object.hasOwn(ITEM_TYPES,type)||!state.shopOffer?.items?.includes(type))return false;
  const id=state.nextItemId++;state.items[id]=type;state.collection.push(id);state.bag.add(id);state.played[id]=0;return id;
}
export function buyCard(state,index){
  const type=state.shopOffer?.cards[index],item=cardDetails(type);
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!item||!CARD_TYPES[cardType(type)]||state.jokers.filter(id=>!isRuleCard(id)).length>=5)return false;
  let serial=1;while(state.jokers.includes(`${type}:${serial}`))serial++;
  state.jokers.push(`${type}:${serial}`);state.shopOffer.cards[index]=null;return true;
}
export function upgradeBall(state,index,number){
  const type=state.shopOffer?.balls[index];
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!BALL_UPGRADES[type]||!Number.isInteger(number)||number<1||number>25||state.upgrades[number]===type)return false;
  state.upgrades[number]=type;state.shopOffer.balls[index]=null;return true;
}
export function redrawShop(state,random=Math.random){
  if(!Object.keys(CARD_TYPES).length&&!Object.keys(BALL_UPGRADES).length)return false;
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!state.shopOffer)return false;
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
  state.shopOffer=state.status==='passed'&&state.bonusPaid&&state.stage<10?{cards:[null,null],balls:[null,null]}:null;
  state.offer=state.offer.slice(0,1);
  state.destinations=Object.fromEntries(state.offer.map(n=>[n,state.destinations?.[n]]));
  delete state.plasmaPending;delete state.plasmaActive;
  state.shopVersion=1;
}

export function migrateInventory(state){
  if(state.inventoryVersion===1)return;
  state.collection=Array.from({length:25},(_,i)=>i+1);state.items={};state.nextItemId=26;state.inventoryVersion=1;
}
