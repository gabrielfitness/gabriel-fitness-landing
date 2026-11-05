// NODE_PATH=/tmp/gfit-qa/node_modules CHROMIUM_EXECUTABLE=/path/to/chromium node tools/verify-demo.cjs /absolute/GFIT-3D-Demo.html
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {packageNotices}=require('./demo-notices.cjs');
const root=path.resolve(__dirname,'..'),file=process.argv[2];
(async()=>{
  assert(file&&path.isAbsolute(file),'Pass absolute demo path');
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({offline:true,viewport:{width:1440,height:1100}});
    const page=await context.newPage();const errors=[],http=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))http.push(r.url());});
    const start=Date.now();await page.goto(pathToFileURL(file).href+'?qa');await page.waitForSelector('[data-state=ready]');const readyMs=Date.now()-start;
    const snapshot=()=>page.evaluate(()=>window.__GFIT_QA__.snapshot());const settle=()=>page.waitForSelector('[data-animating=false]');
    const neutral=await snapshot();assert.equal(neutral.morphCount,10);
    for(const id of ['delgado','atletico','robusto'])for(const shoulders of [0,50,100]){
      await page.locator('#shoulders').fill(String(shoulders));await page.locator(`[data-preset=${id}]`).click();await settle();
      assert.equal((await snapshot()).state.shoulders,shoulders/100);
    }
    await page.locator('#fat').fill('0');await page.locator('#muscle').fill('100');await page.locator('#shoulders').fill('100');
    assert.notDeepEqual((await snapshot()).positions,neutral.positions);
    await page.locator('[data-view=side]').click();const side=(await snapshot()).camera;
    await page.locator('[data-view=back]').click();assert.notDeepEqual((await snapshot()).camera,side);
    await page.locator('#zoom-in').click();await page.locator('#rotate-right').click();
    assert.notDeepEqual((await snapshot()).camera,side);
    await page.locator('#shoulders').focus();await page.keyboard.press('Home');assert.equal((await snapshot()).state.shoulders,0);
    await page.locator('#reset-body').click();await settle();assert.deepEqual((await snapshot()).positions,neutral.positions);
    assert.deepEqual((await snapshot()).state,{fat:.5,muscle:.5,shoulders:.5});
    const expected=['vendor/three/LICENSE','THIRD_PARTY_ASSETS.md','models/licenses/MAKEHUMAN-CC0.md'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n\n');
    assert.equal(await page.locator('#third-party-notices pre').textContent(),expected,'All license/documentation characters round-trip exactly');
    assert((await page.locator('#third-party-notices pre').textContent()).includes('--source'));
    for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>innerWidth===document.documentElement.scrollWidth));}
    assert.deepEqual(errors,[]);assert.deepEqual(http,[]);
    const probe=await context.newPage();const hostile='--source <!-- --> &amp; <script>window.injected=1</script></pre></section>\nCC0 — MIT';
    await probe.setContent(packageNotices(hostile));assert.equal(await probe.locator('pre').textContent(),hostile);assert.equal(await probe.locator('script').count(),0);assert.equal(await probe.evaluate(()=>window.injected),undefined);
    const report={date:'2026-11-05',bytes:fs.statSync(file).size,browser:await browser.version(),offline:true,readyMs,exactNotices:true,injectionTest:true,errors,httpRequests:http,checks:'10 morphs, presets retaining shoulders, 3 sliders, geometry, views, zoom, rotation, keyboard, reset exact, responsive 320/390/768'};
    fs.writeFileSync(path.join(root,'docs/milestone-4-offline.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
