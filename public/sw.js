
const STATIC_CACHE="setter-static-v12";
const PRECACHE=["/","/setter-logo.svg","/advanced-studio-v12.css"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("setter-static-")&&k!==STATIC_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
 if(req.mode==="navigate")return;
 const asset=/\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?|webmanifest)$/.test(url.pathname);
 if(!asset)return;
 event.respondWith(caches.match(req).then(cached=>{
  const fresh=fetch(req).then(response=>{
   if(response.ok&&response.type==="basic"){const copy=response.clone();caches.open(STATIC_CACHE).then(cache=>cache.put(req,copy)).catch(()=>{})}
   return response;
  });
  return cached||fresh;
 }));
});
