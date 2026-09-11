import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:375,height:667},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.GAME_URL||'http://localhost:5173';
await page.goto(url);
assert.equal(await page.title(),'Binglatro');assert.ok(await page.locator('#title-screen').isVisible());assert.ok(await page.locator('#game-screen').isHidden());
for(const [w,h] of [[320,568],[375,667],[667,375]]){await page.setViewportSize({width:w,height:h});const r=await page.locator('#help-button').boundingBox();assert.ok(r.y>=0&&r.y+r.height<=h);}
await page.setViewportSize({width:375,height:667});await page.screenshot({path:'/tmp/binglatro-title.png'});
await page.locator('#help-button').tap();await page.locator('#help-dialog').waitFor({state:'visible'});await page.locator('#help-done').tap();
await page.locator('#play-button').tap();await page.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await page.locator('#target').textContent(),'5');
const n=await page.locator('#balls .face').first().textContent();const tile=await page.evaluate(n=>JSON.parse(localStorage.getItem('binglatro.run.v1')).destinations[n],n);await page.locator('#balls .ball').first().focus();await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('#calls').textContent==='11'&&!document.querySelector('#pause-button').disabled);
await page.locator('#redraw').tap();await page.locator('#balls .ball:not([disabled])').first().waitFor();const offer=await page.locator('#balls .face').allTextContents();
await page.locator('#pause-button').tap();await page.locator('#pause-dialog').waitFor({state:'visible'});await page.screenshot({path:'/tmp/binglatro-pause.png'});
await page.locator('#restart-button').tap();await page.locator('#cancel-restart').tap();assert.ok(await page.locator('#pause-dialog').isVisible());
await page.locator('#sound-button').tap();assert.equal(await page.locator('#sound-button').textContent(),'SOUND OFF');
await page.locator('#main-menu-button').tap();assert.ok(await page.locator('#title-screen').isVisible());assert.ok((await page.locator('#play-button').textContent()).includes('RESUME'));
await page.reload();assert.ok((await page.locator('#play-button').textContent()).includes('RESUME'));await page.locator('#play-button').tap();await page.locator('#balls .ball:not([disabled])').first().waitFor();
assert.equal(await page.locator('#calls').textContent(),'11');assert.equal(await page.locator('#money').textContent(),'4');assert.deepEqual(await page.locator('#balls .face').allTextContents(),offer);assert.ok(await page.locator(`#cell-${tile}`).evaluate(c=>c.classList.contains('stamped')));
await page.keyboard.press('Escape');assert.ok(await page.locator('#pause-dialog').isVisible());await page.keyboard.press('Escape');assert.ok(await page.locator('#pause-dialog').isHidden());
await page.locator('#pause-button').tap();await page.locator('#restart-button').tap();await page.locator('#confirm-restart').tap();await page.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await page.locator('#calls').textContent(),'12');assert.equal(await page.locator('#money').textContent(),'5');assert.equal(await page.locator('.board .stamped').count(),0);
await page.locator('#stages').tap();assert.deepEqual(await page.locator('.stage-node small').allTextContents(),['5 pts','10 pts','15 pts','20 pts','30 pts','40 pts','55 pts','70 pts','90 pts','120 pts']);await page.locator('#stage-dialog .close').tap();
// A saved late-stage run uses its target and still fits the compact HUD.
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('binglatro.run.v1')));saved.stage=10;
const late=await browser.newPage({viewport:{width:320,height:568},reducedMotion:"reduce"});await late.addInitScript(s=>localStorage.setItem('binglatro.run.v1',JSON.stringify(s)),saved);await late.goto(url);await late.locator('#play-button').click();await late.locator('#balls .ball:not([disabled])').first().waitFor();assert.equal(await late.locator('#target').textContent(),'120');await late.close();
await page.addInitScript(()=>localStorage.setItem('binglatro.run.v1','broken'));await page.reload();assert.ok((await page.locator('#play-button').textContent()).includes('PLAY'));
assert.deepEqual(errors,[]);await browser.close();console.log('Passed title/help, pause/resume, restart confirmation, menu return, saved run restore, sound setting, all targets, and invalid-save recovery.');
