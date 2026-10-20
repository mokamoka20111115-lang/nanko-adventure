const {chromium}=require('playwright'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NANKO_CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8001/');
 // Fixture: a player who has cleared Chapter 1; gameplay below uses normal UI only.
 await p.evaluate(()=>localStorage.setItem('nanko_progress_v1',JSON.stringify({version:1,stage:2,meat:true,power:2,score:30000,rpgUnlocked:true,chapter:'rpg'})));
 await p.reload();await p.clock.install();await p.locator('#mainBtn').click();assert.equal(await p.evaluate(()=>nankoStatus.scene),'rpg');await p.locator('#talkBtn').click();
 const status=()=>p.evaluate(()=>nankoStatus);
 const walk=async(x,y)=>{const r=await p.locator('#game').boundingBox();await p.touchscreen.tap(r.x+x*r.width/390,r.y+y*r.height/660);await p.clock.runFor(6500);console.log('WALK',x,y,(await status()).rpg);};
 await walk(65,535);await p.locator('#talkBtn').click();assert((await status()).rpg.pass);await p.locator('#talkBtn').click();
 await walk(85,415);await p.locator('#talkBtn').click();assert((await status()).rpg.lunch);await p.locator('#talkBtn').click();
 await p.reload();await p.locator('#mainBtn').click();assert.equal((await status()).scene,'rpg');assert((await status()).rpg.pass);assert((await status()).rpg.lunch);
 await walk(305,265);await p.screenshot({path:'tests/rpg-town.png'});
 await p.locator('#talkBtn').click();await p.locator('#talkBtn').click();assert((await status()).encounter);await p.locator('[data-weapon=meat]').click();
 let pressed=[];
 for(let i=0;i<900;i++){
  const s=await status();if(s.scene==='rpg')break;assert.notEqual(s.scene,'lost');
  if(s.charge>=100)await p.locator('#specialBtn').click();
  let best;
  for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
   const n=Math.hypot(dx,dy)||1,x=Math.max(24,Math.min(366,s.player.x+dx/n*55)),y=Math.max(255,Math.min(618,s.player.y+dy/n*55));let cost=Math.abs(x-(s.bossX??195))*.045+Math.abs(y-540)*.025;
   for(const b of s.enemyShots)for(const t of [0,.15,.3,.5])cost+=Math.max(0,65-Math.hypot(x-b.x-b.vx*t,y-b.y-b.vy*t))**2*.035;
   if(!best||cost<best.cost)best={dx,dy,cost};
  }
  const next=[best.dx<0?'ArrowLeft':best.dx>0?'ArrowRight':null,best.dy<0?'ArrowUp':best.dy>0?'ArrowDown':null].filter(Boolean);
  for(const k of pressed)if(!next.includes(k))await p.keyboard.up(k);for(const k of next)if(!pressed.includes(k))await p.keyboard.down(k);pressed=next;await p.clock.runFor(100);
 }
 for(const k of pressed)await p.keyboard.up(k);
 assert.equal((await status()).scene,'rpg');assert((await status()).rpg.helped);
 await walk(307,235);await p.locator('#talkBtn').click();assert((await status()).rpg.arrived);await p.screenshot({path:'tests/rpg-clear.png'});
 await p.locator('#talkBtn').click();
 for(const [width,height] of [[320,568],[375,667],[390,844],[1280,900]]){await p.setViewportSize({width,height});await p.clock.runFor(100);const r=await p.locator('#rpgControls').boundingBox();assert(r.y+r.height<=height);assert(await p.locator('#talkBtn').isVisible());}
 await p.setViewportSize({width:390,height:844});await c.setOffline(true);await p.reload();await p.locator('#mainBtn').click();assert((await status()).rpg.arrived);assert.equal((await status()).scene,'rpg');
 assert.deepEqual(errors,[]);console.log('PASS RPG: touch paths, items, dialogue, reload, real shooting encounter victory, return, arrival, layouts, offline saved completion');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
