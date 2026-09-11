import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,deal,choose} from '../game.js';
test('the same three balls get different locations on different deals',()=>{
 const s=newStage();s.bag=new Set([1,2,3]);deal(s,()=>0);const first={...s.destinations};deal(s,()=>.8);assert.deepEqual([...s.offer].sort(),[1,2,3]);assert.notDeepEqual(s.destinations,first);
});
test('reordering offered balls does not change their destinations',()=>{
 const s=newStage();deal(s,()=>.5);const number=s.offer[0],tile=s.destinations[number],dest={...s.destinations};s.offer.reverse();assert.deepEqual(s.destinations,dest);assert.equal(choose(s,number).tile,tile);
});
test('a cleared location can receive a different ball and its own paint later',()=>{
 const s=newStage(10,5,{1:'red',6:'gold'});for(let n=1;n<=5;n++){s.offer=[n];s.destinations={[n]:n};choose(s,n);}assert.equal(s.stampBalls[1],undefined);s.offer=[6];s.destinations={6:1};choose(s,6);assert.equal(s.stampBalls[1],6);assert.equal(s.paints[6],'gold');assert.equal(s.money,5);
});
