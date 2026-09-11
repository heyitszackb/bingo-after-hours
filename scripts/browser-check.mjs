import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.GAME_URL||'http://localhost:5173');await page.locator('#play-button').click();
const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
await ready();
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[667,375],[1280,800]]){
 await page.setViewportSize({width,height});
 const bounds=await page.evaluate(()=>{const r=document.querySelector('footer').getBoundingClientRect(),b=document.querySelector('.board-frame').getBoundingClientRect();return {bottom:r.bottom,top:b.top,right:r.right,h:innerHeight,w:innerWidth,scroll:document.documentElement.scrollHeight};});
 assert.ok(bounds.bottom<=height&&bounds.top>=0&&bounds.right<=width,JSON.stringify(bounds));
 assert.ok(bounds.scroll<=height,JSON.stringify({width,height,...bounds}));
 for(const num of [1,5,25]){await page.locator(`#cell-${num}`).tap();const r=await page.locator('#inspect-tooltip').boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height,JSON.stringify({width,height,r}));await page.keyboard.press('Escape');}

}
await page.setViewportSize({width:375,height:667});
const first=page.locator('#balls .ball').first(),n=await first.locator('.face').textContent();
await first.tap();await page.locator('#inspect-tooltip').waitFor({state:'visible'});assert.equal(await page.locator('#tooltip-number').textContent(),n);assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#calls').textContent(),'12');assert.equal(await page.locator('.cell.stamped').count(),0);
const tip=await page.locator('#inspect-tooltip').boundingBox(),anchor=await first.boundingBox();assert.ok(tip.y+tip.height<anchor.y);
await first.tap();assert.ok(await page.locator('#inspect-tooltip').isHidden());
await page.locator('#cell-13').tap();assert.equal(await page.locator('#tooltip-number').textContent(),'1 pt');assert.ok(await page.locator('#tooltip-effect').isVisible());assert.equal(await page.locator('#tooltip-effect').textContent(),'Nothing special');assert.equal(await page.locator('dialog[open]').count(),0);
await page.locator('#cell-25').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#tooltip-number').textContent(),'1 pt');await page.keyboard.press('Escape');assert.ok(await page.locator('#inspect-tooltip').isHidden());
await first.tap();

// Exercise real touch drag through Chromium's input protocol.
const cdp=await page.context().newCDPSession(page);
async function touchDrag(locator,x,y){const r=await locator.boundingBox();const sx=r.x+r.width/2,sy=r.y+r.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(x-sx)*i/8,y:sy+(y-sy)*i/8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
const tile=await page.evaluate(n=>JSON.parse(localStorage.getItem('binglatro.run.v1')).destinations[n],n);
let board=await page.locator('#board').boundingBox();await touchDrag(first,board.x+board.width-10,board.y+10);
await page.waitForFunction(()=>document.querySelector('#calls').textContent==='11'&&!document.querySelector('#balls .ball').disabled);
assert.ok(await page.locator(`#cell-${tile}`).evaluate(e=>e.classList.contains('stamped')));assert.equal(await page.locator('.drag-ghost').count(),0);assert.ok(await page.locator('#inspect-tooltip').isHidden());
await page.locator('#bag').tap();assert.equal(await page.locator('#bag-grid .ball').count(),25);assert.equal(await page.locator('#bag-grid .played-ball').count(),1);assert.equal(await page.locator('#bag-grid .played-ball .face').textContent(),n);assert.equal(await page.locator('#bag-count').textContent(),'24');assert.ok((await page.locator('#bag-grid .face').allTextContents()).includes(n));assert.equal(await page.locator('#bag-grid .on-track').count(),3);await page.locator('#bag-grid .played-ball').tap();assert.equal(await page.locator('#bag-grid .played-ball').evaluate(b=>getComputedStyle(b).filter),'grayscale(1)');assert.ok(await page.locator('#inspect-tooltip').isVisible());assert.equal(await page.locator('dialog[open]').count(),1);await page.keyboard.press('Escape');assert.ok(await page.locator('#bag-dialog').isVisible());await page.locator('#bag-dialog .close').tap();
await page.locator('#stages').tap();assert.equal(await page.locator('.stage-node').count(),10);assert.equal(await page.locator('.stage-node.locked').count(),9);assert.equal(await page.locator('.stage-node.current').count(),1);await page.screenshot({path:'/tmp/bingo-stages.png'});await page.locator('#stage-dialog .close').tap();
await touchDrag(page.locator('#balls .ball').first(),5,5);await page.waitForFunction(()=>!document.querySelector('.drag-ghost'));assert.equal(await page.locator('#calls').textContent(),'11');
await page.locator('#redraw').tap();await ready();assert.equal(await page.locator('#calls').textContent(),'11');assert.equal(await page.locator('#redraw-cost').textContent(),'$1');assert.equal(await page.locator('#money').textContent(),'4');assert.ok(!(await page.locator('#balls .face').allTextContents()).includes(n));assert.equal(await page.locator('#bag-count').textContent(),'24');
for(let remaining=3;remaining>=0;remaining--){await page.locator('#redraw').tap();await ready();assert.equal(await page.locator('#money').textContent(),String(remaining));assert.equal(await page.locator('#calls').textContent(),'11');assert.equal(await page.locator('#bag-count').textContent(),'24');}
assert.ok(await page.locator('#redraw').isDisabled());
await page.screenshot({path:'/tmp/bingo-mobile-v2.png'});
assert.deepEqual(errors,[]);
console.log('Passed: six viewport fits, tap inspection, touch drag to matching square, invalid drop, visual bag, locked stage map, redraw, no browser errors.');
await browser.close();
