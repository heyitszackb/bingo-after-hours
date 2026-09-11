import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
await page.addInitScript(()=>{const s=sessionStorage.getItem('fixture');if(s){localStorage.setItem('binglatro.run.v1',s);sessionStorage.removeItem('fixture');}});
const url=process.env.GAME_URL||'http://localhost:5173';await page.goto(url);
async function restore(s){await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),s);await page.reload();await page.locator('#play-button').click();}
const s=newStage();s.status='passed';s.bonusPaid=true;s.money=30;s.shopOffer=[1,7,13];await restore({...s,stamps:[],bag:[...s.bag]});await page.locator('#shop-screen').waitFor({state:'visible'});
const cdp=await page.context().newCDPSession(page);
const assets={gold:'coin.svg',red:'ball-red.svg',blue:'ball-blue.svg'};
for(const [i,color] of ['gold','red','blue'].entries()){
 const n=[1,7,13][i],paint=page.locator(`[data-paint=${color}]`),ball=page.locator(`#shop-balls [data-number="${n}"]`);
 const a=await paint.boundingBox(),b=await ball.boundingBox(),x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y-20;
 // Land just above the ball: inside the generous drop area, outside the old hitbox.
 if(color==='red'){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(tx,ty,{steps:12});}
 else{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let j=1;j<=12;j++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(tx-x)*j/12,y:y+(ty-y)*j/12}]});}
 assert.equal(await ball.getAttribute('data-paint-preview'),color);assert.ok((await ball.evaluate(b=>getComputedStyle(b).backgroundImage)).includes(assets[color]));
 if(color==='red')await page.mouse.up();else await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.locator('#shop-next:not([disabled])').waitFor();assert.equal(await page.locator('#money').textContent(),String(27-i*3));assert.ok((await ball.evaluate(b=>getComputedStyle(b).backgroundImage)).includes(assets[color]));
}
await page.locator('#shop-bag').click();for(const [n,color] of [[1,'gold'],[7,'red'],[13,'blue']])assert.ok((await page.locator(`#bag-grid [data-number="${n}"]`).evaluate(b=>getComputedStyle(b).backgroundImage)).includes(assets[color]));await page.locator('#bag-dialog .close').click();
await page.locator('#shop-next').click();await page.locator('#balls .ball:not([disabled])').first().waitFor();
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));saved.offer=[1,7,13];saved.destinations={1:3,7:16,13:24};await restore(saved);await page.locator('#balls .ball:not([disabled])').first().waitFor();
const backgrounds=[];
for(const [n,color] of [[1,'gold'],[7,'red'],[13,'blue']]){const tile=page.locator(`#cell-${saved.destinations[n]}`);assert.ok(await tile.evaluate((c,color)=>c.classList.contains(`paint-${color}`),color));backgrounds.push(await tile.evaluate(c=>getComputedStyle(c).backgroundColor));}
assert.equal(new Set(backgrounds).size,3);assert.ok(backgrounds.every(c=>c!== 'rgb(240, 223, 183)'));
await page.locator('#cell-24').tap();assert.equal(await page.locator('#tooltip-effect').textContent(),'+3 draws when scored');await page.locator('#cell-24').tap();await page.screenshot({path:'/tmp/binglatro-painted-card.png'});
for(const [n,color] of [[1,'gold'],[7,'red'],[13,'blue']]){
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));state.offer=[n];state.destinations={[n]:saved.destinations[n]};await restore(state);await page.locator('#balls .ball:not([disabled])').first().waitFor();
 const b=await page.locator('#balls .ball').boundingBox(),board=await page.locator('#board').boundingBox();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(board.x+board.width/2,board.y+board.height/2,{steps:12});
 assert.ok((await page.locator('.drag-ghost').evaluate(b=>getComputedStyle(b).backgroundImage)).includes(assets[color]));await page.mouse.up();
 await page.locator('#balls .ball:not([disabled])').first().waitFor();
 assert.ok((await page.locator(`#cell-${saved.destinations[n]}`).evaluate(c=>getComputedStyle(c,'::before').backgroundImage)).includes(`stamp-${color}.svg`));
}
await page.screenshot({path:'/tmp/binglatro-painted-stamps.png'});
for(const name of ['app.js','game.js','background.js','style.css'])assert.ok(requests.some(u=>new URL(u).pathname.endsWith('/'+name)&&new URL(u).searchParams.has('v')),`${name} has a versioned URL`);
assert.deepEqual(errors,[]);await browser.close();console.log('Passed forgiving touch/mouse paint drops, preview and permanent colors, bag/track/drag-ghost/stamp consistency, unstamped tile colors, saved paints, and versioned resources.');
