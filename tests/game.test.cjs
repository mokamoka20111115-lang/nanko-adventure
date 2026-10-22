const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
function boot(storage={}){
 let seed=123456;
 function element(){return {style:{},dataset:{},disabled:false,textContent:'',hidden:false,classList:{add(){},remove(){},toggle(){}},querySelector:()=>null,setAttribute(){},addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:390,height:660}},setPointerCapture(){}};}
 const events={},nodes={},canvas=createCanvas(390,660);
 const get=id=>nodes[id]||(nodes[id]=element());
 nodes.game=Object.assign(element(),{getContext:()=>canvas.getContext('2d'),parentElement:{clientWidth:390,clientHeight:660}});
 const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const scope={console,Math:math,document:{getElementById:get,querySelector:()=>null,querySelectorAll:()=>['money','meat','fish'].map(w=>({...element(),dataset:{weapon:w}})),addEventListener(){}},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},SpeechSynthesisUtterance:class{}};
 scope.window={devicePixelRatio:1,addEventListener:(n,f)=>events[n]=f};vm.createContext(scope);
 for(const file of ['progress.js','rpg.js','side.js'])vm.runInContext(fs.readFileSync(file,'utf8'),scope);
 let source=fs.readFileSync('game.js','utf8');
 source=source.replace('  updateButtons();\n  requestAnimationFrame(frame);',`  window.test={begin,tick,render,special,togglePause,changeWeapon,damagePlayer,spawnPickup,enemyFire,bossDefeated,summonBoss,freshStart,startRPG,startEncounter,startSide,side:()=>side,killed,shoot,hitBullet,spawnEnemy,
  bullets:()=>bullets,enemies:()=>enemies,clearItems:()=>{pickups=[];enemies=[];},
  cheer:()=>({life:cheerLife,clock:cheerClock,index:cheerIndex}),
  set:(v)=>{if('stage'in v)stage=v.stage;if('clock'in v)stageClock=v.clock;if('charge'in v)specials=v.charge;if('hp'in v)player.hp=v.hp;if('invuln'in v)player.invuln=v.invuln;if('bossHP'in v)boss.hp=v.bossHP;},
  frame:dt=>{if(scene!=='paused')tick(dt);},boss:()=>({...boss}),rpg:()=>rpg};
  updateButtons();\n  requestAnimationFrame(frame);`);
 vm.runInContext(source,scope);
 return {game:scope.window.test,status:()=>scope.window.nankoStatus,progress:scope.window.NankoProgress,storage,nodes,events};
}
const b=boot(),{game:g,status:s}=b;
const step=seconds=>{for(let n=0;n<Math.ceil(seconds*60);n++)g.frame(1/60);};
g.begin();assert.equal(s().weapon,'money');g.changeWeapon('meat');g.changeWeapon('fish');assert.equal(s().weapon,'money');
for(let n=0;n<3;n++)g.killed({x:195,y:250,points:100});assert(s().items.some(p=>p.type==='meat'));
g.spawnPickup(s().player.x,s().player.y,'meat');step(.02);assert(s().meatUnlocked);assert.equal(s().weapon,'meat');
g.spawnPickup(s().player.x,s().player.y,'fish');step(.02);assert.equal(s().weapon,'fish');assert(s().fishTime>29);
const before=s().fishTime;g.togglePause();step(4);assert.equal(s().fishTime,before);g.togglePause();
g.set({invuln:100});step(30.1);assert.equal(s().fishTime,0);assert.equal(s().weapon,'meat');
g.set({charge:100});g.special();assert.equal(s().charge,0);
for(let stage=0;stage<3;stage++){
 g.set({stage,clock:59,invuln:200});step(.05);assert.equal(g.boss().max,[1800,2400,6000][stage]);
 for(const [ratio,phase] of (stage===2?[[.9,0],[.5,1],[.2,2],[.1,3]]:[[.9,0],[.3,1]])){g.set({bossHP:g.boss().max*ratio});step(.02);assert.equal(s().bossPhase,phase);}
 g.set({bossHP:0});step(.05);assert.equal(s().scene,stage===2?'surrender':'stageclear');
 if(stage<2){assert.equal(b.progress.get().stage,stage+1);const restarted=boot(b.storage);restarted.game.begin();assert.equal(restarted.status().stage,stage+1);}
 step(3.3);assert.equal(s().scene,stage===2?'won':'playing');
 if(stage<2){g.set({hp:1,invuln:0});g.damagePlayer();assert.equal(s().scene,'lost');g.begin();assert.equal(s().stage,stage+1);assert.equal(s().hp,3);}
}
assert(b.progress.get().rpgUnlocked);g.begin();assert.equal(s().scene,'rpg');g.render();
const reloaded=boot(b.storage);reloaded.game.begin();assert.equal(reloaded.status().scene,'rpg');
g.startEncounter();assert.equal(s().bossHP,600);g.set({hp:1,invuln:0});g.damagePlayer();g.begin();assert(s().encounter);g.set({bossHP:0});step(.02);assert.equal(s().scene,'rpg');assert(s().rpg.helped);
g.freshStart();assert.equal(s().stage,0);assert(!s().meatUnlocked);assert(!b.progress.get().rpgUnlocked);
const idle=boot();idle.progress.write({rpgUnlocked:true,chapter:'shooting',stage:2});idle.events.blur();assert.equal(idle.progress.get().chapter,'shooting');assert.equal(idle.progress.get().stage,2);
const corrupt=boot({nanko_progress_v1:'{"version":1,"stage":999,"power":-2,"rpg":{"x":null}}'});assert.equal(corrupt.progress.get().stage,2);assert.equal(corrupt.progress.get().power,1);
console.log('PASS: locks, drops, timed fish, pause, 3 boss HP/phases, each stage retry/reload, RPG unlock/reload, encounter loss/win return, fresh start, corrupt save');

// Second balance pass: isolated fixtures, no gameplay cheats shipped.
const c=boot(),q=c.game,cs=c.status;q.begin();q.set({invuln:999});
for(const type of ['feather','cheek','awake']){q.spawnPickup(cs().player.x,cs().player.y,type);q.frame(.01);assert.equal(cs().chakeBuff[type],type==='awake'?20:45);}
q.frame(.6);assert(q.bullets().filter(b=>b.type==='chake'&&b.homing&&b.damage===22).length>=3);
q.spawnPickup(cs().player.x,cs().player.y,'cheek');q.frame(.01);assert.equal(cs().chakeBuff.cheek,45);
q.togglePause();q.frame(10);assert.equal(cs().chakeBuff.cheek,45);q.togglePause();
for(let i=0;i<1250;i++){q.clearItems();q.frame(1/60);}assert.equal(cs().chakeBuff.awake,0);assert(cs().chakeBuff.feather>0);
for(let i=0;i<1600;i++){q.clearItems();q.frame(1/60);}assert.equal(cs().chakeBuff.feather,0);assert.equal(cs().chakeBuff.cheek,0);
q.begin();assert.equal(cs().chakeBuff.awake,0);
q.spawnEnemy();assert([22,28,32,34].includes(q.enemies().at(-1).hp));
const bullet={x:0,y:0,damage:10,life:2,pierce:2},enemy={hp:50};q.hitBullet(bullet,enemy);q.hitBullet(bullet,enemy);assert.equal(enemy.hp,40);assert.equal(bullet.pierce,1);
for(const pattern of ['homing','spiral','boomerang','feint','pincer']){q.enemyFire(195,150,pattern,3);assert(cs().enemyShots.some(b=>b.motion===pattern));}
for(let i=0;i<120;i++)q.frame(1/60);assert(cs().enemyShots.some(b=>b.motion==='boomerang'&&b.vy<125));assert(cs().enemyShots.some(b=>b.motion==='feint'&&b.turned));
console.log('PASS: Chake spread/double/homing, refresh/cap/pause/expiry/reset, double mob HP, piercing hits once, five bullet motions');
const d=boot(),dg=d.game;dg.begin();let fishDrops=0,birdDrops={feather:0,cheek:0,awake:0};
for(let i=0;i<5000;i++){dg.clearItems();dg.killed({x:100,y:100,points:1});for(const p of d.status().items){if(p.type==='fish')fishDrops++;if(p.type in birdDrops)birdDrops[p.type]++;}}
// Meat guarantee takes priority for 20% of this locked fixture's kills.
assert(fishDrops>85&&fishDrops<160);assert(birdDrops.awake>60&&birdDrops.awake<140);
assert(birdDrops.feather>170&&birdDrops.feather<330);assert(birdDrops.cheek>170&&birdDrops.cheek<330);
console.log('DROP SAMPLE (5000 locked-weapon kills)',{fishDrops,birdDrops});
const w=boot(),wg=w.game;wg.begin();wg.set({invuln:999});
for(let i=0;i<120;i++)wg.shoot();const coin=wg.bullets().find(b=>b.bounce>0);assert(coin);coin.x=389;coin.vx=110;wg.frame(.02);assert.equal(coin.bounce,1);assert(coin.vx<0);
wg.spawnPickup(w.status().player.x,w.status().player.y,'meat');wg.frame(.01);for(let i=0;i<100;i++)wg.shoot();assert(wg.bullets().some(b=>b.type==='meat'&&b.giant&&b.splash===85));
wg.spawnPickup(w.status().player.x,w.status().player.y,'fish');wg.frame(.01);for(let i=0;i<30;i++)wg.shoot();assert(wg.bullets().some(b=>b.type==='fish'&&b.pierce===2&&b.spin>=0));
console.log('PASS: bouncing coin, giant splash meat, rotating piercing fish');

// Old saves gain Chapter 3 fields without losing RPG or shooting progress.
const legacy={nanko_progress_v1:JSON.stringify({version:1,stage:2,meat:true,power:3,score:4000,rpgUnlocked:true,chapter:'rpg',rpg:{x:307,y:235,pass:true,lunch:true,helped:true,arrived:true}})};
const ch=boot(legacy);assert.equal(ch.progress.get().stage,2);assert(ch.progress.get().rpg.arrived);assert.equal(ch.progress.get().side.area,0);ch.game.startSide();assert.equal(ch.status().scene,'side');assert.equal(ch.progress.get().chapter,'side');ch.game.tick(.1);assert(ch.status().side.shots.some(b=>b.vx>0));ch.game.togglePause();const st=ch.status().side.time;ch.game.frame(2);assert.equal(ch.status().side.time,st);ch.game.togglePause();
const resumed=boot(legacy);resumed.game.begin();assert.equal(resumed.status().scene,'side');assert.equal(resumed.progress.get().stage,2);assert(resumed.progress.get().rpg.arrived);
const locked=boot();locked.game.startSide();assert.equal(locked.status().scene,'title');
console.log('PASS: v1 save migration, Chapter 3 unlock gate, rightward fire, pause, reload, earlier chapter progress retained');
