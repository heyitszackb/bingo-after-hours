import {checkShopLayout} from './shop-layout.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage,openShop,buyItem,ballValue} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:process.env.REAL_MOTION?'no-preference':'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem('fixture');if(fixture){localStorage.setItem('binglatro.run.v1',fixture);sessionStorage.removeItem('fixture');}
  window.bombEvents=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('.joker-card.scoring-card'))window.bombEvents.push({type:'score',id:this.dataset.joker,stamps:document.querySelectorAll('.cell.stamped').length});
   if(this.matches('.bomb-armed'))window.bombEvents.push({type:'bomb',score:document.querySelector('#score').textContent,stamps:document.querySelectorAll('.cell.stamped').length,scoring:!!document.querySelector('.scoring-rack')});
   return animate.call(this,frames,options);
  };
 });
 await page.goto(process.env.GAME_URL||'http://localhost:5173');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
 const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await page.reload();await page.locator('#play-button').click();};
 const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
 const s=newStage(1,0);s.status='passed';s.bonusPaid=true;openShop(s);await restore(s);await page.locator('#shop-screen').waitFor({state:'visible'});
 await checkShopLayout(page,'bomb-check');
 await page.setViewportSize({width:390,height:844});await page.locator('#shop-bomb').click();await page.locator('#shop-bomb').click();assert.equal((await read()).money,0);assert.equal((await read()).collection.length,27);assert.equal(await page.locator('#shop-item-count').textContent(),'2');
 await page.reload();await page.locator('#play-button').click();await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal(await page.locator('#shop-item-count').textContent(),'2');await page.locator('#shop-next').click();await ready();assert.equal((await read()).collection.length,27);
 await page.locator('#bag').click();assert.equal(await page.locator('#bag-grid .bomb-item').count(),2);assert.equal(await page.locator('#bag-grid .ball').count(),27);await page.locator('#bag-grid [data-number="26"]').click();assert.equal(await page.locator('#tooltip-number').textContent(),'Bomb');assert.match(await page.locator('#tooltip-effect').textContent(),/On placement/);await page.locator('#bag-dialog .close').click();
 const shop=newStage(1,0);shop.status='passed';shop.bonusPaid=true;openShop(shop);const id=buyItem(shop,'bomb'),unused=buyItem(shop,'bomb');
 const turn=newStage(10,0,{}, {},shop.jokers,shop);[1,2,3,4].forEach(n=>{turn.stamps.add(n);turn.stampBalls[n]=n;turn.stampValues[n]=n;turn.bag.delete(n);});turn.offer=[id];turn.destinations={[id]:5};await restore(turn);await ready();
 const swipe=async dy=>{const r=await page.locator('#balls .ball').first().boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2+dy,{steps:6});await page.mouse.up();};
 assert.equal(await page.locator('#balls .bomb-item .face').textContent(),'');await swipe(-45);
 if(process.env.REAL_MOTION){await page.locator('.bomb-armed').waitFor();assert.ok(await page.locator('#cell-5.bomb-item.stamped').isVisible());assert.equal(await page.locator('.scoring-card').count(),0);await page.screenshot({path:'/tmp/binglatro-bomb-blast.png'});}
 await page.waitForFunction(()=>window.bombEvents.some(e=>e.type==='bomb')&&!document.querySelector('.bomb-exploding')&&document.querySelector('#balls .ball:not([disabled])'));
 const events=await page.evaluate(()=>window.bombEvents);assert.deepEqual(events.map(e=>e.type),['bomb']);assert.deepEqual(events.at(-1),{type:'bomb',score:'0',stamps:5,scoring:false});const after=await read();assert.equal(after.score,0);assert.equal(after.calls,14);assert.ok(!after.collection.includes(id)&&!after.collection.includes(4));assert.ok(after.collection.includes(unused));assert.equal(await page.locator('.cell').count(),25);assert.equal(await page.locator('.cell.stamped').count(),3);
 await page.reload();await page.locator('#play-button').click();await ready();assert.ok(!(await read()).collection.includes(4));await page.locator('#bag').click();assert.equal(await page.locator('#bag-grid [data-number="4"],#bag-grid [data-number="26"]').count(),0);assert.equal(await page.locator('#bag-grid [data-number="27"]').count(),1);await page.locator('#bag-dialog .close').click();
 // Passing an offered Bomb preserves it; a later non-scoring play still explodes.
 const quiet=newStage(10,0,{}, {},shop.jokers,shop);quiet.offer=[id];quiet.destinations={[id]:13};await restore(quiet);await ready();await swipe(50);await page.waitForFunction(()=>document.querySelector('#redraw-cost').textContent==='9'&&document.querySelector('#balls .ball:not([disabled])'));assert.ok((await read()).bag.includes(id));assert.equal((await read()).calls,15);
 await restore(quiet);await ready();await swipe(-45);await page.waitForFunction(()=>window.bombEvents.some(e=>e.type==='bomb')&&!document.querySelector('.bomb-exploding')&&document.querySelector('#balls .ball:not([disabled])'));assert.deepEqual((await page.evaluate(()=>window.bombEvents)).map(e=>e.type),['bomb']);assert.equal((await read()).score,0);assert.equal(await page.locator('.stamped').count(),0);
 // No last-play win from a line that the Bomb destroys.
 const last={...turn,stage:1,target:5,calls:1};await restore(last);await ready();await swipe(-45);await page.locator('#result-actions').waitFor({state:'visible'});assert.equal((await read()).status,'over');assert.equal((await read()).score,0);assert.ok(!(await read()).collection.includes(id));assert.equal(await page.locator('#shop-screen').isVisible(),false);
 // Rebuild the broken line on later plays, then carry destruction through the win.
 const rebuild={...turn,stage:1,target:5};await restore(rebuild);await ready();await swipe(-45);await ready();
 for(const [number,tile] of [[6,4],[7,5]]){const current=await read();await restore({...current,offer:[number],destinations:{[number]:tile},stamps:new Set(current.stamps),bag:new Set(current.bag)});await ready();await swipe(-45);if(number===6)await ready();}
 await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal((await read()).score,19);await page.locator('#shop-next').click();await ready();assert.ok(!(await read()).bag.includes(4));assert.ok(!(await read()).bag.includes(id));assert.ok((await read()).bag.includes(unused));assert.equal((await read()).stage,2);
 assert.deepEqual(errors,[]);console.log('Passed free Bomb additions, responsive shop, bag/tooltip, reload, explosion-before-scoring, no-score blast, pass, permanent removal and next round.');
}finally{await browser.close();}
