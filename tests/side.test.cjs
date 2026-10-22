const {chromium}=require('playwright'),assert=require('assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.NANKO_CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8000/');
 await p.locator('#chaptersBtn').click();assert(await p.locator('#chooseSide').isDisabled());await p.locator('#closeChapters').click();
 // Only initial condition is seeded: a legitimate completed Chapter 2 v1 save.
 await p.evaluate(()=>localStorage.setItem('nanko_progress_v1',JSON.stringify({version:1,stage:2,meat:true,power:3,score:4000,rpgUnlocked:true,chapter:'rpg',rpg:{x:307,y:235,pass:true,lunch:true,helped:true,arrived:true}})));
 await p.reload();await p.locator('#mainBtn').click();await p.locator('#chapter3Btn').waitFor();await p.locator('#chapter3Btn').click();assert.equal(await p.evaluate(()=>nankoStatus.scene),'side');
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[1280,900]]){await p.setViewportSize({width,height});await p.waitForTimeout(70);const r=await p.locator('#specialBtn').boundingBox();assert(r.x>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1);}
 await p.setViewportSize({width:390,height:844});
 const r=await p.locator('#game').boundingBox(),cdp=await c.newCDPSession(p),pt={x:r.x+r.width*.3,y:r.y+r.height*.5};const before=await p.evaluate(()=>nankoStatus.side.player);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pt,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pt.x+25,y:pt.y-40,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await p.evaluate(()=>nankoStatus.side.player);assert(after.x>before.x&&after.y<before.y);assert.equal(await p.evaluate(()=>nankoStatus.scene),'side');
 await p.locator('#pauseBtn').click();assert.equal(await p.evaluate(()=>nankoStatus.scene),'side');
 await p.clock.install();const areas=new Set(),bosses=new Set();let pressed=[],lastArea=-1,bankShot=false,ramenShot=false;
 for(let i=0;i<2200;i++){
  const all=await p.evaluate(()=>nankoStatus),s=all.side;areas.add(s.area);if(s.boss)bosses.add(s.area);
  if(s.boss&&s.area===1&&s.boss.t>4&&!bankShot){await p.screenshot({path:'tests/chapter3-bank.png'});bankShot=true;}
  if(s.ending>1&&!ramenShot){await p.screenshot({path:'tests/chapter3-ramen.png'});ramenShot=true;}
  if(all.scene==='sideWon'){console.log('CHAPTER3 CLEAR',s.score,Math.round(i*.15),[...areas],[...bosses]);break;}
  assert.notEqual(all.scene,'sideLost','Normal-input autoplayer lost');
  if(s.area!==lastArea){console.log('AREA',s.area+1,'HP',s.hp);lastArea=s.area;}
  if(s.weapon==='money')await p.locator('[data-weapon=meat]').click();
  if(s.charge>=100&&!s.transition&&!s.ending)await p.locator('#specialBtn').click();
  const aim=s.boss?340+Math.sin((s.boss.t+.5)*.8)*140:350;let best;
  for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
   const n=Math.hypot(dx,dy)||1,x=Math.max(28,Math.min(220,s.player.x+dx/n*48)),y=Math.max(135,Math.min(585,s.player.y+dy/n*48));
   let cost=Math.abs(x-100)*.055+Math.abs(y-aim)*.10;
   for(const e of s.enemyShots)for(const t of [0,.2,.4,.6])cost+=Math.max(0,65-Math.hypot(x-e.x-e.vx*t,y-e.y-e.vy*t))**2*.05;
   for(const e of s.foes)cost+=Math.max(0,60-Math.hypot(x-e.x,y-e.y))**2*.06;
   for(const o of s.obstacles)cost+=Math.max(0,65-Math.abs(x-o.x))**2*(Math.abs(y-o.y)<65?.12:0);
   if(s.beam&&Math.abs(y-s.beam.y)<55)cost+=500;
   for(const item of s.items)if(item.type==='power'||item.type==='heart'&&s.hp<5||['fish','feather','cheek','awake'].includes(item.type))cost-=Math.max(0,160-Math.hypot(x-item.x,y-item.y))*.15;
   if(!best||cost<best.cost)best={dx,dy,cost};
  }
  const next=[best.dx<0?'ArrowLeft':best.dx>0?'ArrowRight':null,best.dy<0?'ArrowUp':best.dy>0?'ArrowDown':null].filter(Boolean);
  for(const k of pressed)if(!next.includes(k))await p.keyboard.up(k);for(const k of next)if(!pressed.includes(k))await p.keyboard.down(k);pressed=next;
  await p.clock.runFor(150);
 }
 assert.equal(await p.evaluate(()=>nankoStatus.scene),'sideWon');assert(await p.locator('#chapter4Btn').isVisible());assert.equal(areas.size,3);assert.equal(bosses.size,2);
 await p.screenshot({path:'tests/chapter3-clear.png'});
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('nanko_progress_v1')));assert(saved.side.clear&&saved.side.transfer&&saved.rpg.arrived&&saved.rpgUnlocked);assert.equal(saved.stage,2);
 await c.setOffline(true);await p.reload();await p.locator('#mainBtn').click();assert.equal(await p.evaluate(()=>nankoStatus.scene),'side');
 await p.locator('#chaptersBtn').click();await p.locator('#chooseRpg').click();assert.equal(await p.evaluate(()=>nankoStatus.scene),'rpg');assert((await p.evaluate(()=>nankoStatus.rpg)).arrived);
 await p.locator('#chaptersBtn').click();await p.locator('#chooseShoot').click();assert.equal(await p.evaluate(()=>nankoStatus.scene),'playing');assert.equal(await p.evaluate(()=>nankoStatus.stage),2);
 assert.deepEqual(errors,[]);console.log('PASS: chapter gate, migrated save, touch/layout/ghost pause, all areas/bosses/ramen, offline and old chapter replay');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
