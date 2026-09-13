import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1000,height:800},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const s=sessionStorage.getItem('fixture');if(s){localStorage.setItem('binglatro.run.v1',s);sessionStorage.removeItem('fixture');}});
 await page.goto(process.env.GAME_URL||'http://localhost:5173');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
 const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await page.reload();await page.locator('#play-button').click();};
 const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
 const s=newStage(10,5,{25:'dynamite',1:'x',2:'tornado'});
 [7,8,9,12,14,17,18,19].forEach((tile,i)=>{s.stamps.add(tile);s.stampBalls[tile]=i+1;s.stampValues[tile]=i===0?null:(i+1)*4;s.bag.delete(i+1);s.played[i+1]=1;});
 s.stamps.add(1);s.stampBalls[1]=20;s.stampValues[1]=20;s.bag.delete(20);s.offer=[25];s.destinations={25:13};
 await restore(s);await ready();await page.locator('#balls .ball').focus();await page.keyboard.press('Space');
 await page.locator('.return-token').first().waitFor();assert.equal(await page.locator('.return-token').count(),8);assert.equal(await page.locator('#cell-13 span').textContent(),'25');
 await page.screenshot({path:'/tmp/binglatro-dynamite-return.png'});
 await page.waitForFunction(()=>!document.querySelector('#pause-button').disabled&&document.querySelector('#calls').textContent==='11');
 assert.equal(await page.locator('.return-token').count(),0);assert.equal(await page.locator('.cell.stamped').count(),2);assert.equal(await page.locator('#bag-count').textContent(),'23');
 await page.locator('#bag').click();
 for(let n=1;n<=8;n++)assert.ok(!(await page.locator(`#bag-grid [data-number="${n}"]`).getAttribute('class')).includes('played-ball'));
 assert.ok((await page.locator('#bag-grid [data-number="25"]').getAttribute('class')).includes('played-ball'));
 assert.equal(await page.locator('#bag-grid [data-number="1"] .face').textContent(),'X');assert.equal(await page.locator('#bag-grid [data-number="4"] .face').textContent(),'16');await page.locator('#bag-dialog .close').click();
 const saved=await read();assert.ok(saved.bag.includes(4));assert.ok(!saved.bag.includes(25));saved.offer=[4];saved.destinations={4:7};
 await restore({...saved,stamps:new Set(saved.stamps),bag:new Set(saved.bag)});await ready();assert.equal(await page.locator('#balls .face').textContent(),'16');await page.locator('#balls .ball').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!document.querySelector('#pause-button').disabled&&document.querySelector('#calls').textContent==='10');
 assert.equal(await page.locator('#cell-7 span').textContent(),'16');assert.equal((await read()).played[4],2);
 // Existing scramble upgrades and saved shop offers become Tornado, once.
 const old=newStage(1,12,{25:'dynamite'});delete old.upgradeVersion;old.status='passed';old.bonusPaid=true;old.shopOffer={cards:['single-digits','outer-layer'],balls:['dynamite','x']};
 await restore(old);await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal((await read()).upgrades[25],'tornado');assert.equal((await read()).shopOffer.balls[0],'tornado');assert.ok((await page.locator('#shop-balls [data-index="0"]').textContent()).includes('Tornado'));
 await page.reload();await page.locator('#play-button').click();await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal((await read()).upgrades[25],'tornado');
 // New Dynamite is purchasable and remains Dynamite after reload.
 const shop=newStage(1,12);shop.status='passed';shop.bonusPaid=true;shop.shopOffer={cards:['single-digits','outer-layer'],balls:['dynamite','tornado']};await restore(shop);await page.locator('#shop-screen').waitFor({state:'visible'});await page.locator('#shop-balls [data-index="0"]').click();await page.locator('#upgrade-balls [data-number="25"]').click();await page.locator('#upgrade-dialog').waitFor({state:'hidden'});
 await page.reload();await page.locator('#play-button').click();await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal((await read()).upgrades[25],'dynamite');assert.equal((await read()).money,9);
 assert.deepEqual(errors,[]);console.log('Passed eight return flights, bag availability, current values, repeat play counts, retained Dynamite, Tornado migration and new Dynamite purchases.');
}finally{await browser.close();}
