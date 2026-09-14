import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage,openShop,buyItem} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:process.env.REAL_MOTION?'no-preference':'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem('fixture');if(fixture){localStorage.setItem('binglatro.run.v1',fixture);sessionStorage.removeItem('fixture');}
  window.dieEvents=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('.die-rolling'))window.dieEvents.push({type:'roll',settled:this.classList.contains('die-settled'),value:this.querySelector('span').textContent});
   if(this.matches('.joker-card.scoring-card'))window.dieEvents.push({type:'score',id:this.dataset.joker,rolling:!!document.querySelector('.die-rolling'),value:document.querySelector('#cell-5 span').textContent});
   return animate.call(this,frames,options);
  };
 });
 await page.goto(process.env.GAME_URL||'http://localhost:5173');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
 const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await page.reload();await page.locator('#play-button').click();};
 const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
 const shop=newStage(1,0);shop.status='passed';shop.bonusPaid=true;shop.shopOffer={cards:[null,null],balls:[null,null],items:['bomb']};await restore(shop);await page.locator('#shop-screen').waitFor({state:'visible'});
 for(const [width,height] of [[390,844],[320,568],[1000,800],[844,390]]){
  await page.setViewportSize({width,height});for(const sel of ['#shop-screen','#shop-bomb','#shop-d20','#shop-next','.dashboard']){const r=await page.locator(sel).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({sel,width,height,r}));}await page.screenshot({path:`/tmp/binglatro-d20-shop-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#shop-d20').click();await page.locator('#shop-d20').click();assert.equal((await read()).money,0);assert.equal((await read()).items[26],'d20');assert.equal(await page.locator('#shop-d20-count').textContent(),'2');await page.reload();await page.locator('#play-button').click();assert.equal(await page.locator('#shop-d20-count').textContent(),'2');await page.locator('#shop-next').click();await ready();await page.locator('#bag').click();assert.equal(await page.locator('#bag-grid .die-item').count(),2);await page.locator('#bag-grid [data-number="26"]').click();assert.equal(await page.locator('#tooltip-number').textContent(),'?');assert.match(await page.locator('#tooltip-effect').textContent(),/Roll 1–20/);await page.locator('#bag-dialog .close').click();
 openShop(shop);const id=buyItem(shop,'d20'),turn=newStage(10,0,{}, {},shop.jokers,shop);[1,2,3,4].forEach(n=>{turn.stamps.add(n);turn.stampBalls[n]=n;turn.stampValues[n]=n;turn.bag.delete(n);});turn.offer=[id];turn.destinations={[id]:5};await restore(turn);await ready();
 assert.equal(await page.locator('#balls .die-item .face').textContent(),'?');await page.locator('#balls .die-item').click();assert.equal(await page.locator('#tooltip-number').textContent(),'?');assert.equal((await read()).calls,15);assert.equal((await read()).stampValues[5],undefined);await page.screenshot({path:'/tmp/binglatro-d20-draw.png'});
 await page.keyboard.press('ArrowDown');await ready();await page.waitForFunction(()=>document.querySelector('#redraw-cost').textContent==='9');assert.ok((await read()).bag.includes(id));assert.equal((await read()).stampValues[5],undefined);
 await restore(turn);await ready();await page.keyboard.press('ArrowUp');
 if(process.env.REAL_MOTION){await page.locator('.die-rolling').waitFor();await page.screenshot({path:'/tmp/binglatro-d20-rolling.png'});}
 await page.waitForFunction(()=>window.dieEvents.some(e=>e.type==='score')&&document.querySelector('#balls .ball:not([disabled])')&&!document.querySelector('.scoring-rack'));
 const after=await read(),value=after.stampValues[5];assert.ok(value>=1&&value<=20);assert.equal(after.score,10+value);assert.equal(after.calls,14);assert.equal(await page.locator('#cell-5.die-item span').textContent(),String(value));
 const events=await page.evaluate(()=>window.dieEvents),firstScore=events.findIndex(e=>e.type==='score');assert.ok(firstScore>0);assert.ok(events[firstScore-1].settled);assert.equal(events[firstScore-1].value,String(value));assert.equal(events.filter(e=>e.type==='score').length,6);assert.ok(events.filter(e=>e.type==='score').every(e=>!e.rolling&&e.value===String(value)));await page.screenshot({path:'/tmp/binglatro-d20-settled.png'});
 await page.reload();await page.locator('#play-button').click();await ready();assert.equal((await read()).stampValues[5],value);assert.equal(await page.locator('#cell-5.die-item span').textContent(),String(value));await page.locator('#cell-5').click();assert.equal(await page.locator('#tooltip-number').textContent(),String(value));assert.match(await page.locator('#tooltip-effect').textContent(),/Keep that number/);
 const end={...after,stage:1,target:5,status:'passed',bonusPaid:true,stamps:new Set(after.stamps),bag:new Set(after.bag)};await restore(end);await page.locator('#shop-next').click();await ready();assert.equal((await read()).stampValues[5],undefined);await page.locator('#bag').click();assert.equal(await page.locator(`#bag-grid [data-number="${id}"] .face`).textContent(),'?');
 assert.deepEqual(errors,[]);console.log('Passed D20 shop, responsive layouts, unknown draw, inspection/pass, roll-before-scoring animation, result persistence, and fresh next-round roll.');
}finally{await browser.close();}
