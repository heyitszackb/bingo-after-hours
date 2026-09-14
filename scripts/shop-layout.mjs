import assert from 'node:assert/strict';
export async function checkShopLayout(page,prefix='shop'){
 for(const [width,height] of [[390,844],[320,568],[1000,800],[844,390]]){
  await page.setViewportSize({width,height});
  for(const selector of ['.dashboard','#shop-screen','#shop-shelf','#shop-next','#shop-menu','.money-panel']){const r=await page.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({selector,width,height,r}));}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
  for(const product of await page.locator('#shop-shelf .shop-product').all()){
   await product.evaluate(el=>el.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'}));
   const r=await product.boundingBox();assert.ok(r&&r.x>=0&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<=height+1,JSON.stringify({width,height,r}));
  }
  await page.screenshot({path:`/tmp/binglatro-${prefix}-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#shop-shelf').evaluate(el=>el.scrollLeft=0);
}
