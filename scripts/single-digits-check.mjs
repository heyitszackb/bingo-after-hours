import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const [width,height,bonus] of [[1000,800,true],[320,568,false]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=newStage(10,5,{4:'black'});[5,19,23,1].forEach((n,i)=>{s.stamps.add(i+1);s.stampBalls[i+1]=n;s.bag.delete(n);});s.offer=[4];s.destinations={4:5};
  // Old saves gain the new card once; subsequent reloads respect removal.
  delete s.jokerVersion;s.jokers=['bingo'];
  await page.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('binglatro.run.v1',JSON.stringify(s));sessionStorage.setItem('seeded','1');}},{...s,stamps:[...s.stamps],bag:[...s.bag]});
  await page.goto(process.env.GAME_URL||'http://localhost:5173');const ready=()=>page.locator('#balls .ball:not([disabled])').waitFor();await page.locator('#play-button').click();await ready();
  assert.equal(await page.locator('[data-joker]').count(),2);
  for(const card of await page.locator('[data-joker]').all())assert.ok(await card.evaluate(c=>c.scrollHeight<=c.clientHeight+1));
  await page.screenshot({path:`/tmp/binglatro-single-digits-${width}.png`});
  if(!bonus){await page.locator('[data-joker=single-digits]').focus();await page.keyboard.press('Delete');await page.reload();await page.locator('#play-button').click();await ready();assert.equal(await page.locator('[data-joker=single-digits]').count(),0);}
  await page.evaluate(()=>{window.events=[];let last=false,seenBingo=false;new MutationObserver(()=>{if(!seenBingo&&document.querySelector('[data-joker=bingo].scoring-card')){window.events.push({kind:'bingo'});seenBingo=true;}const bonus=document.querySelector('[data-joker="single-digits"].scoring-card');if(bonus&&!last)window.events.push({kind:'bonus',tile:document.querySelector('.cell.activating')?.id});last=!!bonus;}).observe(document.querySelector('#joker-rack'),{subtree:true,attributes:true});});
  await page.locator('#balls .ball').focus();await page.keyboard.press('Space');
  await page.locator('[data-joker=bingo].scoring-card').waitFor();assert.equal(await page.evaluate(()=>window.events[0]?.kind),'bingo');
  await page.waitForFunction(score=>document.querySelector('#score').textContent===String(score)&&!document.querySelector('#pause-button').disabled,bonus?8:5);
  assert.deepEqual(await page.evaluate(()=>window.events.filter(e=>e.kind==='bonus').map(e=>e.tile)),bonus?['cell-1','cell-4','cell-5']:[]);
  assert.equal(await page.locator('.cell.stamped').count(),5);assert.equal(await page.locator('.scoring-card,.score-spark,.activation-point').count(),0);assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Passed 8-point example, Bingo-before-bonus sequence, exactly three single-digit triggers, small-screen cards, save migration and persistent bonus removal.');
}finally{await browser.close();}
