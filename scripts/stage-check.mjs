import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const source=await readFile(new URL('../game.js',import.meta.url),'utf8');
for(const start of [1,10]){
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await page.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:source.replace('stage=1','stage='+start).replace('target:targetFor(stage)','target:5').replace('stamps:new Set()','stamps:new Set([1,2,3,4])').replace('return bag.slice(0,Math.min(count,25))','return [5,6,7]')}));
 await page.goto('http://localhost:5173');await page.locator('#balls .ball:not([disabled])').first().waitFor();
 await page.evaluate(()=>{window.scoreSteps=[];new MutationObserver(()=>window.scoreSteps.push(Number(document.querySelector('#score').textContent))).observe(document.querySelector('#score'),{childList:true});});
 const ball=await page.locator('#balls .ball').first().boundingBox(),board=await page.locator('#board').boundingBox();
 await page.mouse.move(ball.x+ball.width/2,ball.y+ball.height/2);await page.mouse.down();await page.mouse.move(board.x+20,board.y+20,{steps:15});await page.mouse.up();
 await page.locator('#result-dialog').waitFor({state:'visible'});
 assert.deepEqual(await page.evaluate(()=>window.scoreSteps.filter((n,i,a)=>n>0&&a.indexOf(n)===i)),[1,2,3,4,5]);
 assert.equal(await page.locator('#score').textContent(),'5');assert.equal(await page.locator('.cell.stamped').count(),0);
 assert.equal(await page.locator('#continue').getAttribute('aria-label'),start===10?'New run':'Next stage');
 await page.locator('#continue').click();await page.locator('#balls .ball:not([disabled])').first().waitFor();
 assert.equal(await page.locator('#stage').textContent(),start===10?'1':'2');assert.equal(await page.locator('#calls').textContent(),'12');
 await page.locator('#stages').click();assert.equal(await page.locator('.stage-node.complete').count(),start===10?0:1);assert.equal(await page.locator('.stage-node.locked').count(),start===10?9:8);
 await page.close();
}
console.log('Passed normal-motion drag, scoring and clearing, stage unlock, and final-stage restart with deterministic fixtures.');await browser.close();
