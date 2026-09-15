import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage as startingStage,draw,deal,choose,redraw,PATTERNS,settleStage,STAGE_TARGETS,openShop,buyCard,upgradeBall,redrawShop} from '../game.js';
// These fixtures isolate line and value rules from the optional Single Digits bonus.
const newStage=(stage,money,upgrades,counts,jokers=['bingo','face-value'])=>startingStage(stage,money,upgrades,counts,jokers);
const place=(s,ball,tile)=>{s.offer=[ball];s.destinations={[ball]:tile};return choose(s,ball);};
test('new stages are blank with all balls, 17 plays and 10 passes and no permanent mappings',()=>{
 const s=newStage();assert.equal(s.stamps.size,0);assert.deepEqual(s.stampBalls,{});assert.deepEqual(s.destinations,{});assert.equal(s.bag.size,25);assert.equal(s.calls,17);assert.equal(s.money,5);assert.equal(s.board,undefined);
});
test('deals pair unique available balls with unique empty destinations',()=>{
 const s=newStage();place(s,25,3);for(let i=0;i<100;i++){deal(s);assert.equal(s.offer.length,1);assert.equal(new Set(s.offer).size,1);assert.equal(new Set(Object.values(s.destinations)).size,1);assert.ok(!s.offer.includes(25));assert.ok(!Object.values(s.destinations).includes(3));}
});
test('playing uses the offered destination, removes only that ball, and clears offers',()=>{
 const s=newStage();s.offer=[1,2,3];s.destinations={1:25,2:7,3:9};const r=choose(s,1);assert.equal(r.tile,25);assert.deepEqual([...s.stamps],[25]);assert.equal(s.stampBalls[25],1);assert.equal(s.calls,16);assert.ok(!s.bag.has(1));assert.ok(s.bag.has(2));assert.equal(s.played[1],1);assert.deepEqual(s.offer,[]);assert.deepEqual(s.destinations,{});
});
test('invalid, stale and occupied destinations spend nothing',()=>{
 const s=newStage();place(s,1,7);s.offer=[2];s.destinations={2:7};assert.equal(choose(s,2),null);assert.equal(s.calls,16);assert.equal(s.bag.size,24);s.destinations={};assert.equal(choose(s,2),null);s.destinations={2:26};assert.equal(choose(s,2),null);assert.equal(choose(s,1),null);
});
test('every geometric pattern scores the current ball values in each line',()=>{
 for(const pattern of PATTERNS){const s=newStage(10);let r;for(let i=0;i<pattern.length;i++)r=place(s,25-i,pattern[i]);assert.equal(r.points,115);assert.deepEqual(r.activations.map(a=>a.tile),pattern);assert.deepEqual(r.activations.map(a=>a.number),pattern.map((_,i)=>25-i));assert.ok(r.activations.every(a=>a.points===a.number));assert.equal(s.stamps.size,5);assert.equal(Object.keys(s.stampBalls).length,5);assert.equal(s.bag.size,25-pattern.length);}
});
test('passing spends a pass, redraws ball and space, and preserves money, plays, stamps and bag',()=>{
 const s=newStage();place(s,25,1);deal(s,()=>.5);const first={...s.destinations},number=s.offer[0],bag=[...s.bag];
 assert.ok(redraw(s,()=>0));assert.notDeepEqual(s.destinations,first);assert.notEqual(s.offer[0],number);assert.equal(s.money,5);assert.equal(s.calls,16);assert.equal(s.passes,9);assert.equal(s.stampBalls[1],25);assert.deepEqual([...s.bag],bag);assert.equal(s.played[number],0);
 for(let i=0;i<9;i++)assert.ok(redraw(s));const offer=[...s.offer],dest={...s.destinations};assert.equal(s.passes,0);assert.equal(s.status,'playing');assert.equal(redraw(s),false);assert.deepEqual(s.offer,offer);assert.deepEqual(s.destinations,dest);assert.ok(choose(s,s.offer[0]));assert.equal(s.calls,15);
});
test('passes work without money, refill each round, and cannot be spent after a run ends',()=>{
 const s=newStage(1,0);deal(s);assert.ok(redraw(s));assert.equal(s.money,0);assert.equal(s.passes,9);s.status='over';assert.equal(redraw(s),false);assert.equal(s.passes,9);
 const next=newStage(2,s.money,s.upgrades,s.patternCounts,s.jokers);assert.equal(next.calls,17);assert.equal(next.passes,10);
});
test('deals shrink gracefully when only one ball or empty tile remains',()=>{
 const s=newStage();s.bag=new Set([1,2]);assert.equal(deal(s).length,1);s.stamps=new Set(Array.from({length:24},(_,i)=>i+1));assert.equal(deal(s).length,1);assert.deepEqual(Object.values(s.destinations),[25]);
});
test('last-call win takes precedence over failure and settles exactly once',()=>{
 const s=newStage();for(let n=1;n<5;n++)place(s,20+n,n);s.calls=1;place(s,25,5);assert.equal(s.status,'passed');assert.equal(settleStage(s),0);assert.equal(settleStage(s),0);
 const f=newStage();f.calls=1;place(f,2,8);assert.equal(f.status,'over');assert.equal(settleStage(f),0);
 const win=newStage();win.status='passed';win.calls=7;assert.equal(settleStage(win),7);assert.equal(win.money,12);assert.equal(settleStage(win),0);
});
test('stages retain money but reset all placements and replenish balls',()=>{
 const s=newStage(1,12,{25:'doubler'});place(s,25,1);const next=newStage(2,s.money,s.upgrades);assert.equal(next.money,12);assert.deepEqual(next.upgrades,{});assert.equal(next.stamps.size,0);assert.deepEqual(next.stampBalls,{});assert.equal(next.bag.size,25);assert.equal(next.calls,17);assert.deepEqual(STAGE_TARGETS,[40,50,60,70,80,90,100,110,120,130]);
});
test('shop cards are free while empty ball-upgrade slots remain unavailable',()=>{
 const s=newStage(1,20);assert.equal(openShop(s),false);s.status='passed';settleStage(s);assert.ok(openShop(s));
 assert.ok(s.shopOffer.cards.length>=2);assert.equal(new Set(s.shopOffer.cards).size,s.shopOffer.cards.length);assert.deepEqual(s.shopOffer.items,['trash','statue','king','question','plus10','plus50','plus100','copier','x2','x3','seed','bomb','d20','hundred','rock']);const cash=s.money;
 assert.equal(buyCard(s,1),true);assert.equal(buyCard(s,1),false);assert.equal(upgradeBall(s,0,1),false);assert.equal(redrawShop(s),true);assert.equal(s.money,cash);
 s.stage=10;assert.equal(openShop(s),true);
});
