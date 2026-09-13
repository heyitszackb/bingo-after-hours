import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,removeJoker,STAGE_TARGETS} from '../game.js';
const row=(s,numbers)=>{let result;for(let i=0;i<5;i++){const n=numbers[i];s.offer=[n];s.destinations={[n]:i+1};result=choose(s,n);}return result;};
test('purchased cards give the requested example eight points, with one bonus per single digit',()=>{
 const s=newStage(10,5,{}, {},['bingo','single-digits:1']);assert.deepEqual(newStage().jokers,['bingo']);
 const r=row(s,[5,19,23,1,4]);assert.equal(r.points,8);
 assert.deepEqual(r.activations.map(a=>a.basePoints),[1,1,1,1,1]);
 assert.deepEqual(r.activations.map(a=>a.points),[2,1,1,2,2]);
 assert.deepEqual(r.activations.map(a=>a.bonuses.length),[1,0,0,1,1]);assert.equal(s.stamps.size,5);
});
test('removing the bonus restores five points; removing Bingo prevents all scoring',()=>{
 const s=newStage(10);removeJoker(s,'single-digits');assert.equal(row(s,[5,19,23,1,4]).points,5);
 const next=newStage(10,s.money,s.upgrades,s.patternCounts,s.jokers);assert.deepEqual(next.jokers,['bingo']);
 const noBingo=newStage(10);removeJoker(noBingo,'bingo');assert.equal(row(noBingo,[1,2,3,4,5]).points,0);
});
test('only numeric single digits qualify; targets stay unchanged',()=>{
 const s=newStage(10,5,{9:'x'}, {},['bingo','single-digits:1']),r=row(s,[9,10,11,12,13]);
 assert.equal(r.points,5);assert.equal(r.activations[0].number,null);assert.equal(r.activations[0].bonuses.length,0);
 assert.deepEqual(STAGE_TARGETS,[5,10,15,20,30,40,55,70,90,120]);
});
