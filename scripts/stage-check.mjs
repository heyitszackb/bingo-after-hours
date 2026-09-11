import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
for(const stage of [1,10]){
 const page=await browser.newPage({viewport:{width:390,height:844}}),s=newStage(stage);s.score=s.target-5;s.stamps=new Set([1,2,3,4]);s.stampBalls={1:1,2:2,3:3,4:4};s.bag=new Set([...s.bag].filter(n=>n>4));s.offer=[25];s.destinations={25:5};
 await page.addInitScript(s=>{if(!localStorage.getItem('binglatro.run.v1'))localStorage.setItem('binglatro.run.v1',JSON.stringify(s));},{...s,stamps:[...s.stamps],bag:[...s.bag]});
 await page.goto(process.env.GAME_URL||'http://localhost:5173');await page.locator('#play-button').click();await page.locator('#balls .ball:not([disabled])').first().waitFor();
 await page.locator('#balls .ball').focus();await page.keyboard.press('Space');await page.locator('.cash-flight').first().waitFor({state:'visible'});assert.equal(await page.locator('dialog[open]').count(),0);
 await page.locator(stage===1?'#shop-screen':'#continue:not([disabled])').waitFor({state:'visible'});assert.equal(await page.locator('#money').textContent(),'16');assert.equal(await page.locator('#calls').textContent(),'0');assert.equal(await page.locator('.cell.stamped').count(),0);assert.equal(await page.locator('#score').textContent(),String(s.target));
 await page.locator(stage===1?'#shop-next':'#continue').click();await page.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await page.locator('#stage').textContent(),stage===1?'2':'1');assert.equal(await page.locator('#calls').textContent(),'12');assert.equal(await page.locator('#money').textContent(),stage===1?'16':'5');await page.close();
}
await browser.close();console.log('Passed one-point scoring, money flights, next stage and final-run restart.');
