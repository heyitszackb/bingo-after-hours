import test from 'node:test';
import assert from 'node:assert/strict';
import {PATTERN_TYPES,PATTERN_DEFINITIONS,completedPatterns,newStage as startingStage,choose,removeJoker,normalizeJokers} from '../game.js';
// These fixtures isolate line and upgrade rules from the optional Single Digits bonus.
const newStage=(stage,money,upgrades,counts,jokers=['bingo','face-value'])=>startingStage(stage,money,upgrades,counts,jokers);
const place=(s,n,tile)=>{s.offer=[n];s.destinations={[n]:tile};return choose(s,n,tile);};
test('only five rows, five columns and two full diagonals score, each activating five tiles',()=>{
 assert.deepEqual(PATTERN_TYPES.filter(p=>p.tileCount===5).map(p=>p.id),['row','column','diagonal']);
 assert.equal(PATTERN_DEFINITIONS.length,12);
 assert.equal(new Set(PATTERN_DEFINITIONS.map(p=>p.tiles.join(','))).size,12);
 for(const p of PATTERN_TYPES.filter(p=>p.tileCount===5))assert.equal(p.tileCount,5);
 for(const p of PATTERN_DEFINITIONS){
  const s=newStage(10);let result;
  p.tiles.forEach((tile,i)=>{result=place(s,i+1,tile);});
  assert.equal(result.points,15);assert.equal(s.stamps.size,5);assert.equal(s.patternCounts[p.type],1);
 }
});
test('corners and filled two- or three-square patterns remain on the board',()=>{
 for(const tiles of [[1,5,21,25],[1,2,6,7],[1,2,3,6,7,8,11,12,13]]){
  const s=newStage(10);tiles.forEach((tile,i)=>assert.equal(place(s,i+1,tile).points,0));
  assert.deepEqual([...s.stamps],tiles);assert.equal(completedPatterns(s.stamps).length,0);
 }
});
test('Bingo enables all line types; trashing it disables all and persists across stages',()=>{
 assert.deepEqual(newStage().jokers,['bingo','face-value']);
 for(const type of PATTERN_TYPES.filter(p=>p.tileCount===5)){
  const s=newStage(10);assert.ok(removeJoker(s,'bingo'));
  const p=PATTERN_DEFINITIONS.find(p=>p.type===type.id);
  p.tiles.forEach((tile,i)=>assert.equal(place(s,i+1,tile).points,0));
  assert.equal(s.stamps.size,5);
  assert.deepEqual(newStage(10,s.money,s.upgrades,s.patternCounts,s.jokers).jokers,['face-value']);
 }
 assert.deepEqual(normalizeJokers(['row','column','diagonal']),['bingo']);
 assert.deepEqual(normalizeJokers(['column']),['bingo']);
 assert.deepEqual(normalizeJokers([]),[]);
});
test('overlapping row and column score together; all stamps including the diagonal remain',()=>{
 const s=newStage(10,5,{});
 const tiles=[2,3,4,5,6,11,16,21,7,13,19,25];
 tiles.forEach((tile,i)=>{s.stamps.add(tile);s.stampBalls[tile]=i+1;s.stampValues[tile]=i+1;s.bag.delete(i+1);});
 const r=place(s,25,1);
 assert.deepEqual(r.scoredPatterns.map(p=>p.type),['row','column','diagonal']);
 assert.equal(r.points,153);
 assert.equal(r.activations.length,15);assert.deepEqual([...s.stamps],[...tiles,1]);
 assert.deepEqual(s.patternCounts,{square:0,corners:0,row:1,column:1,diagonal:1});
});
test('removing every card gives no points, clears no stamps, and still spends calls',()=>{
 const s=newStage(10);[...s.jokers].forEach(id=>removeJoker(s,id));
 for(let i=1;i<=5;i++)assert.equal(place(s,i,i).points,0);
 assert.equal(s.calls,10);assert.equal(s.stamps.size,5);assert.deepEqual(s.jokers,[]);
});

test('completed lines pay once, while retained stamps can score in another line; stages reset both',()=>{
 const s=newStage(10,5,{});
 for(let n=1;n<=5;n++)place(s,n,n);
 assert.equal(s.score,15);assert.equal(s.money,5);assert.equal(s.calls,10);
 assert.deepEqual(s.scoredLines,['row-1']);
 const nextChoice=place(s,6,6);assert.equal(nextChoice.points,0);
 place(s,7,11);place(s,8,16);const column=place(s,9,21);
 assert.equal(column.points,31);assert.equal(s.score,46);
 assert.equal(s.stamps.size,9);assert.deepEqual(s.scoredLines,['row-1','column-1']);
 assert.deepEqual(s.patternCounts,{square:0,corners:0,row:1,column:1,diagonal:0});
 const next=newStage(10,s.money,s.upgrades,s.patternCounts,s.jokers);
 assert.equal(next.stamps.size,0);assert.deepEqual(next.scoredLines,[]);assert.deepEqual(next.stampBalls,{});
 for(let n=1;n<=5;n++)place(next,n,n);assert.equal(next.score,15);assert.equal(next.patternCounts.row,2);
});
