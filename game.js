/* なんこの大冒険！ — Canvas / Vanilla JS / no external dependencies */
(() => {
  'use strict';
  const progress=window.NankoProgress;
  let meatUnlocked=false,fishTime=0,fishReturn='money',killCount=0,encounter=false;
  let rpg=null;
  const W = 390, H = 660, TAU = Math.PI * 2;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const els = {
    screen: document.getElementById('screen'), title: document.getElementById('screenTitle'),
    text: document.getElementById('screenText'), eyebrow: document.getElementById('screenEyebrow'),
    extra: document.getElementById('screenExtra'), main: document.getElementById('mainBtn'),
    pause: document.getElementById('pauseBtn'), sound: document.getElementById('soundBtn'),
    special: document.getElementById('specialBtn'), specialFill: document.getElementById('specialFill'),
    specialPercent: document.getElementById('specialPercent'), toast: document.getElementById('toast'),
    hint: document.getElementById('weaponHint'), weapons: [...document.querySelectorAll('.weapon')]
  };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const choose = arr => arr[Math.floor(Math.random() * arr.length)];
  const distanceSq = (a,b) => (a.x-b.x)**2 + (a.y-b.y)**2;
  const hasTouch = matchMedia('(pointer:coarse)').matches;
  const stageNames = ['なんこの旅立ち', 'サラリーマンの街', 'はしもと本社'];
  const stageMessages = ['お金を投げて、しゅっぱつ！','オフィス街でも負けないぞ！','ついに はしもと と決戦！'];
  const weaponInfo = {
    money: {label:'💴 連射がとくい！', cooldown:.16},
    meat:  {label:'🍖 うるふぎゃんぐ・高威力！', cooldown:.58},
    fish:  {label:'🐟 子持ちあゆ・３方向！', cooldown:.38}
  };
  let scene='title', lastTime=0, elapsed=0, stage=0, stageClock=0, enemyClock=0;
  let score=0, best=0, weapon='money', power=1, specials=0, chakeClock=.35;
  const cheers=['頑張れなんこ！','いけいけなんこ！','いっけーー！'];
  let cheerClock=3, cheerLife=0, cheerIndex=-1;
  let player={x:W/2,y:560,hp:3,invuln:0,shot:0,tilt:0};
  let enemies=[],bullets=[],enemyBullets=[],particles=[],pickups=[],texts=[];
  let boss=null, stageBossSeen=false, stageDelay=0, effectFlash=0, quake=0, specialFX=0;
  let pointerActive=false, pointerId=null, keys=new Set(), toastTimer=0, musicClock=0, musicNote=0;
  let audio=null, isMuted=false, highScoreAvailable=true;
  let resumeScene='playing', laser=null, surrender=null, dropCount=0, itemClock=10;
  try {isMuted=localStorage.getItem('nanko_muted')==='true';}catch(_){}
  try {best = Number(localStorage.getItem('nanko_adventure_best')||0)||0;} catch(_) {highScoreAvailable=false;}

  // High-resolution drawing while using a fixed logical canvas coordinate system.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width=W*dpr; canvas.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  // Preserve both the artwork ratio and touch coordinates when Safari resizes.
  const fitCanvas=()=>{
    const wrap=canvas.parentElement;
    const height=Math.min(wrap.clientHeight,wrap.clientWidth*H/W);
    canvas.style.width=(height*W/H)+'px';canvas.style.height=height+'px';
  };
  new ResizeObserver(fitCanvas).observe(canvas.parentElement);fitCanvas();

  function ensureAudio() {
    if (isMuted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(!AudioContext) return;
      if(!audio) audio=new AudioContext();
      if(audio.state === 'suspended') audio.resume().catch(()=>{});
    } catch(_){ /* quiet fallback for browsers without WebAudio */ }
  }
  function beep(freq=550,dur=.11,type='sine',volume=.04,slide=0) {
    if(!audio||isMuted) return;
    try {
      const t=audio.currentTime, o=audio.createOscillator(), g=audio.createGain();
      o.type=type; o.frequency.setValueAtTime(freq,t);
      if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(45,freq+slide),t+dur);
      g.gain.setValueAtTime(Math.max(.0001,volume),t);
      g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+dur+.02);
    } catch(_){}
  }
  function sfx(name) {
    if(name==='money') beep(840,.045,'sine',.018,-220);
    else if(name==='meat'){beep(190,.16,'triangle',.058,-130);beep(95,.18,'sine',.03,-20);}
    else if(name==='fish') beep(570,.08,'sine',.03,-400);
    else if(name==='hit') beep(135,.21,'sawtooth',.055,-80);
    else if(name==='pop') beep(rand(320,500),.09,'triangle',.022,-150);
    else if(name==='power'){[600,760,960].forEach((f,i)=>setTimeout(()=>beep(f,.1,'sine',.06),i*80));}
    else if(name==='boom'){beep(115,.48,'sawtooth',.08,-75);beep(310,.32,'triangle',.06,-190);}
    else if(name==='warn') beep(465,.17,'square',.04,-110);
  }
  function music(dt) {
    if(!audio||isMuted||scene!=='playing') return;
    musicClock+=dt;
    if(musicClock>.29){
      musicClock-=.29;
      const notes=stage===2?[293.66,349.23,440,349.23,392,523.25,440,349.23]:[392,493.88,523.25,587.33,523.25,493.88,440,523.25];
      if(musicNote%2===0)beep(notes[musicNote%notes.length],.16,'triangle',.009);
      musicNote++;
    }
  }
  function speakSpecial(words='むかちゅくーーー！！') {
    if(isMuted)return;
    // The browser's own Japanese synthetic voice: no voice recordings required.
    try {
      if('speechSynthesis' in window){
        speechSynthesis.cancel();
        const u=new SpeechSynthesisUtterance(words);
        u.lang='ja-JP';u.rate=1.23;u.pitch=1.65;u.volume=.95;
        const jp=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('ja'));
        if(jp)u.voice=jp;
        speechSynthesis.speak(u);
      }
    }catch(_){}
    beep(600,.18,'sawtooth',.08,-300);
  }
  function showToast(msg,seconds=2) {
    els.toast.textContent=msg; els.toast.classList.add('show'); toastTimer=seconds;
  }
  function screen(eyebrow,title,text,button,extra) {
    els.eyebrow.textContent=eyebrow;
    els.title.innerHTML=title;
    els.text.innerHTML=text;
    els.main.textContent=button;
    els.extra.textContent=extra||'';
    els.screen.hidden=false;
    document.getElementById('newBtn').hidden=!['title','lost','won'].includes(scene);
    els.pause.disabled=scene!=='paused' && scene!=='playing';
  }
  function hideScreen(){els.screen.hidden=true;}
  function resetGame() {
    stage=0;score=0;power=1;specials=0;weapon='money';chakeClock=.35;
    cheerClock=rand(3,6);cheerLife=0;cheerIndex=-1;
    player={x:W/2,y:550,hp:3,invuln:2,shot:0,tilt:0};
    enemies=[];bullets=[];enemyBullets=[];particles=[];pickups=[];texts=[];
    stageClock=0;enemyClock=0;stageBossSeen=false;stageDelay=0;boss=null;
    elapsed=0;specialFX=0;effectFlash=0;quake=0;laser=null;surrender=null;dropCount=0;itemClock=10;
    pointerActive=false;pointerId=null;keys.clear();musicClock=0;musicNote=0;
    updateButtons();changeWeapon('money');
  }
  function saveStage(next=stage){
    if(encounter)return;
    if(!progress.write({stage:next,meat:meatUnlocked,power,score,chapter:'shooting'}))showToast('保存できません。この画面では続けて遊べます',3);
  }
  function begin() {
    if(scene==='won'||(scene==='title'&&progress.get().chapter==='rpg')){startRPG();return;}
    if(encounter&&scene==='lost'){startEncounter();return;}
    const saved=progress.get();
    ensureAudio();resetGame();stage=saved.stage;meatUnlocked=saved.meat;power=saved.power;score=saved.score;
    fishTime=0;fishReturn='money';killCount=0;encounter=false;
    scene='playing';hideScreen();setMode(false);els.pause.disabled=false;updateButtons();
    showToast(`STAGE ${stage+1}\n${stageNames[stage]}`,2.2);sfx('power');
  }
  function setMode(isRpg){
    document.getElementById('shootControls').hidden=isRpg;
    document.getElementById('rpgControls').hidden=!isRpg;
  }
  function startRPG(){
    if(!progress.get().rpgUnlocked)return;
    ensureAudio();scene='rpg';encounter=false;hideScreen();setMode(true);keys.clear();pointerActive=false;
    progress.write({chapter:'rpg'});rpg.enter();els.pause.disabled=false;updateButtons();
  }
  function startEncounter(){
    ensureAudio();resetGame();encounter=true;stage=0;meatUnlocked=progress.get().meat;power=1;fishTime=0;
    scene='playing';hideScreen();setMode(false);els.pause.disabled=false;summonBoss();boss.hp=boss.max=600;
    showToast('書類の嵐！ 道をひらこう！',2);updateButtons();
  }
  function freshStart(){progress.reset();encounter=false;scene='title';begin();}

  function updateButtons() {
    els.weapons.forEach(b=>{
      const t=b.dataset.weapon;b.disabled=t==='meat'?!meatUnlocked:t==='fish'?fishTime<=0:false;
      const small=b.querySelector('small');if(small)small.textContent=t==='money'?'基本の連射':t==='meat'?(meatUnlocked?'高威力':'敵から入手'):(fishTime>0?`残り ${Math.ceil(fishTime)} 秒`:'レア・30秒');
      b.setAttribute('aria-label',t==='money'?'おかね':t==='meat'?(meatUnlocked?'うるふぎゃんぐ':'うるふぎゃんぐ：敵のアイテムで解放'):(fishTime>0?`子持ちあゆ 残り${Math.ceil(fishTime)}秒`:'子持ちあゆ：レアアイテムで30秒解放'));
      b.classList.toggle('active',t===weapon);b.setAttribute('aria-pressed',String(t===weapon));
    });
    if(fishTime>0)els.hint.textContent=`🐟 残り ${Math.ceil(fishTime)}秒`;

    els.special.disabled=scene!=='playing'||specials<100;
    els.specialFill.style.width=clamp(specials,0,100)+'%';
    els.specialPercent.textContent=Math.round(specials)+'%';
    els.pause.textContent=scene==='paused'?'▶':'⏸';
  }
  function changeWeapon(type) {
    if(!weaponInfo[type]||(type==='meat'&&!meatUnlocked)||(type==='fish'&&fishTime<=0))return;
    if(fishTime>0&&type!=='fish')fishReturn=type;
    weapon=type;player.shot=Math.min(player.shot, .08);
    els.weapons.forEach(b=>{const selected=b.dataset.weapon===weapon;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    els.hint.textContent=weaponInfo[type].label;
  }
  function togglePause() {
    if(['playing','stageclear','surrender','rpg'].includes(scene)){
      resumeScene=scene;pointerActive=false;pointerId=null;keys.clear();
      if('speechSynthesis' in window)speechSynthesis.cancel();
      scene='paused';screen('ちょっと休憩','ひとやすみ ♡','準備ができたら、また出発しよう！','▶ つづきから','P キーでも再開できるよ');
    }else if(scene==='paused'){ensureAudio();scene=resumeScene;hideScreen();}
    updateButtons();
  }
  function finish(win) {
    scene=win?'won':'lost';els.pause.disabled=true;
    if(score>best){best=score;if(highScoreAvailable)try{localStorage.setItem('nanko_adventure_best',String(best));}catch(_){}}
    if(win&&encounter){rpg.winEncounter();startRPG();return;}
    if(win){progress.write({rpgUnlocked:true,chapter:'rpg'});sfx('power');screen('✨ GAME CLEAR ✨','やったね！<br>なんこ！','はしもと「まいった〜！ 今日は定時で帰る！」<br>なんこ＆ちゃけの大勝利！','🏢 第2章・ニッショーへ出勤！',`スコア ${score.toLocaleString()} 点　／　ベスト ${best.toLocaleString()} 点`);}
    else {sfx('hit');screen('GAME OVER','なんこは<br>つかれちゃった…','ちゃけ「まだまだいけるよ！」<br>何度でも挑戦しよう！',encounter?'💗 書類バトルを再挑戦':`💗 ステージ${stage+1}から再挑戦`,`スコア ${score.toLocaleString()} 点　／　ベスト ${best.toLocaleString()} 点`);}
    updateButtons();
  }
  function addParticle(x,y,color,n=10,v=115){for(let i=0;i<n;i++){const a=rand(0,TAU),speed=rand(25,v);particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:rand(2,5),color,life:rand(.25,.68),max:.68});}}
  function floatText(x,y,text,color='#fff'){texts.push({x,y,text,color,life:.9,vy:-34});}
  function damagePlayer() {
    if(player.invuln>0||scene!=='playing')return;
    player.hp--;player.invuln=2.0;quake=7;effectFlash=.17;sfx('hit');
    addParticle(player.x,player.y,'#fff4b9',17,125);
    floatText(player.x,player.y-50,'いたーい！','#e85886');
    if(player.hp<=0)finish(false);
  }
  function addScore(n){score+=n;}
  function spawnEnemy() {
    const kind=choose(stage===0?['paper','paper','stamp','tie']:stage===1?['paper','stamp','tie','card']:['paper','stamp','tie','card','card']);
    const x=rand(28,W-28);
    enemies.push({type:kind,x,y:-40,base:x,t:0,seed:rand(0,10),hp:kind==='tie'?17:kind==='card'?14:kind==='stamp'?16:11,r:kind==='tie'?20:17,shot:rand(1.0,2.2),speed:rand(48,76)+stage*12,points:kind==='tie'?240:120});
  }
  function enemyFire(x,y,pattern='single',phase=0){
    if(pattern==='single') {
      const dx=player.x-x,dy=player.y-y;const a=Math.atan2(dy,dx),sp=98+stage*16;
      enemyBullets.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:7,type:'memo'});
    } else if(pattern==='fan'){
      const a=Math.atan2(player.y-y,player.x-x);
      for(let i=-2;i<=2;i++){const aa=a+i*.23,sp=120+stage*10;enemyBullets.push({x,y,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,r:7,type:phase===0?'card':'memo'});}
    } else if(pattern==='ring'){
      for(let i=0;i<11+phase*2;i++){
        const a=TAU*i/(11+phase*2)+elapsed*.38;
        enemyBullets.push({x,y,vx:Math.cos(a)*(82+phase*12),vy:Math.sin(a)*(82+phase*12),r:7,type:phase===2?'stamp':'card'});
      }
    }else if(pattern==='flash'){
      laser={x:player.x,y:y-60,time:1.5};sfx('warn');showToast('眼鏡フラッシュ！ 光の線からよけて！',1);
    }else if(pattern==='ties'){
      for(let i=-1;i<=1;i++)enemyBullets.push({x:x+i*24,y,vx:i*48,vy:145+phase*22,r:10,type:'tie'});
    }else if(pattern==='rain'){
      for(let i=0;i<8;i++)enemyBullets.push({x:rand(15,W-15),y:-15-rand(0,85),vx:rand(-15,15),vy:rand(115,185),r:7,type:'stamp'});
    }
  }
  function summonBoss() {
    stageBossSeen=true;enemies=[];enemyBullets=[];
    boss={type:stage===0?'printer':stage===1?'manager':'hashimoto',x:W/2,y:-85,r:stage===2?50:40,hp:[900,1200,3000][stage],max:[900,1200,3000][stage],shot:1.8,pattern:0,t:0,phase:0,invuln:0};
    showToast(stage===2?'⚠️ はしもと登場！！':'⚠️ 中ボス が あらわれた！',2.4);
    sfx('warn');
  }
  function bossDefeated() {
    const x=boss.x,y=boss.y;
    if(scene!=='playing')return;
    for(let i=0;i<5;i++)addParticle(x+rand(-50,50),y+rand(-40,40),choose(['#ffc96e','#ffe6a8','#fa8db4','#ffffff']),14,205);
    sfx('boom'); quake=11;effectFlash=.4;
    addScore(stage===2?6000:1500);
    boss=null;enemyBullets=[];laser=null;bullets=[];
    if(encounter){finish(true);return;}
    if(stage===2){progress.write({rpgUnlocked:true,chapter:'rpg'});scene='surrender';surrender={x,y,t:0};stageDelay=3.2;speakSpecial('まいった〜！');showToast('まいった〜！',3);updateButtons();return;}
    saveStage(stage+1);
    scene='stageclear';stageDelay=2.9;showToast('✨ STAGE CLEAR！ ✨',2.5);
    specials=clamp(specials+35,0,100);player.hp=Math.min(3,player.hp+1);updateButtons();
  }
  function nextStage(){itemClock=10;laser=null;stage++;stageClock=0;enemyClock=0;stageBossSeen=false;boss=null;scene='playing';player.invuln=1.8;player.x=W/2;player.y=550;enemies=[];bullets=[];enemyBullets=[];pickups=[];showToast(`STAGE ${stage+1}\n${stageNames[stage]}`,2.7);sfx('power');updateButtons();}
  function shoot() {
    if(weapon==='money'){
      const x=player.x+(Math.random()-.5)*4;
      bullets.push({x,y:player.y-35,vx:0,vy:-485,r:8,damage:6*power,type:Math.random()<.3?'coin':'money',life:1.6,pierce:0});
    } else if(weapon==='meat') {
      bullets.push({x:player.x,y:player.y-34,vx:0,vy:-290,r:16,damage:43*power,type:'meat',variant:Math.random()<.5?'steak':'bone',life:2.2,pierce:0,splash:50});
    } else {
      for(const angle of [-.26,0,.26])bullets.push({x:player.x,y:player.y-30,vx:Math.sin(angle)*295,vy:-Math.cos(angle)*340,r:12,damage:13*power,type:'fish',variant:Math.random()<.5?'sea':'bream',life:2.0,pierce:0,spin:rand(0,TAU)});
    }
    if(Math.random()<.45)sfx(weapon);
  }
  function special() {
    if(scene!=='playing'||specials<100)return;
    ensureAudio();specials=0;specialFX=2.25;effectFlash=.55;quake=11;
    enemyBullets=[];laser=null;player.invuln=Math.max(player.invuln,2.5);
    for(const e of enemies)e.hp-=105;
    if(boss)boss.hp-=stage===2?260:190;
    for(let k=0;k<85;k++)addParticle(rand(0,W),rand(70,H-110),choose(['#ffffff','#ff9bc0','#fff3a4','#a3e3fb']),1,220);
    showToast('むかちゅくーーー！！！',1.8);speakSpecial();sfx('boom');updateButtons();
  }
  function spawnPickup(x,y,kind){pickups.push({x,y,vx:rand(-20,20),vy:55,r:13,type:kind,t:0});}
  function killed(e) {
    const x=e.x,y=e.y;
    addScore(e.points);sfx('pop');addParticle(x,y,choose(['#ffd87f','#ffc8e5','#e7bbf7']),11,110);
    dropCount++;killCount++;
    if(!meatUnlocked&&stage===0&&(killCount===3||killCount%5===0))spawnPickup(x,y,'meat');
    else if(Math.random()<.06)spawnPickup(x,y,'fish');
    if(Math.random()<.27)spawnPickup(x,y,Math.random()<.15?'heart':Math.random()<.17?'power':'star');
    specials=clamp(specials+2.8,0,100);
  }
  function hitBullet(b,e) {
    e.hp-=b.damage;
    addParticle(b.x,b.y,weapon==='meat'?'#e89465':'#fff1a2',3,55);
    if(b.splash){
      addParticle(b.x,b.y,'#f6a45c',19,120);
      for(const other of enemies)if(other!==e&&distanceSq(other,b)<b.splash*b.splash)other.hp-=b.damage*.45;
      if(boss&&boss!==e&&distanceSq(boss,b)<(boss.r+b.splash)**2)boss.hp-=b.damage*.38;
    }
    b.life=0;
  }
  function tick(dt){
    elapsed+=dt;music(dt);
    if(scene==='rpg'){rpg.tick(dt,keys);return;}
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)els.toast.classList.remove('show');}
    effectFlash=Math.max(0,effectFlash-dt);quake=Math.max(0,quake-dt*15);specialFX=Math.max(0,specialFX-dt);
    if(scene==='surrender'){
      surrender.t+=dt;stageDelay-=dt;updateParticles(dt);
      if(stageDelay<=0)finish(true);return;
    }
    if(scene==='stageclear'){
      stageDelay-=dt;updateParticles(dt);
      if(stageDelay<=0)nextStage();return;
    }
    if(scene!=='playing'){updateParticles(dt);return;}
    if(fishTime>0){fishTime=Math.max(0,fishTime-dt);if(fishTime===0){if(weapon==='fish')changeWeapon(fishReturn);els.hint.textContent=weaponInfo[weapon].label;showToast('子持ちあゆの時間が終わったよ',1.5);}}
    cheerLife=Math.max(0,cheerLife-dt);
    cheerClock-=dt;
    if(cheerClock<=0){
      // Choose a different encouragement each time; cosmetic only.
      cheerIndex=(cheerIndex+1+Math.floor(Math.random()*(cheerIndex<0?3:2)))%cheers.length;
      cheerLife=1.5;cheerClock=rand(3,6);
    }
    stageClock+=dt;enemyClock-=dt;
    itemClock-=dt;
    if(itemClock<=0){spawnPickup(clamp(player.x,40,W-40),220,boss?'heart':dropCount%2?'power':'heart');dropCount++;itemClock=boss?18:14;}
    specials=clamp(specials+dt*1.1,0,100);
    player.invuln=Math.max(0,player.invuln-dt);
    let vx=0,vy=0;
    if(keys.has('ArrowLeft')||keys.has('KeyA'))vx--;
    if(keys.has('ArrowRight')||keys.has('KeyD'))vx++;
    if(keys.has('ArrowUp')||keys.has('KeyW'))vy--;
    if(keys.has('ArrowDown')||keys.has('KeyS'))vy++;
    const norm=Math.hypot(vx,vy)||1,speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?110:250;
    player.x=clamp(player.x+vx/norm*speed*dt,24,W-24);
    player.y=clamp(player.y+vy/norm*speed*dt,255,H-42);
    player.tilt+=(vx*0.12-player.tilt)*Math.min(1,dt*10);
    player.shot-=dt;
    if(player.shot<=0){shoot();player.shot=weaponInfo[weapon].cooldown/(1+(power-1)*.12);}
    // Chake always follows Nanko and fires little golden feather shots automatically.
    chakeClock-=dt;
    if(chakeClock<=0){
      bullets.push({x:clamp(player.x-49,25,W-25),y:player.y-10,vx:65,vy:-380,r:7,damage:9,type:'chake',life:1.8,pierce:0});
      chakeClock=.52;
    }
    if(!stageBossSeen&&stageClock<(stage===0?47:stage===1?55:57) && enemyClock<=0){
      spawnEnemy();enemyClock=rand(stage===0?.72:.47,stage===0?1.30:.96);
    }
    if(!stageBossSeen&&stageClock>(stage===0?48:stage===1?56:58))summonBoss();

    for(const e of enemies){
      e.t+=dt;e.y+=e.speed*dt;
      e.x=clamp(e.base+Math.sin(e.t*(e.type==='tie'?3:2)+e.seed)*(e.type==='stamp'?35:22),20,W-20);
      e.shot-=dt;
      if(e.shot<=0&&e.y>40&&e.y<H*.7){enemyFire(e.x,e.y);e.shot=rand(2.0,3.4)-stage*.28;}
    }
    if(laser){
      laser.time-=dt;
      if(laser.time<=0)laser=null;
      else if(laser.time<.48&&Math.abs(player.x-laser.x)<22&&player.y>laser.y)damagePlayer();
    }
    if(boss){
      boss.t+=dt;
      boss.y+=(115-boss.y)*Math.min(1,dt*1.1);
      boss.x=W/2+Math.sin(boss.t*(stage===2?1.23:1.5))*104;
      boss.phase=stage===2?(boss.hp<boss.max*.32?2:boss.hp<boss.max*.68?1:0):boss.hp<boss.max*.48?1:0;
      boss.shot-=dt;
      if(boss.shot<=0&&boss.y>95){
        const patterns=stage===2?(boss.phase===0?['fan','ties','single']:boss.phase===1?['fan','ring','flash','ties']:['fan','ties','ring','flash','rain']):(boss.phase===0?['single','fan']:['fan','ring','ties']);
        enemyFire(boss.x,boss.y+36,patterns[boss.pattern%patterns.length],boss.phase);
        if(stage===2&&boss.phase===2&&boss.pattern%3===1)enemyFire(boss.x,boss.y+36,'fan',2);
        boss.pattern++;
        boss.shot=stage===2?Math.max(.62,1.25-boss.phase*.24):(boss.phase===0?1.5:1.2);
        if(boss.phase>0&&boss.pattern%4===0)sfx('warn');
      }
    }
    // Move projectiles and check hits against ordinary enemies and bosses.
    for(const b of bullets){
      if(b.life<=0)continue;
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.spin!=null)b.spin+=dt*8;
      for(const e of enemies){if(e.hp>0&&(b.x-e.x)**2+(b.y-e.y)**2<(e.r+b.r*.65)**2){hitBullet(b,e);break;}}
      if(b.life>0&&boss&&Math.abs(b.x-boss.x)<boss.r+b.r*.55&&Math.abs(b.y-boss.y)<boss.r*.82+b.r*.5)hitBullet(b,boss);
    }
    for(const b of enemyBullets){
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(player.invuln===0&&distanceSq(player,b)<(13+b.r*.6)**2){b.y=H+100;damagePlayer();}
    }
    if(scene!=='playing')return;
    for(const e of enemies){if(e.y>100&&distanceSq(player,e)<(e.r+16)**2)damagePlayer();}
    if(scene!=='playing')return;
    for(const p of pickups){
      p.y+=p.vy*dt;p.x+=p.vx*dt;p.t+=dt;
      if(distanceSq(player,p)<(p.r+19)**2){
        p.y=H+100;sfx('power');
        if(p.type==='meat'){meatUnlocked=true;if(!encounter)progress.write({meat:true});changeWeapon('meat');showToast('うるふぎゃんぐ 解放！',2);}
        else if(p.type==='fish'){if(weapon!=='fish')fishReturn=weapon;fishTime=30;changeWeapon('fish');showToast('レア！ 子持ちあゆ 30秒！',2);}
        else if(p.type==='heart'){player.hp=Math.min(3,player.hp+1);floatText(player.x,player.y-38,'HP +1','#ff78ab');}
        else if(p.type==='power'){power=Math.min(3,power+1);floatText(player.x,player.y-38,'POWER UP!','#ffe77e');}
        else {specials=Math.min(100,specials+15);floatText(player.x,player.y-38,'ゲージ +15%','#ffdf85');}
      }
    }
    // Resolve all deaths, including splash damage and special damage.
    const alive=[];
    for(const e of enemies){if(e.hp<=0)killed(e);else if(e.y<H+45)alive.push(e);}
    enemies=alive;
    if(boss&&boss.hp<=0)bossDefeated();
    bullets=bullets.filter(b=>b.life>0&&b.y>-40&&b.x>-40&&b.x<W+40);
    enemyBullets=enemyBullets.filter(b=>b.y<H+35&&b.y>-120&&b.x>-40&&b.x<W+40);
    pickups=pickups.filter(p=>p.y<H+20);
    updateParticles(dt);
    if(Math.random()<dt*17&&specialFX>0)addParticle(rand(25,W-25),rand(60,H-40),'#ffcbe3',1,30);
    updateButtons();
  }
  function updateParticles(dt){
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.life-=dt;}
    particles=particles.filter(p=>p.life>0);
    for(const t of texts){t.y+=t.vy*dt;t.life-=dt;}
    texts=texts.filter(t=>t.life>0);
  }
  // --- Cute vector character and level art drawn directly on canvas ---
  function rr(x,y,w,h,r,fill,stroke,lw=1){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke();}
  }
  function oval(x,y,rx,ry,color,stroke,width=1,rotation=0){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,TAU);
    if(color){ctx.fillStyle=color;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function line(points,color,width=2){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function label(str,x,y,size=14,color='#fff',align='center',stroke=null){
    ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`900 ${size}px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
    if(stroke){ctx.lineWidth=3;ctx.strokeStyle=stroke;ctx.strokeText(str,x,y);}
    ctx.fillStyle=color;ctx.fillText(str,x,y);
  }
  function star(x,y,outer=10,inner=4,points=5,color='#ffdc77',rotation=0){
    ctx.beginPath();for(let i=0;i<points*2;i++){const a=i*Math.PI/points-Math.PI/2+rotation,r=i%2?inner:outer;if(i===0)ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function cloud(x,y,s=1,alpha=1){
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(s,s);
    oval(-17,1,27,13,'#f7fbff');oval(3,-9,23,19,'#fff');oval(24,0,26,14,'#fff');oval(4,7,49,13,'#fff');
    ctx.restore();
  }
  function softHill(y,color,offset=0){
    ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,y);
    for(let x=0;x<=W;x+=6)ctx.lineTo(x,y+Math.sin(x*.017+offset)*20+Math.sin(x*.038+offset)*10);
    ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function bg(){
    const pal=[['#97dffc','#fff1e8'],['#aad5ff','#fbd7de'],['#a499df','#ffe0b7']][stage];
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const scroll=elapsed*16;
    if(stage===0){
      oval(325,103,38,38,'#ffe6a0');
      for(let i=0;i<7;i++){const x=((i*87+32+Math.sin(i)*20-scroll*.5)%(W+150)+(W+150))%(W+150)-75;cloud(x,105+(i%3)*76,.4+i%2*.15,.72);}
      softHill(404,'#b3eecb',1);softHill(467,'#77d9b1',3);
      for(let i=0;i<9;i++){
        const x=(i*71+30-scroll*.6)%(W+72);const xx=(x+W+72)%(W+72)-30;
        rr(xx,482,7,88,3,'#b89086');oval(xx+3,478,27,29,i%2?'#f5b4cf':'#fcdae5');oval(xx-8,489,15,15,'#fff0f1aa');
      }
      ctx.fillStyle='#70c3a8';ctx.fillRect(0,572,W,88);
      for(let i=0;i<20;i++){const x=(i*29+scroll*1.4)%W,y=585+(i*41)%73;star(x,y,4,2,5,i%3?'#dff6a3':'#f9c4ec');}
    }else if(stage===1){
      oval(320,95,44,44,'#fff3c4');
      for(let i=0;i<5;i++)cloud((i*130-scroll*.38)%(W+120)-65,100+i%3*40,.48,.6);
      for(let i=0;i<7;i++){
        const x=i*78-65-((scroll*.7)%78),h=250+(i%3)*40;
        rr(x,H-h,70,h+30,3,i%2?'#99a7cf':'#9bd6da');
        for(let k=0;k<5;k++)for(let row=0;row<7;row++)rr(x+9+k*12,H-h+13+row*32,6,16,2,(k+row+i)%3?'#f5e6b8':'#fff4d8');
      }
      ctx.fillStyle='#a39bbf';ctx.fillRect(0,H-82,W,82);
      for(let i=0;i<7;i++)rr((i*80+scroll*1.5)%(W+80)-38,H-45,42,12,2,'#e5d5d6');
    }else{
      const sunset=ctx.createLinearGradient(0,0,0,H);sunset.addColorStop(0,'#846ab4');sunset.addColorStop(1,'#ffd6af');ctx.fillStyle=sunset;ctx.fillRect(34,40,W-68,H-40);
      oval(295,155,44,44,'#ffdfb1');
      for(let i=0;i<7;i++){
        const x=i*63-20-scroll*.1%63;
        rr(x,320+i%3*30,63,340,2,'#6d638e');
        for(let k=0;k<4;k++)for(let row=0;row<7;row++)rr(x+9+k*14,340+i%3*30+row*34,8,15,1,'#eebcbd');
      }
      ctx.fillStyle='#e7b9a9';ctx.fillRect(0,510,W,150);
      // Floor tiles and the tall windows of Hashimoto headquarters.
      line([[25,0],[25,H]],'#fbe5d7',14);line([[365,0],[365,H]],'#fbe5d7',14);
      line([[25,295],[365,295]],'#fbe5d7',8);
      for(let i=0;i<7;i++)line([[0,505+i*25],[W,505+i*25]],'#d6a69e66',2);
    }
    // Glittering atmosphere shared by all three locations.
    for(let i=0;i<14;i++){
      const x=(i*53+Math.sin(i)*27+scroll*.25)%W,y=(i*97+elapsed*5)%H;
      oval(x,y,1.4+Math.sin(elapsed*2+i)*.7,1.4,'#ffffffb0');
    }
  }
  function drawNanko(x,y,s=1,angry=false,big=false){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(player.tilt*.4);
    oval(0,30,25,7,'#50467d44');
    // brown checked skirt / legs
    rr(-20,12,40,24,5,'#bca48d','#876b73',1.5);
    for(let xx=-16;xx<=18;xx+=10)line([[xx,14],[xx,33]],'#775e6680',1.2);
    for(let yy=18;yy<=30;yy+=8)line([[-19,yy],[19,yy]],'#775e6680',1.2);
    rr(-16,31,11,9,3,'#383449');rr(5,31,11,9,3,'#383449');
    // arms and cardigan
    oval(-24,4,9,17,'#4c4b58');oval(24,4,9,17,'#4c4b58');
    oval(-26,16,6,6,'#ffe0c7');oval(26,16,6,6,'#ffe0c7');
    rr(-23,-11,46,35,11,'#474651','#302f43',1.5);
    line([[0,-10],[0,23]],'#aaa1ac',1.5);
    for(const yy of [-4,7,18])oval(0,yy,2.7,2.7,'#fff6db');
    // Hair + bun/ponytail (reference photo: brown hair tied back)
    oval(17,-27,12,24,'#5b3b39');oval(-1,-32,27,31,'#68423c','#4f3132',1.5);
    oval(0,-29,23,25,'#ffdec7','#c48b7f',1);
    oval(-15,-46,13,9,'#704744');oval(6,-50,17,8,'#704744');
    oval(23,-22,6,15,'#65413b');
    // eyes, rosy cheeks, expression
    oval(-9,-30,2.9,3.5,'#42323d');oval(9,-30,2.9,3.5,'#42323d');
    oval(-16,-22,6,3,'#ffa5aa88');oval(16,-22,6,3,'#ffa5aa88');
    if(angry){line([[-14,-38],[-5,-34]],'#7c3547',2.4);line([[5,-34],[14,-38]],'#7c3547',2.4);oval(0,-18,5,6,'#a53d60');}
    else {ctx.beginPath();ctx.arc(0,-21,7,0,Math.PI);ctx.strokeStyle='#b75a64';ctx.lineWidth=2.5;ctx.stroke();}
    oval(-10,-32,1.1,1.2,'#fff');oval(8,-32,1.1,1.2,'#fff');
    // decorative little bow for visibility
    if(big){star(28,-46,9,4,5,'#ffcb6a');}
    ctx.restore();
  }
  function drawChake(x,y,s=1){
    ctx.save();ctx.translate(x,y+Math.sin(elapsed*8)*3);ctx.scale(s,s);
    oval(0,17,20,5,'#453b6440');
    const wingFlap=Math.sin(elapsed*18)*8;
    oval(-23,0,11,18,'#828991',null,1,-.5-wingFlap*.015);
    oval(23,0,11,18,'#858b92',null,1,.5+wingFlap*.015);
    oval(0,3,23,25,'#a3a6a9','#626d76',1.5);
    oval(0,-12,22,20,'#fff078');
    // gray crest at the top and orange cheek patches
    line([[-3,-28],[-8,-46],[-1,-37],[1,-51],[7,-33]],'#73767e',3.3);
    oval(-16,-11,8,9,'#f6a451');oval(16,-11,8,9,'#f6a451');
    oval(-10,-18,3.2,4.2,'#393c48');oval(10,-18,3.2,4.2,'#393c48');
    ctx.beginPath();ctx.moveTo(-5,-10);ctx.lineTo(0,-5);ctx.lineTo(5,-10);ctx.closePath();ctx.fillStyle='#85817e';ctx.fill();
    oval(-6,-19,1,1.1,'#fff');oval(9,-19,1,1.1,'#fff');
    line([[-9,27],[-9,32]],'#605b64',2);line([[9,27],[9,32]],'#605b64',2);
    ctx.restore();
  }
  function drawCheer(x,y){
    if(cheerLife<=0||scene!=='playing'||specialFX>0)return;
    // Large, high-contrast lettering stays inside even the narrowest playfield.
    const w=184,h=42,bx=clamp(x-w/2,8,W-w-8),by=y-96;
    const tip=clamp(x,bx+14,bx+w-14);
    ctx.save();ctx.globalAlpha=Math.min(1,cheerLife/.2,(1.5-cheerLife)/.15);
    rr(bx,by+3,w,h,17,'#70465d30');
    rr(bx,by,w,h,17,'#ffffff','#ed9aaf',2);
    ctx.beginPath();ctx.moveTo(tip-7,by+h-1);ctx.lineTo(x,by+h+12);ctx.lineTo(tip+7,by+h-1);
    ctx.fillStyle='#ffffff';ctx.fill();
    line([[tip-7,by+h],[x,by+h+12],[tip+7,by+h]],'#ed9aaf',2);
    label(cheers[cheerIndex],bx+w/2,by+27,20,'#75425c');
    ctx.restore();
  }
  function drawHashimoto(x,y,s=1){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    const fl=Math.sin(elapsed*4)*3;
    oval(0,54,41,9,'#49374b55');
    rr(-24,31,20,29,6,'#31374c');rr(6,31,20,29,6,'#31374c');
    rr(-41,-12,82,60,17,'#74805b','#404f4e',2.3);
    oval(-42,14,12,27,'#7e8a67');oval(42,14,12,27,'#7e8a67');
    oval(-44,38+fl,8,8,'#e5b7a7');oval(44,38-fl,8,8,'#e5b7a7');
    rr(-21,-6,42,48,6,'#fbfaf5');
    // Open jacket flaps, photo's olive jacket with white shirt.
    ctx.beginPath();ctx.moveTo(-39,-15);ctx.lineTo(-9,-13);ctx.lineTo(-21,23);ctx.lineTo(-11,47);ctx.lineTo(-38,44);ctx.closePath();ctx.fillStyle='#6e7b58';ctx.fill();
    ctx.beginPath();ctx.moveTo(39,-15);ctx.lineTo(9,-13);ctx.lineTo(21,23);ctx.lineTo(11,47);ctx.lineTo(38,44);ctx.closePath();ctx.fillStyle='#71805b';ctx.fill();
    // neck / face / hair / rectangular black glasses
    rr(-10,-28,20,19,6,'#e5b2a0');
    oval(0,-46,32,33,'#ecc1aa','#986e70',1.2);
    oval(0,-71,33,14,'#30303a');rr(-30,-73,60,14,7,'#30303a');
    oval(-32,-47,6,9,'#e9baa7');oval(32,-47,6,9,'#e9baa7');
    rr(-25,-55,23,18,5,'#a8b7c840','#242632',3.6);
    rr(3,-55,23,18,5,'#a8b7c840','#242632',3.6);
    line([[-2,-48],[4,-48]],'#242632',3);
    oval(-13,-45,2,2.1,'#30313e');oval(14,-45,2,2.1,'#30313e');
    line([[-4,-28],[7,-28]],'#915f63',2.3);
    if(boss?.phase===2){star(35,-73,9,4,5,'#ffe27c');}
    ctx.restore();
  }
  function drawEnemy(e){
    ctx.save();ctx.translate(e.x,e.y);const bob=Math.sin(e.t*6)*2;ctx.translate(0,bob);
    if(e.type==='paper'){
      ctx.rotate(Math.sin(e.t*3)*.18);
      rr(-17,-21,34,40,4,'#fff8eb','#8d84b6',2);
      for(let i=0;i<3;i++)rr(-10,-8+i*8,20,3,2,'#b7c0d3');
      oval(-6,7,2,2,'#43366a');oval(6,7,2,2,'#43366a');
      line([[-3,13],[3,13]],'#9c6075',2);
    }else if(e.type==='stamp'){
      rr(-13,-20,26,11,5,'#9e6b77');rr(-19,-11,38,24,6,'#e996a9','#91586d',2);rr(-19,9,38,10,2,'#ba6677');
      oval(-7,0,2,2,'#6b415d');oval(7,0,2,2,'#6b415d');
    }else if(e.type==='tie'){
      oval(0,-15,16,15,'#f5d2b8');oval(0,-26,17,7,'#464256');
      rr(-19,-2,38,36,9,'#626f92');
      ctx.beginPath();ctx.moveTo(-4,-1);ctx.lineTo(4,-1);ctx.lineTo(9,21);ctx.lineTo(0,28);ctx.lineTo(-8,21);ctx.closePath();ctx.fillStyle='#ea6c8a';ctx.fill();
      oval(-6,-14,2,2,'#383444');oval(6,-14,2,2,'#383444');
    }else{
      ctx.rotate(Math.sin(e.t*2)*.1);rr(-21,-13,42,27,5,'#ffecbd','#ca8d91',2);rr(-16,-7,19,4,2,'#e698aa');
      oval(11,-3,3,3,'#654464');oval(12,5,3,3,'#654464');
    }
    ctx.restore();
  }
  function drawBoss(b){
    ctx.save();ctx.globalAlpha=.23;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(b.x,b.y,58+i*13+Math.sin(elapsed*3+i)*4,0,TAU);ctx.strokeStyle='#fff0c3';ctx.lineWidth=3;ctx.stroke();}
    ctx.restore();
    if(b.type==='hashimoto')drawHashimoto(b.x,b.y+10,.96);
    else if(b.type==='printer'){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.sin(elapsed*2)*.04);
      rr(-43,-34,86,69,12,'#f7dae9','#8d8bbb',3);rr(-27,-51,54,31,4,'#fff8f7','#baadc9',2);
      rr(-35,-13,70,37,7,'#b1b5dc');rr(-22,17,44,25,4,'#faf4f6');
      oval(-17,-1,4,4,'#404467');oval(17,-1,4,4,'#404467');
      line([[-6,10],[6,10]],'#ab6285',3);ctx.restore();
    }else{
      ctx.save();ctx.translate(b.x,b.y);rr(-42,-45,84,90,15,'#566783','#39455d',3);
      rr(-30,-33,60,48,7,'#eaf2fb');
      for(let i=0;i<4;i++)rr(-24,-26+i*10,48,3,2,'#a2b4cd');
      oval(-15,30,4,4,'#fdf1d6');oval(15,30,4,4,'#fdf1d6');
      rr(-17,37,34,12,4,'#eeb5c6');ctx.restore();
    }
  }
  function drawShot(b){
    ctx.save();ctx.translate(b.x,b.y);
    if(b.type==='chake'){
      ctx.rotate(.42+Math.sin(elapsed*9)*.15);oval(0,0,5,12,'#ffeb72','#e7a954',1.5);line([[0,7],[0,-7]],'#fffef0',1.2);
    }else if(b.type==='coin'){
      oval(0,0,8,10,'#ffda65','#b38431',2);label('¥',0,0,12,'#aa7429');
    }else if(b.type==='money'){
      ctx.rotate(Math.sin(elapsed*19+b.x)*.19);
      rr(-9,-13,18,25,3,'#97d7a0','#447e67',1.8);
      rr(-6,-9,12,17,2,null,'#eafed9',1.5);
      label('¥',0,0,13,'#317b61');
    }else if(b.type==='meat'){
      ctx.rotate(elapsed*4);oval(0,0,15,13,'#e98255','#af4c43',2,.4);
      oval(-3,-3,11,7,'#ffb374');
      if(b.variant==='bone'){oval(17,0,10,4,'#fff6e0');oval(24,-3,4,4,'#fff6e0');oval(24,3,4,4,'#fff6e0');}
      else for(let k=-1;k<=1;k++)line([[-7+k*5,-6],[-3+k*5,7]],'#a04d36',2);
      oval(-9,-8,3,3,'#fff8e5');
    }else{
      ctx.rotate(b.spin||0);
      ctx.beginPath();ctx.moveTo(-10,5);ctx.lineTo(-19,12);ctx.lineTo(-18,-4);ctx.lineTo(-10,1);ctx.closePath();ctx.fillStyle='#6fb5d4';ctx.fill();
      oval(0,0,b.variant==='bream'?13:18,b.variant==='bream'?10:6,b.variant==='bream'?'#ffabc0':'#a3d8ed','#497f9e',1.6);
      oval(8,-2,2,2,'#36576d');line([[0,-6],[3,3]],'#719cb7',1.4);
    }
    ctx.restore();
  }
  function drawEnemyShot(b){
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(elapsed*2);
    if(b.type==='tie'){
      ctx.beginPath();ctx.moveTo(-4,-15);ctx.lineTo(4,-15);ctx.lineTo(8,8);ctx.lineTo(0,16);ctx.lineTo(-8,8);ctx.closePath();ctx.fillStyle='#9b4aaf';ctx.fill();line([[-4,-5],[5,0]],'#ffe8fb',2);
    }else if(b.type==='card'){rr(-8,-5,16,10,2,'#fff8ec','#a579bf',1.6);line([[-5,-1],[4,-1]],'#c087a7',1.5);}
    else if(b.type==='stamp'){rr(-7,-7,14,14,3,'#f48e9e','#c13a73',2);label('印',0,1,8,'#fff');}
    else{rr(-7,-8,14,16,2,'#ff96b4','#b74c83',2);line([[-3,-1],[4,-1]],'#fff3f8',1.5);}
    ctx.restore();
  }
  function drawPickup(p){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(p.t*3)*.18);
    oval(0,0,15,15,'#ffffffc8');
    if(p.type==='meat'||p.type==='fish'){oval(0,0,19,19,'#fff3a4','#df8c6b',2);label(p.type==='meat'?'肉':'魚',0,1,20,'#75425c');}
    else if(p.type==='heart')label('♥',0,1,20,'#f16b9b');
    else if(p.type==='power')star(0,0,12,5,5,'#ffc34e');
    else label('✦',0,0,21,'#9564c2');
    ctx.restore();
  }
  function hud(){
    rr(9,9,W-18,63,15,'#332c68c9','#ffffff9b',1.5);
    label(`STAGE ${stage+1}`,21,25,11,'#fce6fb','left');
    label(stageNames[stage],91,25,11,'#fff4fc','left');
    label('SCORE',W-17,23,10,'#ffec96','right');
    label(score.toLocaleString(),W-17,43,17,'#fff7ff','right');
    for(let i=0;i<3;i++)label(i<player.hp?'♥':'♡',24+i*24,54,22,i<player.hp?'#ff8fae':'#ffffff77');
    rr(105,49,96,9,5,'#241a4b');rr(105,49,96*specials/100,9,5,'#ffcf70');
    label('必',94,54,10,'#ffdf97');label(`POWER ${power}`,214,54,9,'#ffe7a0','left');
    // Stage time indicator when no boss is on screen.
    if(boss){
      rr(36,83,W-72,18,9,'#463468d6','#f8e6ff',1);
      rr(39,86,(W-78)*clamp(boss.hp/boss.max,0,1),12,5,boss.phase===2?'#ff7588':'#ffbd65');
      label(boss.type==='hashimoto'?`はしもと ｜ 第${boss.phase+1}形態`:'中ボス',W/2,92,11,'#fff','center','#63395b');
    }else if(scene==='playing'){
      rr(84,80,W-168,6,3,'#593f7d66');
      rr(84,80,(W-168)*clamp(stageClock/(stage===0?48:stage===1?56:58),0,1),6,3,'#ffe9a1');
    }
  }
  function render(){
    if(scene==='rpg'||(scene==='paused'&&resumeScene==='rpg')){rpg.render();return;}
    ctx.save();
    if(quake>0)ctx.translate(rand(-quake,quake),rand(-quake,quake));
    bg();
    // Fading background foes, enemy and player projectiles.
    for(const p of pickups)drawPickup(p);
    for(const e of enemies)drawEnemy(e);
    if(boss)drawBoss(boss);
    if(laser){
      ctx.save();ctx.fillStyle=laser.time>.48?'#fff1a44d':'#fff6cae8';ctx.fillRect(laser.x-20,laser.y,40,H);
      line([[laser.x,laser.y],[laser.x,H]],'#ffdd67',laser.time>.48?2:10);ctx.restore();
    }
    if(surrender){
      drawHashimoto(surrender.x,180+Math.sin(surrender.t*8)*5,1.5);
      line([[surrender.x-55,185],[surrender.x-80,130]],'#74805b',18);
      line([[surrender.x+55,185],[surrender.x+80,130]],'#74805b',18);
      label('まいった〜！',W/2,300,30,'#fff','center','#70465d');
    }
    for(const b of enemyBullets)drawEnemyShot(b);
    for(const b of bullets)drawShot(b);
    // Chake attacks without ever getting hurt.
    if(['playing','stageclear','surrender','paused'].includes(scene)){
      const cx=clamp(player.x-49,26,W-23),cy=player.y+15;
      drawChake(cx,cy,.72);
      if(player.invuln<=0||Math.floor(elapsed*12)%2===0)drawNanko(player.x,player.y,1,specialFX>0);
      if(specialFX>0){
        ctx.save();ctx.globalAlpha=clamp(specialFX*.35,0,.5);
        const r=(2.26-specialFX)*400;
        ctx.beginPath();ctx.arc(player.x,player.y,r,0,TAU);ctx.strokeStyle='#fff0ba';ctx.lineWidth=22;ctx.stroke();
        ctx.restore();
        if(specialFX>1.35){
          ctx.save();ctx.translate(W/2,320);const scale=4.5+(specialFX-1.35)*.48;
          drawNanko(0,110,scale,true,true);
          ctx.restore();
          label('むかちゅくーーー！！',W/2,402,26,'#fff','center','#dc467f');
        }
      }
    }
    drawCheer(clamp(player.x-49,26,W-23),player.y+15);
    for(const p of particles){ctx.save();ctx.globalAlpha=clamp(p.life/.42,0,1);oval(p.x,p.y,p.r,p.r,p.color);ctx.restore();}
    for(const t of texts){ctx.save();ctx.globalAlpha=t.life;label(t.text,t.x,t.y,14,t.color,'center','#513168');ctx.restore();}
    if(effectFlash>0){ctx.fillStyle=`rgba(255,248,233,${Math.min(.45,effectFlash*.9)})`;ctx.fillRect(0,0,W,H);}
    hud();
    if(scene==='title'){
      // Character preview lives under the title overlay.
      drawChake(283,482,1.25);drawNanko(128,482,1.65);
      drawHashimoto(198,228,.67);
    }
    ctx.restore();
  }
  function frame(ms){
    const dt=lastTime?Math.min((ms-lastTime)/1000,.034):.016;lastTime=ms;
    if(scene!=='paused')tick(dt);
    render();requestAnimationFrame(frame);
  }

  els.main.addEventListener('click',()=>{
    if(scene==='paused')togglePause();else begin();
  });
  // Prevent ghost pause taps after iPhone swipe gestures. Touch users must
  // deliberately hold the top pause button (0.75 s); desktop keeps single-click.
  els.pause.addEventListener('click',e=>{
    if(!hasTouch)togglePause();
    else e.preventDefault();
  });
  if(hasTouch){
    let pauseHold=null;
    const cancelPauseHold=()=>{
      if(pauseHold){clearTimeout(pauseHold.timer);pauseHold=null;}
    };
    els.pause.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch')return;
      cancelPauseHold();
      const hold={id:e.pointerId,x:e.clientX,y:e.clientY,timer:null};
      hold.timer=setTimeout(()=>{
        if(pauseHold!==hold)return;
        pauseHold=null;
        togglePause();
      },750);
      pauseHold=hold;
    });
    els.pause.addEventListener('pointermove',e=>{
      if(pauseHold&&pauseHold.id===e.pointerId&&Math.hypot(e.clientX-pauseHold.x,e.clientY-pauseHold.y)>12)
        cancelPauseHold();
    });
    for(const type of ['pointerup','pointercancel','pointerleave','lostpointercapture'])
      els.pause.addEventListener(type,cancelPauseHold);
    els.pause.setAttribute('aria-label','一時停止（長押し）');
    els.pause.title='一時停止は長押し';
  }
  // Prevent the in-app browser from interpreting game swipes as page gestures,
  // scrolls, long presses, or clicks outside the canvas.
  for(const type of ['touchstart','touchmove']){
    canvas.addEventListener(type,e=>{if(e.cancelable)e.preventDefault();},{passive:false});
  }
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  // A visible build identifier makes stale cached JavaScript easy to diagnose.
  const versionTarget=document.querySelector('.install-tip');
  if(versionTarget){
    const version=document.createElement('span');
    version.textContent=' · 第2章対応 v1';
    versionTarget.appendChild(version);
  }
  els.sound.addEventListener('click',()=>{
    isMuted=!isMuted;els.sound.textContent=isMuted?'🔇':'🔊';els.sound.setAttribute('aria-label',isMuted?'音をオン':'音をオフ');
    try{localStorage.setItem('nanko_muted',String(isMuted));}catch(_){}
    if(!isMuted)ensureAudio();
    else if('speechSynthesis'in window)try{speechSynthesis.cancel();}catch(_){}
  });
  els.weapons.forEach(b=>b.addEventListener('click',()=>{ensureAudio();changeWeapon(b.dataset.weapon);}));
  els.special.addEventListener('click',special);
  let touchOrigin=null;
  const movePointer=ev=>{
    const box=canvas.getBoundingClientRect();
    const x=(ev.clientX-box.left)*W/box.width;
    const y=(ev.clientY-box.top)*H/box.height;
    if(hasTouch&&touchOrigin){
      player.x=clamp(touchOrigin.px+x-touchOrigin.x,24,W-24);
      player.y=clamp(touchOrigin.py+y-touchOrigin.y,255,H-42);
    }else{player.x=clamp(x,24,W-24);player.y=clamp(y,255,H-42);}
  };
  canvas.addEventListener('pointerdown',e=>{
    if(scene==='rpg'){rpg.target(e,canvas);ensureAudio();e.preventDefault();return;}
    if(scene!=='playing'||pointerActive)return;
    const box=canvas.getBoundingClientRect();touchOrigin={x:(e.clientX-box.left)*W/box.width,y:(e.clientY-box.top)*H/box.height,px:player.x,py:player.y};
    pointerActive=true;pointerId=e.pointerId;
    try{canvas.setPointerCapture(e.pointerId);}catch(_){}
    movePointer(e);ensureAudio();e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{if(scene==='rpg'&&e.buttons){rpg.target(e,canvas);e.preventDefault();return;}if(pointerActive&&e.pointerId===pointerId&&scene==='playing'){movePointer(e);e.preventDefault();}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===pointerId){pointerActive=false;pointerId=null;}});
  window.addEventListener('keydown',e=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(e.repeat&&['KeyZ','KeyX','KeyP','Digit1','Digit2','Digit3'].includes(e.code))return;
    keys.add(e.code);
    if(scene==='rpg'&&(e.code==='Space'||e.code==='Enter')&&!e.repeat)rpg.interact();
    if(e.code==='Digit1')changeWeapon('money');
    if(e.code==='Digit2')changeWeapon('meat');
    if(e.code==='Digit3')changeWeapon('fish');
    if(e.code==='KeyZ'||e.code==='KeyX')special();
    if(e.code==='KeyP')togglePause();
    if(e.code==='Enter'&&['title','paused','won','lost'].includes(scene)){if(scene==='paused')togglePause();else begin();}
    if(['KeyZ','KeyX','Enter'].includes(e.code))ensureAudio();
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  // On iOS an in-app browser can fire blur/visibility events while the player
  // is still interacting with the game. Never convert those events into a
  // manual pause: requestAnimationFrame naturally stops in a hidden tab, and
  // frame() clamps elapsed time when the page becomes visible again.
  // Only the on-screen pause button or P key should show "ひとやすみ".
  function clearInterruptedInput() {
    keys.clear();
    if(rpg)rpg.stop();
    pointerActive=false;
    pointerId=null;
    touchOrigin=null;
  }
  window.addEventListener('blur',clearInterruptedInput);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearInterruptedInput();
  });

  // Exposed read-only diagnostics let automated browser tests verify real gameplay.
  Object.defineProperty(window,'nankoStatus',{get:()=>({scene,stage,meatUnlocked,fishTime,encounter,rpg:rpg?.status(),score,hp:player.hp,weapon,shots:bullets.length,enemies:enemies.length,charge:Math.round(specials),boss:boss?.type||null,bossHP:boss?.hp||0,bossPhase:boss?.phase??null,player:{x:player.x,y:player.y},power,stageClock,laser:laser?{...laser}:null,enemyShots:enemyBullets.map(b=>({...b})),foes:enemies.map(e=>({x:e.x,y:e.y,r:e.r})),items:pickups.map(p=>({...p})),bossX:boss?.x??null})});
  rpg=window.createNankoRPG({ctx,W,H,rr,label,oval,line,drawNanko,drawChake,progress,sfx,startEncounter});
  document.getElementById('talkBtn').addEventListener('click',()=>{if(scene==='rpg')rpg.interact();});
  document.getElementById('rpgSaveBtn').addEventListener('click',()=>{if(scene==='rpg'){rpg.save();rpg.say('ちゃけ','ここまで覚えたよ！ 次もつづきから出勤しよう。');}});
  document.getElementById('newBtn').addEventListener('click',()=>{
    document.getElementById('newConfirm').showModal();
  });
  document.getElementById('cancelNew').addEventListener('click',()=>document.getElementById('newConfirm').close());
  document.getElementById('confirmNew').addEventListener('click',()=>{document.getElementById('newConfirm').close();freshStart();});
  if(progress.get().chapter==='rpg')els.main.textContent='🏢 第2章のつづきから';
  else if(progress.get().stage>0)els.main.textContent=`🌸 ステージ${progress.get().stage+1}のつづきから`;
  document.getElementById('newBtn').hidden=false;
  els.sound.textContent=isMuted?'🔇':'🔊';
  els.extra.textContent=`全３ステージ · ベスト ${best.toLocaleString()} 点`;
  updateButtons();
  requestAnimationFrame(frame);
})();
