/* Chapter 2: a small, fully local RPG. Encounters use the existing shooting engine. */
window.createNankoRPG = function(api){
  const {ctx,W,H,rr,label,oval,line,drawNanko,drawChake,progress,sfx,startEncounter}=api;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const cheers=['頑張れなんこ！','いけいけなんこ！','いっけーー！'];
  const buildings=[{x:20,y:110,w:110,h:105,name:'モカのパン屋',color:'#f2a7be'},
    {x:245,y:108,w:125,h:110,name:'ニッショー',color:'#acbce9'},
    {x:20,y:300,w:110,h:88,name:'おべんとう',color:'#ffc888'}];
  const solid=(x,y)=>x<20||x>370||y<100||y>625||buildings.some(b=>x>b.x-12&&x<b.x+b.w+12&&y>b.y-8&&y<b.y+b.h+12);
  let state=progress.get().rpg, bird={x:state.x-25,y:state.y+23},path=[],dialog=null,time=0,saveClock=0,cheerClock=3,cheerLife=0,cheerIndex=0;
  const mission=document.getElementById('rpgMission');
  const statusText=()=>state.arrived?'第2章クリア！ 今日もお仕事がんばろう！':!state.pass?'① 公園で社員証を見つけよう':!state.lunch?'② おべんとう屋さんに話しかけよう':!state.helped?'③ 会社前の受付さんに話しかけよう':'④ ニッショーの玄関を調べよう';
  function save(){const ok=progress.write({rpg:{...state},chapter:'rpg'});mission.textContent=statusText()+(ok?'':'（保存できません）');return ok;}
  function say(name,text){path=[];dialog={name,text};mission.textContent=name+'：'+text;sfx('power');}
  function enter(){state=progress.get().rpg;if(solid(state.x,state.y)){state.x=195;state.y=550;}bird={x:state.x-25,y:state.y+23};path=[];saveClock=0;mission.textContent=statusText();if(!state.pass&&!state.lunch&&!state.arrived)say('ちゃけ','第2章！ ニッショーへ出勤だ！ 社員証とおべんとう、忘れてない？');}
  function npc(){return [{x:195,y:470,name:'おさんぽさん',color:'#b5a5d9',act:()=>say('おさんぽさん','おはよう！ 社員証が公園の左下でキラキラしていたよ。タップで歩いて、近くで「調べる」！')},
    {x:85,y:415,name:'おべんとう屋さん',color:'#e7a4a1',act:()=>{if(!state.pass){say('おべんとう屋さん','会社に行くなら社員証を先に探してね！ 公園の左下に落ちていたよ。');return;}if(!state.lunch){state.lunch=true;save();say('おべんとう屋さん','うるふぎゃんぐ弁当、できたよ！ ちゃけには小さな粟のおまけ！');}else say('おべんとう屋さん','会社は右上。気をつけていってらっしゃい！');}},
    {x:305,y:265,name:'受付さん',color:'#9bc8b5',act:()=>{if(!state.pass||!state.lunch){say('受付さん','出勤の準備はできた？ 社員証とおべんとうを持ってきてね。');return;}if(state.helped){say('受付さん','ありがとう！ 玄関はすぐ上。近くで調べてね！');return;}say('受付さん','書類が風で大暴れ！ 次に話しかけるとシューティングで片づけられるよ。');dialog.next=()=>{dialog=null;path=[];save();startEncounter();};}}];}
  function interact(){
    if(dialog){const next=dialog.next;dialog=null;mission.textContent=statusText();if(next)next();return;}
    const objects=npc();
    if(!state.pass)objects.push({x:65,y:535,name:'社員証',act:()=>{state.pass=true;save();say('なんこ','社員証みーつけた！ 次はおべんとうを受け取ろう！');}});
    objects.push({x:307,y:235,name:'会社の玄関',act:()=>{if(!state.helped){say('ちゃけ','まずは受付さんに話しかけよう！');return;}state.arrived=true;save();say('なんこ','ニッショーに到着！ おはようございまーす！\nちゃけ「出勤ミッション、大成功！」\n第2章クリア！ 街はこのまま散歩できるよ。');}});
    const nearest=objects.map(o=>({...o,d:Math.hypot(state.x-o.x,state.y-o.y)})).sort((a,b)=>a.d-b.d)[0];
    if(nearest&&nearest.d<48)nearest.act();else say('ちゃけ',statusText()+'。近くまで歩いて「話す・調べる」を押してね！');
  }
  // Grid navigation routes taps around buildings. Keyboard movement shares collision rules.
  function target(e,canvas){
    if(dialog){interact();return;}
    const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height;
    if(solid(x,y))return;
    const cell=(x,y)=>[Math.round((x-20)/20),Math.round((y-100)/20)];
    const [sx,sy]=cell(state.x,state.y),[gx,gy]=cell(x,y),key=(x,y)=>x+','+y;
    const queue=[[sx,sy]],from=new Map([[key(sx,sy),null]]);let end=null;
    for(let i=0;i<queue.length;i++){
      const [a,b]=queue[i];if(a===gx&&b===gy){end=key(a,b);break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=a+dx,ny=b+dy,k=key(nx,ny);if(from.has(k)||solid(20+nx*20,100+ny*20))continue;
        from.set(k,key(a,b));queue.push([nx,ny]);
      }
    }
    if(!end)return;path=[];
    while(from.get(end)!==null){const [a,b]=end.split(',').map(Number);path.unshift({x:20+a*20,y:100+b*20});end=from.get(end);}
    path.push({x,y});
  }
  function tick(dt,keys){
    time+=dt;saveClock+=dt;cheerLife=Math.max(0,cheerLife-dt);cheerClock-=dt;
    if(cheerClock<=0){cheerIndex=(cheerIndex+1+Math.floor(Math.random()*2))%3;cheerLife=1.5;cheerClock=3+Math.random()*3;}
    if(!dialog){
      let dx=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
      let dy=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
      if(dx||dy)path=[];
      else if(path.length){dx=path[0].x-state.x;dy=path[0].y-state.y;if(Math.hypot(dx,dy)<3){path.shift();dx=dy=0;}}
      const n=Math.hypot(dx,dy);if(n){const step=Math.min(125*dt,n>2? n:125*dt);dx=dx/n*step;dy=dy/n*step;if(!solid(state.x+dx,state.y))state.x+=dx;if(!solid(state.x,state.y+dy))state.y+=dy;}
      const d=Math.hypot(bird.x-state.x,bird.y-state.y);if(d>29){bird.x+=(state.x-bird.x)*Math.min(1,dt*5);bird.y+=(state.y-bird.y)*Math.min(1,dt*5);}
      if(saveClock>1){saveClock=0;save();}
    }
  }
  function wrapped(text,x,y,width,size=17,color='#654366'){
    ctx.font=`800 ${size}px sans-serif`;let row='',yy=y;
    for(const char of text){if(char==='\n'||ctx.measureText(row+char).width>width){label(row,x,yy,size,color,'left');row=char==='\n'?'':char;yy+=size+8;}else row+=char;}
    if(row)label(row,x,yy,size,color,'left');return yy;
  }
  function render(){
    ctx.save();ctx.fillStyle='#bde1bb';ctx.fillRect(0,0,W,H);
    // Flower beds, a paved town crossroads, and little storefronts.
    rr(143,95,93,550,12,'#f9e4bf');rr(12,235,366,56,12,'#f9e4bf');rr(12,440,366,58,12,'#f9e4bf');
    for(let y=110;y<650;y+=30)line([[187,y],[187,y+13]],'#fff5dd',3);
    for(let i=0;i<22;i++){const x=24+(i*73)%350,y=100+(i*97)%530;if(!solid(x,y)&&!(x>135&&x<242)){oval(x,y,3,3,i%2?'#fff1a5':'#f69fbb');oval(x+4,y+3,3,3,'#fff3fb');}}
    for(const b of buildings){
      rr(b.x+3,b.y+7,b.w,b.h,9,'#76978955');rr(b.x,b.y,b.w,b.h,9,b.color,'#ffffff',3);
      rr(b.x-4,b.y, b.w+8,27,7,b.name==='ニッショー'?'#6c7ea8':'#d97795');label(b.name,b.x+b.w/2,b.y+18,13,'#fff');
      for(let i=0;i<2;i++){rr(b.x+13+i*52,b.y+38,31,27,3,'#e7fbff','#fff',2);line([[b.x+28+i*52,b.y+39],[b.x+28+i*52,b.y+64]],'#b2c5e3',2);}
      rr(b.x+b.w/2-12,b.y+b.h-32,24,32,4,'#fff4d5');oval(b.x+b.w/2+6,b.y+b.h-14,2,2,'#b8a187');
    }
    rr(257,366,105,17,5,'#bc906d');line([[270,380],[270,398]],'#8d715d',5);line([[345,380],[345,398]],'#8d715d',5);
    for(const n of npc()){oval(n.x,n.y+13,13,5,'#52645240');rr(n.x-11,n.y-10,22,24,6,n.color);oval(n.x,n.y-21,13,14,'#ffe2bd');oval(n.x,n.y-31,13,7,'#69536c');oval(n.x-4,n.y-21,1.5,2,'#533f5a');oval(n.x+4,n.y-21,1.5,2,'#533f5a');label('…',n.x,n.y-44,18,'#795478');}
    if(!state.pass){rr(54,522+Math.sin(time*3)*3,23,17,3,'#fff','#b179b6',2);label('証',65,534+Math.sin(time*3)*3,12,'#75425c');label('✦',65,507,19,'#fff7a6');}
    if(path.length){const p=path[path.length-1];oval(p.x,p.y,8,4,'#ffffff88');}
    drawChake(bird.x,bird.y,.50);drawNanko(state.x,state.y,.62);
    if(cheerLife>0&&!dialog){const bx=clamp(bird.x-92,8,W-192),by=clamp(bird.y-84,83,H-100);ctx.save();ctx.globalAlpha=Math.min(1,cheerLife/.2,(1.5-cheerLife)/.15);rr(bx,by,184,38,16,'#fff','#ed9aaf',2);line([[clamp(bird.x,bx+12,bx+172),by+38],[bird.x,bird.y-24]],'#ed9aaf',2);label(cheers[cheerIndex],bx+92,by+25,20,'#75425c');ctx.restore();}
    rr(8,8,374,76,15,'#514573');label('第2章 · なんこ、ニッショーに出勤する！',195,29,15,'#fff');
    label(`社員証 ${state.pass?'✓':'？'}　お弁当 ${state.lunch?'✓':'？'}　道 ${state.helped?'✓':'？'}`,195,54,14,'#ffe7a4');
    label(state.arrived?'✨ 出勤ミッション 完了！':'タップで移動・近くで話す',195,73,12,'#f4dfff');
    if(dialog){rr(10,430,370,219,16,'#fffdf7','#dc9caf',3);label(dialog.name,27,459,19,'#cb6390','left');wrapped(dialog.text,27,490,334,18);label('「話す・調べる」でつづける',195,629,13,'#9c7299');}
    ctx.restore();
  }
  return {enter,tick,render,target,interact,save,say,stop:()=>{path=[];save();},status:()=>({...state,dialog:dialog?.text||null,walking:path.length>0}),winEncounter:()=>{state.helped=true;save();dialog=null;}};
};
