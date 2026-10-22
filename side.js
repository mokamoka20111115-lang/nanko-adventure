/* Chapter 3. Independent horizontal engine; shares only drawing, sound and UI. */
window.createNankoSide=function(api){
 'use strict';
 const {ctx,W,H,rr,label,oval,line,drawNanko,drawChake,drawShot,progress,sfx,speakSpecial,notify,finish}=api;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const names=['銀行への道','銀行振込大作戦','浜木綿へ急げ！'];
 const cheers=['頑張れなんこ！','いけいけなんこ！','いっけーー！'];
 let area=0,time=0,total=0,score=0,p,weapon='money',fish=0,previous='money',power=1,charge=0,buffs={},shots=[],foes=[],enemyShots=[],items=[],obstacles=[],boss=null,warning=null,beam=null;
 let spawn=1,shot=0,birdShot=0,itemClock=8,obstacleClock=7,cheerClock=3,cheerLife=0,cheerIndex=0,transition=0,ending=0,fx=0,kills=0,origin=null;
 function save(){const old=progress.get().side;const ok=progress.write({chapter:'side',side:{...old,area,power,score}});if(!ok)notify('保存できません。この画面では遊べます',3);}
 function enter(replay=false){
  const d=progress.get();if(!d.rpgUnlocked||!d.rpg.arrived)return false;
  area=replay?0:d.side.area;power=replay?Math.max(1,d.power):d.side.power;score=replay?0:d.side.score;
  total=0;weapon='money';fish=0;previous='money';charge=35;buffs={feather:0,cheek:0,awake:0};ending=0;fx=0;kills=0;loadArea();save();return true;
 }
 function loadArea(){time=0;p={x:82,y:355,hp:5,invuln:2};shots=[];foes=[];enemyShots=[];items=[];obstacles=[];boss=null;warning=null;beam=null;spawn=1;shot=0;birdShot=.3;itemClock=8;obstacleClock=7;transition=0;origin=null;
  notify(area===0?'銀行に振り込みに行かなきゃ！\n終わったらエビラーメンだー！':area===1?'架空のATM登場！\nゲーム内の振り込みだよ': '浜木綿へ急げ！\n幻のエビラーメンまであと少し！',3);
  if(area===1)summon();
 }
 function summon(){foes=[];enemyShots=[];obstacles=[];const hp=area===1?1800:3000;boss={x:310,y:330,r:43,hp,max:hp,t:0,clock:2.2,phase:0,pattern:0};sfx('warn');}
 function change(w){if(w==='meat'&&!progress.get().meat||w==='fish'&&fish<=0)return;if(!['money','meat','fish'].includes(w))return;if(fish>0&&w!=='fish')previous=w;weapon=w;shot=Math.min(shot,.08);}
 function hurt(){if(p.invuln>0||transition||ending)return;p.hp--;p.invuln=2;sfx('hit');if(p.hp<=0){stop();finish(false,score);}}
 function special(){if(charge<100||transition||ending)return;charge=0;fx=2.2;enemyShots=[];beam=null;warning=null;p.invuln=2.5;for(const e of foes)e.hp-=150;if(boss)boss.hp-=320;speakSpecial();sfx('boom');}
 function pickup(type,x=350,y=rnd(160,570)){items.push({x,y,type,r:15});}
 function collect(type){
  sfx('power');if(type==='fish'){if(weapon!=='fish')previous=weapon;fish=30;change('fish');notify('子持ちあゆ！ 30秒の3方向攻撃',2);}
  else if(type in buffs){buffs[type]=type==='awake'?20:45;notify({feather:'ちゃけの羽根！ 3方向・45秒',cheek:'オレンジほっぺ！ 威力2倍・45秒',awake:'ちゃけ覚醒！ 追尾連射・20秒'}[type],2);}
  else if(type==='heart')p.hp=Math.min(5,p.hp+1);
  else if(type==='power')power=Math.min(3,power+1);
  else charge=Math.min(100,charge+18);
 }
 function enemy(){const type=['drone','tie','coin','bill'][Math.floor(Math.random()*4)];foes.push({x:420,y:rnd(150,560),base:0,t:0,type,hp:type==='tie'?48:36,r:18,shot:rnd(1,2),speed:area===2?62:47});foes.at(-1).base=foes.at(-1).y;}
 function fire(pattern,phase=0){
  const x=boss?boss.x-30:365,y=boss?boss.y:p.y;
  if(pattern==='beam'){beam={y:p.y,time:1.6};return;}
  const count=pattern==='ring'?10:pattern==='pincer'?6:pattern==='fast'?4:3;
  for(let i=0;i<count;i++){
   let bx=x,by=y,a=Math.PI+(i-(count-1)/2)*.23,sp=130+phase*10;
   if(pattern==='ring'){a=i*Math.PI*2/count+total*.4;sp=103;}
   if(pattern==='pincer'){bx=200+Math.floor(i/2)*65;by=i%2?595:115;a=i%2?-2.1:2.1;sp=110;}
   if(pattern==='fast'){by=155+i*120;sp=210;a=Math.PI;}
   enemyShots.push({x:bx,y:by,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:7,t:0,motion:pattern});
  }
 }
 function attack(){
  if(weapon==='money'){
   const coin=Math.random()<.24;for(const a of power===3?[-.13,0,.13]:power===2?[-.08,.08]:[0])shots.push({x:p.x+22,y:p.y,vx:440,vy:Math.sin(a)*440+(coin?rnd(-75,75):0),r:7,damage:power===1?8:power===2?9:10,type:coin?'coin':'money',life:1.5,bounce:coin?2:0});shot=.16/(1+(power-1)*.12);
  }else if(weapon==='meat'){const giant=Math.random()<.18;shots.push({x:p.x+22,y:p.y,vx:300,vy:0,r:giant?22:15,damage:48*power*(giant?1.4:1),type:'meat',variant:Math.random()<.5?'bone':'steak',giant,splash:giant?85:60,life:1.6});shot=.58;
  }else{for(const a of [-.28,0,.28])shots.push({x:p.x+22,y:p.y,vx:350*Math.cos(a),vy:350*Math.sin(a),r:11,damage:18*power,type:'fish',spin:total,life:1.6,pierce:Math.random()<.35?2:0});shot=.38;}
  sfx(weapon);
 }
 function tick(dt,keys){
  total+=dt;fx=Math.max(0,fx-dt);
  if(ending){ending+=dt;if(ending>5){ending=0;finish(true,score);}return;}
  if(transition){transition-=dt;if(transition<=0){area++;loadArea();save();}return;}
  time+=dt;p.invuln=Math.max(0,p.invuln-dt);charge=Math.min(100,charge+dt*1.4);
  if(fish>0){fish=Math.max(0,fish-dt);if(!fish&&weapon==='fish')weapon=previous;}
  for(const k in buffs)buffs[k]=Math.max(0,buffs[k]-dt);
  let dx=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')),dy=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
  const n=Math.hypot(dx,dy)||1;p.x=clamp(p.x+dx/n*230*dt,28,220);p.y=clamp(p.y+dy/n*230*dt,135,585);
  cheerLife=Math.max(0,cheerLife-dt);cheerClock-=dt;if(cheerClock<=0){cheerClock=rnd(3,6);cheerLife=1.5;cheerIndex=(cheerIndex+1+Math.floor(Math.random()*2))%3;}
  shot-=dt;if(shot<=0)attack();birdShot-=dt;if(birdShot<=0){for(const a of buffs.feather>0?[-.27,0,.27]:[0])shots.push({x:p.x-17,y:p.y+30,vx:360*Math.cos(a),vy:360*Math.sin(a),r:6,damage:(buffs.awake>0?11:9)*(buffs.cheek>0?2:1),type:'chake',life:1.7,homing:buffs.awake>0});birdShot=buffs.awake>0?.24:.52;}
  itemClock-=dt;if(itemClock<=0){pickup(p.hp<4?'heart':'power',350,p.y);itemClock=12;}
  if(!boss){spawn-=dt;if(spawn<=0){enemy();spawn=area===2?.9:1.2;}obstacleClock-=dt;if(obstacleClock<=0){obstacles.push({x:425,y:Math.random()<.5?155:540,w:28,h:65});obstacleClock=8;notify('注意！ 工事コーンをよけよう',1.5);}}
  if(area===0&&time>32){transition=2;foes=[];enemyShots=[];obstacles=[];progress.write({chapter:'side',side:{...progress.get().side,area:1,power,score}});notify('銀行に到着！',2);return;}
  if(area===2&&!boss&&time>36)summon();
  for(const e of foes){e.t+=dt;e.x-=e.speed*dt;e.y=e.base+Math.sin(e.t*2.4)*30;e.shot-=dt;if(e.shot<=0&&e.x>240){const a=Math.atan2(p.y-e.y,p.x-e.x);enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*125,vy:Math.sin(a)*125,r:7,t:0,motion:area===2?'wave':'straight'});e.shot=2.7;}if(dist(e,p)<30)hurt();}
  if(boss){boss.t+=dt;boss.y=340+Math.sin(boss.t*.8)*140;boss.phase=boss.hp<boss.max*.25?2:boss.hp<boss.max*.6?1:0;boss.clock-=dt;
   if(boss.clock<=0&&!warning&&!beam){const patterns=area===1?['fan','ring','beam','homing']:['wave','fast','feint','pincer','beam','homing'];warning={pattern:patterns[boss.pattern++%patterns.length],time:1.2};boss.clock=3.8-boss.phase*.45;sfx('warn');}
  }
  if(warning){warning.time-=dt;if(warning.time<=0){fire(warning.pattern,boss?.phase||0);if(boss?.phase===2&&warning.pattern!=='beam'&&warning.pattern!=='fast')fire('fan',0);warning=null;}}
  if(beam){beam.time-=dt;if(beam.time<.4&&Math.abs(p.y-beam.y)<23)hurt();if(beam.time<=0)beam=null;}
  for(const b of shots){b.life-=dt;b.spin=(b.spin||0)+dt*8;
   if(b.homing){const e=[...foes,boss].filter(Boolean).sort((a,c)=>dist(a,b)-dist(c,b))[0];if(e){const a=Math.atan2(e.y-b.y,e.x-b.x);b.vx+=(Math.cos(a)*360-b.vx)*dt*6;b.vy+=(Math.sin(a)*360-b.vy)*dt*6;}}
   b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.bounce&&(b.y<115||b.y>605)){b.y=clamp(b.y,115,605);b.vy*=-1;b.bounce--;}
   for(const e of [...foes,boss].filter(Boolean)){if(b.life<=0)break;if(e.hp<=0||b.hits?.has(e)||dist(b,e)>e.r+b.r*.65)continue;(b.hits||(b.hits=new Set())).add(e);e.hp-=b.damage;
    if(b.splash)for(const other of [...foes,boss].filter(Boolean))if(other!==e&&dist(other,b)<b.splash+other.r)other.hp-=b.damage*.4;
    if(b.pierce>0)b.pierce--;else b.life=0;
   }
  }
  for(const b of enemyShots){b.t+=dt;if(b.motion==='homing'&&b.t<1.1){const a=Math.atan2(p.y-b.y,p.x-b.x);b.vx+=(Math.cos(a)*135-b.vx)*dt;b.vy+=(Math.sin(a)*135-b.vy)*dt;}if(b.motion==='feint'&&b.t>1&&!b.turned){b.vy*=-1;b.turned=true;}b.x+=b.vx*dt;b.y+=(b.vy+(b.motion==='wave'?Math.cos(b.t*5)*60:0))*dt;if(dist(b,p)<17){b.x=-100;hurt();}}
  for(const o of obstacles){o.x-=64*dt;if(Math.abs(p.x-o.x)<o.w/2+10&&Math.abs(p.y-o.y)<o.h/2+12)hurt();}
  for(const i of items){i.x-=58*dt;if(dist(i,p)<31){collect(i.type);i.x=-100;}}
  for(const e of foes)if(e.hp<=0){score+=150;charge=Math.min(100,charge+3);kills++;sfx('pop');const r=Math.random();if(r<.03)pickup('fish',e.x,e.y);else if(r<.05)pickup('awake',e.x,e.y);else if(r<.10)pickup('feather',e.x,e.y);else if(r<.15)pickup('cheek',e.x,e.y);else if(r<.28)pickup('star',e.x,e.y);}
  foes=foes.filter(e=>e.hp>0&&e.x>-30);shots=shots.filter(b=>b.life>0&&b.x<W+40&&b.y>85&&b.y<630);enemyShots=enemyShots.filter(b=>b.x>-30&&b.x<440&&b.y>90&&b.y<630);items=items.filter(i=>i.x>-30);obstacles=obstacles.filter(o=>o.x>-40);
  if(p.hp<=0)return;
  if(boss&&boss.hp<=0){score+=area===1?2500:5000;boss=null;enemyShots=[];shots=[];warning=null;beam=null;sfx('boom');
   if(area===1){progress.write({chapter:'side',side:{...progress.get().side,area:2,transfer:true,power,score}});transition=3;notify('振り込み完了！\nエビラーメンを取りに行こう！',3);}
   else{progress.write({chapter:'side',side:{...progress.get().side,area:2,transfer:true,clear:true,power,score}});ending=.01;notify('やったーー！ エビラーメンだー！',4);speakSpecial('やったーー！ エビラーメンだー！');}
  }
 }
 function controls(els){els.weapons.forEach(b=>{const w=b.dataset.weapon;b.disabled=w==='meat'?!progress.get().meat:w==='fish'?fish<=0:false;b.classList.toggle('active',w===weapon);b.setAttribute('aria-pressed',String(w===weapon));const small=b.querySelector('small');if(small)small.textContent=w==='fish'?(fish>0?`残り ${Math.ceil(fish)} 秒`:'レア・30秒'):w==='meat'?'高威力・爆風':'右へ連射';});els.hint.textContent=fish>0?`子持ちあゆ ${Math.ceil(fish)}秒`:'第3章・右へ出発！';els.special.disabled=charge<100||!!ending||!!transition;els.specialFill.style.width=charge+'%';els.specialPercent.textContent=Math.floor(charge)+'%';}
 function point(e,canvas){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height};}
 function touch(e,canvas,start=false){const q=point(e,canvas);if(start)origin={...q,px:p.x,py:p.y,id:e.pointerId};if(origin&&origin.id===e.pointerId){p.x=clamp(origin.px+q.x-origin.x,28,220);p.y=clamp(origin.py+q.y-origin.y,135,585);}}
 function stop(){origin=null;}
 function ramen(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);oval(0,8,62,32,'#ed789b','#834a70',3);oval(0,0,62,21,'#fff5d7','#fff',4);oval(0,0,52,16,'#d8a650');for(let i=0;i<9;i++)line([[-38+i*8,-6],[-31+i*8,7]],'#ffe6a0',3);for(let i=0;i<3;i++){oval(-26+i*25,-4,16,8,'#ff8c63','#fff0cf',2,-.4);line([[-36+i*25,-9],[-30+i*25,1]],'#fff5dc',2);}line([[-10,-27],[-15,-43],[-8,-55]],'#fff9',3);ctx.restore();}
 function render(){
  ctx.save();ctx.fillStyle=area===1?'#d9d5ef':area===2?'#ffe1cb':'#bee6f4';ctx.fillRect(0,0,W,H);
  for(let i=0;i<6;i++){const x=((i*100-total*22)%600+600)%600-100;rr(x,185,74,390,8,i%2?'#b0b7df':'#d1b4dc');for(let y=210;y<550;y+=55)for(let j=0;j<2;j++)rr(x+12+j*28,y,17,26,3,'#fff4c7');}
  rr(0,600,W,60,0,'#b4b0c9');for(let i=0;i<6;i++)rr(((i*90-total*65)%540+540)%540-90,625,44,4,1,'#fff6d7');
  if(area===1){rr(230,110,145,50,9,'#fff','#8e91bb',3);label('なんこ銀行 ATM',302,136,16,'#71609b');}
  for(const o of obstacles){rr(o.x-o.w/2,o.y-o.h/2,o.w,o.h,6,'#f6a577','#fff',3);label('!',o.x,o.y,22,'#fff');}
  for(const i of items){oval(i.x,i.y,17,17,{feather:'#fff3a0',cheek:'#ffc399',awake:'#ddaeff',fish:'#ade8ed'}[i.type]||'#fff','#af7b9f',2);label({feather:'羽',cheek:'頬',awake:'覚',fish:'魚',heart:'♥',power:'力',star:'★'}[i.type],i.x,i.y,18,'#93516f');}
  for(const e of foes){ctx.save();ctx.translate(e.x,e.y);if(e.type==='coin')ctx.rotate(e.t*3);if(e.type==='coin'){oval(0,0,19,19,'#ffcf6c','#ad8557',3);label('¥',0,0,20,'#ad7347');}else{rr(-19,-20,38,40,7,e.type==='tie'?'#9a82b9':'#fff3e4','#a16f9f',2);label(e.type==='bill'?'請':e.type==='tie'?'結':'書',0,2,19,'#915779');}oval(-6,-6,2,3,'#604566');oval(7,-6,2,3,'#604566');ctx.restore();}
  if(boss){if(area===1){rr(boss.x-40,boss.y-52,80,104,14,'#98b5da','#fff',3);rr(boss.x-27,boss.y-33,54,36,5,'#e3fff3');label('ATM',boss.x,boss.y-16,20,'#597c91');rr(boss.x-25,boss.y+18,50,9,3,'#665d84');label('¥',boss.x,boss.y+42,17,'#fff');}else{ramen(boss.x,boss.y-22,.7);rr(boss.x-32,boss.y+4,64,42,12,'#ed8fa0','#fff',3);label('番人',boss.x,boss.y+24,19,'#fff');} }
  if(beam){ctx.globalAlpha=beam.time>.4?.35:.85;rr(0,beam.y-(beam.time>.4?3:20),W,beam.time>.4?6:40,3,'#ff527f');ctx.globalAlpha=1;label('手数料ビーム！ 線から離れて',195,beam.y-26,15,'#942b60');}
  for(const b of enemyShots){
   ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.motion==='ring'?b.t*4:Math.sin(b.t*3)*.2);
   if(b.motion==='ring'){oval(0,0,9,9,'#ffd36e','#a47740',2);label('¥',0,1,12,'#936938');}
   else if(b.motion==='fan'){rr(-8,-11,16,22,3,'#9ad2a0','#477e69',2);label('¥',0,1,12,'#426c59');}
   else{rr(-8,-10,16,20,3,b.motion==='homing'?'#e9c9ff':'#fff4de','#c65f91',2);line([[-4,-3],[4,-3]],'#c65f91',1.5);line([[-4,3],[3,3]],'#c65f91',1.5);}
   ctx.restore();
  }
  for(const b of shots)drawShot(b);
  drawChake(p.x-21,p.y+33,.58);if(p.invuln<=0||Math.floor(total*10)%2===0)drawNanko(p.x,p.y,.63,fx>0);
  if(cheerLife>0){const bx=clamp(p.x-55,8,198),by=clamp(p.y-96,115,540);ctx.globalAlpha=Math.min(1,cheerLife/.2,(1.5-cheerLife)/.15);rr(bx,by,184,36,14,'#fff','#e899b5',2);label(cheers[cheerIndex],bx+92,by+21,18,'#82527b');ctx.globalAlpha=1;}
  rr(8,8,374,93,14,'#514573');label('第3章 · 銀行振込と幻のエビラーメン',195,28,16,'#fff');label(`AREA ${area+1}  ${names[area]}`,195,52,14,'#fff1b9');label('♥'.repeat(Math.max(0,p.hp))+'♡'.repeat(Math.max(0,5-p.hp)),24,79,19,'#ff9fc0','left');label(`${score}点  POWER ${power}`,365,79,13,'#fff','right');
  if(boss){rr(24,106,342,13,6,'#6a5a85');rr(26,108,338*Math.max(0,boss.hp/boss.max),9,5,'#ffb96e');}
  if(warning){rr(12,160,366,42,12,'#fff5dc');label({beam:'予告：大型ビーム！ 線を見てよけよう',homing:'追尾用紙！ 引きつけてかわそう',pincer:'上下から挟撃！ 左側に余裕を',fast:'高速請求書！ 横のすき間へ',wave:'蛇行弾！ 波のすき間を見よう',feint:'方向反転！ 弾の動きを見て',fan:'お札ばらまき！ 広がる弾に注意',ring:'回転コイン！ すき間をぬけよう'}[warning.pattern],195,183,14,'#9a4c72');}
  const text=Object.entries(buffs).filter(([,v])=>v>0).map(([k,v])=>({feather:'羽',cheek:'頬',awake:'覚'}[k])+Math.ceil(v)+'秒').join(' ');if(text){rr(40,606,310,24,10,'#fff');label('ちゃけ '+text,195,619,14,'#815274');}
  if(fx>0){ctx.globalAlpha=.3;oval(p.x,p.y,(2.3-fx)*360,(2.3-fx)*360,'#fff5ac');ctx.globalAlpha=1;if(fx>1.3)drawNanko(195,360,3,true,true);label('むかちゅくーーー！！',195,420,25,'#fff','center','#bc5686');}
  if(ending){rr(18,140,354,425,22,'#fff4df','#f3a6bf',4);label('浜木綿に到着！',195,182,26,'#b86d8b');ramen(195,320,2);drawNanko(125,455,1);drawChake(270,450,.9);label('やったーー！ エビラーメンだー！',195,514,18,'#965776');label('ちゃけ「おめでとうなんこ！」',195,544,16,'#9f6d8f');}
  label('架空のお話・公式ゲームではありません',195,650,10,'#786885');ctx.restore();
 }
 return{enter,tick,render,change,special,controls,touch,stop,status:()=>({area,time,score,weapon,fish,power,charge,hp:p?.hp,player:p?{...p}:null,buffs:{...buffs},boss:boss?{...boss}:null,warning,beam,shots:shots.map(b=>({...b,hits:undefined})),enemyShots:enemyShots.map(b=>({...b})),items:items.map(i=>({...i})),foes:foes.map(e=>({...e})),obstacles:obstacles.map(o=>({...o})),transition,ending})};
};
