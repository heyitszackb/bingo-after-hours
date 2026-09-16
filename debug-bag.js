import {ballValue,ITEM_TYPES} from './game.js?v=48c65f95136d';

export const DEBUG_BAG_LIMIT=500;
export const baseBagRecipe=()=>Array.from({length:25},(_,i)=>({type:'number',value:i+1,count:1}));
export function bagRecipe(state){
  const groups=new Map();
  for(const id of state.collection){
    const type=state.items[id]||'number',value=['potion20','potion2','potionCopy','potionMelt','doubleball','question','bomb','x2','x3','copier','trash','plus10','plus50','plus100'].includes(type)?null:type==='d20'?(state.valueModifiers[id]||0):ballValue(state,id),key=`${type}:${value}`;
    if(groups.has(key))groups.get(key).count++;
    else groups.set(key,{type,value,count:1});
  }
  return [...groups.values()];
}
// Each copy receives its own identity, so duplicates draw, score and disappear
// independently. Building a draft never mutates the live game.
export function buildDebugBag(recipe){
  if(!Array.isArray(recipe))throw new Error('Choose the pieces for your bag.');
  let total=0;
  for(const row of recipe){
    if(!row||!(row.type==='number'||Object.hasOwn(ITEM_TYPES,row.type)))throw new Error('Choose a valid piece type.');
    if(!Number.isInteger(row.count)||row.count<1)throw new Error('Copies must be whole numbers of 1 or more.');
    if(!['potion20','potion2','potionCopy','potionMelt','doubleball','question','bomb','x2','x3','copier','trash','plus10','plus50','plus100'].includes(row.type)&&!Number.isSafeInteger(row.value))throw new Error('Values must be whole numbers.');
    total+=row.count;
    if(total>DEBUG_BAG_LIMIT)throw new Error(`Use at most ${DEBUG_BAG_LIMIT} pieces in a test bag.`);
  }
  if(!total)throw new Error('Add at least one piece before applying.');
  const collection=[],items={},ballValues={},valueModifiers={};let nextItemId=26;
  for(const row of recipe)for(let i=0;i<row.count;i++){
    const baseId=row.type==='number'&&row.value>=1&&row.value<=25&&!collection.includes(row.value);
    const id=baseId?row.value:nextItemId++;collection.push(id);
    if(row.type==='number'){if(!baseId)ballValues[id]=row.value;}
    else{
      items[id]=row.type;
      if(row.type==='d20'&&row.value)valueModifiers[id]=row.value;
      if((row.type==='hundred'&&row.value!==50)||(row.type==='seed'&&row.value!==1)||(['earth','mars','moon','jupiter','king'].includes(row.type)&&row.value!==0)||(row.type==='statue'&&row.value!==10))ballValues[id]=row.value;
    }
  }
  return {collection,items,ballValues,valueModifiers,nextItemId};
}
