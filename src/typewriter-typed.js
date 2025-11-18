// Optimized typewriter using Typed.js library
// Replaces the custom typewriter with a more performant solution
(function(){
  if (typeof window === 'undefined' || !document) return;

  // Inject character fade-in CSS to match previous typewriter styling
  const style = document.createElement('style');
  style.id = 'typewriter-typed-style';
  style.textContent = `
/* Typed character fade-in - matches previous tw-char styling */
.typed-cursor {
  display: none !important; /* Hide Typed.js default cursor, we use CSS ::after */
}
/* Smooth character appearance */
.typewriter span {
  display: inline;
  opacity: 0;
  animation: tw-char-fadein 50ms linear forwards;
}
@keyframes tw-char-fadein {
  to { opacity: 1; }
}
`;
  document.head.appendChild(style);

  // Wait for Typed.js library to load
  function init() {
    if (typeof Typed === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    const instances = new Map(); // Track Typed instances for cleanup
    
    function startTypingForElement(el, opts) {
      if (!el || el.dataset._tw_started) return;
      el.dataset._tw_started = '1';
      
      // Get original text content
      const text = el.textContent || '';
      if (!text.trim()) return;
      
      // Store original text and clear element
      el.dataset._tw_orig = text;
      el.textContent = '';
      
      // Create a paragraph element to wrap the typed text
      const p = document.createElement('p');
      el.appendChild(p);
      
      const speed = (opts && opts.speed) || (el.dataset.twSpeed ? parseInt(el.dataset.twSpeed, 10) : 40);
      
      // Speed up typing by 2x (reduce delays by half)
      const adjustedSpeed = Math.round(speed / 2);
      
      // Process text to add natural pauses at punctuation
      // Typed.js supports ^pause syntax for delays
      let processedText = text;
      // Add longer pauses after periods, question marks, exclamation points (reduced by 2x)
      processedText = processedText.replace(/([.!?])\s+/g, '$1^400 ');
      // Add medium pauses after commas (reduced by 2x)
      processedText = processedText.replace(/,\s+/g, ',^200 ');
      // Add subtle pauses after colons and semicolons (reduced by 2x)
      processedText = processedText.replace(/([;:])\s+/g, '$1^150 ');
      
      try {
        // Create Typed instance with natural, human-like typing settings
        const typed = new Typed(p, {
          strings: [processedText],
          typeSpeed: adjustedSpeed,
          startDelay: Math.random() * 100, // Small random delay before starting (reduced by 2x)
          backSpeed: 0,
          backDelay: 0,
          loop: false,
          showCursor: false,
          cursorChar: '',
          // Enable natural human-like typing
          smartBackspace: true,
          shuffle: false,
          fadeOut: false,
          fadeOutClass: '',
          fadeOutDelay: 0,
          attr: null,
          bindInputFocusEvents: false,
          contentType: 'html',
          // Callbacks for cleanup
          onComplete: function(self) {
            // Cleanup after typing completes
            if (instances.has(el)) {
              instances.delete(el);
            }
          }
        });
        
        instances.set(el, typed);
      } catch (e) {
        console.error('Typewriter error:', e);
        // Fallback: just show the text
        el.textContent = text;
      }
    }

    // Observe sections for intersection
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const sec = en.target;
          
          // Check suppression flag
          if (window.__typewriterSuppressed) {
            let startTimeoutId = null;
            
            const startWhenReady = () => {
              if (startTimeoutId) clearTimeout(startTimeoutId);
              const els = sec.querySelectorAll('.typewriter');
              els.forEach(el => startTypingForElement(el));
              sec.removeEventListener('inflection-ready', startWhenReady);
            };
            
            sec.addEventListener('inflection-ready', startWhenReady);
            startTimeoutId = setTimeout(() => {
              sec.removeEventListener('inflection-ready', startWhenReady);
              const els = sec.querySelectorAll('.typewriter');
              els.forEach(el => startTypingForElement(el));
            }, 500);
          } else {
            const els = sec.querySelectorAll('.typewriter');
            els.forEach(el => startTypingForElement(el));
          }
          
          sectionObserver.unobserve(en.target);
        }
      });
    }, { threshold: 0.25 });

    // Fallback observer for elements outside sections
    const fallbackObserver = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          startTypingForElement(en.target);
          fallbackObserver.unobserve(en.target);
        }
      });
    }, { threshold: 0.25 });

    function scanAndObserve() {
      const sections = Array.from(document.querySelectorAll('section'));
      let found = false;
      
      sections.forEach(sec => {
        if (sec.querySelector('.typewriter')) {
          found = true;
          if (!sec.dataset._tw_observed) {
            sec.dataset._tw_observed = '1';
            sectionObserver.observe(sec);
          }
        }
      });
      
      if (!found) {
        const els = document.querySelectorAll('.typewriter');
        els.forEach(el => {
          if (!el.dataset._tw_started) fallbackObserver.observe(el);
        });
      }
    }

    // Lightweight mutation observer with debouncing
    let scanTimeout = null;
    const mo = new MutationObserver(() => {
      if (scanTimeout) clearTimeout(scanTimeout);
      scanTimeout = setTimeout(scanAndObserve, 100);
    });
    mo.observe(document.documentElement || document.body, { 
      childList: true, 
      subtree: true 
    });

    // Initial scan
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanAndObserve);
    } else {
      scanAndObserve();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      instances.forEach(typed => {
        try { typed.destroy(); } catch(e) {}
      });
      instances.clear();
    });
  }

  init();
})();
