const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
function boot(storage={}){
 let seed=123456;
 function element(){return {style:{},dataset:{},disabled:false,textContent:'',hidden:false,classList:{add(){},remove(){},toggle(){}},querySelector:()=>null,setAttribute(){},addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:390,height:660}},setPointerCapture(){}};}
 const nodes={},canvas=createCanvas(390,660);
 const get=id=>nodes[id]||(nodes[id]=element());
 nodes.game=Object.assign(element(),{getContext:()=>canvas.getContext('2d'),parentElement:{clientWidth:390,clientHeight:660}});
 const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const scope={console,Math:math,document:{getElementById:get,querySelector:()=>null,querySelectorAll:()=>['money','meat','fish'].map(w=>({...element(),dataset:{weapon:w}})),addEventListener(){}},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},SpeechSynthesisUtterance:class{}};
 scope.window={devicePixelRatio:1,addEventListener(){}};vm.createContext(scope);
 for(const file of ['progress.js','rpg.js'])vm.runInContext(fs.readFileSync(file,'utf8'),scope);
 let source=fs.readFileSync('game.js','utf8');
 source=source.replace('  updateButtons();\n  requestAnimationFrame(frame);',`  window.test={begin,tick,render,special,togglePause,changeWeapon,damagePlayer,spawnPickup,enemyFire,bossDefeated,summonBoss,freshStart,startRPG,startEncounter,killed,
  cheer:()=>({life:cheerLife,clock:cheerClock,index:cheerIndex}),
  set:(v)=>{if('stage'in v)stage=v.stage;if('clock'in v)stageClock=v.clock;if('charge'in v)specials=v.charge;if('hp'in v)player.hp=v.hp;if('invuln'in v)player.invuln=v.invuln;if('bossHP'in v)boss.hp=v.bossHP;},
  frame:dt=>{if(scene!=='paused')tick(dt);},boss:()=>({...boss}),rpg:()=>rpg};
  updateButtons();\n  requestAnimationFrame(frame);`);
 vm.runInContext(source,scope);
 return {game:scope.window.test,status:()=>scope.window.nankoStatus,progress:scope.window.NankoProgress,storage,nodes};
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
 g.set({stage,clock:59,invuln:200});step(.05);assert.equal(g.boss().max,[900,1200,3000][stage]);
 for(const [ratio,phase] of (stage===2?[[.9,0],[.5,1],[.2,2]]:[[.9,0],[.3,1]])){g.set({bossHP:g.boss().max*ratio});step(.02);assert.equal(s().bossPhase,phase);}
 g.set({bossHP:0});step(.05);assert.equal(s().scene,stage===2?'surrender':'stageclear');
 if(stage<2){assert.equal(b.progress.get().stage,stage+1);const restarted=boot(b.storage);restarted.game.begin();assert.equal(restarted.status().stage,stage+1);}
 step(3.3);assert.equal(s().scene,stage===2?'won':'playing');
 if(stage<2){g.set({hp:1,invuln:0});g.damagePlayer();assert.equal(s().scene,'lost');g.begin();assert.equal(s().stage,stage+1);assert.equal(s().hp,3);}
}
assert(b.progress.get().rpgUnlocked);g.begin();assert.equal(s().scene,'rpg');g.render();
const reloaded=boot(b.storage);reloaded.game.begin();assert.equal(reloaded.status().scene,'rpg');
g.startEncounter();assert.equal(s().bossHP,600);g.set({hp:1,invuln:0});g.damagePlayer();g.begin();assert(s().encounter);g.set({bossHP:0});step(.02);assert.equal(s().scene,'rpg');assert(s().rpg.helped);
g.freshStart();assert.equal(s().stage,0);assert(!s().meatUnlocked);assert(!b.progress.get().rpgUnlocked);
const corrupt=boot({nanko_progress_v1:'{"version":1,"stage":999,"power":-2,"rpg":{"x":null}}'});assert.equal(corrupt.progress.get().stage,2);assert.equal(corrupt.progress.get().power,1);
console.log('PASS: locks, drops, timed fish, pause, 3 boss HP/phases, each stage retry/reload, RPG unlock/reload, encounter loss/win return, fresh start, corrupt save');
