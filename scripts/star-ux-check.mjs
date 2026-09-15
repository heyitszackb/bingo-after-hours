import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {newStage,defaultBag,ITEM_TYPES} from '../game.js';
const browser=await chromium.launch({channel:'chrome'});try{
const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{const s=sessionStorage.getItem('fixture');if(s){localStorage.setItem('binglatro.run.v1',s);sessionStorage.removeItem('fixture');}});
await p.goto(process.env.GAME_URL||'http://localhost:5173');
const s=newStage(1,5,{}, {},[],defaultBag());s.plainRules=true;s.offer=[1];s.destinations={1:13};
const store=async s=>{await p.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),{...s,stamps:[...s.stamps],bag:[...s.bag]});await p.reload();await p.locator('#play-button').click();};
await store(s);await p.locator('#balls .ball:not([disabled])').waitFor();
assert.equal(await p.locator('#score .flip-digit').count(),1);assert.equal(await p.locator('#target .flip-digit').count(),2);
assert.ok(!/\b(points?|pts)\b/i.test(await p.locator('body').innerText()));
assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
await p.screenshot({path:'/tmp/star-game.png'});
await p.locator('#bag').click();assert.ok(!(await p.locator('#bag-grid').innerText()).includes('Anvil'));
const seed=s.collection.find(id=>s.items[id]==='seed');await p.locator(`#bag-grid [data-number="${seed}"]`).click();
assert.equal(await p.locator('#tooltip-value .star').count(),1);assert.match(await p.locator('#tooltip-effect').innerText(),/increases by 1/);
await p.screenshot({path:'/tmp/star-tooltip.png'});
s.status='passed';s.bonusPaid=true;s.score=30;s.offer=[];s.destinations={};s.shopOffer={rewardVersion:2,items:['plus10','bomb','x3'],claimed:false,cards:[],balls:[null,null]};
await store(s);await p.locator('#shop-plus10').waitFor();assert.equal(await p.locator('.shop-stamp-tag').count(),2);assert.equal(await p.locator('#shop-bomb .destroy-text').count(),1);assert.equal(await p.locator('#shop-plus10 .product-description .star').count(),1);assert.ok(!/\b(points?|pts)\b/i.test(await p.locator('body').innerText()));
await p.screenshot({path:'/tmp/star-shop.png'});for(const width of [390,320]){await p.setViewportSize({width,height:width===320?568:844});
const types=Object.keys(ITEM_TYPES);for(let i=0;i<types.length;i+=3){s.shopOffer.items=types.slice(i,i+3);await store(s);await p.locator('#shop-screen').waitFor({state:'visible'});for(const type of s.shopOffer.items){const fit=await p.locator('#shop-'+type).evaluate(c=>({w:c.clientWidth,sw:c.scrollWidth,h:c.clientHeight,sh:c.scrollHeight}));assert.ok(fit.sw<=fit.w+2&&fit.sh<=fit.h+2,`${type} ${width}: ${JSON.stringify(fit)}`);}assert.ok(!/\b(points?|pts)\b/i.test(await p.locator('body').innerText()));}}
assert.deepEqual(errors,[]);console.log('Star header, mobile fit, tooltip, stamp tags, and shop copy verified.');
}finally{await browser.close();}
