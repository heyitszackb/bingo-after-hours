import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {newStage,openShop,buyItem} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const fixture=sessionStorage.getItem('fixture');if(fixture){localStorage.setItem('binglatro.run.v1',fixture);sessionStorage.removeItem('fixture');}
  window.events=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){
   if(this.matches('.die-settled'))window.events.push({id:'roll',value:this.querySelector('span').textContent});
   if(this.matches('.joker-card.scoring-card'))window.events.push({id:this.dataset.joker,rolling:!!document.querySelector('.die-rolling')});
   return animate.call(this,frames,options);
  };
 });
 await page.goto(process.env.GAME_URL||'http://localhost:5173');
 const shop=newStage();shop.status='passed';shop.bonusPaid=true;openShop(shop);const id=buyItem(shop,'d20');
 for(const [roll,modifier] of [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[20,0],[1,-1],[6,-1]]){
  const s=newStage(10,0,{}, {},['face-value','high-five:1'],shop);s.valueModifiers[id]=modifier;
  for(const [n,tile] of [[7,12],[9,8]]){s.stamps.add(tile);s.stampBalls[tile]=n;s.stampValues[tile]=n;s.bag.delete(n);}s.offer=[id];s.destinations={[id]:13};
  await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await page.reload();await page.locator('#play-button').click();await page.locator('#balls .ball:not([disabled])').waitFor();
  await page.evaluate(roll=>Math.random=()=> (roll-1)/20,roll);await page.keyboard.press('ArrowUp');
  await page.waitForFunction(()=>window.events.length&&!document.querySelector('.die-rolling')&&!document.querySelector('.scoring-rack')&&document.querySelector('#balls .ball:not([disabled])'));
  const value=roll+modifier,qualifies=value>=1&&value<=5,events=await page.evaluate(()=>window.events),saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
  assert.deepEqual(events.map(e=>e.id),qualifies?['roll','high-five:1','face-value','face-value','face-value']:['roll']);assert.equal(events[0].value,String(value));assert.ok(events.slice(1).every(e=>!e.rolling));assert.equal(saved.score,qualifies?value+16:0);assert.equal(saved.stampValues[13],value);
 }
 assert.deepEqual(errors,[]);console.log('Verified dice 1–5 trigger High Five after settling; 6/20 and modified zero do not; modified five does.');
}finally{await browser.close();}
