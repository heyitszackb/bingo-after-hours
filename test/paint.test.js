import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,openShop,paintBall,redrawShop,settleStage} from '../game.js';
const shop=()=>{const s=newStage(1,20);s.status='passed';settleStage(s);openShop(s);return s;};
test('gold pays per orthogonal seal, never diagonal or across a row edge',()=>{
  for(const [seal,n,payout] of [[7,2,1],[7,6,1],[7,8,1],[7,12,1],[7,1,0],[5,6,0],[6,5,0]]){
    const s=newStage(4);s.goldSeals.add(seal);s.offer=[n];const result=choose(s,n);
    assert.equal(result.goldEarnings.length,payout);assert.equal(s.money,5+payout);
  }
  const s=newStage(4);s.goldSeals=new Set([2,6,8,12]);s.offer=[7];assert.equal(choose(s,7).goldEarnings.length,4);assert.equal(s.money,9);
});
test('gold seals survive bingo clearing, reset next stage; paint persists independently',()=>{
  const s=newStage(3,5,{1:'gold',7:'orange'});
  for(let n=1;n<=5;n++){s.offer=[n];choose(s,n);}
  assert.ok(s.goldSeals.has(1));assert.equal(s.stamps.size,0);assert.equal(s.money,6);
  s.offer=[6];choose(s,6);assert.equal(s.money,7);
  const next=newStage(4,s.money,s.paints);assert.equal(next.goldSeals.size,0);assert.deepEqual(next.paints,{1:'gold',7:'orange'});
  next.paints[1]='orange';assert.equal(s.paints[1],'gold');assert.deepEqual(newStage().paints,{});
});
test('orange doubles entire horizontal row and stacks, leaving other patterns at base points',()=>{
  const s=newStage(10,5,{1:'orange',3:'orange',6:'orange'});
  s.stamps=new Set([2,3,4,5,6,11,16,21,7,13,19,25]);s.offer=[1];const r=choose(s,1);
  assert.equal(r.points,30);assert.deepEqual(r.activations.map(a=>a.points),[4,4,4,4,4,1,1,1,1,1,1,1,1,1,1]);
  assert.equal(r.activations[0].rowMultiplier,4);
});
test('shops appear only after non-final stage payout and preserve their offers on revisit',()=>{
  const s=newStage();assert.equal(openShop(s),false);s.status='passed';assert.equal(openShop(s),false);
  settleStage(s);assert.equal(openShop(s),true);const first=[...s.shopOffer];openShop(s);assert.deepEqual(s.shopOffer,first);
  assert.equal(new Set(first).size,3);s.stage=10;assert.equal(openShop(s),false);
});
test('shop draws from all 25 including played balls; refresh costs exactly $2',()=>{
  const s=shop();s.bag.clear();s.shopOffer=null;openShop(s,()=>.9999);assert.deepEqual(s.shopOffer,[1,2,3]);
  const money=s.money;assert.equal(redrawShop(s,()=>0),true);assert.equal(s.money,money-2);assert.equal(new Set(s.shopOffer).size,3);
  s.money=1;const offer=[...s.shopOffer];assert.equal(redrawShop(s),false);assert.deepEqual(s.shopOffer,offer);assert.equal(s.money,1);
});
test('painting charges $3 only for valid purchases; replacing paint is allowed',()=>{
  const s=shop();s.shopOffer=[1,2,3];const before=s.money;
  for(const [n,c] of [[4,'gold'],[1,'purple']])assert.equal(paintBall(s,n,c),false);
  assert.equal(s.money,before);assert.ok(paintBall(s,1,'gold'));assert.equal(s.money,before-3);
  assert.equal(paintBall(s,1,'gold'),false);assert.equal(s.money,before-3);
  assert.ok(paintBall(s,1,'orange'));assert.equal(s.money,before-6);assert.equal(s.paints[1],'orange');
  s.money=2;assert.equal(paintBall(s,2,'gold'),false);assert.equal(s.money,2);
  s.money=10;s.status='playing';assert.equal(paintBall(s,2,'gold'),false);assert.equal(redrawShop(s),false);
});
