import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,migrateShop,CARD_TYPES,BALL_UPGRADES,cardDetails,ballValue,openShop,removeJoker} from '../game.js';
const retiredCards=['single-digits:1','outer-layer:1','number-cruncher:1','call-range:1:1'];
const retiredBalls=['x','tornado','dynamite','doubler','plasma'];
const oldRun=()=>{
 const s=newStage(7,32);delete s.shopVersion;s.score=21;s.calls=7;s.passes=4;
 s.jokers.push(...retiredCards);s.upgrades=Object.fromEntries(retiredBalls.map((type,i)=>[i+1,type]));
 for(let n=1;n<=5;n++){s.stamps.add(n);s.stampBalls[n]=n;s.stampValues[n]=n===1?null:n*4;s.bag.delete(n);s.played[n]=1;}
 s.ballValues={2:8,3:12,4:16,5:20};s.plasmaActive=true;s.offer=[6,7,8];s.destinations={6:13,7:13,8:13};s.patternCounts.row=1;s.scoredLines=['row-1'];
 return s;
};
test('catalogs are blank and retired cards cannot normalize into a new run',()=>{
 assert.deepEqual(CARD_TYPES,{});assert.deepEqual(BALL_UPGRADES,{});retiredCards.forEach(id=>assert.equal(cardDetails(id),null));
 const s=newStage(1,5,{1:'x'}, {},['bingo','face-value',...retiredCards]);assert.deepEqual(s.jokers,['bingo','face-value']);assert.deepEqual(s.upgrades,{});assert.equal(ballValue(s,1),1);
});
test('retired ball powers have no placement, movement, destruction, or draw effects',()=>{
 for(const type of retiredBalls){const s=newStage(10);s.upgrades[5]=type;
  for(let n=1;n<5;n++){s.stamps.add(n);s.stampBalls[n]=n;s.stampValues[n]=n;s.bag.delete(n);}
  s.offer=[5];s.destinations={5:5};assert.equal(choose(s,5,13),null);
  const r=choose(s,5,5);assert.equal(r.points,15);assert.deepEqual([...s.stamps],[1,2,3,4,5]);assert.deepEqual(s.stampValues,{1:1,2:2,3:3,4:4,5:5});assert.equal(s.calls,14);assert.equal(s.bag.size,20);assert.equal(s.plasmaPending,undefined);
 }
});
test('save migration removes effects but preserves money, resources, board positions and earned progress',()=>{
 const s=oldRun(),bag=[...s.bag];migrateShop(s);
 assert.deepEqual(s.upgrades,{});assert.deepEqual(s.ballValues,{});assert.deepEqual(s.jokers,['bingo','face-value']);assert.deepEqual(s.stampValues,{1:1,2:2,3:3,4:4,5:5});assert.deepEqual([...s.bag],bag);
 assert.equal(s.stage,7);assert.equal(s.score,21);assert.equal(s.money,32);assert.equal(s.calls,7);assert.equal(s.passes,4);assert.equal(s.patternCounts.row,1);assert.deepEqual(s.scoredLines,['row-1']);assert.equal(s.played[1],1);
 assert.equal(s.plasmaActive,undefined);assert.deepEqual(s.offer,[6]);assert.deepEqual(s.destinations,{6:13});assert.equal(s.shopOffer,null);
});
test('migration clears saved shop offers, keeps discarded rules discarded, and is idempotent',()=>{
 const s=oldRun();s.status='passed';s.bonusPaid=true;s.shopOffer={cards:retiredCards.slice(0,2),balls:retiredBalls.slice(0,2)};removeJoker(s,'bingo');migrateShop(s);
 assert.deepEqual(s.jokers,['face-value']);assert.deepEqual(s.shopOffer,{cards:[null,null],balls:[null,null]});assert.ok(openShop(s));const before=JSON.stringify(s);migrateShop(s);assert.equal(JSON.stringify(s),before);assert.equal(s.money,32);
});
