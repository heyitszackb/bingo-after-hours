import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,openShop,buyItem,choose,draw,redraw,ballValue,migrateInventory} from '../game.js';
const withBomb=()=>{const s=newStage(1,0);s.status='passed';s.bonusPaid=true;openShop(s);const id=buyItem(s,'bomb');return {s:newStage(10,s.money,s.upgrades,s.patternCounts,s.jokers,s),id};};
const stamp=(s,id,tile)=>{s.stamps.add(tile);s.stampBalls[tile]=id;s.stampValues[tile]=ballValue(s,id);s.bag.delete(id);};
const play=(s,id,tile)=>{s.offer=[id];s.destinations={[id]:tile};return choose(s,id,tile);};
test('free repeatable Bomb additions have independent identities and survive round transitions',()=>{
 const s=newStage(1,0);assert.equal(buyItem(s,'bomb'),false);s.status='passed';s.bonusPaid=true;openShop(s);
 const a=buyItem(s,'bomb'),b=buyItem(s,'bomb');assert.equal(a,26);assert.equal(b,27);assert.equal(s.money,0);assert.equal(s.collection.length,27);assert.equal(s.bag.size,27);assert.equal(ballValue(s,a),null);
 const next=newStage(2,0,s.upgrades,s.patternCounts,s.jokers,s);assert.ok(next.bag.has(a)&&next.bag.has(b));assert.equal(next.nextItemId,28);assert.equal(next.stamps.size,0);
});
test('Bomb and numbered balls each occupy one equally selectable position in the draw',()=>{
 const {s,id}=withBomb();s.bag=new Set([1,id]);let heads=0;
 for(let i=0;i<100;i++)if(draw(s,()=>i/100)[0]===id)heads++;
 assert.equal(heads,50);assert.deepEqual(new Set(draw(s,()=>.5,30)),s.bag);
});
test('passing a Bomb spends a pass and neither removes it nor explodes neighbors',()=>{
 const {s,id}=withBomb();stamp(s,1,1);s.offer=[id];s.destinations={[id]:7};const roster=[...s.collection];assert.ok(redraw(s,()=>.5));
 assert.equal(s.calls,17);assert.equal(s.passes,9);assert.deepEqual(s.collection,roster);assert.ok(s.bag.has(id));assert.equal(s.stampBalls[1],1);
});
test('Bomb destroys itself and adjacent items before a newly completed line can score',()=>{
 const {s,id}=withBomb();[1,2,3,4].forEach(n=>stamp(s,n,n));stamp(s,6,9);stamp(s,7,10);stamp(s,8,11);
 const r=play(s,id,5);assert.equal(r.points,0);assert.deepEqual(r.activations,[]);assert.deepEqual(r.scoredPatterns,[]);assert.ok(r.effectBoard.stamps.has(5));assert.equal(r.effectBoard.stampBalls[5],id);assert.deepEqual(r.destroyed.map(d=>d.id).sort((a,b)=>a-b),[4,6,7,id]);
 assert.equal(s.patternCounts.row,0);assert.deepEqual(s.scoredLines,[]);assert.equal(s.score,0);assert.equal(s.calls,16);assert.ok(s.stamps.has(11));assert.ok(!s.stamps.has(4)&&!s.stamps.has(5));
 const next=newStage(10,s.money,s.upgrades,s.patternCounts,s.jokers,s);for(const d of r.destroyed){assert.ok(!next.bag.has(d.id));assert.ok(!next.collection.includes(d.id));}assert.ok(next.bag.has(8));assert.equal(newStage().collection.length,25);
});
test('center blast removes all eight neighbors; emptied board spaces remain playable',()=>{
 const {s,id}=withBomb(),neighbors=[7,8,9,12,14,17,18,19];neighbors.forEach((t,i)=>stamp(s,i+1,t));stamp(s,20,1);const r=play(s,id,13);
 assert.equal(r.destroyed.length,9);assert.deepEqual([...s.stamps],[1]);assert.equal(s.collection.length,17);assert.equal(s.bag.size,16);assert.ok(play(s,21,13));assert.equal(s.stampBalls[13],21);
});
test('corner blast does not wrap across rows; no-line Bomb still explodes',()=>{
 const {s,id}=withBomb();stamp(s,2,2);stamp(s,5,5);stamp(s,6,6);stamp(s,7,7);const r=play(s,id,1);
 assert.equal(r.activations.length,0);assert.equal(r.points,0);assert.deepEqual(new Set(r.destroyed.map(d=>d.id)),new Set([2,6,7,id]));assert.equal(s.stampBalls[5],5);
});
test('explosion breaks all four candidate lines before scoring, including on the final play',()=>{
 const {s,id}=withBomb();s.target=1;s.calls=1;
 [11,12,14,15,3,8,18,23,1,7,19,25,5,9,17,21].forEach((t,i)=>stamp(s,i+1,t));
 const r=play(s,id,13);assert.equal(r.scoredPatterns.length,0);assert.equal(r.activations.length,0);assert.equal(r.points,0);assert.deepEqual(s.scoredLines,[]);assert.equal(s.status,'over');assert.ok(!s.collection.includes(id));assert.equal(s.calls,0);
});
test('destroying another Bomb does not trigger an additional explosion',()=>{
 const {s,id}=withBomb();const other=s.nextItemId++;s.items[other]='bomb';s.collection.push(other);s.bag.add(other);stamp(s,other,14);stamp(s,25,15);const r=play(s,id,13);
 assert.ok(r.destroyed.some(d=>d.id===other));assert.equal(s.stampBalls[15],25);
});
test('legacy saves receive the standard collection without altering played availability',()=>{
 const s=newStage();delete s.inventoryVersion;delete s.collection;delete s.items;delete s.nextItemId;s.bag.delete(1);migrateInventory(s);assert.equal(s.collection.length,25);assert.ok(!s.bag.has(1));assert.equal(s.nextItemId,26);
});

test('a line broken by a Bomb remains eligible when rebuilt later',()=>{
 const {s,id}=withBomb();[1,2,3,4].forEach(n=>stamp(s,n,n));play(s,id,5);
 assert.equal(play(s,6,4).points,0);const r=play(s,7,5);assert.equal(r.points,19);assert.deepEqual(s.scoredLines,['row-1']);assert.equal(s.patternCounts.row,1);
});
test('blast preserves previous points and scoring history without rescoring untouched lines',()=>{
 const {s,id}=withBomb();[1,2,3,4].forEach(n=>stamp(s,n,n));play(s,5,5);assert.equal(s.score,15);
 const r=play(s,id,25);assert.equal(r.points,0);assert.equal(s.score,15);assert.deepEqual(s.scoredLines,['row-1']);assert.equal(s.patternCounts.row,1);
});
