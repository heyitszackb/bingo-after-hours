import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'});
for(const touch of [true,false]){
 const page=await browser.newPage({viewport:touch?{width:375,height:667}:{width:1280,height:800},isMobile:touch,hasTouch:touch});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://localhost:5173');await page.locator('#balls .ball:not([disabled])').first().waitFor();
 const cdp=await page.context().newCDPSession(page);
 const order=()=>page.locator('#balls .face').allTextContents();
 const initial=await order();
 const ball=n=>page.locator(`#balls .ball[data-number="${n}"]`);
 const center=async locator=>{const r=await locator.boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
 const down=async pos=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pos]});else{await page.mouse.move(pos.x,pos.y);await page.mouse.down();}};
 const move=async pos=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pos]});else await page.mouse.move(pos.x,pos.y);};
 const up=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();};
 const settle=()=>page.waitForFunction(()=>!document.querySelector('.drag-ghost'));
 const drag=async(from,to)=>{const start=await center(ball(from));await down(start);for(let i=1;i<=12;i++)await move({x:start.x+(to.x-start.x)*i/12,y:start.y+(to.y-start.y)*i/12});await up();await settle();};
 const last=await center(ball(initial[2]));await drag(initial[0],last);assert.deepEqual(await order(),[initial[1],initial[2],initial[0]]);
 const first=await center(ball(initial[1]));await drag(initial[0],first);assert.deepEqual(await order(),initial);
 // Preview a different order, then abandon the drop outside both track and board.
 await down(await center(ball(initial[0])));await move(last);await move({x:2,y:2});await up();await settle();assert.deepEqual(await order(),initial);
 if(touch){await down(await center(ball(initial[0])));await move(last);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await settle();assert.deepEqual(await order(),initial);}
 assert.equal(await page.locator('#calls').textContent(),'12');assert.equal(await page.locator('#money').textContent(),'5');assert.equal(await page.locator('#bag-count').textContent(),'25');assert.equal(await page.locator('.board .stamped').count(),0);
 // Reorder, then play that same ball on the card in one gesture.
 await down(await center(ball(initial[0])));await move(last);const board=await center(page.locator('#board'));await move(board);await up();
 await page.waitForFunction(()=>document.querySelector('#calls').textContent==='11'&&!document.querySelector('#balls .ball').disabled);
 assert.ok(await page.locator(`#cell-${initial[0]}`).evaluate(el=>el.classList.contains('stamped')));assert.equal(await page.locator('#money').textContent(),'5');assert.equal(await page.locator('#bag-count').textContent(),'24');
 assert.deepEqual(errors,[]);await page.close();
}
console.log('Passed touch and mouse reorder in both directions, invalid drop, cancellation, no resource cost, and reorder-to-play in one gesture.');
await browser.close();
