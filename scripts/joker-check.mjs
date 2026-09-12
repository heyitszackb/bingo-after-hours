import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
const url=process.env.GAME_URL||'http://localhost:5173';
try{
 for(const [width,height,touch] of [[1280,900,false],[844,390,true],[390,844,true],[320,568,true]]){
  const p=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const s=newStage(10,20,{5:'black'});s.offer=[5,6,7];s.destinations={5:10,6:13,7:25};
  for(let n=1;n<5;n++){s.stamps.add(n);s.stampBalls[n]=n;s.bag.delete(n);}
  await p.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('binglatro.run.v1',JSON.stringify(s));sessionStorage.setItem('seeded','1');}},{...s,stamps:[...s.stamps],bag:[...s.bag]});
  await p.goto(url);const ready=()=>p.locator('#balls .ball:not([disabled])').first().waitFor();
  await p.locator('#play-button').click();await ready();
  assert.equal(await p.locator('[data-joker]').count(),3);
  for(const el of await p.locator('#joker-rack,.board-frame,.draw-area,.dashboard,footer').all()){
   const r=await el.boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({width,height,r}));
  }
  const board=await p.locator('.board-frame').boundingBox(),rack=await p.locator('#joker-rack').boundingBox(),balls=await p.locator('.draw-area').boundingBox();
  assert.ok(rack.y+rack.height<=board.y+1);assert.ok(balls.y>=board.y+board.height-1);
  await p.screenshot({path:`/tmp/binglatro-cards-${width}.png`});
  const cdp=await p.context().newCDPSession(p);
  const center=async selector=>{const r=await p.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
  const down=async pt=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt]});else{await p.mouse.move(pt.x,pt.y);await p.mouse.down();}};
  const move=async pt=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt]});else await p.mouse.move(pt.x,pt.y,{steps:8});};
  const up=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();};
  const start=await center('[data-joker=row]');await down(start);await move({x:start.x,y:start.y+22});await p.locator('#joker-trash').waitFor({state:'visible'});
  // Drop away from trash: card springs home and no resources are spent.
  await up();await p.waitForFunction(()=>!document.querySelector('.joker-ghost'));
  assert.equal(await p.locator('[data-joker]').count(),3);
  await down(start);await move({x:start.x,y:start.y+22});await p.locator('#joker-trash').waitFor({state:'visible'});
  await move(await center('#joker-trash'));await p.waitForFunction(()=>document.querySelector('#joker-trash').classList.contains('ready'));await up();
  await p.locator('[data-joker=row]').waitFor({state:'detached'});assert.equal(await p.locator('#calls').textContent(),'12');assert.equal(await p.locator('#money').textContent(),'20');
  await p.reload();await p.locator('#play-button').click();await ready();assert.equal(await p.locator('[data-joker]').count(),2);
  await down(await center('#balls [data-number="5"]'));await move(await center('#cell-5'));await up();
  await p.waitForFunction(()=>document.querySelector('#calls').textContent==='11'&&!document.querySelector('#pause-button').disabled);
  assert.equal(await p.locator('#score').textContent(),'0');assert.equal(await p.locator('.cell.stamped').count(),5);
  assert.deepEqual(errors,[]);await p.close();
 }
 // Enabled scoring clears stamps and awards ten, with the matching card still present.
 const p=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'});
 const s=newStage(10,5,{5:'black'});s.offer=[5];s.destinations={5:25};for(let n=1;n<5;n++){s.stamps.add(n);s.stampBalls[n]=n;s.bag.delete(n);}
 await p.addInitScript(s=>localStorage.setItem('binglatro.run.v1',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});
 await p.goto(url);await p.locator('#play-button').click();await p.locator('#balls .ball:not([disabled])').waitFor();
 const a=await p.locator('#balls .ball').boundingBox(),b=await p.locator('#cell-5').boundingBox();await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await p.mouse.up();
 await p.waitForFunction(()=>document.querySelector('#score').textContent==='10'&&!document.querySelector('#pause-button').disabled);assert.equal(await p.locator('.cell.stamped').count(),0);
 await p.locator('#patterns-button').click();assert.equal(await p.locator('.pattern-row').count(),3);
 assert.equal(await p.locator('.pattern-row[data-pattern=row] .pattern-count').textContent(),'×1');
 await p.close();console.log('Passed desktop/mobile landscape layouts, mouse/touch card trash and cancellation, saved removals, disabled patterns, ten-point scoring and stamp clearing.');
}finally{await browser.close();}
