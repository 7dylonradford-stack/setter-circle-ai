
(function(){
 if(!("serviceWorker" in navigator)||!window.isSecureContext)return;
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("/sw.js").catch(e=>console.warn("Installable app support unavailable",e));
 },{once:true});
})();
