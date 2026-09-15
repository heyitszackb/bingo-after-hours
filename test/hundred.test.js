import test from 'node:test';import assert from 'node:assert/strict';
import {newStage,openShop,buyItem,choose,redraw,draw,ballValue} from '../game.js';
const fixture=()=>{const shop=newStage(1,0);shop.status='passed';shop.bonusPaid=true;openShop(shop);const id=buyItem(shop,'hundred'),other=buyItem(shop,'hundred'),die=buyItem(shop,'d20'),bomb=buyItem(shop,'bomb');return {s:newStage(10,0,{}, {},shop.jokers,shop),id,other,die,bomb};};
const stamp=(s,id,tile,value=ballValue(s,id))=>{s.stamps.add(tile);s.stampBalls[tile]=id;s.stampValues[tile]=value;s.bag.delete(id);};
const play=(s,id,tile,rng)=>{s.offer=[id];s.destinations={[id]:tile};return choose(s,id,tile,rng);};
test('Anvil is free, independently drawable and passing never changes values',()=>{
 const {s,id}=fixture();assert.equal(ballValue(s,id),50);assert.equal(s.money,0);s.bag=new Set([1,id]);let hits=0;for(let i=0;i<100;i++)if(draw(s,()=>i/100)[0]===id)hits++;assert.equal(hits,50);
 stamp(s,2,8);s.offer=[id];s.destinations={[id]:13};redraw(s,()=>.5);assert.equal(s.stampValues[8],2);assert.ok(s.bag.has(id));assert.equal(s.calls,20);assert.deepEqual(s.valueModifiers,{});
});
test('before scoring, only occupied orthogonal numeric neighbors lose one; snapshot keeps old values',()=>{
 const {s,id}=fixture();[[1,8],[2,14],[3,18],[4,12],[5,7]].forEach(([n,t])=>stamp(s,n,t));const r=play(s,id,13);
 assert.equal(s.stampValues[13],50);assert.deepEqual(r.valueChanges.map(c=>[c.tile,c.before,c.after]),[[8,1,0],[14,2,1],[18,3,2],[12,4,3]]);assert.ok(r.valueChanges.every(c=>c.source===13&&c.delta===-1));assert.equal(r.effectBoard.stampValues[8],1);assert.equal(s.stampValues[7],5);assert.equal(r.points,0);assert.equal(s.stamps.size,6);
});
test('completed lines use reduced numbers immediately, including overlapping lines',()=>{
 const {s,id}=fixture();[11,12,14,15,3,8,18,23].forEach((t,i)=>stamp(s,i+1,t));const r=play(s,id,13);
 assert.equal(r.scoringGroups.length,2);assert.equal(r.points,132);assert.equal(r.valueChanges.length,4);assert.equal(r.activations.find(a=>a.tile===12).number,1);assert.equal(r.activations.find(a=>a.tile===8).number,5);
});
test('reductions stack through zero, persist next round, and influence High Five qualification',()=>{
 const {s,id,other}=fixture();stamp(s,1,13);play(s,id,8);play(s,other,12);assert.equal(s.stampValues[13],-1);assert.equal(ballValue(s,1),-1);assert.equal(s.valueModifiers[1],-2);
 const next=newStage(10,0,{}, {},['face-value','high-five:1'],s);assert.equal(ballValue(next,1),-1);assert.equal(play(next,1,13).activations.length,0);assert.deepEqual(newStage().valueModifiers,{});
 const low=fixture();stamp(low.s,6,13);play(low.s,low.id,8);const later=newStage(10,0,{}, {},['face-value','high-five:1'],low.s);assert.equal(play(later,6,13).points,5);
});
test('effects happen without cards, skip numberless items and empty cells, never wrap at edges',()=>{
 const {s,id,bomb}=fixture();s.jokers=[];stamp(s,2,4);stamp(s,3,6);stamp(s,4,9);stamp(s,bomb,10);const r=play(s,id,5);assert.deepEqual(r.valueChanges.map(c=>c.tile),[4]);assert.equal(s.stampValues[10],null);assert.equal(r.points,0);assert.ok(s.collection.includes(bomb));
});
test('a die retains its permanent penalty on future rolls; other Anvils can be reduced',()=>{
 const {s,id,other,die}=fixture();stamp(s,die,13,1);stamp(s,other,9);play(s,id,8);assert.equal(s.stampValues[13],0);assert.equal(s.stampValues[9],49);
 const next=newStage(10,0,{}, {},s.jokers,s);assert.equal(ballValue(next,die),null);assert.equal(ballValue(next,other),49);const r=play(next,die,13,()=>0);assert.equal(r.roll,0);assert.equal(next.stampValues[13],0);
});
test('future scoring uses negative values and Bomb destruction removes permanent modifiers',()=>{
 const {s,id,other,bomb}=fixture();stamp(s,1,13);play(s,id,8);play(s,other,12);s.jokers=['face-value','high-five:1'];const r=play(s,2,14);assert.equal(r.points,1);assert.deepEqual(r.activations.map(a=>a.points),[2,-1]);
 play(s,bomb,18);assert.ok(!s.collection.includes(1));assert.equal(s.valueModifiers[1],undefined);assert.ok(!newStage(10,0,{}, {},s.jokers,s).bag.has(1));
});
