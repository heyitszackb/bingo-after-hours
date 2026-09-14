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
export const CARD_TYPES={};
export const BALL_UPGRADES={};
export const cardType=id=>id.split(':')[0];
export function cardDetails(id){
  if(typeof id!=='string')return null;
  const type=cardType(id),base=RULE_CARDS[id]||CARD_TYPES[type];if(!base)return null;
  return {...base,price:base.price??3};
}
export const normalizeJokers=jokers=>{
  if(!Array.isArray(jokers))return ['bingo','face-value'];
  const cards=[...new Set(jokers.filter(id=>typeof id==='string'&&CARD_TYPES[cardType(id)]&&cardDetails(id)))].slice(0,5);
  return [...(jokers.some(id=>['bingo','row','column','diagonal'].includes(id))?['bingo']:[]),...(jokers.includes('face-value')?['face-value']:[]),...cards];
};
export const ballValue=(state,number)=>state.ballValues?.[number]??number;
export function newStage(stage=1,money=5,upgrades={},patternCounts={},jokers=['bingo','face-value']) {
  return {shopVersion:1,turnVersion:1,passes:10,rulesVersion:3,upgradeVersion:2,ballValues:{},jokerVersion:4,scoredLines:[],jokers:normalizeJokers(jokers),patternCounts:{...freshPatternCounts(),...patternCounts},stampBalls:{},stampValues:{},destinations:{},upgrades:Object.fromEntries(Object.entries(upgrades).filter(([,type])=>Object.hasOwn(BALL_UPGRADES,type))),callCapacity:15,shopOffer:null,stage,target:targetFor(stage),score:0,calls:15,money,bonusPaid:false,stamps:new Set(),bag:new Set(Array.from({length:25},(_,i)=>i+1)),played:Array(26).fill(0),status:'playing',offer:[]};
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
  return bag.slice(0,Math.min(count,25));
}
export function choose(state,number,tile=state.destinations[number],random=Math.random) {
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)||!Number.isInteger(tile)||!Object.values(state.destinations).includes(tile)||tile<1||tile>25||state.stamps.has(tile))return null;
  state.stamps.add(tile);state.stampBalls[tile]=number;state.stampValues[tile]=ballValue(state,number);state.bag.delete(number);state.played[number]++;state.calls--;
  const callsBeforeBonuses=state.calls;
  const scoredPatterns=completedPatterns(state.stamps).filter(p=>!state.scoredLines.includes(p.id)&&p.tiles.includes(tile)&&state.jokers.includes('bingo'));
  const patterns=scoredPatterns.map(p=>p.tiles);
  for(const {type} of scoredPatterns)state.patternCounts[type]=(state.patternCounts[type]||0)+1;
  state.scoredLines.push(...scoredPatterns.map(p=>p.id));
  const hasPointsRule=state.jokers.includes('face-value');
  const activations=patterns.flatMap((pattern,i)=>pattern.map((tile,j)=>{
    const number=state.stampValues[tile],bonuses=[];
    const basePoints=hasPointsRule?(number??0):0;
    const contributions=[...(hasPointsRule?[{joker:'face-value',points:basePoints}]:[]),...bonuses];
    return {tile,number,basePoints,bonuses,contributions,points:basePoints+bonuses.reduce((sum,b)=>sum+b.points,0),trigger:'bingo',type:scoredPatterns[i].type,pattern:j===0?pattern:null};
  }));
  const points=activations.reduce((sum,a)=>sum+a.points,0);state.score+=points;
  state.offer=[];state.destinations={};
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0||state.bag.size===0||state.stamps.size===25)state.status='over';
  return {tile,callsBeforeBonuses,patterns,scoredPatterns,activations,points};
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
  state.shopOffer??=Object.fromEntries([['cards',CARD_TYPES],['balls',BALL_UPGRADES]].map(([kind,catalog])=>{const choices=shuffled(Object.keys(catalog),random);return [kind,[choices[0]??null,choices[1]??null]];}));return true;
}
export function buyCard(state,index){
  const type=state.shopOffer?.cards[index],item=cardDetails(type);
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!item||!CARD_TYPES[cardType(type)]||state.money<item.price||state.jokers.filter(id=>!isRuleCard(id)).length>=5)return false;
  let serial=1;while(state.jokers.includes(`${type}:${serial}`))serial++;
  state.jokers.push(`${type}:${serial}`);state.shopOffer.cards[index]=null;state.money-=item.price;return true;
}
export function upgradeBall(state,index,number){
  const type=state.shopOffer?.balls[index];
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!BALL_UPGRADES[type]||!Number.isInteger(number)||number<1||number>25||state.money<3||state.upgrades[number]===type)return false;
  state.upgrades[number]=type;state.shopOffer.balls[index]=null;state.money-=3;return true;
}
export function redrawShop(state,random=Math.random){
  if(!Object.keys(CARD_TYPES).length&&!Object.keys(BALL_UPGRADES).length)return false;
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!state.shopOffer||state.money<2)return false;
  state.money-=2;state.shopOffer=null;return openShop(state,random);
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
