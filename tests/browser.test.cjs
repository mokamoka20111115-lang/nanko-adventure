// Run with a local HTTP server and Playwright installed. Chromium path is optional.
const {chromium}=require('playwright');const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NANKO_CHROME||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:700},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.NANKO_URL||'http://127.0.0.1:8000/');
 await page.waitForFunction(()=>document.getElementById('offlineStatus').textContent.includes('OK'));
 for(const [width,height] of [[320,568],[375,667],[390,700],[390,844],[430,932],[1280,900]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const layout=await page.evaluate(()=>{const rect=document.getElementById('specialBtn').getBoundingClientRect();const start=document.getElementById('mainBtn').getBoundingClientRect();return{scroll:document.documentElement.scrollHeight,height:innerHeight,bottom:rect.bottom,startTop:start.top,startBottom:start.bottom,width:document.documentElement.scrollWidth}});
  assert(layout.bottom<=height,JSON.stringify({width,height,...layout}));assert(layout.startTop>0&&layout.startBottom<height);assert(layout.width<=width);console.log('LAYOUT PASS',width,height);
 }
 await page.setViewportSize({width:390,height:700});await page.screenshot({path:'/tmp/nanko-title.png'});
 await page.locator('#mainBtn').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>nankoStatus.scene),'playing');
 const rect=await page.locator('#game').boundingBox();const cdp=await context.newCDPSession(page);
 const point={x:rect.x+rect.width*.5,y:rect.y+rect.height*.75};const before=await page.evaluate(()=>nankoStatus.player);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+35,y:point.y-25}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await page.evaluate(()=>nankoStatus.player);assert(after.x>before.x+30&&after.y<before.y-20);console.log('TOUCH DRAG PASS');
 assert(await page.locator('[data-weapon=meat]').isDisabled());assert(await page.locator('[data-weapon=fish]').isDisabled());
 // A swipe and a stray click must never pause on iPhone; only deliberate hold.
 assert.equal(await page.evaluate(()=>nankoStatus.scene),'playing');
 await page.locator('#pauseBtn').click();assert.equal(await page.evaluate(()=>nankoStatus.scene),'playing');
 const pauseRect=await page.locator('#pauseBtn').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pauseRect.x+pauseRect.width/2,y:pauseRect.y+pauseRect.height/2}]});
 await page.waitForTimeout(850);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await page.evaluate(()=>nankoStatus.scene),'paused');
 const time=await page.evaluate(()=>nankoStatus.stageClock);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>nankoStatus.stageClock),time);await page.locator('#mainBtn').click();
 await page.waitForTimeout(2200);await page.screenshot({path:'/tmp/nanko-playing.png'});
 await context.setOffline(true);await page.reload();await page.locator('#mainBtn').click();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>nankoStatus.scene),'playing');assert(await page.evaluate(()=>nankoStatus.shots)>0);console.log('OFFLINE RELOAD PASS');
 await context.setOffline(false);
 // Accelerate the browser clock, retaining production code, damage and movement speed.
 await page.reload();await page.clock.install();await page.locator('#mainBtn').click();
 const stages=new Set(),phases=new Set();let pressed=[];
 for(let i=0;i<12000;i++){
  const s=await page.evaluate(()=>nankoStatus);stages.add(s.stage);if(s.stage===2&&s.boss)phases.add(s.bossPhase);
  if(['won','lost'].includes(s.scene)){console.log('BROWSER PLAYTHROUGH',s.scene,s.score,s.hp,[...stages],[...phases]);assert.equal(s.scene,'won');break;}
  if(s.scene==='playing'){
   if(s.meatUnlocked&&s.weapon==='money')await page.locator('[data-weapon=meat]').click();
   if(s.charge>=100&&(s.boss||s.enemyShots.length>14))await page.locator('#specialBtn').click();
   let best;
   for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
    const norm=Math.hypot(dx,dy)||1,x=Math.max(24,Math.min(366,s.player.x+dx/norm*55)),y=Math.max(255,Math.min(618,s.player.y+dy/norm*55));
    let cost=Math.abs(x-(s.bossX??195))*.045+Math.abs(y-540)*.025;
    for(const b of s.enemyShots)for(const t of [0,.15,.3,.5])cost+=Math.max(0,65-Math.hypot(x-b.x-b.vx*t,y-b.y-b.vy*t))**2*.035;
    for(const e of s.foes)cost+=Math.max(0,65-Math.hypot(x-e.x,y-e.y))**2*.08;
    if(s.laser&&Math.abs(x-s.laser.x)<48)cost+=300;
    for(const p of s.items)if(p.type==='power'||p.type==='meat'&&!s.meatUnlocked||p.type==='fish'||p.type==='heart'&&s.hp<3)cost-=Math.max(0,200-Math.hypot(x-p.x,y-p.y))*(p.type==='meat'?.4:.13);
    if(!best||cost<best.cost)best={dx,dy,cost};
   }
   const next=[best.dx<0?'ArrowLeft':best.dx>0?'ArrowRight':null,best.dy<0?'ArrowUp':best.dy>0?'ArrowDown':null].filter(Boolean);
   for(const key of pressed)if(!next.includes(key))await page.keyboard.up(key);
   for(const key of next)if(!pressed.includes(key))await page.keyboard.down(key);
   pressed=next;
  }
  await page.clock.runFor(100);
  if(i%600===0)console.log('PLAY',i/10,'stage',s.stage+1,'HP',s.hp);
 }
 assert.equal(await page.evaluate(()=>nankoStatus.scene),'won');assert.equal(stages.size,3);assert.equal(phases.size,4);
 await page.screenshot({path:'/tmp/nanko-browser-clear.png'});assert.deepEqual(errors,[]);console.log('PASS: no page errors');
 await page.locator('#mainBtn').click();assert.equal(await page.evaluate(()=>nankoStatus.scene),'rpg');
 await page.locator('#talkBtn').click();
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){
  await page.setViewportSize({width,height});await page.clock.runFor(100);
  assert(await page.locator('#talkBtn').isVisible());const r=await page.locator('#rpgControls').boundingBox();assert(r.y+r.height<=height);
 }
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(100);
 const walk=async(x,y)=>{const r=await page.locator('#game').boundingBox();await page.mouse.click(r.x+x*r.width/390,r.y+y*r.height/660);await page.clock.runFor(6500);};
 await walk(65,535);await page.locator('#talkBtn').click();assert((await page.evaluate(()=>nankoStatus.rpg)).pass);await page.locator('#talkBtn').click();
 await walk(85,415);await page.locator('#talkBtn').click();assert((await page.evaluate(()=>nankoStatus.rpg)).lunch);await page.locator('#talkBtn').click();
 await page.reload();await page.locator('#mainBtn').click();assert.equal(await page.evaluate(()=>nankoStatus.scene),'rpg');assert((await page.evaluate(()=>nankoStatus.rpg)).lunch);
 await page.clock.install();await walk(305,265);await page.locator('#talkBtn').click();await page.locator('#talkBtn').click();assert((await page.evaluate(()=>nankoStatus)).encounter);
 console.log('PASS: RPG map, touch navigation, items, dialogue, reload, encounter entry');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
