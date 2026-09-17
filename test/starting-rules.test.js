import test from 'node:test';
import assert from 'node:assert/strict';
import {newStage,choose,removeJoker,normalizeJokers} from '../game.js';
const finish=(jokers,values=[5,19,23,1,4])=>{
 const s=newStage(10,5,{}, {},jokers);s.calls=1;
 values.slice(0,4).forEach((n,i)=>{s.stamps.add(i+1);s.stampBalls[i+1]=n;s.stampValues[i+1]=n;s.bag.delete(n);});
 const n=values[4];s.offer=[n];s.playableSpaces=undefined;s.destinations={[n]:5};return {s,r:choose(s,n,5)};
};
test('default rules explain every awarded point with ordered card contributions',()=>{
 const {s,r}=finish();assert.deepEqual(s.jokers,['bingo','face-value']);assert.equal(r.points,52);
 assert.deepEqual(r.activations.map(a=>a.points),[5,19,23,1,4]);
 assert.ok(r.activations.every(a=>a.trigger==='bingo'&&a.contributions.length===1&&a.contributions[0].joker==='face-value'));
 assert.equal(r.activations.filter(a=>a.pattern).length,1);assert.equal(s.stamps.size,5);
});
test('removing Bingo prevents activation, points, and on-score resources',()=>{
 const {s,r}=finish(['face-value','call-range:1:1','single-digits:1']);
 assert.deepEqual(r.activations,[]);assert.equal(r.points,0);assert.equal(s.calls,0);assert.equal(s.patternCounts.row,0);
});
test('without Face Value, tiles activate for zero points',()=>{
 const {s,r}=finish(['bingo','single-digits:1','outer-layer:1','number-cruncher:1','call-range:1:1']);
 assert.equal(r.activations.length,5);assert.equal(r.points,0);assert.equal(s.score,0);assert.equal(s.patternCounts.row,1);assert.equal(s.calls,0);
 assert.ok(r.activations.every(a=>a.basePoints===0&&a.contributions.every(c=>c.calls!==undefined)));
 assert.deepEqual(s.scoredLines,['row-1']);
});
test('removed rules remain removed on the next stage and are not inserted by normalization',()=>{
 for(const id of ['bingo','face-value']){const s=newStage();removeJoker(s,id);const next=newStage(2,s.money,s.upgrades,s.patternCounts,s.jokers);assert.ok(!next.jokers.includes(id));}
 assert.deepEqual(normalizeJokers([]),[]);assert.deepEqual(normalizeJokers(),['bingo','face-value']);
});
