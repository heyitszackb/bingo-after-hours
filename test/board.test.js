import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,shuffleBoard,boardPatterns,choose,redraw,PATTERNS} from '../game.js';
const layout=[17,4,23,8,12,3,20,7,1,25,14,10,22,6,18,2,15,24,11,9,21,5,16,13,19];
test('shuffle creates a full permutation and uses fresh randomness per stage',()=>{
  const layouts=new Set();
  for(let stage=1;stage<=10;stage++){const s=newStage(stage);assert.deepEqual([...s.board].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));layouts.add(s.board.join(','));}
  assert.equal(layouts.size,10);assert.deepEqual(shuffleBoard(()=>0),shuffleBoard(()=>0));assert.notDeepEqual(shuffleBoard(()=>0),shuffleBoard(()=>.8));
});
test('all visible rows, columns and diagonals score on a shuffled board',()=>{
  for(const positions of PATTERNS){
    const pattern=positions.map(pos=>layout[pos-1]);const s=newStage(10);s.board=[...layout];s.stamps=new Set(pattern.slice(0,4));s.offer=[pattern[4]];
    const r=choose(s,pattern[4]);assert.equal(r.points,pattern.reduce((sum,n)=>sum+n,0));assert.deepEqual(r.activations.map(a=>a.number),pattern);assert.equal(s.stamps.size,0);assert.deepEqual(s.board,layout);
  }
});
test('numeric sequences do not score unless their tiles actually form a bingo',()=>{
  const s=newStage(10);s.board=[...layout];s.stamps=new Set([1,2,3,4]);s.offer=[5];assert.equal(choose(s,5).points,0);assert.equal(s.stamps.size,5);
});
test('intersecting shuffled patterns apply paint to the correct numbers and retain other stamps',()=>{
  const s=newStage(10);s.board=[...layout];const patterns=boardPatterns(layout);const lines=[patterns[0],patterns[5],patterns[10]];const shared=layout[0];
  s.paints={[shared]:'red',[layout[1]]:'gold',[layout[5]]:'blue'};
  s.stamps=new Set([...lines.flat().filter(n=>n!==shared),layout[3*5+2]]);s.offer=[shared];const r=choose(s,shared);
  assert.equal(r.points,2*lines.flat().reduce((sum,n)=>sum+n,0));assert.equal(r.gold,1);assert.equal(r.bonusDraws,3);assert.equal(r.activations.filter(a=>a.number===shared).length,3);assert.deepEqual([...s.stamps],[layout[17]]);
});
test('reroll preserves layout; a stage reset retains number-bound paint',()=>{
  const s=newStage(1,20,{17:'gold'});s.board=[...layout];redraw(s);assert.deepEqual(s.board,layout);
  const next=newStage(2,s.money,s.paints,()=>0);assert.notDeepEqual(next.board,s.board);assert.deepEqual(next.paints,{17:'gold'});assert.equal(next.stamps.size,0);
});
