import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';

const browser=await chromium.launch({channel:'chrome'});
try{
 for(const black of [false,true])for(const touch of [false,true]){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=newStage(10,5,{1:black?'black':'red',2:'gold',3:'blue'});state.offer=[1,2,3];state.destinations={1:1,2:13,3:25};
  await page.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('binglatro.run.v1',JSON.stringify(s));sessionStorage.setItem('seeded','yes');}},{...state,stamps:[],bag:[...state.bag]});
  await page.goto(process.env.GAME_URL||'http://localhost:5173');
  const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
  await page.locator('#play-button').click();await ready();
  assert.ok((await page.locator('#board .cell span').allTextContents()).every(n=>n===''));
  assert.equal(await page.locator('.cell.offered.paint-grey').count(),3);
  const center=async selector=>{const r=await page.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
  const cdp=await page.context().newCDPSession(page);
  const start=await center('#balls [data-number="1"]');
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
  else{await page.mouse.move(start.x,start.y);await page.mouse.down();}
  for(const [space,nearest] of [[1,1],[25,25],[10,black?10:13]]){
   const point=await center(`#cell-${space}`);
   if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});
   else await page.mouse.move(point.x,point.y,{steps:5});
   await page.waitForFunction(tile=>document.querySelector(`#cell-${tile}`).classList.contains('destination'),nearest);
   assert.equal(await page.locator('.cell.destination').count(),1);
   assert.ok(await page.locator(`#cell-${nearest}`).evaluate(c=>c.classList.contains('destination')),JSON.stringify({touch,space,nearest,actual:await page.locator('.cell.destination').getAttribute('id')}));
  }
  // Release on an unoffered tile: its nearest offered space is 13, not ball 1's old mapping.
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#calls').textContent==='11'&&!document.querySelector('#pause-button').disabled);
  assert.equal(await page.locator(`#cell-${black?10:13} span`).textContent(),'1');
  assert.ok(await page.locator(`#cell-${black?10:13}`).evaluate((c,black)=>c.classList.contains(black?'paint-black':'paint-red'),black));
  assert.ok((await page.locator('.cell:not(.stamped) span').allTextContents()).every(n=>n===''));
  assert.equal(await page.locator('#score').textContent(),'0');assert.equal(await page.locator('#bag-count').textContent(),'24');
  await page.reload();await page.locator('#play-button').click();await ready();
  assert.equal(await page.locator(`#cell-${black?10:13} span`).textContent(),'1');
  await page.locator('#redraw').click();await ready();
  assert.equal(await page.locator(`#cell-${black?10:13} span`).textContent(),'1');
  if(touch)await page.screenshot({path:black?'/tmp/binglatro-black-stamp.png':'/tmp/binglatro-numbered-stamp.png'});
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Passed mouse/touch nearest-space previews, any-ball placement, numbered colored stamps, blank unused tiles, reroll and reload persistence.');
}finally{await browser.close();}
