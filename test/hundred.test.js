import test from 'node:test';import assert from 'node:assert/strict';
import {defaultBag,ITEM_TYPES,removeRetiredItems,newStage,openRewardShop} from '../game.js';
import {buildDebugBag} from '../debug-bag.js';
test('Anvil is absent from starting bags, rewards, and debug choices',()=>{
 assert.ok(!ITEM_TYPES.hundred);assert.ok(!Object.values(defaultBag().items).includes('hundred'));
 assert.throws(()=>buildDebugBag([{type:'hundred',value:50,count:1}]));
 const s=newStage();s.status='passed';s.bonusPaid=true;openRewardShop(s);assert.ok(!s.shopOffer.items.includes('hundred'));
});
test('retiring Anvils preserves score, other items and permanent tile ink',()=>{
 const s={items:{26:'hundred',27:'king',28:'hundred'},collection:[1,26,27,28],bag:[1,28],offer:[28],destinations:{28:3},stamps:[1,2],stampBalls:{1:26,2:27},stampValues:{1:50,2:10},valueModifiers:{26:-1},ballValues:{28:48},tileStamps:{1:['copier']},score:53,scoredLines:['column-1'],shopOffer:{items:['hundred','rock','seed']}};
 removeRetiredItems(s);assert.deepEqual(s.collection,[1,27]);assert.deepEqual(s.bag,[1]);assert.deepEqual(s.offer,[]);assert.deepEqual(s.destinations,{});assert.deepEqual(s.stamps,[2]);assert.deepEqual(s.stampBalls,{2:27});assert.deepEqual(s.tileStamps,{1:['copier']});assert.equal(s.score,53);assert.deepEqual(s.scoredLines,['column-1']);assert.ok(!s.shopOffer.items.includes('hundred'));assert.equal(s.shopOffer.items.length,3);assert.deepEqual(s.valueModifiers,{});assert.deepEqual(s.ballValues,{});
});
