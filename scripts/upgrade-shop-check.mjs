import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce',hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const s=sessionStorage.getItem('fixture');if(s){localStorage.setItem('binglatro.run.v1',s);sessionStorage.removeItem('fixture');}});
 const url=process.env.GAME_URL||'http://localhost:5173';await page.goto(url);
 const serial=s=>({...s,stamps:[...s.stamps],bag:[...s.bag]});
 const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),serial(s));await page.reload();await page.locator('#play-button').click();};
 const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
 const s=newStage(1,100);s.status='passed';s.bonusPaid=true;s.shopOffer={cards:['single-digits','outer-layer'],balls:['x','doubler']};
 await restore(s);await page.locator('#shop-screen').waitFor({state:'visible'});
 assert.equal(await page.locator('.paint-can').count(),0);assert.equal(await page.locator('#shop-cards .shop-offer').count(),2);assert.equal(await page.locator('#shop-balls .shop-offer').count(),2);
 for(const [width,height] of [[1000,800],[844,390],[320,568]]){
  await page.setViewportSize({width,height});
  for(const el of await page.locator('#shop-screen,.dashboard,#joker-rack').all()){
   const r=await el.boundingBox();assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({width,height,r}));
  }
  await page.screenshot({path:`/tmp/binglatro-upgrade-shop-${width}.png`});
 }
 await page.setViewportSize({width:1000,height:800});
 await page.locator('#shop-cards [data-index="0"]').click();await page.locator('#shop-cards [data-index="1"]').click();
 assert.equal((await read()).money,94);assert.equal(await page.locator('#shop-card-count').textContent(),'2/5');
 await page.locator('#shop-balls [data-index="0"]').click();await page.locator('#upgrade-balls [data-number="1"]').click();await page.locator('#upgrade-dialog').waitFor({state:'hidden'});
 await page.locator('#shop-balls [data-index="1"]').click();await page.locator('#upgrade-balls [data-number="2"]').click();await page.locator('#upgrade-dialog').waitFor({state:'hidden'});
 assert.equal((await read()).money,88);assert.deepEqual((await read()).upgrades,{1:'x',2:'doubler'});
 await page.reload();await page.locator('#play-button').click();await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal(await page.locator('.offer-sold').count(),4);
 for(let i=0;i<3;i++){await page.locator('#shop-redraw').click();await page.locator('#shop-cards [data-index="0"]').click();}
 assert.equal(await page.locator('#shop-card-count').textContent(),'5/5');assert.equal(await page.locator('[data-joker]').count(),6);assert.ok(await page.locator('#shop-cards [data-index="1"]').isDisabled());
 await page.locator('#shop-next').click();await ready();let saved=await read();assert.equal(saved.stage,2);assert.equal(saved.jokers.length,6);assert.equal(saved.upgrades[1],'x');
 await page.locator('#joker-rack').evaluate(r=>r.scrollLeft=0);
 const firstCard=await page.locator('[data-joker]').first().boundingBox();await page.mouse.move(firstCard.x+firstCard.width/2,firstCard.y+firstCard.height/2);await page.mouse.down();await page.mouse.move(firstCard.x+firstCard.width/2-90,firstCard.y+firstCard.height/2,{steps:8});await page.mouse.up();
 assert.ok(await page.locator('#joker-rack').evaluate(r=>r.scrollLeft>0));assert.equal(await page.locator('[data-joker]').count(),6);
 // Select a card, then drag the selected card into trash using actual touch events.
 const card=page.locator('[data-joker]').last();await card.scrollIntoViewIfNeeded();await card.tap();
 const cdp=await page.context().newCDPSession(page);const r=await card.boundingBox(),start={x:r.x+r.width/2,y:r.y+r.height/2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x,y:start.y+25}]});await page.locator('#joker-trash').waitFor({state:'visible'});
 const t=await page.locator('#joker-trash').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:t.x+t.width/2,y:t.y+t.height/2}]});await page.waitForFunction(()=>document.querySelector('#joker-trash').classList.contains('ready'));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>document.querySelectorAll('[data-joker]').length===5);
 // X shows no number anywhere and can use a non-offered empty cell.
 saved=await read();saved.offer=[1,2,3];saved.destinations={1:25,2:13,3:21};await restore({...saved,stamps:new Set(saved.stamps),bag:new Set(saved.bag)});await ready();
 assert.equal(await page.locator('#balls [data-number="1"] .face').textContent(),'X');
 const a=await page.locator('#balls [data-number="1"]').boundingBox(),b=await page.locator('#cell-1').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('#pause-button').disabled&&document.querySelector('#calls').textContent==='11');
 assert.equal(await page.locator('#cell-1 span').textContent(),'X');assert.equal((await read()).stampValues[1],null);
 // Doubler visibly updates neighboring values; reload preserves them.
 const d=newStage(10,5,{25:'doubler',2:'x'}, {},['bingo','single-digits:1']);[7,8,9,12,14,17,18,19].forEach((tile,i)=>{d.stamps.add(tile);d.stampBalls[tile]=i+1;d.stampValues[tile]=i===1?null:i+1;d.bag.delete(i+1);});d.offer=[25];d.destinations={25:13};await restore(d);await ready();await page.locator('#balls .ball').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!document.querySelector('#pause-button').disabled&&document.querySelector('#calls').textContent==='11');
 assert.equal(await page.locator('#cell-19 span').textContent(),'16');assert.equal(await page.locator('#cell-8 span').textContent(),'X');assert.equal(await page.locator('#cell-13 span').textContent(),'25');
 await page.reload();await page.locator('#play-button').click();await ready();assert.equal(await page.locator('#cell-19 span').textContent(),'16');
 // Tornado animates a complete permutation and retains all identities and values.
 const dy=newStage(10,5,{25:'tornado',1:'x'});[6,12,18,24].forEach((tile,i)=>{dy.stamps.add(tile);dy.stampBalls[tile]=i+1;dy.stampValues[tile]=i===0?null:(i+1)*4;dy.bag.delete(i+1);});dy.offer=[25];dy.destinations={25:13};await restore(dy);await ready();await page.locator('#balls .ball').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!document.querySelector('#pause-button').disabled&&document.querySelector('#calls').textContent==='11');
 const result=await read();assert.deepEqual(Object.values(result.stampBalls).sort((a,b)=>a-b),[1,2,3,4,25]);assert.deepEqual(Object.values(result.stampValues).sort((a,b)=>(a??0)-(b??0)),[null,8,12,16,25]);assert.equal(await page.locator('.scatter-token').count(),0);assert.equal(await page.locator('.cell.stamped').count(),5);
 // Legacy saves lose paints and the formerly free bonus, but retain the run.
 const old={...serial(newStage(4,19)),rulesVersion:2,paints:{1:'black',2:'red'},jokers:['bingo','single-digits'],score:3};delete old.upgrades;delete old.stampValues;await restore({...old,stamps:new Set(),bag:new Set(old.bag)});await ready();const migrated=await read();assert.equal(migrated.stage,4);assert.equal(migrated.money,19);assert.equal(migrated.score,3);assert.deepEqual(migrated.upgrades,{});assert.deepEqual(migrated.jokers,['bingo']);assert.equal(migrated.paints,undefined);
 const win=newStage(1,5);win.calls=8;[1,2,3,4].forEach(n=>{win.stamps.add(n);win.stampBalls[n]=n;win.stampValues[n]=n;win.bag.delete(n);win.played[n]=1;});win.offer=[5];win.destinations={5:5};await restore(win);await ready();await page.locator('#balls .ball').focus();await page.keyboard.press('Space');await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal((await read()).money,12);assert.equal(await page.locator('#shop-cards .shop-offer').count(),2);assert.equal((await read()).stamps.length,5);
 await page.locator('#shop-next').click();await ready();assert.equal((await read()).stamps.length,0);assert.equal((await read()).calls,12);
 const combo=newStage(10,5,{}, {},['bingo','single-digits:1','outer-layer:1','outer-layer:2','single-digits:2','outer-layer:3']);
 [5,19,23,1].forEach((n,i)=>{combo.stamps.add(i+1);combo.stampBalls[i+1]=n;combo.stampValues[i+1]=n;combo.bag.delete(n);});combo.offer=[4];combo.destinations={4:5};await restore(combo);await ready();
 await page.evaluate(()=>{window.triggers={};const active=new Set();new MutationObserver(()=>{for(const c of document.querySelectorAll('[data-joker]')){const id=c.dataset.joker,on=c.classList.contains('scoring-card');if(on&&!active.has(id))window.triggers[id]=(window.triggers[id]||0)+1;if(on)active.add(id);else active.delete(id);}}).observe(document.querySelector('#joker-rack'),{subtree:true,attributes:true});});
 await page.locator('#balls .ball').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!document.querySelector('#pause-button').disabled&&document.querySelector('#score').textContent==='86');
 assert.deepEqual(await page.evaluate(()=>window.triggers),{'bingo':1,'single-digits:1':3,'outer-layer:1':5,'outer-layer:2':5,'single-digits:2':3,'outer-layer:3':5});assert.equal(await page.locator('.scoring-card,.score-spark,.activation-point').count(),0);
 assert.deepEqual(errors,[]);console.log('Passed mixed shop, prices, five-card cap, sold/save state, touch trash, X placement, Doubler values, Tornado identities, migration and responsive layouts.');
}finally{await browser.close();}
