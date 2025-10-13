(function(){
  if ('serviceWorker' in navigator) {
    var register = function(){
      navigator.serviceWorker.register('/service-worker.js').catch(function(e){
        console.warn('SW registration failed', e);
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', register);
    } else {
      register();
    }
  }
})();
