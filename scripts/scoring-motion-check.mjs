import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const s=newStage(10,5,{25:'black'}),positions=[2,3,4,5,6,11,16,21,7,13,19,25];
 positions.forEach((tile,i)=>{s.stamps.add(tile);s.stampBalls[tile]=i+1;s.bag.delete(i+1);});s.offer=[25];s.destinations={25:1};
 await page.addInitScript(s=>localStorage.setItem('binglatro.run.v1',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});
 await page.goto(process.env.GAME_URL||'http://localhost:5173');await page.locator('#play-button').click();await page.locator('#balls .ball:not([disabled])').waitFor();
 await page.evaluate(()=>{window.scoringTrace=[];new MutationObserver(()=>{const cards=[...document.querySelectorAll('.scoring-card')];if(cards.length)window.scoringTrace.push({ids:cards.map(c=>c.dataset.joker),payout:cards[0].dataset.payout});}).observe(document.querySelector('#joker-rack'),{subtree:true,attributes:true});});
 await page.locator('#balls .ball').focus();await page.keyboard.press('Space');
 for(const type of ['row','column','diagonal']){
  await page.locator(`[data-joker=${type}].scoring-card`).waitFor();
  assert.equal(await page.locator('.scoring-card').count(),1);
  await page.waitForFunction(type=>document.querySelector(`[data-joker=${type}]`).dataset.payout==='+4',type);
  assert.equal(await page.locator('.cell.pattern-active').count(),5);
  if(type==='row')await page.screenshot({path:'/tmp/binglatro-scoring-activation.png'});
 }
 await page.waitForFunction(()=>!document.querySelector('#pause-button').disabled&&document.querySelector('#score').textContent==='30');
 const trace=await page.evaluate(()=>window.scoringTrace);
 assert.deepEqual([...new Set(trace.flatMap(t=>t.ids))],['row','column','diagonal']);
 assert.ok(trace.every(t=>t.ids.length===1));
 for(const type of ['row','column','diagonal'])assert.ok(trace.some(t=>t.ids[0]===type&&t.payout==='+10'));
 assert.equal(await page.locator('.scoring-card,.scoring-rack,.score-spark,.activation-point').count(),0);
 assert.equal(await page.locator('.cell.stamped').count(),13);assert.deepEqual(errors,[]);
 console.log('Passed sequential row/column/diagonal card focus, live subtotals, five-tile highlights, retained stamps, final totals and effect cleanup.');
}finally{await browser.close();}
