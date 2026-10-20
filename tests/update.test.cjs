// Installed previous PWA -> current build -> offline, preserving local storage.
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),assert=require('assert/strict'),{execFileSync}=require('child_process');
(async()=>{
 const old={};for(const f of ['game.js','index.html','service-worker.js','pwa.js'])old[f]=execFileSync('git',['show','0b03296:'+f]);
 let latest=false;
 const server=http.createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
  if(path.includes('..')){res.writeHead(400);res.end();return;}
  try{
   res.setHeader('Cache-Control','no-store');
   res.setHeader('Content-Type',path.endsWith('.js')?'application/javascript':path.endsWith('.html')?'text/html; charset=utf-8':path.endsWith('.css')?'text/css':path.endsWith('.png')?'image/png':'application/json');
   res.end(!latest&&old[path]?old[path]:fs.readFileSync(path));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.NANKO_CHROME,args:['--no-sandbox'],headless:true});
  const c=await browser.newContext();let p=await c.newPage();const url='http://127.0.0.1:'+server.address().port;
  p.setDefaultTimeout(15000);
  await p.goto(url);await p.waitForFunction(()=>document.getElementById('offlineStatus').textContent.includes('OK'),null,{timeout:15000});
  await p.evaluate(()=>localStorage.setItem('nanko_progress_v1',JSON.stringify({version:1,stage:1,meat:true,power:2,score:1234})));
  latest=true;
  // Use the versioned release link, also usable by existing installed-PWA users.
  await p.goto(url+'/?v=balance-2');
  await p.waitForFunction(async()=>{const k=await caches.keys(),r=await navigator.serviceWorker.getRegistration();return k.includes('nanko-adventure-balance-v2a')&&!k.includes('nanko-adventure-rpg-v1')&&r.active.state==='activated'&&r.active===navigator.serviceWorker.controller;},null,{timeout:15000});
  await p.close();p=await c.newPage();await p.goto(url+'/');
  assert((await p.locator('.install-tip').textContent()).includes('第2次バランス v2'));
  await c.setOffline(true);await p.reload();await p.locator('#mainBtn').click();await p.waitForTimeout(200);
  const state=await p.evaluate(()=>nankoStatus);assert.equal(state.scene,'playing');assert.equal(state.stage,1);assert.equal(state.meatUnlocked,true);
  console.log('PASS: installed v1 -> v2a, root URL updated, saved stage/weapon retained, offline game starts');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
