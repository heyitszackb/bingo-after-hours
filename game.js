export const PATTERNS = [
  ...Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r*5+c+1)),
  ...Array.from({length:5},(_,c)=>Array.from({length:5},(_,r)=>r*5+c+1)),
  [1,7,13,19,25],[5,9,13,17,21]
];
export const targetFor = stage => stage * 10;
export function newStage(stage=1,money=5) {
  return {stage,target:targetFor(stage),score:0,calls:12,money,bonusPaid:false,stamps:new Set(),bag:new Set(Array.from({length:25},(_,i)=>i+1)),played:Array(26).fill(0),status:'playing',offer:[]};
}
export function draw(state=newStage(),random=Math.random,count=3) {
  const bag=[...state.bag];
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag.slice(0,Math.min(count,25));
}
export function choose(state,number) {
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)) return null;
  const duplicate=state.stamps.has(number);
  state.stamps.add(number);state.bag.delete(number);state.played[number]++;state.calls--;
  const patterns=PATTERNS.filter(p=>p.every(n=>state.stamps.has(n)));
  const cleared=[...new Set(patterns.flat())];
  const activations=patterns.flatMap(pattern=>pattern.map(number=>({number,points:1})));
  const points=activations.reduce((total,activation)=>total+activation.points,0);
  state.score+=points;
  cleared.forEach(n=>state.stamps.delete(n));
  state.offer=[];
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0)state.status='over';
  return {duplicate,patterns,cleared,activations,points};
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
