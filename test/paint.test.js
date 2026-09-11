import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,openShop,paintBall,redrawShop,settleStage,PATTERNS} from '../game.js';
const shop=()=>{const s=newStage(1,20);s.status='passed';settleStage(s);openShop(s);return s;};
test('gold and blue trigger on scoring in every orientation, never on adjacent plays',()=>{
  for(const pattern of PATTERNS){
    const s=newStage(10,5,{[pattern[0]]:'gold',[pattern[1]]:'blue'});
    for(const n of pattern.slice(0,4)){s.offer=[n];const r=choose(s,n);assert.equal(r.gold,0);assert.equal(r.bonusDraws,0);assert.equal(s.money,5);}
    assert.equal(s.calls,8);s.offer=[pattern[4]];const r=choose(s,pattern[4]);
    assert.equal(r.gold,1);assert.equal(r.bonusDraws,3);assert.equal(s.money,6);assert.equal(s.calls,10);assert.equal(s.callCapacity,15);assert.equal(s.stamps.size,0);
  }
});
test('shared colored spaces trigger per completed pattern and orange does not multiply bonuses',()=>{
  for(const color of ['gold','blue']){
    const s=newStage(10,5,{1:color,2:'orange'});s.stamps=new Set([2,3,4,5,6,11,16,21,7,13,19,25]);s.offer=[1];
    const r=choose(s,1);assert.equal(r.points,20);assert.equal(r.gold,color==='gold'?3:0);assert.equal(r.bonusDraws,color==='blue'?9:0);
    assert.equal(s.calls,color==='blue'?20:11);assert.equal(s.money,color==='gold'?8:5);
  }
});
test('blue rescues a last call; extra calls can exceed 12 and pay out once',()=>{
  const s=newStage(4,5,{1:'blue',2:'blue'});s.calls=1;s.stamps=new Set([1,2,3,4]);s.offer=[5];choose(s,5);
  assert.equal(s.calls,6);assert.equal(s.status,'playing');
  const win=newStage(1,5,{1:'blue'});win.stamps=new Set([1,2,3,4]);win.offer=[5];choose(win,5);
  assert.equal(win.calls,14);assert.equal(win.status,'passed');assert.equal(settleStage(win),14);assert.equal(win.money,19);assert.equal(settleStage(win),0);
  const next=newStage(2,win.money,win.paints);assert.equal(next.calls,12);assert.equal(next.callCapacity,12);assert.deepEqual(next.paints,{1:'blue'});
});
test('running out of playable balls ends a run even with bonus calls left',()=>{
  const s=newStage(10,5,{25:'blue'});s.bag=new Set([25]);s.offer=[25];s.stamps=new Set([21,22,23,24]);choose(s,25);
  assert.equal(s.calls,14);assert.equal(s.status,'over');
});
test('orange stacks independently across simultaneous rows, columns and diagonals',()=>{
  const s=newStage(10,5,{1:'orange',3:'orange',6:'orange'});
  s.stamps=new Set([2,3,4,5,6,11,16,21,7,13,19,25]);s.offer=[1];const r=choose(s,1);
  assert.equal(r.points,50);assert.deepEqual(r.activations.map(a=>a.points),[4,4,4,4,4,4,4,4,4,4,2,2,2,2,2]);
  assert.equal(r.activations[0].patternMultiplier,4);
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
  assert.ok(paintBall(s,1,'orange'));assert.equal(s.money,before-6);assert.equal(s.paints[1],'orange');assert.ok(paintBall(s,2,'blue'));assert.equal(s.paints[2],'blue');
  s.money=2;assert.equal(paintBall(s,2,'gold'),false);assert.equal(s.money,2);
  s.money=10;s.status='playing';assert.equal(paintBall(s,2,'gold'),false);assert.equal(redrawShop(s),false);
});

test('every bingo orientation applies orange only when the pattern scores',()=>{
  for(const pattern of PATTERNS){
    const s=newStage(10,5,{[pattern[0]]:'orange',[pattern[2]]:'orange'});
    for(const n of pattern.slice(0,4)){s.offer=[n];assert.equal(choose(s,n).points,0);assert.equal(s.score,0);}
    s.offer=[pattern[4]];const r=choose(s,pattern[4]);
    assert.equal(r.points,20);assert.equal(s.score,20);assert.equal(s.stamps.size,0);
    assert.deepEqual(r.activations[0].pattern,pattern);assert.equal(r.activations[0].patternMultiplier,4);
    assert.ok(r.activations.every(a=>a.points===4));
  }
});
