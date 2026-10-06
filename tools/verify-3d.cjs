// npm install --prefix /tmp/gfit-qa playwright
// NODE_PATH=/tmp/gfit-qa/node_modules node tools/verify-3d.cjs
// Optional: CHROMIUM_EXECUTABLE=/path/to/chromium (uses software WebGL in CI).
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.glb':'model/gltf-binary', '.webp':'image/webp' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream' });
    res.end(error ? 'Not found' : data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  execFileSync('git',['diff','--exit-code','7059c66','--','index.html','styles.css','script.js','calculadora.html','img','models/body-male.glb','models/body-male.source.json'],{cwd:root});
  let browser;
  try {
    browser = await chromium.launch({headless:true,
      ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {}),
      args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors = [], failures = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
    page.on('request', r => { if (!r.url().startsWith(base)) external.push(r.url()); });
    const started = Date.now();
    let readyMs;
    await page.goto(base+'/modelo-3d.html?qa');
    await page.waitForSelector('[data-state="ready"]');
    readyMs = Date.now()-started;
    console.log('Desktop ready in', readyMs, 'ms (local software WebGL; not mobile hardware benchmark)');
    const canvas = page.locator('canvas');
    const shot = () => canvas.screenshot();
    const snapshot = p => p.evaluate(() => window.__GFIT_QA__.snapshot());
    const settle = p => p.waitForSelector('[data-animating="false"]');
    const neutral = await snapshot(page);
    assert.equal(neutral.morphCount,8); assert.equal(neutral.triangles,26756);
    assert.equal(neutral.positions.length,13380*3);
    assert(neutral.influences.every(w=>w===0));
    const geometryStates=[];
    for(const fat of [0,50,100])for(const muscle of [0,50,100]){
      await page.locator('#fat').fill(String(fat)); await page.locator('#muscle').fill(String(muscle));
      const state=await snapshot(page);
      assert(Math.abs(state.state.fat-(0.1+fat*0.008))<1e-8);
      assert(Math.abs(state.state.muscle-(0.1+muscle*0.008))<1e-8);
      assert.deepEqual(state.scale,[1,1,1]);
      const changed=state.positions.reduce((n,v,i)=>n+(Math.abs(v-neutral.positions[i])>1e-5),0);
      assert((fat===50&&muscle===50)?changed===0:changed>1000,'Real vertex deformation');
      geometryStates.push({fat,muscle,changedCoordinates:changed});
    }
    for(const [id,fat,muscle] of [['delgado',0.18,0.32],['atletico',0.28,0.82],['robusto',0.82,0.52]]){
      await page.locator(`[data-preset=${id}]`).click();
      await page.waitForSelector('[data-animating="true"]');
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const intermediate=await snapshot(page);
      assert(Math.abs(intermediate.state.fat-fat)>1e-5||Math.abs(intermediate.state.muscle-muscle)>1e-5,'Preset has an intermediate frame');
      await settle(page); const state=await snapshot(page);
      assert.deepEqual(state.state,{fat,muscle});
      assert.equal(await page.locator(`[data-preset=${id}]`).getAttribute('aria-pressed'),'true');
    }
    const beforeIndependent = await snapshot(page);
    await page.locator('#fat').fill('60');
    assert.equal((await snapshot(page)).state.muscle,beforeIndependent.state.muscle,'Fat slider preserves muscle exactly');
    await page.locator('[data-preset=delgado]').click();
    await page.locator('#fat').fill('70'); // cancels an in-flight preset
    await settle(page);const interrupted=await snapshot(page);
    assert(Math.abs(interrupted.state.fat-0.66)<1e-8);
    assert.equal(await page.locator('[data-preset=delgado]').getAttribute('aria-pressed'),'false');
    await page.locator('#reset-body').click();await settle(page);
    assert.deepEqual((await snapshot(page)).positions,neutral.positions,'Body reset is exact');
    const idleFrame=(await snapshot(page)).frame;
    await page.waitForTimeout(120);
    assert.equal((await snapshot(page)).frame,idleFrame,'No idle render loop');
    const timings=await page.evaluate(async()=>{
      const input=document.querySelector('#fat'),samples=[];
      for(let i=0;i<60;i++){
        await new Promise(resolve=>requestAnimationFrame(resolve));
        input.value=String((i*7)%101);const start=performance.now();
        input.dispatchEvent(new Event('input',{bubbles:true}));samples.push(performance.now()-start);
      }
      return samples.sort((a,b)=>a-b);
    });
    await page.locator('#reset-body').click();await settle(page);
    await page.locator('#reset').click();
    const front = await shot();
    await page.getByRole('button',{name:'Perfil',exact:true}).click();
    assert(!front.equals(await shot()), 'Side view changes rendered pixels');
    await page.getByRole('button',{name:'Espalda',exact:true}).click();
    const back = await shot();
    assert(!front.equals(back), 'Back view differs');
    await page.locator('#reset').click();
    assert(front.equals(await shot()), 'Reset returns original framing');
    for(let i=0;i<16;i++) await page.locator('#rotate-right').click();
    assert(front.equals(await shot()), 'Sixteen 22.5-degree steps return a full 360-degree rotation');
    await page.locator('#zoom-in').click();
    assert(!front.equals(await shot()), 'Zoom changes rendered pixels');
    for(let i=0;i<12;i++) await page.locator('#zoom-in').click();
    const maxZoom = await shot();
    await page.locator('#zoom-in').click();
    assert(maxZoom.equals(await shot()), 'Zoom-in limit holds');
    await page.locator('#reset').click();
    const bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
    await page.mouse.down();
    await page.mouse.move(bounds.x+bounds.width/2+100,bounds.y+bounds.height/2,{steps:8});
    await page.mouse.up();
    assert(!front.equals(await shot()), 'Mouse drag rotates');
    await page.locator('#reset').click();
    await canvas.focus(); await page.keyboard.press('ArrowRight');
    assert(!front.equals(await shot()), 'Keyboard rotates');
    await page.locator('#reset').click();
    await page.screenshot({path:path.join(root,'docs/milestone-2-desktop.png'),fullPage:true});
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]); assert.deepEqual(external,[]);

    const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
    await mobile.goto(base+'/modelo-3d.html?qa');
    await mobile.waitForSelector('[data-state="ready"]');
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'No mobile overflow');
    assert(await mobile.locator('canvas').evaluate(c=>c.width/c.clientWidth<=1.51),'Pixel ratio capped');
    const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(e.message));
    const mobileBefore=await snapshot(mobile);
    await mobile.locator('[data-preset=atletico]').click();await settle(mobile);
    assert.notDeepEqual((await snapshot(mobile)).positions,mobileBefore.positions);
    await mobile.locator('#fat').fill('100');
    assert(Math.abs((await snapshot(mobile)).state.fat-0.9)<1e-8);
    // Scroll the sliders below the sticky body instead of hiding them behind it.
    await mobile.evaluate(()=>{
      const panel=document.querySelector('.viewer-panel');
      const input=document.querySelector('#fat');
      scrollTo(0,scrollY+input.getBoundingClientRect().top-panel.getBoundingClientRect().height-70);
    });
    const sliderBounds=await mobile.locator('#fat').boundingBox();
    await mobile.touchscreen.tap(sliderBounds.x+sliderBounds.width*0.3,sliderBounds.y+sliderBounds.height/2);
    assert((await snapshot(mobile)).state.fat<0.6,'Real mobile tap changes slider');
    await mobile.locator('#reset-body').click();await settle(mobile);
    await mobile.evaluate(()=>scrollTo(0,0));
    const mb = await mobile.locator('canvas').boundingBox();
    const cdp=await mobile.context().newCDPSession(mobile);
    const touch = (type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    const x=mb.x+mb.width/2,y=mb.y+mb.height/2;
    const before=await mobile.locator('canvas').screenshot();
    await touch('touchStart',[{x,y,id:1}]);
    for(let dx=10;dx<=80;dx+=10) await touch('touchMove',[{x:x+dx,y,id:1}]);
    await touch('touchEnd',[]);
    assert(!before.equals(await mobile.locator('canvas').screenshot()),'Touch drag rotates');
    const beforePinch=await mobile.locator('canvas').screenshot();
    await touch('touchStart',[{x:x-30,y,id:1},{x:x+30,y,id:2}]);
    for(let d=35;d<=65;d+=5) await touch('touchMove',[{x:x-d,y,id:1},{x:x+d,y,id:2}]);
    await touch('touchEnd',[]);
    assert(!beforePinch.equals(await mobile.locator('canvas').screenshot()),'Pinch changes zoom');
    await mobile.locator('#reset').click();
    await mobile.locator('[data-preset=atletico]').click();await settle(mobile);
    await mobile.evaluate(()=>{
      const top=document.querySelector('#fat').getBoundingClientRect().top+scrollY;
      scrollTo(0,top-document.querySelector('.viewer-panel').getBoundingClientRect().height-65);
    });
    await mobile.screenshot({path:path.join(root,'docs/milestone-2-mobile.png')});
    for(const width of [320,768]) {
      await mobile.setViewportSize({width,height:844});
      assert(await mobile.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Responsive overflow '+width);
    }

    const broken = await browser.newPage();
    await broken.route('**/body-male-parametric.glb',route=>route.fulfill({status:404,body:'missing'}));
    await broken.goto(base+'/modelo-3d.html');
    await broken.waitForSelector('[data-state="error"]');
    assert(await broken.locator('#retry').isVisible());
    assert(await broken.locator('#zoom-in').isDisabled());
    await broken.unroute('**/body-male-parametric.glb');
    await broken.locator('#retry').click();
    await broken.waitForSelector('[data-state="ready"]');
    await broken.locator('canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await broken.waitForSelector('[data-state="error"]');
    assert(await broken.locator('#retry').isVisible());
    const noGL = await browser.newPage();
    await noGL.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
    await noGL.goto(base+'/modelo-3d.html');
    await noGL.waitForSelector('[data-state="error"]');
    assert((await noGL.locator('#status').innerText()).includes('WebGL 2'));

    // Existing pages load; mobile menu and calculator still work. Avoid sending forms.
    const landing = await browser.newPage({viewport:{width:390,height:844}});
    await landing.goto(base+'/index.html');
    await landing.locator('#menuBtn').click();
    assert.equal(await landing.locator('#menuBtn').getAttribute('aria-expanded'),'true');
    await landing.locator('#mobileMenu a[href="calculadora.html"]').click();
    await landing.waitForURL('**/calculadora.html');
    await landing.locator('#c-edad').fill('30');
    await landing.locator('#c-altura').fill('170');
    await landing.locator('#c-peso').fill('70');
    await landing.locator('#calcForm button[type="submit"]').click();
    assert((await landing.locator('#resCalorias').innerText()).includes('kcal'));
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(mobileErrors,[]);
    const reduced=await browser.newPage({reducedMotion:'reduce'});
    await reduced.goto(base+'/modelo-3d.html?qa');await reduced.waitForSelector('[data-state=ready]');
    await reduced.locator('[data-preset=atletico]').click();await settle(reduced);
    assert.deepEqual((await snapshot(reduced)).state,{fat:0.28,muscle:0.82});
    fs.writeFileSync(path.join(root,'docs/milestone-2-browser.json'),JSON.stringify({
      date:'2026-10-06',browser:await browser.version(),readyMs,geometryStates,
      inputAndRenderSubmissionMs:{median:timings[30],p95:timings[57],max:timings[59]},
      measurement:'Local headless Chromium with software WebGL; JS handler + render submission, not physical mobile GPU frame time',
      assertions:'geometry, 8 morphs, 9 slider states, 3 presets and intermediate animation, interruption, exact neutral reset, no scaling, no idle rendering, views, rotation, zoom, keyboard, mobile tap/drag/pinch, reduced motion, responsive, error recovery, original files unchanged',
      pageErrors:errors,httpFailures:failures,externalViewerRequests:external
    },null,2)+'\n');
    console.log('PASS: morphs, slider geometry, presets, continuous animation, exact body reset, render, 360°, views, reset, bounded zoom, mouse, keyboard, mobile touch/pinch, resize, load failure/retry, context loss, no-WebGL fallback, landing menu, calculator.');
  } finally { if(browser) await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
