/**
 * Map initialization and configuration service
 */

import { CONFIG } from '../config.js';

export class MapService {
  constructor(appState) {
    this.state = appState;
  }

  /**
   * Initialize Mapbox map
   * @param {string} containerId - DOM container ID
   * @param {Object} options - Optional camera overrides
   * @returns {Promise<Object>} Mapbox map instance
   */
  async initializeMap(containerId, options = {}) {
    // Set access token
    mapboxgl.accessToken = CONFIG.MAPBOX_ACCESS_TOKEN;

    // Enable RTL text plugin
    mapboxgl.setRTLTextPlugin(
      CONFIG.RTL_PLUGIN_URL,
      null,
      true // lazy load
    );

    // Get camera from options or config
    const camera = {
      center: options.center || CONFIG.DEFAULT_CAMERA.center,
      zoom: options.zoom || CONFIG.DEFAULT_CAMERA.zoom,
      bearing: options.bearing || CONFIG.DEFAULT_CAMERA.bearing,
      pitch: options.pitch || CONFIG.DEFAULT_CAMERA.pitch
    };

    // Force correct pixel ratio on mobile
    if (window.devicePixelRatio > 1) {
      const mapContainer = document.getElementById(containerId);
      if (mapContainer) {
        mapContainer.style.zoom = '100%';
        mapContainer.style.transform = 'scale(1)';
      }
    }

    // Create map
    const map = new mapboxgl.Map({
      container: containerId,
      style: CONFIG.MAPBOX_STYLE,
      center: camera.center,
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
      interactive: true,
      pixelRatio: window.devicePixelRatio || 1
    });

    // Store in state
    this.state.setMap(map);

    // Wait for map to load
    return new Promise((resolve, reject) => {
      map.on('load', () => {
        // Force resize on mobile
        if (window.innerWidth <= CONFIG.MOBILE.MAX_WIDTH) {
          map.resize();
        }

        // Get all style layers
        this.state.allStyleLayers = map.getStyle().layers.map(l => ({ id: l.id }));

        // Store default visibility and filters
        this.state.allStyleLayers.forEach(layer => {
          if (map.getLayer(layer.id)) {
            const styleLayer = map.getStyle().layers.find(l => l.id === layer.id);
            let vis = 'visible';
            if (styleLayer && styleLayer.layout && typeof styleLayer.layout.visibility !== 'undefined') {
              vis = styleLayer.layout.visibility;
            }
            this.state.setStyleDefaultVisibility(layer.id, vis);

            try {
              const filter = (styleLayer && typeof styleLayer.filter !== 'undefined') ? styleLayer.filter : null;
              this.state.setStyleDefaultFilter(layer.id, filter);
            } catch (e) {
              this.state.setStyleDefaultFilter(layer.id, null);
            }
          }
        });

        resolve(map);
      });

      map.on('error', reject);
    });
  }

  /**
   * Setup resize observers for mobile
   * @param {Object} map - Mapbox map instance
   */
  setupMobileHandlers(map) {
    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (map && map.resize) {
        setTimeout(() => map.resize(), 100);
      }
    });

    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    // Orientation change for iOS Safari
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (map && map.resize) {
          map.resize();
        }
      }, 200);
    });

    // Window resize
    window.addEventListener('resize', () => {
      if (map && map.resize) {
        map.resize();
      }
    }, { passive: true });

    // Mobile force resize on load
    if (window.innerWidth <= CONFIG.MOBILE.MAX_WIDTH) {
      const forceMapResize = () => {
        if (map) {
          map.resize();
          const canvas = map.getCanvas();
          if (canvas) {
            canvas.style.imageRendering = 'crisp-edges';
            canvas.width = window.innerWidth * window.devicePixelRatio;
            canvas.height = window.innerHeight * window.devicePixelRatio;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
          }
        }
      };

      forceMapResize();
      setTimeout(forceMapResize, 50);
      setTimeout(forceMapResize, 100);
      setTimeout(forceMapResize, 200);
    }
  }

  /**
   * Setup map event handlers
   * @param {Object} map - Mapbox map instance
   * @param {Object} hashRouter - HashRouter instance
   */
  setupEventHandlers(map, hashRouter) {
    // Update hash on camera move
    map.on('moveend', () => {
      // Skip if flag is set
      if (this.state.getSkipNextHashUpdate()) {
        this.state.setSkipNextHashUpdate(false);
        return;
      }

      // Don't update during follow animation
      if (this.state.isFreeCameraAnimating) return;

      // Don't update if :follow is present in hash
      try {
        const rawHash = window.location.hash.replace('#', '');
        const parts = rawHash.split('/');
        const layersStr = parts[1] || '';
        const tokens = layersStr.split(',').filter(t => t.trim());
        if (tokens.some(t => /:follow(?:\+\d+)?$/.test(t))) return;
      } catch (e) {}

      hashRouter.updateHash();
    });

    // Update distance ticker on map move
    map.on('move', () => {
      const ticker = document.getElementById('distance-ticker');
      if (ticker && ticker.classList.contains('active') && !this.state.isFreeCameraAnimating) {
        const lng = parseFloat(ticker.dataset.lng);
        const lat = parseFloat(ticker.dataset.lat);
        if (!isNaN(lng) && !isNaN(lat)) {
          const tipPx = map.project({ lng, lat });
          ticker.style.left = tipPx.x + 'px';
          ticker.style.top = tipPx.y + 'px';
        }
      }
    });
  }
}
