/**
 * Section Animations Extension for inflect
 * 
 * Adds directional slide animations when navigating between sections.
 * - Forward navigation: sections slide up from bottom
 * - Backward navigation: sections slide down from top
 * 
 * Only loads when frontmatter has animate-sections: true
 * 
 * Automatically removes animation classes after animation completes.
 */

(function() {
  'use strict';

  // Check if animations should be enabled
  function shouldLoad() {
    return document.body.classList.contains('animate-sections') || window.__animateSections === true;
  }

  // Apply animation to target section based on direction
  function animateSection(targetId, direction) {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Remove any existing animation classes from all sections
    document.querySelectorAll('section').forEach(sec => {
      sec.classList.remove('slide-from-bottom', 'slide-from-top');
    });

    // Apply appropriate animation class
    if (direction === 'forward') {
      target.classList.add('slide-from-bottom');
    } else if (direction === 'backward') {
      target.classList.add('slide-from-top');
    }

    // Remove animation class after animation completes (600ms)
    setTimeout(() => {
      target.classList.remove('slide-from-bottom', 'slide-from-top');
    }, 600);
  }

  // Listen for chapter navigation events
  function handleScrollTargetReached(e) {
    if (!shouldLoad()) return;
    if (!e.detail || !e.detail.targetId) return;

    const direction = e.detail.direction || 'forward';
    animateSection(e.detail.targetId, direction);
  }

  // Initialize
  function init() {
    if (!shouldLoad()) return;

    // Listen for custom events from chapters.js or other navigation
    window.addEventListener('scroll-target-reached', handleScrollTargetReached);
  }

  // Cleanup
  function cleanup() {
    window.removeEventListener('scroll-target-reached', handleScrollTargetReached);
    
    // Remove all animation classes
    document.querySelectorAll('section').forEach(sec => {
      sec.classList.remove('slide-from-bottom', 'slide-from-top');
    });
  }

  // Public API
  window.SectionAnimationsExtension = {
    init: init,
    cleanup: cleanup,
    animate: animateSection
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
