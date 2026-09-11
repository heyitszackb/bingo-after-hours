export const PATTERNS = [
  ...Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r*5+c+1)),
  ...Array.from({length:5},(_,c)=>Array.from({length:5},(_,r)=>r*5+c+1)),
  [1,7,13,19,25],[5,9,13,17,21]
];
export const STAGE_TARGETS = [5,10,20,40,100,200,500,1000,5000,10000];
export const targetFor = stage => STAGE_TARGETS[stage-1];
export function newStage(stage=1,money=5,paints={}) {
  return {paints:{...paints},goldSeals:new Set(),shopOffer:null,stage,target:targetFor(stage),score:0,calls:12,money,bonusPaid:false,stamps:new Set(),bag:new Set(Array.from({length:25},(_,i)=>i+1)),played:Array(26).fill(0),status:'playing',offer:[]};
}
export function draw(state=newStage(),random=Math.random,count=3) {
  const bag=[...state.bag];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag.slice(0,Math.min(count,25));
}
export function choose(state,number) {
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)) return null;
  const duplicate=state.stamps.has(number);
  const goldEarnings=[...state.goldSeals].filter(n=>Math.abs(Math.floor((n-1)/5)-Math.floor((number-1)/5))+Math.abs((n-1)%5-(number-1)%5)===1);
  state.money+=goldEarnings.length;
  if(state.paints[number]==='gold')state.goldSeals.add(number);
  state.stamps.add(number);state.bag.delete(number);state.played[number]++;state.calls--;
  const patterns=PATTERNS.filter(p=>p.every(n=>state.stamps.has(n)));
  const cleared=[...new Set(patterns.flat())];
  const multipliers=patterns.map(pattern=>2**pattern.filter(n=>state.paints[n]==='orange').length);
  const activations=patterns.flatMap((pattern,i)=>pattern.map((number,j)=>({number,points:multipliers[i],patternMultiplier:j===0?multipliers[i]:1,pattern:j===0?pattern:null})));
  const points=activations.reduce((total,activation)=>total+activation.points,0);
  state.score+=points;
  cleared.forEach(n=>state.stamps.delete(n));
  state.offer=[];
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0)state.status='over';
  return {duplicate,patterns,cleared,activations,points,goldEarnings};
}
export function redraw(state,random=Math.random) {
  if(state.status!=='playing'||state.money<1)return false;
  state.money--;state.offer=draw(state,random);return true;
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
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!state.shopOffer?.includes(number)||!['gold','orange'].includes(color)||state.money<3||state.paints[number]===color)return false;
  state.money-=3;state.paints[number]=color;return true;
}
export function redrawShop(state,random=Math.random){
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!state.shopOffer||state.money<2)return false;
  state.money-=2;state.shopOffer=draw({bag:new Set(Array.from({length:25},(_,i)=>i+1))},random);return true;
}
