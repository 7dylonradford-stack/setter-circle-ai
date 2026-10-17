
/* Setter Circle service worker — freshness first for app code; no account/API caching. */
const STATIC_CACHE="setter-static-v16.1";
const PRECACHE=["/setter-logo.svg"];
self.addEventListener("install",event=>{
 event.waitUntil(
  caches.open(STATIC_CACHE).then(cache=>cache.addAll(PRECACHE))
   .then(()=>self.skipWaiting())
 );
});
self.addEventListener("activate",event=>{
 event.waitUntil(
  caches.keys().then(keys=>Promise.all(
   keys.filter(k=>k.startsWith("setter-static-")&&k!==STATIC_CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
 );
});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
 if(req.mode==="navigate"||req.destination==="document")return;
 const asset=/\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?|webmanifest)$/.test(url.pathname);
 if(!asset)return;
 // Keep authentication and training scripts fresh; never cache API responses or navigations.
 event.respondWith(fetch(req,{cache:"no-store"}).then(response=>{
  if(response.ok&&response.type==="basic"){
   const copy=response.clone();
   event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));
  }
  return response;
 }).catch(async()=>{
  const cached=await caches.match(req);
  return cached||Response.error();
 }));
});
