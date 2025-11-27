// Google tag (gtag.js)
(function() {
  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-Y7ZFSTEQGS';
  document.head.appendChild(script);
  
  // Initialize GA
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-Y7ZFSTEQGS');
})();
