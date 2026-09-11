import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
await page.addInitScript(()=>{const fixture=sessionStorage.getItem('fixture');if(fixture){localStorage.setItem('binglatro.run.v1',fixture);sessionStorage.removeItem('fixture');}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.GAME_URL||'http://localhost:5173';
async function restore(s){await page.goto(url);await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,bag:[...s.bag],stamps:[...s.stamps]});await page.reload();await page.locator('#play-button').click();}
async function drag(from,to,touch=false){const a=await from.boundingBox(),b=await to.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
 if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*i/12,y:y+(ty-y)*i/12}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});await page.mouse.up();}
}
const s=newStage();s.status='passed';s.bonusPaid=true;s.money=16;s.shopOffer=[1,7,13];s.score=5;
await restore(s);await page.locator('#shop-screen').waitFor({state:'visible'});
for(const [w,h] of [[320,568],[375,667],[390,844],[667,375],[1440,900]]){
 await page.setViewportSize({width:w,height:h});
 for(const selector of ['.dashboard','#shop-screen','#shop-next','#shop-bag']){const r=await page.locator(selector).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=h+1&&r.x>=0&&r.x+r.width<=w+1,`${selector} fits ${w}x${h}: ${JSON.stringify(r)}`);}
}
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/binglatro-shop-before.png'});
// An off-target drop costs nothing.
await drag(page.locator('[data-paint=gold]'),page.locator('.shop-heading'));assert.equal(await page.locator('#money').textContent(),'16');
await drag(page.locator('[data-paint=gold]'),page.locator('#shop-balls [data-number="1"]'),true);
await page.locator('#shop-next:not([disabled])').waitFor();assert.equal(await page.locator('#money').textContent(),'13');assert.ok(await page.locator('#shop-balls [data-number="1"]').evaluate(b=>b.classList.contains('paint-gold')));
await drag(page.locator('[data-paint=gold]'),page.locator('#shop-balls [data-number="1"]'));assert.equal(await page.locator('#money').textContent(),'13');
await drag(page.locator('[data-paint=red]'),page.locator('#shop-balls [data-number="7"]'));
await page.locator('#shop-next:not([disabled])').waitFor();assert.equal(await page.locator('#money').textContent(),'10');
await page.locator('#shop-bag').click();assert.equal(await page.locator('#bag-grid .ball').count(),25);assert.equal(await page.locator('#bag-grid .paint-gold').count(),1);assert.equal(await page.locator('#bag-grid .paint-red').count(),1);await page.locator('#bag-dialog .close').click();
await page.screenshot({path:'/tmp/binglatro-shop-painted.png'});
await page.locator('#shop-menu').click();await page.reload();await page.locator('#play-button').click();await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal(await page.locator('#money').textContent(),'10');assert.deepEqual(await page.locator('#shop-balls .face').allTextContents(),['1','7','13']);
await page.locator('#shop-redraw').click();await page.locator('#shop-next:not([disabled])').waitFor();assert.equal(await page.locator('#money').textContent(),'8');assert.equal(new Set(await page.locator('#shop-balls .face').allTextContents()).size,3);
await page.locator('#shop-next').click();await page.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await page.locator('#stage').textContent(),'2');assert.equal(await page.locator('#money').textContent(),'8');assert.equal(await page.locator('#calls').textContent(),'12');
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')).paints),{1:'gold',7:'red'});
// Gold and blue animate their bonuses while scoring a vertical bingo.
const bonus=newStage(4,5,{1:'gold',6:'blue'});bonus.stamps=new Set([1,6,11,16]);bonus.offer=[21];await restore(bonus);await page.locator('#balls .ball:not([disabled])').first().waitFor();
await drag(page.locator('#balls .ball'),page.locator('#board'));await page.locator('.cash-flight').waitFor({state:'visible'});assert.equal(await page.locator('#money').textContent(),'5');
await page.locator('.draw-bonus').waitFor({state:'visible'});assert.equal(await page.locator('.draw-bonus').textContent(),'+3');assert.equal(await page.locator('#calls').textContent(),'11');
await page.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await page.locator('#money').textContent(),'6');assert.equal(await page.locator('#calls').textContent(),'14');
await page.reload();await page.locator('#play-button').click();await page.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await page.locator('#calls').textContent(),'14');
// Blue bonus calls are included in the stage payout, even above twelve.
bonus.stage=1;await restore(bonus);await page.locator('#balls .ball:not([disabled])').first().waitFor();await drag(page.locator('#balls .ball'),page.locator('#board'));await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal(await page.locator('#money').textContent(),'20');assert.equal(await page.locator('#calls').textContent(),'0');
// Check scoring and the highlighted cells for every line orientation.
for(const pattern of [[1,2,3,4,5],[1,6,11,16,21],[1,7,13,19,25],[5,9,13,17,21]]){
const red=newStage(4,5,{[pattern[0]]:'red',[pattern[2]]:'red'});red.stamps=new Set(pattern.slice(0,4));red.offer=[pattern[4]];await restore(red);await page.locator('#balls .ball:not([disabled])').first().waitFor();
assert.equal(await page.locator('#score').textContent(),'0');
await page.evaluate(()=>{window.scoreSteps=[];new MutationObserver(()=>window.scoreSteps.push(Number(document.querySelector('#score').textContent))).observe(document.querySelector('#score'),{childList:true});});
await drag(page.locator(`#balls [data-number="${pattern[4]}"]`),page.locator('#board'));await page.locator('.pattern-multiplier').waitFor({state:'visible'});assert.equal(await page.locator('.pattern-multiplier').textContent(),'×4');
assert.deepEqual(await page.locator('.cell.multiplied').evaluateAll(cells=>cells.map(c=>Number(c.id.replace('cell-','')))),pattern);
await page.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await page.locator('#score').textContent(),'20');assert.deepEqual(await page.evaluate(()=>[...new Set(window.scoreSteps.filter(n=>n>0))]),[4,8,12,16,20]);
}
// Tap/keyboard alternative and insufficient funds.
s.money=3;await restore(s);await page.locator('#shop-screen').waitFor({state:'visible'});await page.locator('[data-paint=blue]').focus();await page.keyboard.press('Enter');await page.locator('#shop-balls [data-number="13"]').click();await page.locator('#shop-next:not([disabled])').waitFor();assert.equal(await page.locator('#money').textContent(),'0');assert.equal(await page.locator('#shop-balls .paint-blue').count(),1);await page.screenshot({path:'/tmp/binglatro-blue-shop.png'});assert.ok(await page.locator('[data-paint=gold]').isDisabled());assert.ok(await page.locator('#shop-redraw').isDisabled());
// Old orange upgrades retain their power and become red; ordinary balls stay grey.
const legacy=newStage(2,5,{1:'orange'});legacy.offer=[1,2,3];await restore(legacy);await page.locator('#balls .ball:not([disabled])').first().waitFor();
assert.equal(await page.locator('#balls .paint-red').count(),1);assert.equal(await page.locator('#balls .paint-grey').count(),2);
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')).paints),{1:'red'});
await page.screenshot({path:'/tmp/binglatro-grey-red.png'});
assert.deepEqual(errors,[]);await browser.close();console.log('Passed mobile shop fit, touch/mouse paint drag, cancelled/same-color drops, prices, refresh, bag colors, saved shop, paint persistence, gold scoring payouts, blue bonus calls and payout, red scoring in all line orientations, and keyboard purchasing.');
