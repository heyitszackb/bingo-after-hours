const squareTiles=(row,column,size)=>Array.from({length:size*size},(_,i)=>(row+Math.floor(i/size))*5+column+i%size+1);
export const PATTERN_TYPES = [
  {id:'row',label:'5 in a row',previewTiles:[11,12,13,14,15],basePoints:5},
  {id:'column',label:'5 in a col',previewTiles:[3,8,13,18,23],basePoints:5},
  {id:'diagonal',label:'Diagonals',previewTiles:[1,7,13,19,25],basePoints:5},
  {id:'corners',label:'4 in corners',previewTiles:[1,5,21,25],basePoints:4},
  {id:'square4',label:'4 in a square',previewTiles:squareTiles(1,1,2),basePoints:4}
];
export const PATTERN_DEFINITIONS = [
  ...Array.from({length:5},(_,r)=>({id:`row-${r+1}`,type:'row',tiles:Array.from({length:5},(_,c)=>r*5+c+1)})),
  ...Array.from({length:5},(_,c)=>({id:`column-${c+1}`,type:'column',tiles:Array.from({length:5},(_,r)=>r*5+c+1)})),
  {id:'diagonal-1',type:'diagonal',tiles:[1,7,13,19,25]},
  {id:'diagonal-2',type:'diagonal',tiles:[5,9,13,17,21]},
  {id:'corners',type:'corners',tiles:[1,5,21,25]},
  ...Array.from({length:16},(_,i)=>({id:`square4-${Math.floor(i/4)+1}-${i%4+1}`,type:'square4',tiles:squareTiles(Math.floor(i/4),i%4,2)}))
];
export const PATTERNS = PATTERN_DEFINITIONS.map(pattern=>pattern.tiles);
export const freshPatternCounts=()=>Object.fromEntries(PATTERN_TYPES.map(({id})=>[id,0]));
export const completedPatterns=stamps=>PATTERN_DEFINITIONS.filter(({tiles})=>tiles.every(tile=>stamps.has(tile)));
export const STAGE_TARGETS = [5,10,15,20,30,40,55,70,90,120];
export const targetFor = stage => STAGE_TARGETS[stage-1];
export function newStage(stage=1,money=5,paints={},patternCounts={}) {
  return {rulesVersion:2,patternCounts:{...freshPatternCounts(),...patternCounts},stampBalls:{},destinations:{},paints:{...paints},callCapacity:12,shopOffer:null,stage,target:targetFor(stage),score:0,calls:12,money,bonusPaid:false,stamps:new Set(),bag:new Set(Array.from({length:25},(_,i)=>i+1)),played:Array(26).fill(0),status:'playing',offer:[]};
}
export function deal(state,random=Math.random,count=3){
  const empty=Array.from({length:25},(_,i)=>i+1).filter(tile=>!state.stamps.has(tile));
  state.offer=draw(state,random,Math.min(count,empty.length));
  for(let i=empty.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[empty[i],empty[j]]=[empty[j],empty[i]];}
  state.destinations=Object.fromEntries(state.offer.map((number,i)=>[number,empty[i]]));
  return state.offer;
}
export function draw(state=newStage(),random=Math.random,count=3) {
  const bag=[...state.bag];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag.slice(0,Math.min(count,25));
}
export function choose(state,number,tile=state.destinations[number]) {
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)||!Number.isInteger(tile)||(state.paints[number]!=='black'&&!Object.values(state.destinations).includes(tile))||tile<1||tile>25||state.stamps.has(tile)) return null;
  state.stamps.add(tile);state.stampBalls[tile]=number;state.bag.delete(number);state.played[number]++;state.calls--;
  const scoredPatterns=completedPatterns(state.stamps);
  const patterns=scoredPatterns.map(p=>p.tiles);
  state.patternCounts??=freshPatternCounts();
  for(const {type} of scoredPatterns)state.patternCounts[type]=(state.patternCounts[type]||0)+1;
  const cleared=[...new Set(patterns.flat())];
  const multipliers=patterns.map(pattern=>2**pattern.filter(tile=>state.paints[state.stampBalls[tile]]==='red').length);
  const activations=patterns.flatMap((pattern,i)=>pattern.map((tile,j)=>{
    const number=state.stampBalls[tile],color=state.paints[number];
    return {tile,number,points:multipliers[i],gold:color==='gold'?1:0,draws:color==='blue'?3:0,patternMultiplier:j===0?multipliers[i]:1,pattern:j===0?pattern:null};
  }));
  const points=activations.reduce((total,activation)=>total+activation.points,0);
  const gold=activations.reduce((sum,a)=>sum+a.gold,0),bonusDraws=activations.reduce((sum,a)=>sum+a.draws,0);
  state.money+=gold;state.calls+=bonusDraws;state.callCapacity+=bonusDraws;
  state.score+=points;
  cleared.forEach(tile=>{state.stamps.delete(tile);delete state.stampBalls[tile];});
  state.offer=[];state.destinations={};
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0||state.bag.size===0)state.status='over';
  return {tile,patterns,scoredPatterns,cleared,activations,points,gold,bonusDraws};
}
export function redraw(state,random=Math.random) {
  if(state.status!=='playing'||state.money<1)return false;
  state.money--;deal(state,random);return true;
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
  state.shopOffer??=draw({bag:new Set(Array.from({length:25},(_,i)=>i+1))},random);
  return true;
}
export function paintBall(state,number,color){
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!state.shopOffer?.includes(number)||!['gold','red','blue','black'].includes(color)||state.money<3||state.paints[number]===color)return false;
  state.money-=3;state.paints[number]=color;return true;
}
export function redrawShop(state,random=Math.random){
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!state.shopOffer||state.money<2)return false;
  state.money-=2;state.shopOffer=draw({bag:new Set(Array.from({length:25},(_,i)=>i+1))},random);return true;
}
