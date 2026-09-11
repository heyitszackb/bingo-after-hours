import test from 'node:test';
import assert from 'node:assert/strict';
import {PATTERNS,PATTERN_TYPES,PATTERN_DEFINITIONS,freshPatternCounts,completedPatterns,newStage,choose} from '../game.js';

const matches=(tiles,type)=>completedPatterns(new Set(tiles)).filter(pattern=>pattern.type===type);

test('the scoring catalog contains five types and all 29 distinct board patterns',()=>{
  assert.deepEqual(PATTERN_TYPES.map(type=>type.id),['row','column','diagonal','corners','square4']);
  assert.equal(PATTERN_DEFINITIONS.length,29);
  assert.deepEqual(Object.fromEntries(PATTERN_TYPES.map(({id})=>[id,PATTERN_DEFINITIONS.filter(pattern=>pattern.type===id).length])),{
    row:5,column:5,diagonal:2,corners:1,square4:16
  });
  assert.equal(new Set(PATTERN_DEFINITIONS.map(pattern=>pattern.id)).size,29);
  assert.equal(new Set(PATTERNS.map(tiles=>[...tiles].sort((a,b)=>a-b).join(','))).size,29);
  assert.deepEqual(PATTERNS,PATTERN_DEFINITIONS.map(pattern=>pattern.tiles));
  for(const pattern of PATTERN_DEFINITIONS){
    const type=PATTERN_TYPES.find(type=>type.id===pattern.type);
    assert.equal(pattern.tiles.length,type.basePoints);
    assert.equal(new Set(pattern.tiles).size,pattern.tiles.length);
    assert.ok(pattern.tiles.every(tile=>Number.isInteger(tile)&&tile>=1&&tile<=25));
  }
  for(const type of PATTERN_TYPES){
    assert.ok(type.label.length>0);
    assert.equal(matches(type.previewTiles,type.id).length,1);
  }
});

test('rows, columns, and both full diagonals match their board geometry',()=>{
  for(let i=0;i<5;i++){
    const row=Array.from({length:5},(_,column)=>i*5+column+1);
    const column=Array.from({length:5},(_,row)=>row*5+i+1);
    assert.equal(matches(row,'row').length,1);
    assert.equal(matches(column,'column').length,1);
    assert.equal(matches(row.slice(1),'row').length,0);
    assert.equal(matches(column.slice(1),'column').length,0);
  }
  assert.equal(matches([1,7,13,19,25],'diagonal').length,1);
  assert.equal(matches([5,9,13,17,21],'diagonal').length,1);
  assert.equal(matches([2,8,14,20],'diagonal').length,0);
});

test('four corners means the four outer board corners only',()=>{
  assert.deepEqual(matches([1,5,21,25],'corners').map(pattern=>pattern.tiles),[[1,5,21,25]]);
  assert.equal(matches([1,3,11,13],'corners').length,0);
  assert.equal(matches([1,5,21],'corners').length,0);
});

test('square patterns require filled contiguous 2×2 blocks without wrapping',()=>{
  for(let row=0;row<4;row++)for(let column=0;column<4;column++){
    const tiles=Array.from({length:4},(_,i)=>(row+Math.floor(i/2))*5+column+i%2+1);
    assert.equal(matches(tiles,'square4').length,1);
    assert.equal(matches(tiles.slice(1),'square4').length,0);
  }
  assert.equal(matches([5,6,10,11],'square4').length,0);
  assert.equal(matches([1,3,11,13],'square4').length,0);
});

test('matching preserves every overlapping pattern and does not mutate stamps',()=>{
  const square=new Set([1,2,3,6,7,8,11,12,13]);
  const before=[...square];
  const completed=completedPatterns(square);
  assert.equal(completed.filter(pattern=>pattern.type==='square4').length,4);
  assert.equal(completed.length,4);
  assert.deepEqual([...square],before);
  assert.equal(completedPatterns(new Set()).length,0);
  assert.equal(completedPatterns(new Set(Array.from({length:25},(_,i)=>i+1))).length,29);
});

test('fresh pattern counters are independent and begin at zero for every type',()=>{
  const first=freshPatternCounts(),second=freshPatternCounts();
  assert.deepEqual(first,{row:0,column:0,diagonal:0,corners:0,square4:0});
  first.row=3;
  assert.equal(second.row,0);
  assert.deepEqual(Object.keys(first),PATTERN_TYPES.map(type=>type.id));
});

const place=(state,ball,tile)=>{state.offer=[ball];state.destinations={[ball]:tile};return choose(state,ball);};

test('outer corners and every small square score, count, and clear automatically',()=>{
  for(const definition of PATTERN_DEFINITIONS.filter(pattern=>['corners','square4'].includes(pattern.type))){
    const state=newStage(10);
    let result;
    for(let i=0;i<definition.tiles.length;i++){
      result=place(state,25-i,definition.tiles[i]);
      if(i<definition.tiles.length-1){assert.equal(result.points,0);assert.equal(state.patternCounts[definition.type],0);}
    }
    assert.deepEqual(result.scoredPatterns,[definition]);
    assert.equal(result.points,4);
    assert.deepEqual(state.patternCounts,{...freshPatternCounts(),[definition.type]:1});
    assert.equal(state.stamps.size,0);
    assert.deepEqual(state.stampBalls,{});
    assert.equal(state.calls,8);
    assert.equal(state.bag.size,21);
  }
});

test('overlapping small squares count separately, apply paint per activation, and clear their union',()=>{
  const state=newStage(10,5,{1:'red',2:'gold',5:'red',25:'blue'});
  const positions=[1,2,3,6,8,25];
  positions.forEach((tile,i)=>{state.stamps.add(tile);state.stampBalls[tile]=i+1;state.bag.delete(i+1);});
  assert.equal(completedPatterns(state.stamps).length,0);
  const result=place(state,25,7);
  assert.deepEqual(result.scoredPatterns.map(pattern=>pattern.id),['square4-1-1','square4-1-2']);
  assert.equal(result.points,16);
  assert.equal(result.gold,2);
  assert.equal(result.bonusDraws,6);
  assert.equal(result.activations.length,8);
  assert.equal(result.activations.filter(activation=>activation.tile===2).length,2);
  assert.equal(result.activations.filter(activation=>activation.tile===7).length,2);
  assert.deepEqual([...result.cleared].sort((a,b)=>a-b),[1,2,3,6,7,8]);
  assert.deepEqual(state.patternCounts,{...freshPatternCounts(),square4:2});
  assert.equal(state.money,7);
  assert.equal(state.calls,17);
  assert.deepEqual([...state.stamps],[25]);
  assert.deepEqual(state.stampBalls,{25:6});
  assert.equal(choose(state,25),null);
  assert.equal(state.patternCounts.square4,2);
});

test('scoring counts carry across stages by value and reset for a fresh run',()=>{
  const first=newStage(10);
  [1,2,6,7].forEach((tile,i)=>place(first,i+1,tile));
  [1,5,21,25].forEach((tile,i)=>place(first,i+5,tile));
  assert.deepEqual(first.patternCounts,{row:0,column:0,diagonal:0,corners:1,square4:1});
  const next=newStage(10,first.money,first.paints,first.patternCounts);
  assert.deepEqual(next.patternCounts,first.patternCounts);
  assert.notEqual(next.patternCounts,first.patternCounts);
  [11,12,13,14,15].forEach((tile,i)=>place(next,i+1,tile));
  assert.equal(next.patternCounts.row,1);
  assert.equal(first.patternCounts.row,0);
  assert.equal(next.patternCounts.corners,1);
  assert.equal(next.patternCounts.square4,1);
  assert.deepEqual(newStage().patternCounts,freshPatternCounts());
});
