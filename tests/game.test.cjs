const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
let randomSeed=123456;
function element(){return {style:{},dataset:{},disabled:false,textContent:'',hidden:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:390,height:660}},setPointerCapture(){}}}
const nodes={},canvas=createCanvas(390,660),events={};
for(const id of ['screen','screenTitle','screenText','screenEyebrow','screenExtra','mainBtn','pauseBtn','soundBtn','specialBtn','specialFill','specialPercent','toast','weaponHint'])nodes[id]=element();
nodes.game=Object.assign(element(),{getContext:()=>canvas.getContext('2d'),parentElement:{clientWidth:390,clientHeight:660}});
const math=Object.create(Math);math.random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
const scope={console,Math:math,document:{getElementById:id=>nodes[id],querySelectorAll:()=>['money','meat','fish'].map(w=>({...element(),dataset:{weapon:w}})),addEventListener(){}},matchMedia:()=>({matches:false}),localStorage:{getItem(){return null},setItem(){}},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},SpeechSynthesisUtterance:class{}};
scope.window={devicePixelRatio:1,addEventListener:(n,f)=>events[n]=f};vm.createContext(scope);
let source=fs.readFileSync('game.js','utf8');
source=source.replace('  updateButtons();\n  requestAnimationFrame(frame);',`  window.test={begin,tick,render,special,togglePause,changeWeapon,damagePlayer,spawnPickup,enemyFire,bossDefeated,
    input:(x,y)=>{keys.clear();if(x)keys.add(x>0?'ArrowRight':'ArrowLeft');if(y)keys.add(y>0?'ArrowDown':'ArrowUp');},
    set:(v)=>{if('stage' in v)stage=v.stage;if('clock' in v)stageClock=v.clock;if('charge' in v)specials=v.charge;if('hp' in v)player.hp=v.hp;if('invuln' in v)player.invuln=v.invuln;if('bossHP' in v)boss.hp=v.bossHP;},
    frame:(dt)=>{if(scene!=='paused')tick(dt);},
    bullets:()=>bullets.map(b=>({...b})),summonBoss};
  updateButtons();\n  requestAnimationFrame(frame);`);
vm.runInContext(source,scope);const game=scope.window.test,status=()=>scope.window.nankoStatus;
const step=(seconds)=>{for(let i=0;i<seconds*60;i++)game.frame(1/60)};
game.begin();step(.1);assert.equal(status().scene,'playing');assert(game.bullets().length>0);
game.changeWeapon('fish');step(.5);assert(game.bullets().filter(b=>b.type==='fish').length>=3);
game.changeWeapon('meat');step(.7);assert(game.bullets().some(b=>b.damage>=43));assert(game.bullets().some(b=>b.type==='chake'));
const old=status().stageClock;game.togglePause();step(1);assert.equal(status().stageClock,old);game.togglePause();
game.set({charge:100});game.special();assert.equal(status().charge,0);assert.equal(status().enemyShots.length,0);
game.set({hp:2,invuln:0});game.spawnPickup(status().player.x,status().player.y,'heart');step(.05);assert.equal(status().hp,3);
game.spawnPickup(status().player.x,status().player.y,'power');step(.05);assert.equal(status().power,2);
game.set({invuln:0,hp:1});game.damagePlayer();assert.equal(status().scene,'lost');game.begin();assert.equal(status().hp,3);assert.equal(status().score,0);
for(let stage=0;stage<3;stage++){
 game.set({stage,clock:59});step(.05);assert(status().boss);
 if(stage===2){
  for(const [hp,phase] of [[800,0],[500,1],[200,2]]){game.set({bossHP:hp});step(.05);assert.equal(status().bossPhase,phase);}
  game.enemyFire(195,150,'flash',2);assert(status().laser);game.set({charge:100});game.special();assert.equal(status().laser,null);
 }
 game.set({bossHP:0});step(.05);assert.equal(status().scene,stage===2?'surrender':'stageclear');
 game.togglePause();assert.equal(status().scene,'paused');step(1);game.togglePause();step(3.3);
 assert.equal(status().scene,stage===2?'won':'playing');
}
console.log('PASS: weapons, Chake, pause, special, recovery, power, loss/retry, all stages, three boss phases, laser cancellation, surrender/clear');
// Full playthrough. Only ordinary movement/weapon/special controls; no state changes.
game.begin();game.changeWeapon('meat');const seen=new Set(),phases=new Set();
for(let frame=0;frame<60*420;frame++){
 const s=status();seen.add(s.stage);if(s.stage===2&&s.boss)phases.add(s.bossPhase);
 if(s.scene==='lost'||s.scene==='won')break;
 if(s.scene==='playing'){
  if(s.charge>=100&&(s.boss||s.enemyShots.length>14))game.special();
  if(frame%6===0){
   let best=null;
   for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
    const norm=Math.hypot(dx,dy)||1;const x=Math.max(24,Math.min(366,s.player.x+dx/norm*55));const y=Math.max(255,Math.min(618,s.player.y+dy/norm*55));
    let cost=Math.abs(x-(s.bossX??195))*.045+Math.abs(y-540)*.025;
    for(const b of s.enemyShots){for(const t of [0,.15,.3,.5]){const d=Math.hypot(x-(b.x+b.vx*t),y-(b.y+b.vy*t));cost+=Math.max(0,65-d)**2*.035;}}
    for(const e of s.foes){const d=Math.hypot(x-e.x,y-e.y);cost+=Math.max(0,65-d)**2*.08;}
    if(s.laser&&Math.abs(x-s.laser.x)<48)cost+=300;
    for(const p of s.items){if(p.type==='power'||(p.type==='heart'&&s.hp<3))cost-=Math.max(0,160-Math.hypot(x-p.x,y-p.y))*.08;}
    if(!best||cost<best.cost)best={dx,dy,cost};
   }
   game.input(best.dx,best.dy);
  }
 }
 game.tick(1/60);
 if(frame%3600===0)console.log('PLAY',Math.round(frame/60),JSON.stringify({stage:status().stage,hp:status().hp,score:status().score,boss:status().boss}));
}
console.log('PLAYTHROUGH',JSON.stringify(status()),'stages',Array.from(seen),'phases',Array.from(phases));
assert.equal(status().scene,'won');assert.equal(seen.size,3);assert.equal(phases.size,3);
game.render();fs.writeFileSync('/tmp/nanko-clear.png',canvas.toBuffer('image/png'));
