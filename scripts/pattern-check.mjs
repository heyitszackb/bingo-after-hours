import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage as startingStage} from '../game.js';
const newStage=(stage,money,paints,counts,jokers=['bingo'])=>startingStage(stage,money,paints,counts,jokers);

const url=process.env.GAME_URL||'http://localhost:5173';
const ids=['row','column','diagonal'];
const labels=['5 in a row','5 in a col','Diagonals'];
const basePoints=[5,5,5];
const zeroCounts=Object.fromEntries(ids.map(id=>[id,0]));
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem('pattern-fixture');
  if(fixture){localStorage.setItem('binglatro.run.v1',fixture);sessionStorage.removeItem('pattern-fixture');}
});

const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
const serialized=state=>({...state,stamps:[...state.stamps],bag:[...state.bag]});
async function restore(state){
  await page.evaluate(state=>sessionStorage.setItem('pattern-fixture',JSON.stringify(state)),serialized(state));
  await page.reload();
  await page.locator('#play-button').click();
  await ready();
}
async function openPatterns(button='#patterns-button'){
  await page.locator(button).click();
  await page.locator('#patterns-dialog').waitFor({state:'visible'});
  await page.locator('#patterns-dialog').evaluate(async dialog=>{
    await Promise.all(dialog.getAnimations().filter(animation=>animation.effect.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
  });
}
const closePatterns=()=>page.locator('#patterns-dialog .close').click();
async function checkCounts(expected){
  for(const id of ids){
    assert.equal((await page.locator(`[data-pattern="${id}"] .pattern-count`).textContent()).replace(/\s/g,''),`×${expected[id]}`);
  }
  assert.equal(await page.locator('#patterns-total').textContent(),String(Object.values(expected).reduce((sum,count)=>sum+count,0)));
}
async function play(number){
  await page.locator(`#balls [data-number="${number}"]`).focus();
  await page.keyboard.press('Space');
}

try{
  await page.goto(url);
  await page.locator('#play-button').click();
  await ready();
  await openPatterns();
  assert.deepEqual(await page.locator('#patterns-list .pattern-row').evaluateAll(rows=>rows.map(row=>row.dataset.pattern)),ids);
  assert.equal(await page.locator('[data-pattern="square9"]').count(),0);
  for(let i=0;i<ids.length;i++){
    const row=page.locator(`[data-pattern="${ids[i]}"]`);
    assert.ok((await row.locator('.pattern-name').textContent()).includes(labels[i]));
    assert.equal((await row.locator('.pattern-base').textContent()).replace(/\s/g,''),`${basePoints[i]}pts`);
    assert.equal(await row.locator('.pattern-preview i').count(),25);
    assert.equal(await row.locator('.pattern-preview .filled').count(),5);
  }
  await checkCounts(zeroCounts);
  await closePatterns();
  await openPatterns('#score-patterns');
  await checkCounts(zeroCounts);
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#patterns-dialog').isHidden());

  // Both menu access points and every pattern stay inside compact mobile layouts.
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    const bounds=await page.evaluate(()=>{
      const box=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};};
      return {footer:box(document.querySelector('footer')),buttons:[...document.querySelectorAll('footer button')].map(box),score:box(document.querySelector('#score-patterns')),scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth};
    });
    assert.ok(bounds.scrollHeight<=height+1&&bounds.scrollWidth<=width+1,JSON.stringify({width,height,...bounds}));
    for(const box of [bounds.footer,bounds.score,...bounds.buttons])assert.ok(box.left>=-1&&box.top>=-1&&box.right<=width+1&&box.bottom<=height+1,JSON.stringify({width,height,box}));
    await openPatterns();
    const modal=await page.locator('#patterns-dialog').evaluate(dialog=>{
      const r=dialog.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth,scrollHeight:dialog.scrollHeight,clientHeight:dialog.clientHeight};
    });
    assert.ok(modal.left>=-1&&modal.top>=-1&&modal.right<=width+1&&modal.bottom<=height+1,JSON.stringify({width,height,modal}));
    assert.ok(modal.scrollWidth<=modal.clientWidth+1&&modal.scrollHeight<=modal.clientHeight+1,JSON.stringify({width,height,modal}));
    for(const row of await page.locator('.pattern-row').all()){
      const box=await row.boundingBox();
      assert.ok(box.x>=modal.left&&box.y>=modal.top&&box.x+box.width<=modal.right+1&&box.y+box.height<=modal.bottom+1,JSON.stringify({width,height,box,modal}));
    }
    await page.screenshot({path:`/tmp/binglatro-patterns-${width}x${height}.png`});
    await closePatterns();
  }
  await page.setViewportSize({width:390,height:844});

  // Actually complete an adjacent 2×2: no points, no counted pattern, stamps remain.
  const square=newStage();
  square.stamps=new Set([1,2,6]);
  square.stampBalls={1:1,2:2,6:3};
  square.bag=new Set([...square.bag].filter(number=>number>3));
  for(const number of [1,2,3])square.played[number]=1;
  square.offer=[4,5,6];square.destinations={4:7,5:15,6:24};
  await restore(square);
  await play(4);
  await page.waitForFunction(()=>document.querySelector('#score').textContent==='0'&&!document.querySelector('#pause-button').disabled);
  await ready();
  assert.equal(await page.locator('#calls').textContent(),'11');
  assert.equal(await page.locator('.cell.stamped').count(),4);
  assert.ok(await page.locator('#shop-screen').isHidden());
  assert.equal((await read()).status,'playing');
  const squareCounts={...zeroCounts};
  await openPatterns();await checkCounts(squareCounts);await closePatterns();
  await page.reload();await page.locator('#play-button').click();await ready();
  await openPatterns('#score-patterns');await checkCounts(squareCounts);await closePatterns();

  // A later row completion increments its own count; shop progression retains the run totals.
  const row=newStage(1,5,{},squareCounts,['row','column']);
  row.stamps=new Set([1,2,3,4]);row.stampBalls={1:1,2:2,3:3,4:4};
  row.bag=new Set([...row.bag].filter(number=>number>4));
  for(const number of [1,2,3,4])row.played[number]=1;
  row.offer=[5,6,7];row.destinations={5:5,6:16,7:24};
  await restore(row);await play(5);
  await page.locator('#shop-screen').waitFor({state:'visible'});
  assert.equal(await page.locator('#money').textContent(),'16');
  assert.deepEqual((await read()).patternCounts,{...squareCounts,row:1});
  await page.locator('#shop-next').click();await ready();
  assert.equal(await page.locator('#stage').textContent(),'2');assert.deepEqual((await read()).jokers,['bingo']);
  assert.equal(await page.locator('#score').textContent(),'0');
  await openPatterns();await checkCounts({...squareCounts,row:1});await closePatterns();

  // Restarting begins new run statistics, while old/malformed statistics safely normalize.
  await page.locator('#pause-button').click();await page.locator('#restart-button').click();await page.locator('#confirm-restart').click();await ready();
  await openPatterns();await checkCounts(zeroCounts);await closePatterns();
  const oldSave=newStage();delete oldSave.patternCounts;delete oldSave.jokers;
  await restore(oldSave);assert.equal(await page.locator('[data-joker]').count(),1);await openPatterns();await checkCounts(zeroCounts);await closePatterns();
  const invalidCounts=newStage();invalidCounts.patternCounts={row:-2,column:1.5,diagonal:'3',corners:null,square4:2,square9:4,unknown:9};
  await restore(invalidCounts);await openPatterns();await checkCounts({...zeroCounts});await closePatterns();
  assert.deepEqual((await read()).patternCounts,{...zeroCounts});
  assert.deepEqual(errors,[]);
  console.log('Passed scoring-pattern previews and counts, both menu buttons, three mobile layouts, non-scoring 2×2 stamps, saved counts, stage/shop retention, restart reset, and old/invalid count migration.');
}finally{
  await browser.close();
}
