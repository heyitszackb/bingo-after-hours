import test from 'node:test';import assert from 'node:assert/strict';
import {baseBagRecipe,bagRecipe,buildDebugBag} from '../debug-bag.js';import {newStage,choose,deal,ballValue} from '../game.js';
const make=rows=>newStage(10,12,{}, {},['bingo','face-value','high-five:1'],buildDebugBag(rows));
const play=(s,id,tile)=>{s.offer=[id];s.destinations={[id]:tile};return choose(s,id,tile,()=>0);};
test('base preset exactly recreates the original 1–25 collection',()=>{
 const inventory=buildDebugBag(baseBagRecipe()),s=make(baseBagRecipe());assert.deepEqual(inventory.collection,Array.from({length:25},(_,i)=>i+1));assert.equal(inventory.nextItemId,26);assert.deepEqual(inventory.items,{});assert.deepEqual(bagRecipe(s),baseBagRecipe());assert.equal(s.calls,17);assert.equal(s.passes,10);
});
test('duplicates have independent identities, placement and High Five scoring',()=>{
 const s=make([{type:'number',value:5,count:3}]);const [a,b,c]=s.collection;assert.equal(new Set(s.collection).size,3);assert.ok(b>25);assert.equal(ballValue(s,b),5);assert.equal(play(s,a,13).points,5);assert.equal(play(s,b,14).points,10);assert.ok(s.bag.has(c));assert.equal(s.stampValues[13],5);assert.equal(s.stampValues[14],5);
});
test('custom numeric values include zero and negatives and survive rounds',()=>{
 const s=make([{type:'number',value:100,count:1},{type:'number',value:0,count:1},{type:'number',value:-7,count:1}]);
 const next=newStage(10,s.money,{}, {},s.jokers,s);assert.deepEqual(next.collection.map(id=>ballValue(next,id)),[100,0,-7]);
});
test('current bag recipes retain powers, values and die modifiers without including destroyed items',()=>{
 const s=make([{type:'number',value:5,count:2},{type:'king',value:80,count:1},{type:'d20',value:-2,count:1},{type:'bomb',value:null,count:1}]);
 play(s,s.collection[0],13);const recipe=bagRecipe(s),rebuilt=make(recipe);assert.deepEqual(bagRecipe(rebuilt),recipe);const die=rebuilt.collection.find(id=>rebuilt.items[id]==='d20');assert.equal(play(rebuilt,die,1).roll,-1);
 const bomb=s.collection.find(id=>s.items[id]==='bomb');play(s,bomb,25);assert.ok(!bagRecipe(s).some(r=>r.type==='bomb'));
});
test('draft validation rejects empty, invalid or excessive bags without touching the live run',()=>{
 const live=newStage();const before=JSON.stringify(live);for(const rows of [[],[{type:'number',value:1,count:0}],[{type:'number',value:1.5,count:1}],[{type:'number',value:null,count:1}],[{type:'number',value:1,count:501}],[{type:'bogus',value:1,count:1}]])assert.throws(()=>buildDebugBag(rows));assert.equal(JSON.stringify(live),before);assert.equal(buildDebugBag([{type:'number',value:-999,count:500}]).collection.length,500);
});
test('a custom one-piece bag deals and plays without requiring base numbered balls',()=>{
 const s=make([{type:'number',value:42,count:1}]);deal(s,()=>.5);const r=choose(s,s.offer[0]);assert.ok(r);assert.equal(s.stampValues[r.tile],42);assert.equal(s.status,'over');
});

test('custom values matching allocated IDs retain an explicit numeric definition',()=>{
 const inventory=buildDebugBag([{type:'number',value:26,count:1}]);assert.deepEqual(inventory.collection,[26]);assert.equal(inventory.ballValues[26],26);
});
