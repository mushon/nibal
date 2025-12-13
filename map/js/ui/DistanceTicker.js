/**
 * Distance ticker UI component
 * Shows distance traveled during follow mode animation
 */

import { getDistance } from '../utils/geometry.js';

export class DistanceTicker {
  constructor() {
    this.ticker = null;
  }

  /**
   * Initialize ticker element
   */
  initialize() {
    this.ticker = document.getElementById('distance-ticker');
    if (!this.ticker) {
      console.error('DistanceTicker: #distance-ticker element not found');
    }
  }

  /**
   * Show ticker at a specific position with distance text
   * @param {Object} position - { lng, lat } coordinates
   * @param {string} text - Distance text to display
   */
  show(position, text) {
    if (!this.ticker) return;

    this.ticker.classList.add('active');
    this.ticker.dataset.lng = position.lng.toString();
    this.ticker.dataset.lat = position.lat.toString();
    this.ticker.textContent = text;
  }

  /**
   * Hide ticker
   */
  hide() {
    if (!this.ticker) return;
    
    this.ticker.classList.remove('active');
    this.ticker.textContent = '';
    delete this.ticker.dataset.lng;
    delete this.ticker.dataset.lat;
  }

  /**
   * Update ticker position on map (called during map moves)
   * @param {Object} map - Mapbox map instance
   */
  updatePosition(map) {
    if (!this.ticker || !this.ticker.classList.contains('active')) return;

    const lng = parseFloat(this.ticker.dataset.lng);
    const lat = parseFloat(this.ticker.dataset.lat);
    
    if (!isNaN(lng) && !isNaN(lat)) {
      const tipPx = map.project({ lng, lat });
      this.ticker.style.left = tipPx.x + 'px';
      this.ticker.style.top = tipPx.y + 'px';
    }
  }

  /**
   * Check if ticker is currently active
   * @returns {boolean}
   */
  isActive() {
    return this.ticker && this.ticker.classList.contains('active');
  }
}
