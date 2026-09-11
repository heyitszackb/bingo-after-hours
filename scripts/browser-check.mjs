import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.GAME_URL||'http://localhost:5173');
await page.locator('.ball:not([disabled])').first().waitFor();
assert.equal(await page.locator('.cell').count(),25);
assert.equal(await page.locator('.ball').count(),3);
await page.screenshot({path:'/tmp/bingo-desktop.png',fullPage:true});
const chosen=await page.locator('.ball .face').first().textContent();
await page.locator('.ball').first().click();
await page.waitForFunction(()=>document.querySelector('#calls').textContent==='11'&&!document.querySelector('.ball').disabled);
assert.ok(await page.locator(`#cell-${chosen}`).evaluate(e=>e.classList.contains('stamped')));
await page.locator('#bag').click();
assert.equal(await page.locator('.bag-item.on-track').count(),3);
assert.equal(await page.locator('.bag-item').nth(Number(chosen)-1).locator('small').textContent(),'×1');
await page.locator('.close').click();
for(let i=0;i<2;i++){await page.locator('#redraw').click();await page.waitForFunction(()=>!document.querySelector('.ball').disabled);}
assert.equal(await page.locator('#calls').textContent(),'11');
assert.ok(await page.locator('#redraw').isDisabled());
await page.setViewportSize({width:375,height:812});
await page.screenshot({path:'/tmp/bingo-mobile.png',fullPage:true});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
// Always choose an existing stamp when offered, otherwise minimize progress to test game over.
for(let i=0;i<11;i++){
 if(await page.locator('#result-dialog').isVisible())break;
 await page.locator('.ball:not([disabled])').first().waitFor();
 const repeat=page.locator('.ball').filter({has:page.locator('.repeat')});
 await (await repeat.count()?repeat.first():page.locator('.ball').first()).click();
 await page.waitForFunction(()=>document.querySelector('#result-dialog').open||!document.querySelector('.ball').disabled);
}
assert.ok(await page.locator('#result-dialog').isVisible());
await page.locator('#continue').click();
await page.locator('.ball:not([disabled])').first().waitFor();
assert.equal(await page.locator('#calls').textContent(),'12');
assert.equal(await page.locator('.stamped').count(),0);
assert.deepEqual(errors,[]);
console.log('Browser checks passed: card, stamping, bag counts, redraws, mobile layout, run transition.');
await browser.close();
