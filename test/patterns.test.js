import test from 'node:test';
import assert from 'node:assert/strict';
import {PATTERN_TYPES,PATTERN_DEFINITIONS,completedPatterns,newStage,choose,removeJoker} from '../game.js';
const place=(s,n,tile)=>{s.offer=[n];s.destinations={[n]:tile};return choose(s,n,tile);};
test('only five rows, five columns and two full diagonals score, each worth ten',()=>{
 assert.deepEqual(PATTERN_TYPES.map(p=>p.id),['row','column','diagonal']);
 assert.equal(PATTERN_DEFINITIONS.length,12);
 assert.equal(new Set(PATTERN_DEFINITIONS.map(p=>p.tiles.join(','))).size,12);
 for(const p of PATTERN_TYPES)assert.equal(p.basePoints,10);
 for(const p of PATTERN_DEFINITIONS){
  const s=newStage(10);let result;
  p.tiles.forEach((tile,i)=>{result=place(s,i+1,tile);});
  assert.equal(result.points,10);assert.equal(s.stamps.size,5);assert.equal(s.patternCounts[p.type],1);
 }
});
test('corners and filled two- or three-square patterns remain on the board',()=>{
 for(const tiles of [[1,5,21,25],[1,2,6,7],[1,2,3,6,7,8,11,12,13]]){
  const s=newStage(10);tiles.forEach((tile,i)=>assert.equal(place(s,i+1,tile).points,0));
  assert.deepEqual([...s.stamps],tiles);assert.equal(completedPatterns(s.stamps).length,0);
 }
});
test('removing each scoring card disables only that type and persists into the next stage',()=>{
 for(const type of PATTERN_TYPES){
  const s=newStage(10);assert.ok(removeJoker(s,type.id));assert.equal(removeJoker(s,type.id),false);
  const p=PATTERN_DEFINITIONS.find(p=>p.type===type.id);
  p.tiles.forEach((tile,i)=>assert.equal(place(s,i+1,tile).points,0));
  assert.equal(s.stamps.size,5);assert.equal(s.patternCounts[type.id],0);
  const next=newStage(10,s.money,s.paints,s.patternCounts,s.jokers);
  assert.deepEqual(next.jokers,s.jokers);assert.notEqual(next.jokers,s.jokers);
  assert.ok(!next.jokers.includes(type.id));assert.equal(newStage().jokers.length,3);
 }
});
test('overlapping row and column score together; all stamps including a removed diagonal remain',()=>{
 const s=newStage(10,5,{25:'blue',2:'gold',3:'red'});removeJoker(s,'diagonal');
 const tiles=[2,3,4,5,6,11,16,21,7,13,19,25];
 tiles.forEach((tile,i)=>{s.stamps.add(tile);s.stampBalls[tile]=i+1;s.bag.delete(i+1);});
 const r=place(s,25,1);
 assert.deepEqual(r.scoredPatterns.map(p=>p.type),['row','column']);
 assert.equal(r.points,30);assert.equal(r.gold,1);assert.equal(r.bonusDraws,6);
 assert.equal(r.activations.length,10);assert.deepEqual([...s.stamps],[...tiles,1]);
 assert.deepEqual(s.patternCounts,{row:1,column:1,diagonal:0});
});
test('removing every card gives no points, clears no stamps, and still spends calls',()=>{
 const s=newStage(10);[...s.jokers].forEach(id=>removeJoker(s,id));
 for(let i=1;i<=5;i++)assert.equal(place(s,i,i).points,0);
 assert.equal(s.calls,7);assert.equal(s.stamps.size,5);assert.deepEqual(s.jokers,[]);
});

test('completed lines pay once, while retained stamps can score in another line; stages reset both',()=>{
 const s=newStage(10,5,{1:'gold',2:'blue'});
 for(let n=1;n<=5;n++)place(s,n,n);
 assert.equal(s.score,10);assert.equal(s.money,6);assert.equal(s.calls,10);
 assert.deepEqual(s.scoredLines,['row-1']);
 const nextChoice=place(s,6,6);assert.equal(nextChoice.points,0);assert.equal(nextChoice.gold,0);assert.equal(nextChoice.bonusDraws,0);
 place(s,7,11);place(s,8,16);const column=place(s,9,21);
 assert.equal(column.points,10);assert.equal(column.gold,1);assert.equal(s.score,20);
 assert.equal(s.stamps.size,9);assert.deepEqual(s.scoredLines,['row-1','column-1']);
 assert.deepEqual(s.patternCounts,{row:1,column:1,diagonal:0});
 const next=newStage(10,s.money,s.paints,s.patternCounts,s.jokers);
 assert.equal(next.stamps.size,0);assert.deepEqual(next.scoredLines,[]);assert.deepEqual(next.stampBalls,{});
 for(let n=1;n<=5;n++)place(next,n,n);assert.equal(next.score,10);assert.equal(next.patternCounts.row,2);
});
