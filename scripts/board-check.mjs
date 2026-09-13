import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {newStage as startingStage} from '../game.js';
const newStage=(stage,money,paints,counts,jokers=['bingo'])=>startingStage(stage,money,paints,counts,jokers);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const s=sessionStorage.getItem('fixture');if(s){localStorage.setItem('binglatro.run.v1',s);sessionStorage.removeItem('fixture');}});
const url=process.env.GAME_URL||'http://localhost:5173';await page.goto(url);
const ready=()=>page.locator('#balls .ball:not([disabled])').first().waitFor();
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));
const restore=async s=>{await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),s);await page.reload();await page.locator('#play-button').click();};
await page.locator('#play-button').click();await ready();
let state=await read();assert.equal((await page.locator('#board .cell span').allTextContents()).filter(Boolean).length,0);assert.equal(await page.locator('.cell.offered').count(),3);assert.equal(await page.locator('.cell.stamped').count(),0);
for(const n of state.offer)assert.equal(await page.locator(`#cell-${state.destinations[n]} span`).textContent(),'');
const initial={...state.destinations};await page.locator('#redraw').click();await ready();assert.notDeepEqual((await read()).destinations,initial);
state=await read();await page.locator('#pause-button').click();await page.locator('#main-menu-button').click();await page.reload();await page.locator('#play-button').click();await ready();assert.deepEqual((await read()).destinations,state.destinations);
// The exact same three balls can point to three different spots on a subsequent draw.
const fixture=newStage();fixture.bag=new Set([1,2,3]);fixture.offer=[1,2,3];fixture.destinations={1:25,2:9,3:17};await restore({...fixture,stamps:[],bag:[1,2,3]});await ready();await page.locator('#redraw').click();await ready();state=await read();assert.deepEqual([...state.offer].sort(),[1,2,3]);assert.notDeepEqual(state.destinations,fixture.destinations);
// Complete a physical column with unrelated ball identities and all three paints.
const s=newStage();s.paints={25:'red',24:'gold',23:'blue'};s.stamps=new Set([1,6,11,16]);s.stampBalls={1:25,6:24,11:23,16:22};s.bag=new Set([...s.bag].filter(n=>n<22));s.played[25]=s.played[24]=s.played[23]=s.played[22]=1;s.offer=[3,8,19];s.destinations={3:21,8:2,19:15};
await restore({...s,stamps:[...s.stamps],bag:[...s.bag]});await ready();
assert.equal(await page.locator('#cell-1 span').textContent(),'25');await page.screenshot({path:'/tmp/binglatro-blank-board.png'});
const a=await page.locator('#balls [data-number="3"]').boundingBox(),b=await page.locator('#cell-21').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width-10,b.y+10,{steps:12});assert.ok(await page.locator('#cell-21').evaluate(c=>c.classList.contains('destination')));await page.mouse.up();
await page.locator('.pattern-multiplier').waitFor({state:'visible'});assert.deepEqual(await page.locator('.cell.multiplied').evaluateAll(c=>c.map(n=>Number(n.id.replace('cell-','')))),[1,6,11,16,21]);assert.equal((await page.locator('#board .cell span').allTextContents()).filter(Boolean).length,5);assert.equal(await page.locator('#cell-21 span').textContent(),'3');
await page.locator('#shop-screen').waitFor({state:'visible'});assert.equal(await page.locator('#score').textContent(),'10');assert.equal(await page.locator('#money').textContent(),'20');assert.equal(await page.locator('.cell.stamped').count(),5);assert.equal((await page.locator('#board .cell span').allTextContents()).filter(Boolean).length,5);
await page.locator('#shop-next').click();await ready();state=await read();assert.deepEqual(state.stampBalls,{});assert.deepEqual(state.paints,s.paints);assert.equal(state.stage,2);assert.equal(await page.locator('.cell.offered').count(),3);
// Migrate old numbered boards without losing the wallet or collection.
const legacy={...state,rulesVersion:undefined,board:Array.from({length:25},(_,i)=>i+1),score:80,calls:3,money:17};await restore(legacy);await ready();state=await read();assert.equal(state.score,0);assert.equal(state.calls,12);assert.equal(state.money,17);assert.deepEqual(state.paints,s.paints);assert.deepEqual(state.stamps,[]);
const invalid={...state,destinations:Object.fromEntries(state.offer.map(n=>[n,1]))};await page.evaluate(s=>sessionStorage.setItem('fixture',JSON.stringify(s)),invalid);await page.reload();assert.ok((await page.locator('#play-button').textContent()).includes('PLAY'));
assert.deepEqual(errors,[]);await browser.close();console.log('Passed blank tiles, random per-offer assignments, fixed reorder/resume spaces, nearest-space snapping, placement-based paint scoring, stage reset and old-save migration.');
