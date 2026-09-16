import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {newStage,ballValue} from '../game.js';
const browser=await chromium.launch({channel:'chrome'}),errors=[];
const add=(s,type)=>{const id=s.nextItemId++;s.collection.push(id);s.items[id]=type;s.bag.add(id);return id;};const put=(s,id,t)=>{s.stamps.add(t);s.stampBalls[t]=id;s.stampValues[t]=ballValue(s,id);s.bag.delete(id);};
const open=async s=>{const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(s=>{localStorage.setItem('binglatro.run.v1',JSON.stringify(s));Math.random=()=>.5;},{...s,stamps:[...s.stamps],bag:[...s.bag]});await p.goto('http://localhost:5174');await p.locator('#play-button').click();return p;};
const play=async(p,id)=>{await p.waitForFunction(()=>document.querySelectorAll('#balls .ball:not([disabled])').length===3);await p.locator(`#balls [data-number="${id}"]`).focus();await p.keyboard.press('ArrowUp');await p.waitForTimeout(700);await p.waitForFunction(()=>document.querySelectorAll('#balls .ball:not([disabled])').length===3);};
try{
for(const type of ['tornado','prism','bomb']){const s=newStage(1000);let id;
if(type==='tornado'){put(s,add(s,'anchor'),13);put(s,1,8);put(s,2,1);id=add(s,'tornado');s.destinations={[id]:25,23:25,24:25};}
if(type==='prism'){put(s,add(s,'prism'),2);put(s,add(s,'glass'),1);put(s,2,7);put(s,3,13);put(s,4,19);id=5;s.destinations={5:25,23:25,24:25};}
if(type==='bomb'){put(s,add(s,'phoenix'),13);id=add(s,'bomb');s.destinations={[id]:14,23:14,24:14};}
s.offer=[id,23,24];const p=await open(s);await play(p,id);const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));if(type==='prism')assert.equal(saved.score,31);if(type==='bomb'){const ph=Object.keys(saved.items).find(k=>saved.items[k]==='phoenix');assert.ok(saved.bag.includes(Number(ph)));assert.equal(saved.valueModifiers[ph],10);}if(type==='tornado')assert.equal(saved.stampBalls[8],1);await p.screenshot({path:`/tmp/new-${type}.png`});await p.close();}
const s=newStage(100);s.status='passed';s.bonusPaid=true;s.shopOffer={rewardVersion:2,items:['phoenix','prism','tornado'],claimed:false};const p=await open(s);await p.locator('#shop-phoenix').waitFor();await p.screenshot({path:'/tmp/new-shop.png'});await p.close();assert.deepEqual(errors,[]);console.log('Mobile Tornado movement, Prism replay, Phoenix return and shop verified.');
}finally{await browser.close();}
