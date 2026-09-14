import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:process.env.REAL_MOTION?'no-preference':'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.audioAttempts=0;window.AudioContext=window.webkitAudioContext=class{constructor(){window.audioAttempts++;throw Error('No audio allowed');}};
  window.scoreEvents=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('.joker-card.scoring-card'))window.scoreEvents.push({id:this.dataset.joker,payout:this.dataset.payout,score:document.querySelector('#score').textContent,tiles:[...document.querySelectorAll('.cell.pattern-active')].map(c=>c.id),active:[...document.querySelectorAll('.cell.activating')].map(c=>c.id),at:performance.now()});
   return animate.call(this,frames,options);
  };
  const fixture=sessionStorage.getItem('fixture');if(fixture){localStorage.setItem('binglatro.run.v1',fixture);sessionStorage.removeItem('fixture');}
 });
 await page.goto(process.env.GAME_URL||'http://localhost:5173');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
 const fixture=(jokers)=>{const s=newStage(10,5,{}, {},jokers);[5,19,23,1].forEach((n,i)=>{s.stamps.add(i+1);s.stampBalls[i+1]=n;s.stampValues[i+1]=n;s.bag.delete(n);});s.offer=[4];s.destinations={4:5};return s;};
 const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await page.reload();await page.locator('#play-button').click();await page.locator('#balls .ball:not([disabled])').waitFor();};
 const swipe=async()=>{const r=await page.locator('#balls .ball').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2-45,{steps:5});assert.doesNotMatch(await page.locator('#gesture-hint').textContent(),/release/i);await page.mouse.up();};
 await restore(fixture());assert.equal(await page.locator('#score-meter #score').textContent(),'0');assert.equal(await page.locator('#score-meter #target').textContent(),'120');await swipe();
 if(process.env.REAL_MOTION){
  await page.locator('[data-joker="bingo"].scoring-card').waitFor();await page.screenshot({path:'/tmp/binglatro-rule-trigger.png'});
  await page.locator('[data-joker="face-value"].scoring-card').waitFor();await page.waitForTimeout(120);await page.screenshot({path:'/tmp/binglatro-rule-points.png'});
  // Cards cannot be trashed halfway through an already computed scoring sequence.
  await page.locator('[data-joker="face-value"]').focus();await page.keyboard.press('Delete');assert.ok((await read()).jokers.includes('face-value'));
 }
 await page.waitForFunction(()=>window.scoreEvents.length>=6&&!document.querySelector('.scoring-rack')&&document.querySelector('#balls .ball:not([disabled])'));
 const events=await page.evaluate(()=>window.scoreEvents);assert.deepEqual(events.map(e=>e.id),['bingo',...Array(5).fill('face-value')]);assert.equal(events[0].tiles.length,5);assert.equal(events[0].active.length,0);assert.deepEqual(events.slice(1).map(e=>e.payout),['+5','+19','+23','+1','+4']);assert.deepEqual(events.slice(1).map(e=>e.active),Array.from({length:5},(_,i)=>[`cell-${i+1}`]));assert.deepEqual(events.map(e=>e.score),['0','0','5','24','47','48']);assert.equal(await page.locator('#score-meter #score').textContent(),'52');assert.ok(await page.locator('#score-meter').isVisible());assert.equal(await page.locator('#score-readout,#score-running,#score-gain').count(),0);assert.equal((await read()).score,52);assert.equal(await page.locator('.stamped').count(),5);
 await restore(fixture(['bingo']));await swipe();await page.waitForFunction(()=>window.scoreEvents.length===1&&!document.querySelector('.scoring-rack')&&document.querySelector('#balls .ball:not([disabled])'));assert.equal((await read()).score,0);assert.equal((await read()).patternCounts.row,1);
 await restore(fixture(['face-value']));await swipe();await page.waitForFunction(()=>document.querySelector('#play-count').textContent==='14'&&document.querySelector('#balls .ball:not([disabled])'));assert.deepEqual(await page.evaluate(()=>window.scoreEvents),[]);assert.equal((await read()).score,0);
 // Existing saves receive Face Value once; deletion then persists across reload.
 const old=fixture(['bingo','single-digits:1']);old.jokerVersion=3;delete old.shopVersion;await restore(old);assert.deepEqual((await read()).jokers,['bingo','face-value']);
 await page.locator('[data-joker="face-value"]').focus();await page.keyboard.press('Delete');await page.reload();await page.locator('#play-button').click();await page.locator('#balls .ball:not([disabled])').waitFor();assert.ok(!(await read()).jokers.includes('face-value'));
 await page.locator('#pause-button').click();assert.equal(await page.locator('#sound-button').count(),0);assert.equal(await page.evaluate(()=>window.audioAttempts),0);assert.deepEqual(errors,[]);
 console.log('Passed rule attribution/order, five distinct value pulses, zero-point scoring, absent trigger, save migration, no audio, and input locking.');
}finally{await browser.close();}
