export const PATTERN_TYPES = [
  {id:'row',label:'5 in a row',previewTiles:[11,12,13,14,15],basePoints:5},
  {id:'column',label:'5 in a col',previewTiles:[3,8,13,18,23],basePoints:5},
  {id:'diagonal',label:'Diagonals',previewTiles:[1,7,13,19,25],basePoints:5},
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
export const CARD_TYPES={
  'single-digits':{name:'Single Digits',text:'Single digits get +1 when scored',icon:'1–9'},
  'outer-layer':{name:'Outer Layer',text:'Outer edge tiles get +5 when scored',icon:'▣'},
  'number-cruncher':{name:'Number Cruncher',text:'+number when scored. X adds 0.',icon:'+#',price:7},
  'call-range':{name:'Second Wind',text:'Scored numbers in this range give +1 play. Max 15.',icon:'↻',price:3}
};
export const BALL_UPGRADES={
  plasma:{name:'Plasma',text:'Next turn, see the space and choose any ball still in the bag.',icon:'✧'},
  x:{name:'X Ball',text:'Place anywhere. Has no numeric value.',icon:'X'},
  tornado:{name:'Tornado',text:'On placement, scatter every stamp across the board.',icon:'≋'},
  dynamite:{name:'Dynamite',text:'Return all 8 neighboring stamps to the bag. This ball stays.',icon:'✹'},
  doubler:{name:'Doubler',text:'On placement, double all 8 neighboring numbers.',icon:'×2'}
};
export const cardType=id=>id.split(':')[0];
export function cardDetails(id){
  if(typeof id!=='string')return null;
  const type=cardType(id),base=CARD_TYPES[type];if(!base)return null;
  if(type!=='call-range')return {...base,price:base.price??3};
  const start=Number(id.split(':')[1]);if(!Number.isInteger(start)||start<1||start>21)return null;
  return {...base,start,end:start+4,icon:`${start}–${start+4}`,text:`${start}–${start+4}: +1 play when scored. Max 15.`};
}
export const normalizeJokers=jokers=>{
  if(!Array.isArray(jokers))return ['bingo'];
  const cards=[...new Set(jokers.filter(id=>cardDetails(id)))].slice(0,5);
  return [...(jokers.some(id=>['bingo','row','column','diagonal'].includes(id))?['bingo']:[]),...cards];
};
export const ballValue=(state,number)=>state.upgrades[number]==='x'?null:(state.ballValues?.[number]??number);
export function newStage(stage=1,money=5,upgrades={},patternCounts={},jokers=['bingo']) {
  return {turnVersion:1,passes:10,plasmaPending:false,plasmaActive:false,rulesVersion:3,upgradeVersion:2,ballValues:{},jokerVersion:3,scoredLines:[],jokers:normalizeJokers(jokers),patternCounts:{...freshPatternCounts(),...patternCounts},stampBalls:{},stampValues:{},destinations:{},upgrades:{...upgrades},callCapacity:15,shopOffer:null,stage,target:targetFor(stage),score:0,calls:15,money,bonusPaid:false,stamps:new Set(),bag:new Set(Array.from({length:25},(_,i)=>i+1)),played:Array(26).fill(0),status:'playing',offer:[]};
}
const shuffled=(values,random)=>{
  const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
};
export function deal(state,random=Math.random,count=1){
  const empty=Array.from({length:25},(_,i)=>i+1).filter(tile=>!state.stamps.has(tile));
  state.plasmaActive=!!(state.plasmaPending||state.plasmaActive);state.plasmaPending=false;
  state.offer=state.plasmaActive&&empty.length?[...state.bag]:draw(state,random,Math.min(count,empty.length));
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
  if(state.status!=='playing'||!state.offer.includes(number)||!state.bag.has(number)||!Number.isInteger(tile)||(state.upgrades[number]!=='x'&&!Object.values(state.destinations).includes(tile))||tile<1||tile>25||state.stamps.has(tile))return null;
  state.stamps.add(tile);state.stampBalls[tile]=number;state.stampValues[tile]=ballValue(state,number);state.bag.delete(number);state.played[number]++;state.calls--;
  const upgrade=state.upgrades[number],moves=[],doubled=[],returned=[];
  state.plasmaActive=false;state.plasmaPending=upgrade==='plasma';
  const callsBeforeBonuses=state.calls;
  state.ballValues??={};
  if(upgrade==='doubler'){
    const row=Math.floor((tile-1)/5),col=(tile-1)%5;
    for(const other of state.stamps){
      const value=state.stampValues[other];
      if(other!==tile&&value!==null&&Math.abs(Math.floor((other-1)/5)-row)<=1&&Math.abs((other-1)%5-col)<=1){
        state.stampValues[other]=value*2;state.ballValues[state.stampBalls[other]]=value*2;doubled.push({tile:other,before:value,after:value*2});
      }
    }
  }
  if(upgrade==='tornado'){
    const destinations=shuffled(Array.from({length:25},(_,i)=>i+1),random),balls={},values={};
    [...state.stamps].forEach((from,i)=>{const to=destinations[i];balls[to]=state.stampBalls[from];values[to]=state.stampValues[from];moves.push({from,to,number:balls[to],value:values[to]});});
    state.stampBalls=balls;state.stampValues=values;state.stamps=new Set(Object.keys(balls).map(Number));
  }
  if(upgrade==='dynamite'){
    const row=Math.floor((tile-1)/5),col=(tile-1)%5;
    for(const other of [...state.stamps]){
      if(other===tile||Math.abs(Math.floor((other-1)/5)-row)>1||Math.abs((other-1)%5-col)>1)continue;
      const ball=state.stampBalls[other],value=state.stampValues[other];
      returned.push({tile:other,number:ball,value});
      if(value!==null)state.ballValues[ball]=value;
      state.bag.add(ball);state.stamps.delete(other);delete state.stampBalls[other];delete state.stampValues[other];
    }
  }
  const scoredPatterns=completedPatterns(state.stamps).filter(p=>!state.scoredLines.includes(p.id)&&(upgrade==='tornado'||p.tiles.includes(tile))&&state.jokers.includes('bingo'));
  const patterns=scoredPatterns.map(p=>p.tiles);
  for(const {type} of scoredPatterns)state.patternCounts[type]=(state.patternCounts[type]||0)+1;
  state.scoredLines.push(...scoredPatterns.map(p=>p.id));
  const activations=patterns.flatMap((pattern,i)=>pattern.map((tile,j)=>{
    const number=state.stampValues[tile],bonuses=[];
    for(const joker of state.jokers){
      if(cardType(joker)==='single-digits'&&number!==null&&number>=1&&number<=9)bonuses.push({joker,points:1});
      if(cardType(joker)==='number-cruncher'&&number!==null)bonuses.push({joker,points:number});
      if(cardType(joker)==='call-range'){
        const range=cardDetails(joker);
        if(number!==null&&number>=range.start&&number<=range.end){
          const calls=Math.max(0,Math.min(1,15-state.calls));state.calls+=calls;bonuses.push({joker,points:0,calls});
        }
      }
      if(cardType(joker)==='outer-layer'&&(tile<=5||tile>=21||tile%5===1||tile%5===0))bonuses.push({joker,points:5});
    }
    return {tile,number,basePoints:1,bonuses,points:1+bonuses.reduce((sum,b)=>sum+b.points,0),type:scoredPatterns[i].type,pattern:j===0?pattern:null};
  }));
  const points=activations.reduce((sum,a)=>sum+a.points,0);state.score+=points;
  state.offer=[];state.destinations={};
  if(state.score>=state.target)state.status='passed';
  else if(state.calls===0||state.bag.size===0||state.stamps.size===25)state.status='over';
  return {tile,upgrade,moves,doubled,returned,callsBeforeBonuses,patterns,scoredPatterns,activations,points};
}
export function redraw(state,random=Math.random) {
  if(state.status!=='playing'||state.passes<1||!state.offer.length)return false;
  const oldBalls=new Set(state.offer),oldTiles=new Set(Object.values(state.destinations));
  state.passes--;deal(state,random);
  // The offered ball is still in the bag. Prefer a fresh ball and space when possible.
  if(!state.plasmaActive){
    const candidates=[...state.bag].filter(n=>!oldBalls.has(n));
    if(candidates.length)state.offer=[candidates[Math.floor(random()*candidates.length)]];
  }
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
  state.shopOffer??={cards:shuffled(Object.keys(CARD_TYPES),random).slice(0,2).map(type=>type==='call-range'?`${type}:${1+Math.floor(random()*21)}`:type),balls:shuffled(Object.keys(BALL_UPGRADES),random).slice(0,2)};return true;
}
export function buyCard(state,index){
  const type=state.shopOffer?.cards[index],item=cardDetails(type);
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!item||state.money<item.price||state.jokers.filter(id=>id!=='bingo').length>=5)return false;
  let serial=1;while(state.jokers.includes(`${type}:${serial}`))serial++;
  state.jokers.push(`${type}:${serial}`);state.shopOffer.cards[index]=null;state.money-=item.price;return true;
}
export function upgradeBall(state,index,number){
  const type=state.shopOffer?.balls[index];
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!BALL_UPGRADES[type]||!Number.isInteger(number)||number<1||number>25||state.money<3||state.upgrades[number]===type)return false;
  state.upgrades[number]=type;state.shopOffer.balls[index]=null;state.money-=3;return true;
}
export function redrawShop(state,random=Math.random){
  if(state.status!=='passed'||!state.bonusPaid||state.stage>=10||!state.shopOffer||state.money<2)return false;
  state.money-=2;state.shopOffer=null;return openShop(state,random);
}

export function removeJoker(state,type){
  if(!state.jokers?.includes(type))return false;
  state.jokers=state.jokers.filter(id=>id!==type);return true;
}
