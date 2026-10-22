/* Chapter 4: local-only stealth RPG. The reference photograph is not distributed. */
window.createNankoStealth=function(api){
 'use strict';
 const {ctx,W,H,rr,label,oval,line,drawNanko,drawChake,progress,sfx,speakSpecial,finish}=api;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const office=[
  {x:250,y:135,w:110,h:55,name:'店長のデスク',color:'#c89b7c'},
  {x:30,y:145,w:110,h:85,name:'会議室',color:'#b6bfdc'},
  {x:145,y:280,w:30,h:120,name:'書棚',color:'#bda08c'},
  {x:35,y:295,w:65,h:45,name:'コピー機',color:'#b5c9cf'},
  {x:235,y:345,w:100,h:50,name:'事務机',color:'#c7a98b'},
  {x:35,y:475,w:95,h:45,name:'休憩席',color:'#b0c7ad'}
 ];
 const town=[
  {x:20,y:115,w:115,h:95,name:'花の小路',color:'#eba9bf'},
  {x:250,y:115,w:120,h:95,name:'トンテキ亭',color:'#efbb83'},
  {x:150,y:300,w:130,h:65,name:'工事中・迂回',color:'#d2b29b'},
  {x:25,y:415,w:90,h:80,name:'小鳥の公園',color:'#b5cead'}
 ];
 const hiding=[{x:120,y:550,name:'休憩席の陰'},{x:120,y:370,name:'書棚の陰'},{x:270,y:440,name:'机の陰'},{x:210,y:245,name:'観葉植物'}];
 const patrol=[{x:305,y:220},{x:340,y:280},{x:210,y:280},{x:210,y:440},{x:85,y:440},{x:85,y:360},{x:120,y:245},{x:210,y:245}];
 const names={work:'お仕事中',patrol:'巡回中',look:'きょろきょろ',investigate:'物音を調査',chase:'なんこ発見！',search:'どこかな？',return:'仕事に戻る'};
 const $=id=>document.getElementById(id);
 let state,p,bird,guard,path=[],time=0,saveClock=0,alert=0,sneak=true,hidden=false,dialog=null,drawer=null,transition=0,ending=0,caught=false;
 let bubble={text:'',life:0,priority:0},cheerClock=4,warningClock=0,loudClock=18,noise=null,copyCooldown=0,invuln=0;
 const objects=()=>state?.day?town:office;
 const solid=(x,y)=>x<20||x>370||y<110||y>610||objects().some(b=>x>b.x-11&&x<b.x+b.w+11&&y>b.y-9&&y<b.y+b.h+11);
 const route=(a,b)=>window.NankoRPGNavigation(a,b,solid);
 function mission(){return state.day&&state.clear?'第4章クリア！ ごちそうさまでした！':state.day?'③ トンテキ亭を探そう（街の右上）':state.coupon?'② 割引券を持って下の出口へ！':'① 店長の隙を見てデスクの引き出しへ';}
 function save(){const ok=progress.write({chapter:'stealth',stealth:{...state,clear:state.clear||progress.get().stealth.clear,x:p.x,y:p.y}});$('stealthMission').textContent=mission()+(ok?'':'（端末に保存できません）');return ok;}
 function say(name,text){path=[];dialog={name,text};ui();}
 function cheer(text,priority=0,life=1.8){if(bubble.life>0&&bubble.priority>priority)return;bubble={text,priority,life};}
 function resetGuard(){guard={x:305,y:220,angle:-Math.PI/2,mode:'work',clock:8,route:[],index:0,last:{x:305,y:220},lost:0,repath:0};alert=0;noise=null;copyCooldown=0;}
 function enter(replay=false){
  const d=progress.get();if(!d.side.clear)return false;
  state={...d.stealth};if(replay)state={...state,coupon:false,escaped:false,day:false,clear:false,x:195,y:580};
  p={x:state.x,y:state.y};if(solid(p.x,p.y)){p={x:195,y:580};}
  bird={x:p.x-20,y:p.y+20};path=[];dialog=null;drawer=null;transition=0;ending=0;caught=false;sneak=true;hidden=false;time=0;saveClock=0;invuln=2;cheerClock=4;loudClock=18;bubble.life=0;resetGuard();
  if(state.day&&state.clear&&!replay)say('なんこ','ごちそうさま！ トンテキ最高！\n街はこのまま歩けるよ。「章」から再プレイもできるよ。');
  else if(!state.coupon&&!state.day)say('ちゃけ','店長の引き出しに幻の割引券！ 扇形の視界をよけて進もう。\n青い丸の近くで「隠れる」。コピー機で店長の気を引けるよ。');
  save();ui();return true;
 }
 function ui(){
  $('stealthMission').textContent=mission()+(progress.available?'':'（保存できません）');
  $('sneakBtn').textContent=sneak?'忍び足 ON':'忍び足 OFF';$('sneakBtn').setAttribute('aria-pressed',String(sneak));
  $('hideBtn').textContent=hidden?'隠れ場所から出る':'隠れる';$('hideBtn').setAttribute('aria-pressed',String(hidden));$('hideBtn').disabled=state.day||!!drawer||!!ending||!!transition;
  $('stealthTalkBtn').textContent=dialog?'つづける':'話す・調べる';
  $('drawerPanel').hidden=!drawer;$('drawerTime').textContent=drawer?`店長に注意！ 残り ${Math.ceil(drawer.left)} 秒`:'';
  for(let i=0;i<6;i++){$('drawer'+i).disabled=!!drawer?.opened.includes(i);$('drawer'+i).textContent=drawer?.opened.includes(i)?'からっぽ…':['書類の山','印鑑ケース','付箋の束','予定表','メモ帳','ピンクの封筒'][i];}
 }
 function toggleSneak(){if(!state||ending||transition||caught)return;sneak=!sneak;ui();}
 function hide(){if(state.day||drawer||ending||transition||caught)return;if(hidden){hidden=false;cheer('今がチャンス！',1);}
  else if(hiding.some(h=>distance(h,p)<34)){hidden=true;path=[];cheer('しーーっ！',1);sfx('power');}
  else cheer('青い丸の近くで隠れて！',2,2.2);ui();
 }
 function lineClear(a,b){const n=Math.ceil(distance(a,b)/4);for(let i=1;i<n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;if(office.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h))return false;}return true;}
 function visible(){if(state.day||hidden||invuln>0)return false;const d=distance(guard,p);if(d>155)return false;const angle=Math.atan2(p.y-guard.y,p.x-guard.x),delta=Math.atan2(Math.sin(angle-guard.angle),Math.cos(angle-guard.angle));return (d<26||Math.abs(delta)<.62)&&lineClear(guard,p);}
 function investigate(at){if(guard.mode==='chase')return;guard.mode='investigate';guard.last={...at};guard.route=route(guard,at);guard.clock=5;cheer('店長「ん？ 誰かいるのか？」',2,2.2);}
 function makeNoise(at){noise={...at,life:1.3};if(distance(guard,at)<300)investigate(at);}
 function followGuard(dt,speed){if(!guard.route.length)return true;const q=guard.route[0],dx=q.x-guard.x,dy=q.y-guard.y,n=Math.hypot(dx,dy);if(n<3){guard.route.shift();return !guard.route.length;}guard.angle=Math.atan2(dy,dx);const step=Math.min(n,speed*dt);guard.x+=dx/n*step;guard.y+=dy/n*step;return false;}
 function ai(dt,moving){
  const seen=visible();
  if(seen){alert=clamp(alert+dt*(sneak?23:48),0,100);guard.last={x:p.x,y:p.y};if(alert>=100&&guard.mode!=='chase'){guard.mode='chase';guard.lost=0;guard.repath=0;cheer('隠れてなんこ！',3,2.4);sfx('warn');}}
  else alert=Math.max(0,alert-dt*(hidden?26:13));
  if(moving&&!sneak&&!hidden&&distance(guard,p)<75&&guard.mode!=='chase'&&guard.mode!=='investigate')makeNoise({x:p.x,y:p.y});
  if(guard.mode==='chase'){
   guard.lost=seen?0:guard.lost+dt;guard.repath-=dt;if(guard.repath<=0){guard.route=route(guard,guard.last);guard.repath=.45;}
   followGuard(dt,112);if(distance(guard,p)<22&&!hidden&&invuln<=0){capture();return;}
   if(guard.lost>3.5){guard.mode='search';guard.clock=3;guard.route=[];cheer('ふう…見失ったみたい！',2,2.2);}
  }else if(guard.mode==='work'){
   guard.angle=-Math.PI/2;guard.clock-=dt;if(guard.clock<=0){guard.mode='patrol';guard.index=1;guard.route=route(guard,patrol[1]);}
  }else if(guard.mode==='patrol'){
   if(followGuard(dt,60)){guard.mode='look';guard.clock=1.6;}
  }else if(guard.mode==='look'){
   guard.angle+=dt*1.5;guard.clock-=dt;if(guard.clock<=0){guard.index=(guard.index+1)%patrol.length;if(guard.index===0){guard.mode='return';guard.route=route(guard,patrol[0]);}else{guard.mode='patrol';guard.route=route(guard,patrol[guard.index]);}}
  }else if(guard.mode==='investigate'){
   if(followGuard(dt,80)){guard.clock-=dt;guard.angle+=dt*.9;if(guard.clock<=0){guard.mode='return';guard.route=route(guard,patrol[0]);}}
  }else if(guard.mode==='search'){
   guard.angle+=dt*2;guard.clock-=dt;if(guard.clock<=0){guard.mode='return';guard.route=route(guard,patrol[0]);}
  }else if(guard.mode==='return'){
   if(followGuard(dt,64)){guard.mode='work';guard.clock=7;}
  }
  warningClock-=dt;if(distance(guard,p)<140&&warningClock<=0&&!hidden){cheer(alert>50?'隠れてなんこ！':'店長が来るよ！',2);warningClock=5;}
 }
 function capture(){caught=true;drawer=null;path=[];p={x:195,y:580};hidden=false;state.x=p.x;state.y=p.y;save();ui();finish(false);}
 function search(index){if(!drawer||caught||index<0||index>5||drawer.opened.includes(index))return;drawer.opened.push(index);sfx('pop');if(index===5){drawer=null;state.coupon=true;save();cheer('いっけーー！',2);say('なんこ','✨ 幻のトンテキ割引券 GET！ ✨\nやったー！ トンテキが安くなる！\n出口まで、もうひとがんばり！');sfx('power');}ui();}
 function closeDrawer(){drawer=null;ui();}
 function interact(){
  if(caught||transition||ending)return;if(dialog){dialog=null;ui();return;}if(drawer)return;if(hidden){cheer('隠れ場所から出て調べよう',1);return;}
  const targets=state.day?[
   {x:310,y:240,act:()=>{if(!state.coupon){say('店員さん','割引券が必要だよ！');return;}ending=.01;path=[];state.clear=true;save();sfx('power');speakSpecial('やったーー！ トンテキだーー！');}},
   {x:75,y:375,act:()=>{state.flower=true;save();say('お花屋さん','寄り道ありがとう！ 小さなお花をどうぞ。\nトンテキ亭は右上。工事の左側をまわってね。');}},
   {x:310,y:470,act:()=>say('通行人','ソースのいい匂い！ 工事中の道は左から迂回できるよ。')},
   {x:65,y:535,act:()=>say('ちゃけ','小鳥の公園！ あとでまた来よう。今はトンテキ！')}
  ]:[
   {x:305,y:215,act:()=>{if(state.coupon){say('ちゃけ','割引券は持ってるよ！ 下の出口へ！');return;}drawer={left:18,opened:[]};path=[];cheer('ピンクの封筒があやしい！',1,2.5);ui();}},
   {x:65,y:365,act:()=>{if(copyCooldown>0){cheer('コピー機はひとやすみ中',1);return;}copyCooldown=20;makeNoise({x:65,y:365});cheer('今がチャンス！',2,2);}},
   {x:195,y:580,act:()=>{if(!state.coupon){say('ちゃけ','割引券は店長のデスクだよ！');return;}state.escaped=true;state.day=true;state.x=195;state.y=580;p={x:195,y:580};path=[];transition=3;save();cheer('脱出成功！',3);}},
   {x:85,y:550,act:()=>say('同僚さん','店長は巡回の後にデスクへ戻るよ。\nコピー機の音が気になるみたい。青い丸は隠れ場所！')},
   {x:85,y:255,act:()=>say('ちゃけ','会議室はお留守。店長の目が届かない場所で待とう。')},
   {x:120,y:370,act:()=>say('ちゃけ','この書棚は視線を遮るよ。近くで隠れられる！')}
  ];
  const near=targets.map(o=>({...o,d:distance(o,p)})).sort((a,b)=>a.d-b.d)[0];if(near&&near.d<46)near.act();else cheer(state.day?'お店は街の右上だよ！':'近くで「話す・調べる」！',1,2);
 }
 function target(e,canvas){if(dialog){interact();return;}if(hidden||drawer||transition||ending||caught)return;const r=canvas.getBoundingClientRect(),q={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};if(!solid(q.x,q.y))path=route(p,q);}
 function stop(){path=[];if(state&&p)save();}
 function tick(dt,keys){
  time+=dt;if(caught)return;invuln=Math.max(0,invuln-dt);bubble.life=Math.max(0,bubble.life-dt);
  if(ending){ending+=dt;if(ending>6){ending=0;finish(true);}return;}
  if(transition){transition=Math.max(0,transition-dt);if(!transition){bird={x:p.x-20,y:p.y+20};say('なんこ','翌出勤日！ 割引券を持ってトンテキ亭へ！\nちゃけ「頑張れなんこ！」');}return;}
  if(dialog)return;
  let dx=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')),dy=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
  if(dx||dy)path=[];else if(path.length){dx=path[0].x-p.x;dy=path[0].y-p.y;if(Math.hypot(dx,dy)<3){path.shift();dx=dy=0;}}
  const n=Math.hypot(dx,dy),moving=n>0&&!hidden&&!drawer;
  if(moving){const step=Math.min((state.day?125:sneak?78:130)*dt,n>2?n:999),mx=dx/n*step,my=dy/n*step;if(!solid(p.x+mx,p.y))p.x+=mx;if(!solid(p.x,p.y+my))p.y+=my;}
  if(distance(bird,p)>25){bird.x+=(p.x-bird.x)*Math.min(1,dt*5);bird.y+=(p.y-bird.y)*Math.min(1,dt*5);}
  if(!state.day){ai(dt,moving);copyCooldown=Math.max(0,copyCooldown-dt);loudClock-=dt;
   if(loudClock<=0){loudClock=22;cheer('いっけ…しーーっ！',1,2);if(!sneak&&!hidden&&distance(guard,p)<100)makeNoise(p);}
  }
  if(noise){noise.life-=dt;if(noise.life<=0)noise=null;}
  if(drawer){drawer.left-=dt;if(drawer.left<=0){drawer=null;cheer('時間切れ！ また調べよう',2,2);}ui();}
  cheerClock-=dt;if(cheerClock<=0){cheerClock=3+Math.random()*3;cheer(['頑張れなんこ！','いけいけなんこ！','今がチャンス！'][Math.floor(Math.random()*3)],0,1.5);}
  saveClock+=dt;if(saveClock>=1){saveClock=0;save();}
 }
 function wrapped(text,x,y,width,size=16,color='#63466f'){ctx.font=`800 ${size}px sans-serif`;let row='',yy=y;for(const ch of text){if(ch==='\n'||ctx.measureText(row+ch).width>width){label(row,x,yy,size,color,'left');row=ch==='\n'?'':ch;yy+=size+7;}else row+=ch;}if(row)label(row,x,yy,size,color,'left');}
 function manager(){
  const g=guard,walk=g.route.length>0?Math.sin(time*11)*4:0;ctx.save();ctx.translate(g.x,g.y);oval(0,19,17,5,'#453f6240');
  rr(-12,7+walk,9,17,3,'#3c3d51');rr(3,7-walk,9,17,3,'#3c3d51');rr(-16,-20,32,35,9,'#596276','#343b50',1.5);
  ctx.beginPath();ctx.moveTo(-8,-19);ctx.lineTo(0,3);ctx.lineTo(8,-19);ctx.fillStyle='#fff4e5';ctx.fill();line([[0,-15],[0,0]],'#7c6c9e',4);
  oval(-19,-1+walk,5,12,'#596276');oval(19,-1-walk,5,12,'#596276');
  oval(0,-37,17,24,'#f3c7ac','#9d7d77',1);oval(0,-54,18,12,'#282c37');
  for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-17+i*7,-52);ctx.lineTo(-11+i*7,-69+(i%2)*5);ctx.lineTo(-5+i*7,-49);ctx.fillStyle='#282c37';ctx.fill();}
  line([[-12,-41],[-4,-43]],'#343443',2);line([[4,-43],[12,-41]],'#343443',2);oval(-7,-36,2,2.3,'#38333f');oval(7,-36,2,2.3,'#38333f');
  if(g.mode==='chase'){oval(0,-24,4,5,'#9e5d66');label('！',0,-82,26,'#ef6d8d');}
  else{line([[-4,-23],[4,-23]],'#af7775',1.5);if(['investigate','search','look'].includes(g.mode))label('？',0,-80,24,'#8e73bd');}
  if(g.mode==='work'){rr(-18,6,36,20,3,'#fff3df');line([[-10,12],[8,12+Math.sin(time*9)*3]],'#7f82a0',2);}
  ctx.restore();
 }
 function vision(){ctx.beginPath();ctx.moveTo(guard.x,guard.y);for(let a=guard.angle-.62;a<=guard.angle+.63;a+=.035){let end={x:guard.x,y:guard.y};for(let r=4;r<=155;r+=5){const q={x:guard.x+Math.cos(a)*r,y:guard.y+Math.sin(a)*r};if(q.x<15||q.x>375||q.y<105||q.y>615||office.some(b=>q.x>b.x&&q.x<b.x+b.w&&q.y>b.y&&q.y<b.y+b.h))break;end=q;}ctx.lineTo(end.x,end.y);}ctx.closePath();ctx.fillStyle=alert>55?'#ef6e8155':'#f8cf6b55';ctx.fill();}
 function tonteki(){oval(195,305,150,92,'#fffdf3','#a694b8',5);oval(195,305,130,73,'#f3e9d0');for(let i=0;i<30;i++)line([[230+(i*17)%64,260+(i*13)%65],[240+(i*11)%60,280+(i*7)%50]],i%2?'#c8dc9a':'#ecf1bd',3);
  oval(158,306,85,51,'#824a32','#603b32',4,-.12);for(let i=0;i<5;i++){rr(92+i*26,273+(i%2)*6,24,65,10,'#bd7650','#744c37',2);line([[96+i*26,289],[108+i*26,326]],'#74432f',4);}for(let i=0;i<7;i++)oval(120+i*15,280+(i%3)*16,9,6,'#fff0bc','#d7b478',1,.4);line([[160,207],[150,190],[158,172]],'#fff',3);}
 function render(){if(!state)return;ctx.save();ctx.fillStyle=state.day?'#bed6c5':'#e6d9e7';ctx.fillRect(0,0,W,H);
  for(let y=110;y<620;y+=30)line([[14,y],[376,y]],state.day?'#b2cdbd':'#d8cbdf',1);
  if(state.day){rr(140,104,95,510,12,'#f6dfbc');rr(20,225,350,57,10,'#f6dfbc');rr(20,380,350,45,10,'#f6dfbc');}
  else{rr(10,104,370,516,12,null,'#b29cbe',4);label('ニッショー事務所',95,127,12,'#9d7caa');}
  for(const b of objects()){rr(b.x+3,b.y+6,b.w,b.h,8,'#5b526520');rr(b.x,b.y,b.w,b.h,8,b.color,'#fff8ef',2);
   if(b.name==='書棚'){for(let y=b.y+8;y<b.y+b.h-8;y+=22)for(let i=0;i<3;i++)rr(b.x+4+i*8,y,6,17,1,['#df8fa3','#eac790','#8db8c2'][i]);}
   else{label(b.name,b.x+b.w/2,b.y+22,b.w<80?12:14,'#66506e');if(b.name==='店長のデスク'){rr(b.x+15,b.y+33,78,13,3,'#eed7b6','#997f78',1);oval(b.x+54,b.y+39,3,2,'#9c7b69');}else rr(b.x+12,b.y+32,b.w-24,Math.max(8,b.h-44),4,'#ffffff55');}}
  if(!state.day){rr(198,215,23,16,4,'#d6a58d');oval(203,206,12,16,'#98bc96',null,1,-.4);oval(216,201,10,17,'#adcda4',null,1,.4);vision();for(const h of hiding){oval(h.x,h.y,18,11,'#b5e5ee88','#6dabc6',2);label('隠',h.x,h.y+1,12,'#517b9e');}manager();rr(162,603,66,14,4,'#9ab0c4');label('出口',195,597,14,'#705f8f');}
  const npcs=state.day?[{x:75,y:375,c:'#e5a0b6'},{x:310,y:470,c:'#9cabc7'}]:[{x:85,y:550,c:'#b0a0cf'}];
  for(const n of npcs){rr(n.x-10,n.y-15,20,26,6,n.c);oval(n.x,n.y-27,12,14,'#ffe0bd');oval(n.x,n.y-37,12,6,'#73607c');label('…',n.x,n.y-53,16,'#846b97');}
  if(path.length){const q=path.at(-1);oval(q.x,q.y,9,4,'#fff9');}
  ctx.globalAlpha=hidden?.35:1;drawChake(bird.x,bird.y,.45);drawNanko(p.x,p.y,.55);ctx.globalAlpha=1;
  if(hidden){rr(p.x-30,p.y+20,60,18,7,'#577d96');label('かくれ中',p.x,p.y+31,11,'#fff');}
  if(noise){ctx.beginPath();ctx.arc(noise.x,noise.y,20+(1.3-noise.life)*25,0,Math.PI*2);ctx.strokeStyle='#e898bc';ctx.lineWidth=3;ctx.stroke();}
  if(bubble.life>0&&!dialog&&!drawer){const bx=clamp(bird.x-100,8,182),by=clamp(bird.y-100,112,540);rr(bx,by,200,36,14,'#fff','#d996b7',2);label(bubble.text,bx+100,by+22,bubble.text.length>14?12:16,'#7c527b');}
  rr(8,8,374,88,15,'#514573');label('第4章 · 店長の秘密と幻のトンテキ割引券',195,28,14,'#fff');label(state.day?'翌出勤日 · トンテキを探して':`事務所 · 店長：${names[guard.mode]}`,195,49,14,'#ffedb5');
  if(!state.day){label('警戒',24,77,12,'#fff','left');rr(62,66,194,15,7,'#847496');rr(64,68,190*alert/100,11,6,alert>60?'#ff8b97':'#ffd885');label(`${Math.ceil(alert)}%`,278,77,12,'#fff');label(state.coupon?'券 GET':'券 ？',341,77,12,'#ffe2af');}
  else label(state.flower?'寄り道のお花も GET！':'ソースの香りは街の右上から…',195,75,13,'#f7e0f2');
  label('架空の割引券です・実際のお店では使えません',195,644,10,'#846c90');
  if(dialog){rr(10,440,370,188,16,'#fff9ef','#dc9caf',3);label(dialog.name,26,469,18,'#bd6b91','left');wrapped(dialog.text,26,497,336,16);label('「つづける」で閉じる',195,610,12,'#a482a3');}
  if(transition){rr(12,230,366,180,20,'#fff6e8','#e7a0b6',3);label('脱出成功！',195,280,27,'#ba688b');label('翌出勤日……',195,350,25,'#816293');}
  if(ending){rr(12,118,366,488,22,'#fff3df','#e5a0bc',4);label('トンテキ、いただきまーす！',195,155,22,'#b66887');label('幻の割引券を使った！',195,184,14,'#9d7894');tonteki();drawNanko(130,480+Math.sin(ending*9)*2,1);drawChake(272,478,.85);const bite=(Math.sin(ending*4)+1)/2;oval(158-bite*25,470-bite*14,8,5,'#ae6d46');line([[170,477],[150-bite*22,458]],'#856149',2);label('やったーー！ トンテキだーー！',195,540,18,'#a66185');label('ちゃけ「頑張ったね、なんこ！」',195,571,16,'#947096');}
  ctx.restore();
 }
 return{enter,tick,render,target,interact,hide,toggleSneak,search,closeDrawer,stop,save,ui,status:()=>({...(state||{}),player:p?{...p}:null,guard:guard?{...guard,route:guard.route.map(q=>({...q}))}:null,alert,sneak,hidden,dialog:dialog?.text||null,drawer:drawer?{...drawer,opened:[...drawer.opened]}:null,transition,ending,caught,path:path.map(q=>({...q})),bubble:{...bubble}})};
};
