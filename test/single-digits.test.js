import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,removeJoker,STAGE_TARGETS} from '../game.js';
const row=(s,numbers)=>{let result;for(let i=0;i<5;i++){const n=numbers[i];s.offer=[n];s.destinations={[n]:i+1};result=choose(s,n);}return result;};
test('starting cards give the requested example eight points, with one bonus per single digit',()=>{
 const s=newStage(10);assert.deepEqual(s.jokers,['bingo','single-digits']);
 const r=row(s,[5,19,23,1,4]);assert.equal(r.points,8);
 assert.deepEqual(r.activations.map(a=>a.basePoints),[1,1,1,1,1]);
 assert.deepEqual(r.activations.map(a=>a.points),[2,1,1,2,2]);
 assert.deepEqual(r.activations.map(a=>a.bonuses.length),[1,0,0,1,1]);assert.equal(s.stamps.size,5);
});
test('removing the bonus restores five points; removing Bingo prevents all scoring',()=>{
 const s=newStage(10);removeJoker(s,'single-digits');assert.equal(row(s,[5,19,23,1,4]).points,5);
 const next=newStage(10,s.money,s.paints,s.patternCounts,s.jokers);assert.deepEqual(next.jokers,['bingo']);
 const noBingo=newStage(10);removeJoker(noBingo,'bingo');assert.equal(row(noBingo,[1,2,3,4,5]).points,0);
});
test('single digits means 1–9; red still multiplies the whole line and other paint bonuses stay fixed',()=>{
 const s=newStage(10,5,{9:'red',10:'gold',11:'blue'}),r=row(s,[9,10,11,12,13]);
 assert.equal(r.points,12);assert.equal(r.activations[0].basePoints,2);assert.equal(r.activations[0].bonuses[0].points,2);
 assert.equal(r.gold,1);assert.equal(r.bonusDraws,3);assert.equal(s.money,6);assert.equal(s.calls,10);
 assert.deepEqual(STAGE_TARGETS,[5,10,15,20,30,40,55,70,90,120]);
});
