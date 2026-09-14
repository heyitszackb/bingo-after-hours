import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:process.env.REAL_MOTION?'no-preference':'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem('fixture');if(fixture){localStorage.setItem('binglatro.run.v1',fixture);sessionStorage.removeItem('fixture');}
  window.cardEvents=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('.joker-card.scoring-card'))window.cardEvents.push({id:this.dataset.joker,label:this.dataset.payout,tiles:[...document.querySelectorAll('.cell.pattern-active')].map(c=>Number(c.id.slice(5))),pending:[...document.querySelectorAll('.cell.score-pending')].map(c=>Number(c.id.slice(5))),score:document.querySelector('#score').textContent});
   return animate.call(this,frames,options);
  };
 });
 await page.goto(process.env.GAME_URL||'http://localhost:5173');
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
 const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await page.reload();await page.locator('#play-button').click();};
 const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
 const s=newStage(1,0);s.status='passed';s.bonusPaid=true;s.shopOffer={cards:[null,null],balls:[null,null],items:['bomb','d20']};await restore(s);await page.locator('#shop-screen').waitFor({state:'visible'});
 for(const [width,height] of [[390,844],[320,568],[1000,800],[844,390]]){
  await page.setViewportSize({width,height});for(const sel of ['#shop-screen','.shop-rule-card','#shop-d20','#shop-next','.dashboard']){const r=await page.locator(sel).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({sel,width,height,r}));}await page.screenshot({path:`/tmp/binglatro-high-five-shop-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-shop-card="high-five"]').click();assert.equal((await read()).money,0);assert.ok((await read()).jokers.includes('high-five:1'));assert.equal(await page.locator('.shop-rule-card').count(),0);await page.reload();await page.locator('#play-button').click();assert.equal(await page.locator('.shop-rule-card').count(),0);await page.locator('#shop-next').click();await ready();assert.equal(await page.locator('[data-joker="high-five:1"]').count(),1);
 const turn=newStage(10,0,{}, {},['bingo','face-value','high-five:1']);[[6,1],[7,2],[8,3],[9,4],[10,10]].forEach(([n,t])=>{turn.stamps.add(t);turn.stampBalls[t]=n;turn.stampValues[t]=n;turn.bag.delete(n);});turn.offer=[5];turn.destinations={5:5};await restore(turn);await ready();await page.keyboard.press('ArrowUp');
 if(process.env.REAL_MOTION){await page.locator('[data-joker="bingo"].scoring-card').waitFor();await page.screenshot({path:'/tmp/binglatro-high-five-line.png'});await page.locator('[data-joker="high-five:1"].scoring-card').waitFor({timeout:30000});await page.screenshot({path:'/tmp/binglatro-high-five-cross.png'});}
 await page.waitForFunction(()=>window.cardEvents.some(e=>e.id==='high-five:1')&&!document.querySelector('.scoring-rack')&&document.querySelector('#balls .ball:not([disabled])'),null,{timeout:45000});
 const events=await page.evaluate(()=>window.cardEvents);assert.deepEqual(events.map(e=>e.id),['bingo',...Array(5).fill('face-value'),'high-five:1',...Array(3).fill('face-value')]);assert.deepEqual(events[0].tiles,[1,2,3,4,5]);assert.deepEqual(events[0].pending,[1,2,3,4,5]);assert.deepEqual(events[6].tiles,[4,5,10]);assert.deepEqual(events[6].pending,[4,5,10]);assert.equal(events[6].label,'SCORE 3');assert.equal(events[6].score,'35');assert.equal((await read()).score,59);assert.equal((await read()).stamps.length,6);await page.screenshot({path:'/tmp/binglatro-high-five-finished.png'});
 // Alternate ordering survives reload and drives the same ordered activation queue.
 const reverse={...turn,jokers:['high-five:1','face-value','bingo']};await restore(reverse);await ready();assert.deepEqual(await page.locator('#joker-rack .joker-card').evaluateAll(cards=>cards.map(c=>c.dataset.joker)),reverse.jokers);
 if(!process.env.REAL_MOTION){await page.keyboard.press('ArrowUp');await page.waitForFunction(()=>window.cardEvents.some(e=>e.id==='bingo')&&!document.querySelector('.scoring-rack')&&document.querySelector('#balls .ball:not([disabled])'));assert.equal((await page.evaluate(()=>window.cardEvents))[0].id,'high-five:1');assert.equal((await read()).score,59);
 for(const jokers of [['face-value','high-five:1'],['high-five:1']]){await restore({...turn,jokers});await ready();await page.keyboard.press('ArrowUp');await page.waitForFunction(()=>window.cardEvents.length&&!document.querySelector('.scoring-rack')&&document.querySelector('#balls .ball:not([disabled])'));assert.equal((await read()).score,jokers.includes('face-value')?24:0);assert.equal((await page.evaluate(()=>window.cardEvents))[0].id,'high-five:1');}}
 // Select and drag to trash; it remains removed after reload.
 await restore(turn);await ready();const card=page.locator('[data-joker="high-five:1"]');await card.click();await page.mouse.move(...Object.values(await card.boundingBox()).slice(0,2).map((v,i)=>v+(i?20:25)));await page.mouse.down();await page.mouse.move(200,400,{steps:8});await page.locator('#joker-trash').waitFor({state:'visible'});const trash=await page.locator('#joker-trash').boundingBox();await page.mouse.move(trash.x+trash.width/2,trash.y+trash.height/2,{steps:5});await page.mouse.up();assert.ok(!(await read()).jokers.includes('high-five:1'));await page.reload();await page.locator('#play-button').click();await ready();assert.equal(await page.locator('[data-joker="high-five:1"]').count(),0);
 assert.deepEqual(errors,[]);console.log('Passed High Five shop/reload, mobile layouts, ordered distinct groups, shared tile rescoring, missing rules, rack order persistence and drag-to-trash.');
}finally{await browser.close();}
