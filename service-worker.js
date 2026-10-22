/* Offline cache for static, self-contained Nanko Adventure PWA. */
const CACHE_NAME = 'nanko-adventure-chapter4-v1';
const FILES = [
  './', './index.html', './style.css', './game.js?v=chapter-4', './side.js?v=chapter-4', './stealth.js?v=chapter-4', './rpg-nav.js?v=chapter-4',
  './progress.js?v=chapter-4', './rpg.js?v=chapter-4', './manifest.webmanifest', './pwa.js?v=chapter-4',
  './assets/heroes.png', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(FILES.map(url => new Request(url, {cache:'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('nanko-adventure-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET')return;
  const url=new URL(event.request.url);
  if(url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // Refresh the entry document online; fall back to this build when offline.
    if(event.request.mode==='navigate'){
      try{
        const response=await fetch(new Request(event.request,{cache:'no-cache'}));
        if(!response.ok)throw new Error('Navigation unavailable');
        await cache.put(event.request,response.clone());
        await cache.put('./index.html',response.clone());
        return response;
      }catch(_){return (await cache.match(event.request)) || (await cache.match('./index.html')) || Response.error();}
    }
    const cached=await cache.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok)await cache.put(event.request,response.clone());
      return response;
    }catch(_){return Response.error();}
  })());
});
