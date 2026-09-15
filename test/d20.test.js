import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,openShop,buyItem,choose,draw,redraw,ballValue} from '../game.js';
const fixture=()=>{const shop=newStage(1,0);shop.status='passed';shop.bonusPaid=true;openShop(shop);const id=buyItem(shop,'d20');return {s:newStage(10,0,{}, {},shop.jokers,shop),id};};
const stamp=(s,id,tile)=>{s.stamps.add(tile);s.stampBalls[tile]=id;s.stampValues[tile]=id;s.bag.delete(id);};
const offer=(s,id,tile)=>{s.offer=[id];s.destinations={[id]:tile};};
test('die is a free independent item, including when reopening a saved Bomb-only shop',()=>{
 const s=newStage(1,0);s.status='passed';s.bonusPaid=true;s.shopOffer={cards:[null,null],balls:[null,null],items:['bomb']};openShop(s);
 const a=buyItem(s,'d20'),b=buyItem(s,'d20');assert.equal(a,26);assert.equal(b,27);assert.equal(s.money,0);assert.equal(s.items[a],'d20');assert.equal(ballValue(s,a),null);
 s.bag=new Set([1,a]);let hits=0;for(let i=0;i<100;i++)if(draw(s,()=>i/100)[0]===a)hits++;assert.equal(hits,50);
});
test('all 20 outcomes occur evenly, only after a valid placement',()=>{
 for(let i=0;i<200;i++){const {s,id}=fixture();offer(s,id,13);let calls=0;const random=()=>{calls++;return i/200;};
 assert.equal(choose(s,id,12,random),null);assert.equal(calls,0);assert.equal(ballValue(s,id),null);
 const r=choose(s,id,13,random);assert.equal(r.roll,1+Math.floor(i/10));assert.equal(s.stampValues[13],r.roll);assert.equal(calls,1);assert.equal(s.calls,16);assert.ok(!s.bag.has(id));
 assert.equal(choose(s,id,13,random),null);assert.equal(calls,1);
 }
});
test('passing an unknown die preserves it without setting any value',()=>{
 const {s,id}=fixture();offer(s,id,13);redraw(s,()=>.5);assert.equal(s.calls,17);assert.equal(s.passes,9);assert.ok(s.bag.has(id));assert.equal(ballValue(s,id),null);assert.deepEqual(s.stampValues,{});
});
test('roll resolves before a completed line scores and the same value scores in later lines',()=>{
 const {s,id}=fixture();[1,2,3,4].forEach(n=>stamp(s,n,n));offer(s,id,5);const first=choose(s,id,5,()=>.9999);
 assert.equal(first.roll,20);assert.equal(first.points,30);assert.equal(first.activations[4].number,20);
 [10,15,20].forEach(n=>stamp(s,n,n));offer(s,25,25);const later=choose(s,25,25);assert.equal(later.roll,null);assert.equal(later.points,90);assert.equal(later.activations[0].number,20);assert.equal(s.stampValues[5],20);
 const next=newStage(10,0,{}, {},s.jokers,s);assert.equal(ballValue(next,id),null);assert.ok(next.bag.has(id));offer(next,id,1);assert.equal(choose(next,id,1,()=>0).roll,1);
});
test('die still rolls without points or scoring cards and can be permanently destroyed by a Bomb',()=>{
 for(const jokers of [[],['bingo']]){const {s,id}=fixture();s.jokers=jokers;[1,2,3,4].forEach(n=>stamp(s,n,n));offer(s,id,5);const r=choose(s,id,5,()=>.5);assert.equal(r.roll,11);assert.equal(r.points,0);assert.equal(r.activations.length,jokers.length?5:0);}
 const {s,id}=fixture();offer(s,id,13);choose(s,id,13,()=>.5);const bomb=s.nextItemId++;s.items[bomb]='bomb';s.collection.push(bomb);s.bag.add(bomb);offer(s,bomb,14);const r=choose(s,bomb,14);assert.ok(r.destroyed.some(d=>d.id===id));assert.ok(!newStage(10,0,{}, {},s.jokers,s).collection.includes(id));
});
