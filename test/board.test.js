import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage as startingStage,deal,choose} from '../game.js';
// These fixtures isolate line and upgrade rules from the optional Single Digits bonus.
const newStage=(stage,money,upgrades,counts,jokers=['bingo'])=>startingStage(stage,money,upgrades,counts,jokers);
test('every offered ball can occupy every offered space, retaining its own identity and upgrade',()=>{
 for(const number of [1,2,3])for(const tile of [1,13,25]){
  const s=newStage(10,5,{});s.offer=[1,2,3];s.destinations={1:1,2:13,3:25};
  const result=choose(s,number,tile);
  assert.equal(result.tile,tile);assert.equal(s.stampBalls[tile],number);assert.deepEqual([...s.stamps],[tile]);assert.equal(s.calls,14);assert.equal(s.score,0);assert.equal(s.bag.size,24);assert.ok(!s.bag.has(number));assert.equal(s.played[number],1);
 }
});
test('choosing an unoffered location or an occupied location spends nothing',()=>{
 const s=newStage();s.offer=[1,2,3];s.destinations={1:1,2:13,3:25};
 assert.equal(choose(s,1,7),null);assert.equal(s.calls,15);assert.equal(s.bag.size,25);
 s.stamps.add(13);assert.equal(choose(s,1,13),null);assert.equal(s.calls,15);assert.equal(s.played[1],0);
});
test('the same three balls get different locations on different deals',()=>{
 const s=newStage();s.bag=new Set([1,2,3]);deal(s,()=>0,3);const first={...s.destinations};deal(s,()=>.8,3);assert.deepEqual([...s.offer].sort(),[1,2,3]);assert.notDeepEqual(s.destinations,first);
});
test('reordering offered balls does not change their destinations',()=>{
 const s=newStage();deal(s,()=>.5);const number=s.offer[0],tile=s.destinations[number],dest={...s.destinations};s.offer.reverse();assert.deepEqual(s.destinations,dest);assert.equal(choose(s,number).tile,tile);
});
test('scored locations retain their original ball and reject replacement until a new stage',()=>{
 const s=newStage(10,5,{});for(let n=1;n<=5;n++){s.offer=[n];s.destinations={[n]:n};choose(s,n);}
 assert.equal(s.stampBalls[1],1);s.offer=[6];s.destinations={6:1};assert.equal(choose(s,6),null);assert.equal(s.stampBalls[1],1);assert.equal(s.calls,10);
});
