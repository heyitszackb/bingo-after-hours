import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,PATTERNS,settleStage} from '../game.js';
const place=(s,ball,tile)=>{s.offer=[ball];s.destinations={[ball]:tile};return choose(s,ball);};
test('paints travel with balls to any location and remain there across later offers',()=>{
 const s=newStage(10,5,{25:'blue',2:'gold',18:'red'});place(s,25,1);place(s,2,2);place(s,18,3);assert.equal(s.stampBalls[1],25);assert.equal(s.money,5);assert.equal(s.calls,9);place(s,4,4);const r=place(s,5,5);assert.equal(r.points,10);assert.equal(r.gold,1);assert.equal(r.bonusDraws,3);assert.equal(s.money,6);assert.equal(s.calls,10);assert.ok(!s.bag.has(25));
});
test('all line orientations use one base point, stack red and retain fixed gold/blue bonuses',()=>{
 for(const pattern of PATTERNS){const s=newStage(10,5,{25:'red',24:'red',23:'gold',22:'blue'});let r;for(let i=0;i<5;i++)r=place(s,25-i,pattern[i]);assert.equal(r.points,20);assert.ok(r.activations.every(a=>a.points===4));assert.equal(r.gold,1);assert.equal(r.bonusDraws,3);assert.equal(s.score,20);assert.equal(s.stamps.size,0);}
});
test('shared tile activates once per simultaneous pattern; only scored stamps clear',()=>{
 const s=newStage(10,5,{25:'blue'}),positions=[2,3,4,5,6,11,16,21,7,13,19,25,8];positions.forEach((tile,i)=>{s.stamps.add(tile);s.stampBalls[tile]=i+1;s.bag.delete(i+1);});
 const r=place(s,25,1);assert.equal(r.patterns.length,3);assert.equal(r.points,15);assert.equal(r.bonusDraws,9);assert.equal(r.activations.filter(a=>a.tile===1).length,3);assert.deepEqual([...s.stamps],[8]);assert.deepEqual(s.stampBalls,{8:13});
});
test('blue rescues a last call and its unused bonus calls pay out',()=>{
 const s=newStage(10,5,{25:'blue'});[1,2,3,4].forEach(n=>place(s,n,n));s.calls=1;place(s,25,5);assert.equal(s.calls,3);assert.equal(s.status,'playing');
 const win=newStage(1,5,{25:'blue'});[1,2,3,4].forEach(n=>{win.stamps.add(n);win.stampBalls[n]=n;win.bag.delete(n);});place(win,25,5);assert.equal(win.calls,14);assert.equal(win.status,'passed');assert.equal(settleStage(win),14);assert.equal(win.money,19);
});
