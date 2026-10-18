(() => {
  const status=document.getElementById('offlineStatus');
  const help=document.getElementById('installHelp');
  document.getElementById('installHelpBtn').onclick=()=>help.showModal();
  document.getElementById('closeHelp').onclick=()=>help.close();
  if(!('serviceWorker' in navigator)){status.textContent='このブラウザはオンライン専用';return;}
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});
      await navigator.serviceWorker.ready;
      status.textContent='オフライン準備OK';
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)status.textContent='更新あり・ゲーム終了後に開き直してね';
        });
      });
    }catch(e){status.textContent='オフライン保存未完了・通信時に再読込';console.warn('Offline setup:',e);}
  });
})();
