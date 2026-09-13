import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,deal,openShop,buyCard,upgradeBall,removeJoker,ballValue} from '../game.js';
const stamp=(s,n,t,value=n)=>{s.stamps.add(t);s.stampBalls[t]=n;s.stampValues[t]=value;s.bag.delete(n);};
const place=(s,n,t,random)=>{s.offer=[n];s.destinations={[n]:t};return choose(s,n,t,random);};
test('X can occupy any empty tile, has no number, but completes lines and earns positional bonuses',()=>{
 const s=newStage(10,5,{5:'x'}, {},['bingo','single-digits:1','outer-layer:1']);[1,2,3,4].forEach(n=>stamp(s,n,n));s.offer=[5];s.destinations={5:25};
 const r=choose(s,5,5);assert.equal(ballValue(s,5),null);assert.equal(s.stampValues[5],null);assert.equal(r.points,34);
 assert.deepEqual(r.activations[4].bonuses,[{joker:'outer-layer:1',points:5}]);assert.equal(s.stamps.size,5);
 const before=s.calls;assert.equal(choose(s,5,1),null);assert.equal(s.calls,before);
});
test('Doubler changes all eight neighbors, not itself, distant tiles, or X; eligibility uses the new value',()=>{
 const s=newStage(10,5,{25:'doubler',2:'x'}, {},['bingo','single-digits:1']);
 [7,8,9,12,14,17,18,19].forEach((t,i)=>stamp(s,i+1,t,i===1?null:i+1));stamp(s,20,1,20);
 const r=place(s,25,13);assert.equal(r.doubled.length,7);assert.equal(s.stampValues[13],25);assert.equal(s.stampValues[8],null);assert.equal(s.stampValues[1],20);
 assert.equal(s.stampValues[7],2);assert.equal(s.stampValues[19],16);
 const edge=newStage(10,5,{25:'doubler'});stamp(edge,1,5);stamp(edge,2,6);stamp(edge,3,7);stamp(edge,4,11);
 place(edge,25,1);assert.equal(edge.stampValues[5],1);assert.equal(edge.stampValues[6],4);assert.equal(edge.stampValues[7],6);assert.equal(edge.stampValues[11],4);
});
test('doubling happens before bonuses and does not raise the base score',()=>{
 const s=newStage(10,5,{25:'doubler'}, {},['bingo','single-digits:1']);[1,2,3,4].forEach(n=>stamp(s,n,n,n===4?5:n));
 const r=place(s,25,5);assert.equal(s.stampValues[4],10);assert.equal(r.points,8);assert.equal(r.activations[3].bonuses.length,0);
});
test('Tornado scatters every stamp without losing identity or values, then scores its resulting lines',()=>{
 const s=newStage(10,5,{25:'tornado',1:'x'});[6,12,18,24].forEach((t,i)=>stamp(s,i+1,t,i===0?null:(i+1)*4));
 const r=place(s,25,13,()=>.999);assert.equal(r.moves.length,5);assert.deepEqual([...s.stamps],[1,2,3,4,5]);assert.deepEqual(Object.values(s.stampBalls),[1,2,3,4,25]);
 assert.deepEqual(Object.values(s.stampValues),[null,8,12,16,25]);assert.equal(r.points,5);assert.equal(s.calls,11);assert.equal(s.bag.size,20);
 deal(s);assert.ok(Object.values(s.destinations).every(t=>t>5));
});
test('Outer Layer follows positions and stacks independently with single digits and duplicate cards',()=>{
 const s=newStage(10,5,{}, {},['bingo','outer-layer:1','outer-layer:2','single-digits:1']);let r;
 [11,12,13,14,15].forEach((t,i)=>{r=place(s,i+1,t);});assert.equal(r.points,30);
 assert.deepEqual(r.activations.map(a=>a.points),[12,2,2,2,12]);
});
test('five purchased cards plus Bingo; trashing one copy frees a slot without removing another',()=>{
 const s=newStage(1,100);s.status='passed';s.bonusPaid=true;
 for(let i=0;i<5;i++){s.shopOffer=null;openShop(s);assert.ok(buyCard(s,0));}
 assert.equal(s.jokers.length,6);s.shopOffer=null;openShop(s);const money=s.money;assert.equal(buyCard(s,0),false);assert.equal(s.money,money);
 const id=s.jokers[1];removeJoker(s,id);assert.ok(buyCard(s,0));assert.equal(s.jokers.length,6);assert.equal(new Set(s.jokers).size,6);
});
test('upgrades replace rather than stack; shop never charges for the same upgrade; stage resets values only',()=>{
 const s=newStage(1,20,{1:'x'});s.status='passed';s.bonusPaid=true;s.shopOffer={cards:['single-digits','outer-layer'],balls:['x','doubler']};
 assert.equal(upgradeBall(s,0,1),false);assert.equal(s.money,20);assert.ok(upgradeBall(s,1,1));assert.equal(s.upgrades[1],'doubler');assert.equal(s.money,17);
 const next=newStage(2,s.money,s.upgrades,s.patternCounts,s.jokers);assert.equal(next.upgrades[1],'doubler');assert.deepEqual(next.stampValues,{});assert.equal(ballValue(next,1),1);
});
test('Dynamite returns all eight neighbors, preserving values/upgrades/counts and leaving itself out',()=>{
 const s=newStage(10,5,{25:'dynamite',1:'x',2:'tornado',3:'dynamite'});
 const neighbors=[7,8,9,12,14,17,18,19];neighbors.forEach((tile,i)=>{stamp(s,i+1,tile,i===0?null:(i+1)*4);s.played[i+1]=1;});stamp(s,20,1,20);
 const r=place(s,25,13);assert.equal(r.returned.length,8);assert.deepEqual([...s.stamps],[1,13]);assert.deepEqual(s.stampBalls,{1:20,13:25});assert.deepEqual(s.stampValues,{1:20,13:25});
 assert.equal(s.bag.size,23);assert.ok(!s.bag.has(25));assert.ok(!s.bag.has(20));assert.equal(s.calls,11);assert.equal(s.played[25],1);assert.equal(r.points,0);
 for(let n=1;n<=8;n++){assert.ok(s.bag.has(n));assert.equal(s.played[n],1);assert.equal(ballValue(s,n),n===1?null:n*4);}
 assert.equal(s.upgrades[2],'tornado');assert.equal(s.upgrades[3],'dynamite');
 // Replay returned X without clearing history, on a newly empty cell.
 place(s,1,7);assert.equal(s.stampValues[7],null);assert.equal(s.played[1],2);assert.ok(!s.bag.has(1));assert.equal(s.calls,10);
});
test('Dynamite corners do not wrap rows, empty blasts are valid, and it destroys before scoring',()=>{
 const s=newStage(10,5,{25:'dynamite'});[2,5,6,7,11].forEach((tile,i)=>stamp(s,i+1,tile));
 const r=place(s,25,1);assert.deepEqual(r.returned.map(b=>b.tile),[2,6,7]);assert.deepEqual([...s.stamps],[5,11,1]);
 const empty=newStage(10,5,{25:'dynamite'});assert.deepEqual(place(empty,25,13).returned,[]);assert.equal(empty.stampValues[13],25);
 const row=newStage(10,5,{25:'dynamite'});[1,2,3,4].forEach(n=>stamp(row,n,n));const boom=place(row,25,5);
 assert.equal(boom.points,0);assert.equal(row.stamps.has(4),false);assert.equal(row.stamps.has(5),true);assert.equal(row.patternCounts.row,0);
});
