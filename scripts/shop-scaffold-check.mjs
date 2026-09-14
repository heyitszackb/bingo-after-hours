import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const s=sessionStorage.getItem('fixture');if(s){localStorage.setItem('binglatro.run.v1',s);sessionStorage.removeItem('fixture');}});
 await page.goto(process.env.GAME_URL||'http://localhost:5173');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
 const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await page.reload();await page.locator('#play-button').click();};
 const s=newStage(1,25);delete s.shopVersion;s.status='passed';s.bonusPaid=true;s.score=52;s.jokers.push('single-digits:1','number-cruncher:1');s.upgrades={1:'x',2:'doubler',3:'plasma'};s.ballValues={2:8};s.shopOffer={cards:['single-digits','call-range:13'],balls:['x','dynamite']};
 await restore(s);await page.locator('#shop-screen').waitFor({state:'visible'});
 assert.equal(await page.locator('#shop-cards .card-slot').count(),1);assert.equal(await page.locator('#shop-balls .ball-slot').count(),2);assert.equal(await page.locator('#shop-screen button').count(),4);assert.equal(await page.locator('#shop-redraw,#upgrade-dialog,#plasma-dialog,#plasma-pick').count(),0);
 assert.deepEqual((await read()).jokers,['bingo','face-value']);assert.deepEqual((await read()).upgrades,{});assert.equal((await read()).money,25);assert.equal((await read()).score,52);
 for(const [width,height] of [[390,844],[320,568],[1000,800],[844,390]]){
  await page.setViewportSize({width,height});
  for(const selector of ['.dashboard','#shop-screen','#shop-next','#shop-menu','.money-panel',...['cards','balls'].map(k=>`#shop-${k}`)]){const r=await page.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({selector,width,height,r}));}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);await page.screenshot({path:`/tmp/binglatro-shop-blank-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 const slot=await page.locator('.card-slot').first().boundingBox();await page.mouse.click(slot.x+slot.width/2,slot.y+slot.height/2);assert.equal((await read()).money,25);
 await page.locator('#shop-menu').click();await page.locator('#play-button').click();await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal((await read()).money,25);
 await page.reload();await page.locator('#play-button').click();await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal((await read()).money,25);
 await page.locator('#shop-next').click();await page.locator('#balls .ball:not([disabled])').waitFor();const next=await read();assert.equal(next.stage,2);assert.equal(next.score,0);assert.equal(next.calls,15);assert.equal(next.passes,10);assert.equal(next.money,25);assert.deepEqual(next.jokers,['bingo','face-value']);assert.deepEqual(next.upgrades,{});
 // Migrate an in-progress Plasma draw and altered stamps without losing the run.
 const active=newStage(10,32);delete active.shopVersion;active.score=17;active.calls=7;active.passes=4;active.plasmaActive=true;active.offer=[6,7,8];active.destinations={6:13,7:13,8:13};active.upgrades={1:'x',2:'doubler'};active.jokers=['face-value','single-digits:1'];
 for(let n=1;n<=2;n++){active.stamps.add(n);active.stampBalls[n]=n;active.stampValues[n]=n===1?null:8;active.bag.delete(n);}
 await restore(active);await page.locator('#balls .ball:not([disabled])').waitFor();assert.equal(await page.locator('#balls .ball').count(),1);assert.equal(await page.locator('#cell-1 span').textContent(),'1');assert.equal(await page.locator('#cell-2 span').textContent(),'2');assert.equal((await read()).score,17);assert.equal((await read()).calls,7);assert.equal((await read()).passes,4);assert.deepEqual((await read()).jokers,['face-value']);
 assert.deepEqual(errors,[]);console.log('Passed empty shop layout, no purchase/reroll controls, inert slots, saved-shop and active-run migration, menu/reload, and next round.');
}finally{await browser.close();}
