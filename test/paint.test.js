import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,PATTERNS,settleStage,paintBall} from '../game.js';
const place=(s,ball,tile)=>{s.offer=[ball];s.destinations={[ball]:tile};return choose(s,ball);};
test('paints travel with balls to any location and remain there across later offers',()=>{
 const s=newStage(10,5,{25:'blue',2:'gold',18:'red'});place(s,25,1);place(s,2,2);place(s,18,3);assert.equal(s.stampBalls[1],25);assert.equal(s.money,5);assert.equal(s.calls,9);place(s,4,4);const r=place(s,5,5);assert.equal(r.points,20);assert.equal(r.gold,1);assert.equal(r.bonusDraws,3);assert.equal(s.money,6);assert.equal(s.calls,10);assert.ok(!s.bag.has(25));
});
test('all scoring shapes use ten base points per line, stack red and retain fixed gold/blue bonuses',()=>{
 for(const pattern of PATTERNS){const s=newStage(10,5,{25:'red',24:'red',23:'gold',22:'blue'});let r;for(let i=0;i<pattern.length;i++)r=place(s,25-i,pattern[i]);assert.equal(r.points,40);assert.ok(r.activations.every(a=>a.points===8));assert.equal(r.gold,1);assert.equal(r.bonusDraws,3);assert.equal(s.score,40);assert.equal(s.stamps.size,0);}
});
test('shared tile activates once per simultaneous pattern; only scored stamps clear',()=>{
 const s=newStage(10,5,{25:'blue'}),positions=[2,3,4,5,6,11,16,21,7,13,19,25,24];positions.forEach((tile,i)=>{s.stamps.add(tile);s.stampBalls[tile]=i+1;s.bag.delete(i+1);});
 const r=place(s,25,1);assert.deepEqual(r.scoredPatterns.map(pattern=>pattern.type),['row','column','diagonal']);assert.equal(r.patterns.length,3);assert.equal(r.points,30);assert.equal(r.bonusDraws,9);assert.equal(r.activations.filter(a=>a.tile===1).length,3);assert.deepEqual([...s.stamps],[24]);assert.deepEqual(s.stampBalls,{24:13});assert.deepEqual(s.patternCounts,{row:1,column:1,diagonal:1});
});
test('blue rescues a last call and its unused bonus calls pay out',()=>{
 const s=newStage(10,5,{25:'blue'});[1,2,3,4].forEach(n=>place(s,n,n));s.calls=1;place(s,25,5);assert.equal(s.calls,3);assert.equal(s.status,'playing');
 const win=newStage(1,5,{25:'blue'});[1,2,3,4].forEach(n=>{win.stamps.add(n);win.stampBalls[n]=n;win.bag.delete(n);});place(win,25,5);assert.equal(win.calls,14);assert.equal(win.status,'passed');assert.equal(settleStage(win),14);assert.equal(win.money,19);
});

test('black paint can use any empty space, but never occupied or invalid spaces',()=>{
 for(let tile=1;tile<=25;tile++){
  const s=newStage(10,5,{1:'black'});s.offer=[1,2,3];s.destinations={1:1,2:13,3:25};
  const r=choose(s,1,tile);assert.equal(r.tile,tile);assert.equal(s.stampBalls[tile],1);assert.equal(s.calls,11);assert.equal(r.points,0);assert.ok(!s.bag.has(1));
 }
 const s=newStage(10,5,{1:'black'});s.offer=[1,2,3];s.destinations={1:1,2:13,3:25};s.stamps.add(10);s.stampBalls[10]=4;
 for(const tile of [10,0,26,1.5,null])assert.equal(choose(s,1,tile),null);
 assert.equal(choose(s,2,9),null);assert.equal(s.calls,12);assert.equal(s.bag.size,25);
});
test('black paint replaces other paint for $3 and keeps ten-point line scoring',()=>{
 const s=newStage(1,10,{5:'red'});s.status='passed';s.bonusPaid=true;s.shopOffer=[5,6,7];
 assert.ok(paintBall(s,5,'black'));assert.equal(s.money,7);assert.equal(s.paints[5],'black');assert.equal(paintBall(s,5,'black'),false);
 const next=newStage(10,s.money,s.paints);[1,2,3,4].forEach(n=>place(next,n,n));next.offer=[5];next.destinations={5:25};
 const r=choose(next,5,5);assert.equal(r.points,10);assert.equal(r.gold,0);assert.equal(r.bonusDraws,0);
});
