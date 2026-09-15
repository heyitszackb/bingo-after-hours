import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {newStage} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});try{
const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const s=newStage();s.items[26]='seed';s.items[27]='king';s.collection.push(26,27);s.nextItemId=28;s.played=[...s.played,0,0];s.stamps=new Set([1,25]);s.stampBalls={1:26,25:27};s.stampValues={1:7,25:10};s.tileStamps={1:['copier','copier','plus10','x3'],2:['plus50'],25:['trash','x2']};s.offer=[1];s.destinations={1:13};
await p.addInitScript(s=>localStorage.setItem('binglatro.run.v1',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await p.goto(process.env.GAME_URL||'http://localhost:5173');await p.locator('#play-button').click();await p.locator('#balls .ball:not([disabled])').waitFor();
for(const width of [390,320]){
 await p.setViewportSize({width,height:width===320?568:844});
 await p.locator('#cell-12').click();assert.equal((await p.locator('#inspect-tooltip').innerText()).trim(),'Nothing here');await p.locator('#cell-12').click();assert.ok(await p.locator('#inspect-tooltip').isHidden());
 for(const tile of [1,2,25]){
  await p.locator(`#cell-${tile}`).click();const tip=p.locator('#inspect-tooltip');assert.ok(await tip.isVisible());assert.equal(await tip.locator('.stamp-symbol').count(),new Set(s.tileStamps[tile]).size);assert.ok(!/ITEM:|STAMPS|0\/4|None/.test(await tip.innerText()));
  const rect=await tip.boundingBox();assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=(width===320?568:844)+1,JSON.stringify(rect));
  const a=await tip.locator('.tooltip-main').boundingBox(),b=await tip.locator('#tooltip-stamps').boundingBox();assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x,'Panels should be adjacent, not stacked');
  if(tile===1){assert.equal(await tip.locator('.stamp-repeat').textContent(),'×2');assert.equal(await p.locator('#tooltip-number').textContent(),'Seed');assert.equal((await p.locator('#tooltip-value').innerText()).trim(),'7');await p.screenshot({path:`/tmp/tile-tooltip-${width}.png`});}
  await p.locator(`#cell-${tile}`).click();
 }
}
await p.locator('#bag').click();await p.locator('#bag-grid [data-number="1"]').click();assert.ok(await p.locator('#tooltip-stamps').isHidden());assert.equal(await p.locator('#tooltip-number').textContent(),'Ball');assert.deepEqual(errors,[]);console.log('Minimal empty/item tooltips, separate stamp panels, duplicates, dismissal and mobile bounds verified.');
}finally{await browser.close();}
