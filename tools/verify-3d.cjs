// npm install --prefix /tmp/gfit-qa playwright
// NODE_PATH=/tmp/gfit-qa/node_modules node tools/verify-3d.cjs
// Optional: CHROMIUM_EXECUTABLE=/path/to/chromium (uses software WebGL in CI).
const { chromium } = require('playwright');
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
    await page.goto(base+'/modelo-3d.html');
    await page.waitForSelector('[data-state="ready"]');
    console.log('Desktop ready in', Date.now()-started, 'ms (local software WebGL; not mobile hardware benchmark)');
    const canvas = page.locator('canvas');
    const shot = () => canvas.screenshot();
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
    await page.screenshot({path:path.join(root,'docs/milestone-1-desktop.png'),fullPage:true});
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]); assert.deepEqual(external,[]);

    const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
    await mobile.goto(base+'/modelo-3d.html');
    await mobile.waitForSelector('[data-state="ready"]');
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'No mobile overflow');
    assert(await mobile.locator('canvas').evaluate(c=>c.width/c.clientWidth<=1.51),'Pixel ratio capped');
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
    await mobile.screenshot({path:path.join(root,'docs/milestone-1-mobile.png'),fullPage:true});
    for(const width of [320,768]) {
      await mobile.setViewportSize({width,height:844});
      assert(await mobile.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Responsive overflow '+width);
    }

    const broken = await browser.newPage();
    await broken.route('**/body-male.glb',route=>route.fulfill({status:404,body:'missing'}));
    await broken.goto(base+'/modelo-3d.html');
    await broken.waitForSelector('[data-state="error"]');
    assert(await broken.locator('#retry').isVisible());
    assert(await broken.locator('#zoom-in').isDisabled());
    await broken.unroute('**/body-male.glb');
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
    console.log('PASS: render, 360°, views, reset, bounded zoom, mouse, keyboard, mobile touch/pinch, resize, load failure/retry, context loss, no-WebGL fallback, landing menu, calculator.');
  } finally { if(browser) await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
