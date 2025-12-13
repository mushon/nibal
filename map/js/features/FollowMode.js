/**
 * Follow Mode - Animated path following with free camera
 * Animates the camera along a GeoJSON LineString/Polygon path
 */

import { getDistance, interpolateLine } from '../utils/geometry.js';
import { CONFIG } from '../config.js';

export class FollowMode {
  constructor(appState) {
    this.state = appState;
    this.animationHandle = null;
    this.checkInterval = null;
    this.cancelFn = null;
  }

  /**
   * Start following a path with animated camera
   * @param {Object} map - Mapbox map instance
   * @param {Array<[number, number]>} coords - Path coordinates
   * @param {Function} onComplete - Callback when animation completes
   * @param {string} layerId - Source layer ID
   * @param {number} startOffset - Starting distance offset in meters
   * @param {boolean} showTicker - Show distance ticker
   * @param {boolean} keepLayerHidden - Keep layer hidden during follow
   * @returns {Function} Cancel function
   */
  start(map, coords, onComplete, layerId, startOffset = 0, showTicker = false, keepLayerHidden = false) {
    // Periodic check for :follow in the hash
    const safeLayerId = layerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    this.checkInterval = setInterval(() => {
      const rawHash = window.location.hash;
      const hash = rawHash.replace('#', '');
      const [, layersStr] = hash.split('/');
      let stillFollowing = false;
      
      if (layersStr) {
        const tokens = layersStr.split(',').filter(t => t.trim());
        stillFollowing = tokens.some(token => 
          token.match(new RegExp(`^[+~]${safeLayerId}(?:\\([^)]+\\))?:follow(?:\\+\\d*)?$`))
        );
      }
      
      if (!stillFollowing) {
        this.cancel();
      }
    }, 1000);

    this.state.setFreeCameraAnimating(true);

    // Capture original visibility
    let originalVisibility = null;
    if (layerId && map.getLayer(layerId)) {
      try {
        originalVisibility = map.getLayoutProperty(layerId, 'visibility');
      } catch (e) {
        originalVisibility = null;
      }
      
      if (!keepLayerHidden) {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    }

    // Store original data for restoration
    let originalData = null;
    let representativeProps = {};
    
    if (layerId) {
      const src = map.getSource(layerId);
      if (src && src._data) {
        originalData = JSON.parse(JSON.stringify(src._data));
      }
      
      // Capture representative properties
      try {
        const feats = (originalData && originalData.features) ? originalData.features : [];
        const rep = feats.find(f => f && f.geometry && (
          f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString' ||
          f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
        ));
        if (rep && rep.properties && typeof rep.properties === 'object') {
          representativeProps = JSON.parse(JSON.stringify(rep.properties));
        }
      } catch (e) {
        representativeProps = {};
      }
    }

    // Calculate total distance for constant speed
    let totalDist = 0;
    for (let j = 1; j < coords.length; j++) {
      totalDist += getDistance(coords[j-1], coords[j]);
    }
    
    const duration = Math.max(
      CONFIG.ANIMATION.FOLLOW_MIN_DURATION_MS,
      totalDist * CONFIG.ANIMATION.FOLLOW_DURATION_MS_PER_METER
    );

    let startTime = null;

    // Distance ticker
    const ticker = document.getElementById('distance-ticker');
    const totalDistKm = totalDist / 1000;
    const startOffsetKm = startOffset / 1000;
    
    if (showTicker && ticker && totalDistKm > 0) {
      ticker.classList.add('active');
      ticker.textContent = startOffsetKm.toFixed(1) + ' km';
    }

    // Capture current camera state
    const camBearing = map.getBearing();
    const camPitch = map.getPitch();
    const camZoom = map.getZoom();
    
    // Get current map center and path start in screen coordinates
    const mapCenter = map.getCenter();
    const mapCenterPx = map.project(mapCenter);
    const pathStartPx = map.project({ lng: coords[0][0], lat: coords[0][1] });
    
    // Offset vector in pixels
    const offsetPx = {
      x: pathStartPx.x - mapCenterPx.x,
      y: pathStartPx.y - mapCenterPx.y
    };
    
    let currentCameraCenter = mapCenter;
    const useOffset = Math.abs(offsetPx.x) > 1e-2 || Math.abs(offsetPx.y) > 1e-2;

    // Animation loop
    const animate = (ts) => {
      if (!this.state.isFreeCameraAnimating) {
        return;
      }

      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(1, elapsed / duration);
      const tip = interpolateLine(coords, t);

      // Update source data to show partial path
      if (layerId) {
        const src = map.getSource(layerId);
        if (src) {
          // Find last full point before tip
          let dist = 0;
          let lastIdx = 0;
          let total = 0;
          
          for (let j = 1; j < coords.length; j++) {
            total += getDistance(coords[j-1], coords[j]);
          }
          
          const target = t * total;
          
          for (let j = 1; j < coords.length; j++) {
            const segLen = getDistance(coords[j-1], coords[j]);
            if (dist + segLen >= target) {
              lastIdx = j - 1;
              break;
            }
            dist += segLen;
          }

          const partialCoords = coords.slice(0, lastIdx + 1).concat([tip]);
          const partialLine = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: partialCoords
              },
              properties: representativeProps
            }]
          };
          src.setData(partialLine);
        }
      }

      // Update camera position
      let targetCameraCenter;
      if (useOffset) {
        const tipPx = map.project({ lng: tip[0], lat: tip[1] });
        const desiredCenterPx = {
          x: tipPx.x - offsetPx.x,
          y: tipPx.y - offsetPx.y
        };
        targetCameraCenter = map.unproject(desiredCenterPx);
      } else {
        targetCameraCenter = { lng: tip[0], lat: tip[1] };
      }

      // Smooth camera easing
      const ease = CONFIG.ANIMATION.CAMERA_EASE;
      currentCameraCenter = {
        lng: currentCameraCenter.lng + (targetCameraCenter.lng - currentCameraCenter.lng) * ease,
        lat: currentCameraCenter.lat + (targetCameraCenter.lat - currentCameraCenter.lat) * ease
      };

      map.jumpTo({
        center: currentCameraCenter,
        zoom: camZoom,
        bearing: camBearing,
        pitch: camPitch,
        animate: false
      });

      // Update distance ticker
      if (ticker && ticker.classList.contains('active')) {
        const tipPx = map.project({ lng: tip[0], lat: tip[1] });
        ticker.style.left = tipPx.x + 'px';
        ticker.style.top = tipPx.y + 'px';
        const currentDistKm = startOffsetKm + (t * totalDistKm);
        ticker.textContent = currentDistKm.toFixed(1) + ' km';
        ticker.dataset.lng = tip[0];
        ticker.dataset.lat = tip[1];
      }

      if (t < 1) {
        this.animationHandle = requestAnimationFrame(animate);
      } else {
        // Animation complete
        this._complete(map, layerId, originalData, originalVisibility, keepLayerHidden, ticker, tip, onComplete);
      }
    };

    this.animationHandle = requestAnimationFrame(animate);

    // Create cancel function
    this.cancelFn = () => {
      this._cleanup(map, layerId, originalData, originalVisibility, keepLayerHidden, ticker);
    };

    // Store in global for external cancel
    if (!window._follow) window._follow = {};
    window._follow.layerId = layerId;
    window._follow.checkIntervalId = this.checkInterval;
    window._follow.originalData = originalData;
    window._follow.cancel = this.cancelFn;

    return this.cancelFn;
  }

  /**
   * Cancel the current follow animation
   */
  cancel() {
    if (this.cancelFn) {
      this.cancelFn();
    }
  }

  /**
   * Complete the animation
   * @private
   */
  _complete(map, layerId, originalData, originalVisibility, keepLayerHidden, ticker, tip, onComplete) {
    // Restore original data
    if (layerId && originalData) {
      const src = map.getSource(layerId);
      if (src) src.setData(originalData);
    }

    // Restore visibility
    if (layerId && originalVisibility !== null && !keepLayerHidden) {
      try {
        map.setLayoutProperty(layerId, 'visibility', originalVisibility);
      } catch (e) {}
    }

    this.state.setFreeCameraAnimating(false);

    // Keep ticker visible with final position
    if (ticker && ticker.classList.contains('active')) {
      ticker.dataset.lng = tip[0];
      ticker.dataset.lat = tip[1];
    }

    // Clear interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Callback
    if (typeof onComplete === 'function') {
      onComplete();
    }

    // Cleanup global handle
    window._follow = null;
    this.cancelFn = null;
  }

  /**
   * Cleanup animation state
   * @private
   */
  _cleanup(map, layerId, originalData, originalVisibility, keepLayerHidden, ticker) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.animationHandle) {
      cancelAnimationFrame(this.animationHandle);
      this.animationHandle = null;
    }

    this.state.setFreeCameraAnimating(false);

    // Restore original data
    if (layerId && originalData) {
      const src = map.getSource(layerId);
      if (src && src.setData) {
        try {
          src.setData(originalData);
        } catch (e) {}
      }
    }

    // Restore visibility
    if (layerId && originalVisibility !== null && !keepLayerHidden) {
      try {
        map.setLayoutProperty(layerId, 'visibility', originalVisibility);
      } catch (e) {}
    }

    // Hide ticker
    if (ticker) {
      ticker.classList.remove('active');
    }

    window._follow = null;
    this.cancelFn = null;
  }
}
