import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,draw,choose,redraw,PATTERNS,settleStage,STAGE_TARGETS,targetFor} from '../game.js';
test('25 ordinary balls and unique offers before any are played',()=>{for(let i=0;i<100;i++){const offer=draw();assert.equal(new Set(offer).size,3);assert.ok(offer.every(n=>n>=1&&n<=25));}assert.deepEqual(draw(newStage(),()=>.5),draw(newStage(),()=>.5));assert.equal(draw(newStage(),Math.random,8).length,8);});
test('row activates five spaces for 5 points and clears only completed stamps',()=>{const s=newStage();s.stamps=new Set([1,2,3,4,9]);s.offer=[5,10,12];const r=choose(s,5);assert.equal(r.points,5);assert.deepEqual([...s.stamps],[9]);assert.equal(s.calls,11);assert.equal(s.status,'passed');assert.deepEqual(r.activations.map(a=>a.number),[1,2,3,4,5]);});
test('simultaneous row column and diagonal all score before union clears',()=>{const s=newStage(4);s.stamps=new Set([2,3,4,5,6,11,16,21,7,13,19,25,8]);s.offer=[1,10,20];const r=choose(s,1);assert.equal(r.points,15);assert.equal(r.activations.length,15);assert.equal(r.activations.filter(a=>a.number===1).length,3);assert.deepEqual([...s.stamps],[8]);assert.equal(s.status,'playing');});
test('every row column and diagonal scores',()=>{for(const p of PATTERNS){const s=newStage();s.stamps=new Set(p.slice(0,4));s.offer=[p[4]];assert.equal(choose(s,p[4]).points,5);assert.equal(s.stamps.size,0);}});
test('duplicate spends a call and counts plays but adds no stamp',()=>{const s=newStage();s.stamps.add(3);s.offer=[3,5,8];assert.equal(choose(s,3).duplicate,true);assert.equal(s.stamps.size,1);assert.equal(s.calls,11);assert.equal(s.played[3],1);});
test('new runs have $5 and each reroll costs $1 without spending a call',()=>{
  const s=newStage();assert.equal(s.money,5);
  for(let remaining=4;remaining>=0;remaining--){assert.ok(redraw(s));assert.equal(s.money,remaining);assert.equal(s.calls,12);assert.equal(s.bag.size,25);}
  const offer=[...s.offer];assert.equal(redraw(s),false);assert.equal(s.money,0);assert.deepEqual(s.offer,offer);
});
test('money carries into the next stage and new runs reset to $5',()=>{
  const s=newStage();redraw(s);redraw(s);const next=newStage(2,s.money);
  assert.equal(next.money,3);assert.equal(newStage().money,5);
  next.status='passed';assert.equal(redraw(next),false);assert.equal(next.money,3);
});
test('last-call success precedes game over; failure ends run',()=>{const s=newStage();s.score=0;s.calls=1;s.stamps=new Set([1,2,3,4]);s.offer=[5];choose(s,5);assert.equal(s.status,'passed');const f=newStage();f.calls=1;f.offer=[2];choose(f,2);assert.equal(f.status,'over');assert.equal(choose(f,2),null);});
test('stage reset refreshes board calls and counts, increases target',()=>{const s=newStage(2);assert.equal(s.target,10);assert.equal(s.calls,12);assert.equal(s.money,5);assert.equal(s.stamps.size,0);assert.ok(s.played.every(n=>n===0));});

test('playing removes only the chosen ball from all future draws and redraws',()=>{
  const s=newStage();s.offer=[3,5,8];choose(s,3);
  assert.equal(s.bag.size,24);assert.ok(!s.bag.has(3));assert.ok(s.bag.has(5)&&s.bag.has(8));
  const all=draw(s,Math.random,25);assert.equal(all.length,24);assert.ok(!all.includes(3));
  for(let i=0;i<100;i++)assert.ok(!draw(s).includes(3));
  redraw(s);assert.ok(!s.offer.includes(3));assert.equal(s.bag.size,24);
  s.offer=[3];assert.equal(choose(s,3),null);assert.equal(s.calls,11);
});
test('scoring clears stamps without returning played balls to the bag',()=>{
  const s=newStage(2);
  for(let n=1;n<=5;n++){s.offer=[n];choose(s,n);}
  assert.equal(s.score,5);assert.equal(s.stamps.size,0);assert.equal(s.bag.size,20);
  assert.ok(draw(s,Math.random,25).every(n=>n>5));
  assert.equal(newStage(3).bag.size,25);
});
test('inspection and redraws do not remove balls',()=>{
  const s=newStage();s.offer=draw(s);assert.equal(s.bag.size,25);
  redraw(s);redraw(s);assert.equal(s.bag.size,25);
});

test('cleared stages pay one dollar per unused call exactly once',()=>{
  const s=newStage();s.money=3;s.calls=7;s.status='passed';
  assert.equal(settleStage(s),7);assert.equal(s.money,10);
  assert.equal(settleStage(s),0);assert.equal(s.money,10);
  const next=newStage(2,s.money);assert.equal(next.money,10);assert.equal(next.bonusPaid,false);
});
test('no bonus for unfinished or failed stages, or for a last-call win',()=>{
  for(const status of ['playing','over']){const s=newStage();s.status=status;assert.equal(settleStage(s),0);assert.equal(s.money,5);}
  const s=newStage();s.status='passed';s.calls=0;assert.equal(settleStage(s),0);assert.equal(s.money,5);assert.equal(s.bonusPaid,true);
});

test('all ten stages use the requested score targets',()=>{
  assert.deepEqual(STAGE_TARGETS,[5,10,20,40,100,200,500,1000,5000,10000]);
  STAGE_TARGETS.forEach((target,i)=>assert.equal(targetFor(i+1),target));
});
