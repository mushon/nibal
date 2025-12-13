/**
 * Map UI controls component
 * Handles copy link, fullscreen toggle, and other UI buttons
 */

export class MapUIControls {
  constructor(appState) {
    this.state = appState;
  }

  /**
   * Initialize UI controls
   */
  initialize() {
    this._setupCopyLinkButton();
    this._setupFullscreenButton();
  }

  /**
   * Setup copy link button
   */
  _setupCopyLinkButton() {
    const copyBtn = document.getElementById('copy-link-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', () => {
      const fullUrl = window.location.href;
      let linkToCopy = null;

      // Extract from 'svg/' or 'map/' onwards (including hash)
      const mapIdx = fullUrl.indexOf('/map/');
      const svgIdx = fullUrl.indexOf('/svg/');
      
      if (mapIdx !== -1) {
        linkToCopy = fullUrl.substring(mapIdx + 1);
      } else if (svgIdx !== -1) {
        linkToCopy = fullUrl.substring(svgIdx + 1);
      } else {
        linkToCopy = fullUrl;
      }

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkToCopy)
          .then(() => {
            this._showCopyFeedback(copyBtn, '✓ Copied!');
          })
          .catch(() => {
            this._fallbackCopyToClipboard(linkToCopy, copyBtn);
          });
      } else {
        this._fallbackCopyToClipboard(linkToCopy, copyBtn);
      }
    });
  }

  /**
   * Show copy feedback
   */
  _showCopyFeedback(btn, message) {
    const originalText = btn.textContent;
    btn.textContent = message;
    btn.classList.add('success');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('success');
    }, 2000);
  }

  /**
   * Fallback clipboard method for older browsers
   */
  _fallbackCopyToClipboard(text, btn) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this._showCopyFeedback(btn, '✓ Copied!');
      } else {
        this._showCopyFeedback(btn, '✗ Failed');
      }
    } catch (err) {
      this._showCopyFeedback(btn, '✗ Failed');
    }
    
    document.body.removeChild(textArea);
  }

  /**
   * Setup fullscreen button
   */
  _setupFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (!fullscreenBtn) return;

    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    // Update button state when fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        fullscreenBtn.textContent = '⊡';
        fullscreenBtn.title = 'Exit fullscreen';
      } else {
        fullscreenBtn.textContent = '⊞';
        fullscreenBtn.title = 'Enter fullscreen';
      }
    });
  }
}
