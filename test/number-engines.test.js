import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,deal,redraw,openShop,redrawShop,buyCard,cardDetails,cardType} from '../game.js';
const stamp=(s,n,t,value=n)=>{s.stamps.add(t);s.stampBalls[t]=n;s.stampValues[t]=value;s.bag.delete(n);};
const place=(s,n,t)=>{s.offer=[n];s.destinations={[n]:t};return choose(s,n,t);};
test('Number Cruncher adds current values to the existing base and other bonuses; X adds no number',()=>{
 const s=newStage(10,5,{25:'x'}, {},['bingo','number-cruncher:1','single-digits:1']);
 [5,19,23,1].forEach((n,i)=>stamp(s,n,i+1));const r=place(s,25,5);
 assert.equal(r.points,55);assert.equal(r.activations[4].points,1);assert.deepEqual(r.activations[4].bonuses,[]);
 const d=newStage(10,5,{25:'doubler'}, {},['bingo','number-cruncher:1']);[1,2,3,4].forEach(n=>stamp(d,n,n));
 assert.equal(place(d,25,5).points,44);assert.equal(d.stampValues[4],8);
});
test('Second Wind uses the inclusive five-number range and current values, excludes X, rescues last call',()=>{
 const s=newStage(10,5,{25:'x'}, {},['bingo','call-range:13:1']);
 [13,17,12,18].forEach((n,i)=>stamp(s,n,i+1));s.calls=1;const r=place(s,25,5);
 assert.equal(r.points,5);assert.equal(s.calls,2);assert.equal(s.status,'playing');assert.equal(r.callsBeforeBonuses,0);
 assert.deepEqual(r.activations.map(a=>a.bonuses.reduce((v,b)=>v+(b.calls??0),0)),[1,1,0,0,0]);
});
test('call bonuses cap at 15 including stacked copies and overlapping lines',()=>{
 const s=newStage(10,5,{}, {},['bingo','call-range:1:1','call-range:1:2']);
 [1,2,3,4].forEach(n=>stamp(s,n,n));const r=place(s,5,5);
 assert.equal(s.calls,15);assert.equal(r.activations.flatMap(a=>a.bonuses).reduce((sum,b)=>sum+b.calls,0),1);
 assert.equal(r.activations.flatMap(a=>a.bonuses).length,10);
 // The center stamp restores a call in each of its two newly completed lines.
 const cross=newStage(10,5,{}, {},['bingo','call-range:1:1']);cross.calls=1;
 [11,12,14,15,3,8,18,23].forEach((tile,i)=>stamp(cross,i+6,tile));
 const lines=place(cross,3,13);assert.equal(lines.scoredPatterns.length,2);assert.equal(cross.calls,2);
});
test('shops have unique card types; ranges roll once per offer, persist on purchase and through stages',()=>{
 const s=newStage(1,10000);s.status='passed';s.bonusPaid=true;const starts=new Set();
 for(let i=0;i<400;i++){s.shopOffer=null;openShop(s);assert.equal(new Set(s.shopOffer.cards.map(cardType)).size,2);for(const id of s.shopOffer.cards){const item=cardDetails(id);if(cardType(id)==='call-range'){starts.add(item.start);assert.equal(item.end-item.start,4);assert.ok(item.start>=1&&item.end<=25);}}const previous=JSON.stringify(s.shopOffer);openShop(s);assert.equal(JSON.stringify(s.shopOffer),previous);}
 assert.ok(starts.size>10);
 s.shopOffer={cards:['number-cruncher','call-range:13'],balls:['plasma','x']};s.money=6;assert.equal(buyCard(s,0),false);assert.equal(s.money,6);s.money=10;assert.ok(buyCard(s,0));assert.equal(s.money,3);assert.ok(buyCard(s,1));assert.equal(s.money,0);
 const next=newStage(2,s.money,s.upgrades,s.patternCounts,s.jokers);assert.equal(cardDetails(next.jokers[2]).start,13);assert.equal(cardDetails(next.jokers[2]).end,17);
 assert.equal(cardDetails('call-range:0'),null);assert.equal(cardDetails('call-range:22'),null);
});
test('Plasma reveals one space and offers every remaining ball for exactly the next play',()=>{
 const s=newStage(10,5,{25:'plasma',24:'x'});place(s,25,13);assert.equal(s.plasmaPending,true);assert.equal(s.plasmaActive,false);
 deal(s);assert.equal(s.plasmaPending,false);assert.equal(s.plasmaActive,true);assert.equal(s.offer.length,24);assert.ok(!s.offer.includes(25));assert.equal(new Set(Object.values(s.destinations)).size,1);
 const calls=s.calls;assert.ok(redraw(s));assert.equal(s.calls,calls);assert.equal(s.plasmaActive,true);assert.equal(s.offer.length,24);
 const locations=[...new Set(Object.values(s.destinations))],unoffered=Array.from({length:25},(_,i)=>i+1).find(t=>t!==13&&!locations.includes(t));
 assert.equal(choose(s,1,unoffered),null);assert.ok(choose(s,1,locations[0]));assert.equal(s.calls,calls-1);assert.equal(s.plasmaActive,false);
 deal(s);assert.equal(s.offer.length,1);assert.equal(new Set(Object.values(s.destinations)).size,1);
 const next=newStage(2,s.money,s.upgrades,s.patternCounts,s.jokers);assert.equal(next.plasmaPending,false);assert.equal(next.plasmaActive,false);
});
