// Reuse the game's own vector characters; no external image service or font needed.
const fs=require('fs'),vm=require('vm');
const {createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync('game.js','utf8');
const functions=['rr','oval','line','label','star','drawNanko','drawChake'].map(name=>{
 const start=source.indexOf('  function '+name+'('); const end=source.indexOf('\n  function ',start+1);
 return source.slice(start,end);
}).join('\n');
function art(w,h,icon){
 const canvas=createCanvas(w,h),ctx=canvas.getContext('2d');
 const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#ffe4ee');g.addColorStop(1,'#b7a6ee');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const scope={ctx,TAU:Math.PI*2,player:{tilt:0},elapsed:0};vm.createContext(scope);vm.runInContext(functions,scope);
 ctx.scale(w/512,h/512);
 for(let i=0;i<14;i++)scope.star((i*137+29)%512,(i*79+38)%512,8,3,5,'#fff5bc');
 scope.drawNanko(icon?220:200,icon?330:335,icon?3.35:3.4);
 scope.drawChake(icon?362:355,icon?335:332,icon?1.75:2.1);
 return canvas.toBuffer('image/png');
}
for(const size of [180,192,512])fs.writeFileSync(`icons/${size===180?'apple-touch-icon':`icon-${size}`}.png`,art(size,size,true));
fs.writeFileSync('assets/heroes.png',art(512,300,false));
