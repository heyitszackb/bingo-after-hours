export const PATTERNS = [
  ...Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r*5+c+1)),
  ...Array.from({length:5},(_,c)=>Array.from({length:5},(_,r)=>r*5+c+1)),
  [1,7,13,19,25],[5,9,13,17,21]
];
export const targetFor = stage => stage * 10;
export function newStage(stage=1) {
  return {stage,target:targetFor(stage),score:0,calls:12,redraws:2,stamps:new Set(),played:Array(26).fill(0),status:'playing',offer:[]};
}
export function draw(random=Math.random,count=3) {
  const bag=Array.from({length:25},(_,i)=>i+1);
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  return bag.slice(0,Math.min(count,25));
}
export function choose(state,number) {
  if(state.status!=='playing'||!state.offer.includes(number)) return null;
  const duplicate=state.stamps.has(number);
  state.stamps.add(number);state.played[number]++;state.calls--;
  const patterns=PATTERNS.filter(p=>p.every(n=>state.stamps.has(n)));
  const cleared=[...new Set(patterns.flat())];
  state.score+=patterns.length*10;
  cleared.forEach(n=>state.stamps.delete(n));
  state.offer=[];
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0)state.status='over';
  return {duplicate,patterns,cleared,points:patterns.length*10};
}
export function redraw(state,random=Math.random) {
  if(state.status!=='playing'||state.redraws===0)return false;
  state.redraws--;state.offer=draw(random);return true;
}
