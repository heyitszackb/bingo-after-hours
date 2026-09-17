import test from 'node:test';import assert from 'node:assert/strict';import {newStage,choose,EXTRA_PATTERNS} from '../game.js';
function finish(jokers,occupied,tile){const s=newStage(10,5,{}, {},jokers);s.target=10000;for(const t of occupied){s.stamps.add(t);s.stampBalls[t]=t;s.stampValues[t]=t;s.bag.delete(t);}s.offer=[tile];s.playableSpaces=undefined;s.destinations={[tile]:tile};return {s,r:choose(s,tile)};}
test('all sixteen 2x2 squares and board corners score through their own cards',()=>{for(const p of EXTRA_PATTERNS){const {r}=finish(['face-value',`${p.type}:1`],p.tiles.slice(0,-1),p.tiles.at(-1));assert.equal(r.scoringGroups.length,1);assert.deepEqual(r.scoringGroups[0].tiles,p.tiles);assert.equal(r.points,p.tiles.reduce((a,b)=>a+b,0));}});
test('Bingo and Square both score independently in rack order, including shared tiles',()=>{for(const jokers of [['bingo','square:1','face-value'],['square:1','face-value','bingo']]){const {s,r}=finish(jokers,[1,2,3,4,9,10],5);assert.equal(r.points,43);assert.deepEqual(r.scoringGroups.map(g=>g.trigger),jokers.filter(id=>id!=='face-value'));assert.equal(r.activations.filter(a=>a.tile===5).length,2);assert.equal(s.patternCounts.square,1);assert.equal(s.patternCounts.row,1);}});
test('corners plus Bingo work together; stamp ink does not occupy a corner and absent cards do not trigger',()=>{assert.equal(finish(['bingo','corners:1','face-value'],[1,2,3,4,21,25],5).r.points,76);assert.equal(finish(['face-value'],[1,5,21],25).r.points,0);const {s}=finish(['corners:1','face-value'],[1,5],21);s.tileMultipliers[25]=3;s.offer=[20];s.playableSpaces=undefined;s.destinations={20:20};assert.equal(choose(s,20).points,0);});
test('Encore repeats the Square condition, but unrelated future placements do not repeat completed patterns',()=>{const {s,r}=finish(['encore:1','square:1','face-value'],[1,2,6],7);assert.equal(r.points,32);assert.equal(s.patternCounts.square,1);s.offer=[20];s.playableSpaces=undefined;s.destinations={20:20};assert.equal(choose(s,20).points,0);assert.deepEqual(newStage(10,5,{}, {},s.jokers,s).scoredLines,[]);});

test('Four Corners scores all occupied tiles with Face Value and Encore, only once per round',()=>{
 const {s,r}=finish(['encore:1','corners:1','face-value'],[1,5,13,21],25);
 assert.equal(r.points,130);assert.deepEqual(r.scoringGroups.map(g=>g.tiles),[[1,5,13,21,25],[1,5,13,21,25]]);
 assert.equal(s.patternCounts.corners,1);assert.equal(s.stamps.size,5);
 s.offer=[2];s.playableSpaces=undefined;s.destinations={2:2};assert.equal(choose(s,2).points,0);
 const noPoints=finish(['corners:1'],[1,5,13,21],25).r;
 assert.equal(noPoints.activations.length,5);assert.equal(noPoints.points,0);
});
