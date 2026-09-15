import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {newStage,ITEM_TYPES} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});try{
const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{const s=sessionStorage.getItem('fixture');if(s){localStorage.setItem('binglatro.run.v1',s);sessionStorage.removeItem('fixture');}});await p.goto(process.env.GAME_URL||'http://localhost:5173');
const restore=async s=>{await p.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await p.reload();await p.locator('#play-button').click();};
for(const [width,height] of [[390,844],[320,568],[844,390]]){
 await p.setViewportSize({width,height});const s=newStage();s.status='passed';s.bonusPaid=true;s.shopOffer={rewardVersion:2,items:['bomb','copier','statue'],claimed:false};await restore(s);await p.locator('#shop-statue').waitFor();
 const logo=await p.locator('.game-logo').boundingBox(),menu=await p.locator('#shop-menu').boundingBox();assert.ok(Math.abs(logo.x+logo.width/2-width/2)<1);assert.ok(logo.y<50&&menu.y<50,'Header stays at top');assert.ok(!/ITEMS.*CHOOSE|troph|🏆/i.test(await p.locator('body').innerText()));assert.equal(await p.locator('.shop-heading h2').innerText(),'CHOOSE 1');
 for(const type of s.shopOffer.items){const card=p.locator('#shop-'+type),r=await card.boundingBox();assert.ok(r.y+r.height<height);const fit=await card.evaluate(c=>[c.clientWidth,c.scrollWidth,c.clientHeight,c.scrollHeight]);assert.ok(fit[1]<=fit[0]+2&&fit[3]<=fit[2]+2,`${width} ${type} ${fit}`);}
 await p.screenshot({path:`/tmp/shop-reference-${width}.png`});await p.locator('#shop-statue').click();await p.locator('#balls .ball:not([disabled])').waitFor();assert.equal(await p.locator('#stage').textContent(),'2');
 const offered=p.locator('.cell.offered');assert.equal(await offered.evaluate(el=>getComputedStyle(el).animationName),'offered-breathe');const before=await offered.evaluate(el=>getComputedStyle(el).backgroundColor);await p.waitForTimeout(450);const after=await offered.evaluate(el=>getComputedStyle(el).backgroundColor);assert.notEqual(before,after);assert.equal(await p.locator('#score-meter .star').count(),1);
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await offered.evaluate(el=>getComputedStyle(el).animationName),'none');await p.emulateMedia({reducedMotion:'no-preference'});
}
assert.deepEqual(errors,[]);console.log('Top-aligned centered shop, stacked rewards, star branding, selection and reduced-motion pulse verified.');
}finally{await browser.close();}
