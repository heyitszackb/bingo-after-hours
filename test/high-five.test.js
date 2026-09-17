import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,openShop,buyCard,buyItem,normalizeJokers,removeJoker} from '../game.js';
const joker='high-five:1';
const make=(jokers=['bingo','face-value',joker])=>newStage(10,0,{}, {},jokers);
const stamp=(s,n,t)=>{s.stamps.add(t);s.stampBalls[t]=n;s.stampValues[t]=n;s.bag.delete(n);};
const play=(s,n,t,random)=>{s.offer=[n];s.playableSpaces=undefined;s.destinations={[n]:t};return choose(s,n,t,random);};
test('High Five scores itself and occupied orthogonal neighbors, without diagonals or recursive triggers',()=>{
 const s=make();[[2,8],[3,14],[4,18],[5,12],[20,7]].forEach(([n,t])=>stamp(s,n,t));const r=play(s,1,13);
 assert.deepEqual(r.scoringGroups,[{trigger:joker,retriggers:[],type:'cross',tiles:[13,8,14,18,12]}]);assert.equal(r.points,15);assert.equal(r.activations.length,5);assert.equal(s.calls,16);assert.equal(s.stamps.size,6);assert.deepEqual(s.scoredLines,[]);
 assert.ok(r.activations.every(a=>a.trigger===joker&&a.contributions[0].joker==='face-value'));
});
test('all low values qualify; six through twenty-five do not, and edge neighbors never wrap',()=>{
 for(let n=1;n<=25;n++){const s=make();const r=play(s,n,13);assert.equal(r.points,n<=5?n:0);assert.equal(r.activations.length,n<=5?1:0);}
 const s=make();[[6,4],[7,10],[8,6],[9,9]].forEach(([n,t])=>stamp(s,n,t));const r=play(s,5,5);assert.deepEqual(r.activations.map(a=>a.tile),[5,10,4]);assert.equal(r.points,18);
});
test('completed Bingo and cross score independently, preserving shared tile activations and card order',()=>{
 for(const reverse of [false,true]){const s=make(reverse?[joker,'face-value','bingo']:undefined);[[6,1],[7,2],[8,3],[9,4],[10,10]].forEach(([n,t])=>stamp(s,n,t));const r=play(s,5,5);
 assert.deepEqual(r.scoringGroups.map(g=>g.trigger),reverse?[joker,'bingo']:['bingo',joker]);assert.equal(r.points,59);assert.equal(r.activations.filter(a=>a.tile===5).length,2);assert.equal(r.activations.filter(a=>a.tile===4).length,2);assert.equal(s.patternCounts.row,1);assert.deepEqual(s.scoredLines,['row-1']);assert.equal(s.stamps.size,6);
 assert.deepEqual(normalizeJokers(s.jokers),s.jokers);assert.deepEqual(newStage(10,0,{}, {},s.jokers,s).jokers,s.jokers);
 }
});
test('High Five works without Bingo and scores for zero without a point provider',()=>{
 for(const rules of [['face-value',joker],[joker],['bingo','face-value']]){const s=make(rules);stamp(s,12,8);const r=play(s,3,13);assert.equal(r.activations.length,rules.includes(joker)?2:0);assert.equal(r.points,rules.includes(joker)&&rules.includes('face-value')?15:0);}
 const s=make();removeJoker(s,joker);assert.equal(play(s,1,13).activations.length,0);
});
test('a die rolls before testing High Five, using its value rather than its bag identity',()=>{
 const shop=newStage();shop.status='passed';shop.bonusPaid=true;openShop(shop);const id=buyItem(shop,'d20');
 for(const random of Array.from({length:20},(_,i)=>()=>i/20)){const s=newStage(10,0,{}, {},['face-value',joker],shop);stamp(s,19,8);const r=play(s,id,13,random);assert.equal(r.points,r.roll<=5?r.roll+19:0);assert.equal(s.stampValues[13],r.roll);}
});
test('fresh low placements can rescore neighbors; duplicate cards each trigger once, even on a winning final play',()=>{
 const s=make(['bingo','face-value',joker,'high-five:2']);stamp(s,20,13);let r=play(s,1,8);assert.equal(r.points,42);r=play(s,2,12);assert.equal(r.points,44);assert.equal(s.stampValues[13],20);
 s.calls=1;s.target=87;r=play(s,3,14);assert.equal(r.points,46);assert.equal(s.status,'passed');assert.equal(s.calls,0);assert.equal(r.scoringGroups.length,2);
});
test('shop adds High Five free once per shop; purchases, limits, removal and saved-offer migration work',()=>{
 const s=newStage(1,0);s.status='passed';s.bonusPaid=true;s.shopOffer={cards:[null,null],balls:[null,null],items:['bomb','d20']};openShop(s);assert.deepEqual(s.shopOffer.cards,['high-five','encore']);assert.ok(buyCard(s,0));assert.equal(s.money,0);assert.ok(s.jokers.includes(joker));assert.equal(buyCard(s,0),false);openShop(s);assert.deepEqual(s.shopOffer.cards,[null,'encore']);
 for(let i=0;i<4;i++){s.shopOffer=null;openShop(s);assert.ok(buyCard(s,0));}s.shopOffer=null;openShop(s);assert.equal(buyCard(s,0),false);assert.equal(s.jokers.length,7);removeJoker(s,joker);assert.ok(buyCard(s,0));assert.equal(s.money,0);
});
