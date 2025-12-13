/**
 * Hash-based URL routing service
 * Parses and updates URL hash for map state (camera, layers, features)
 */

import { splitLayerTokens, parseParenArgs, buildParenArgs, combineFilterExprsToMapbox } from '../utils/tokenParser.js';
import { CONFIG } from '../config.js';

export class HashRouter {
  constructor(appState) {
    this.state = appState;
    this.cachedHashString = '';
    this.cachedHashState = null;
  }

  /**
   * Parse the current URL hash into structured state
   * Hash format: #lat,lng,zoom,bearing,pitch/+layer1,~layer2/flags
   * @returns {Object} Parsed state object
   */
  parseHash() {
    const hash = window.location.hash.replace('#', '');
    
    // Return cached result if hash hasn't changed
    if (hash === this.cachedHashString && this.cachedHashState) {
      return this.cachedHashState;
    }
    
    if (!hash) {
      this.cachedHashString = '';
      this.cachedHashState = this._getDefaultState();
      return this.cachedHashState;
    }

    let cameraStr = '';
    let layersStr = '';
    let followId = null;
    let followOffset = 0;
    let showTicker = false;
    let followHidden = false;
    let showMapUI = false;
    let isStatic = false;

    const parts = hash.split('/');
    const restParts = [];

    // Filter out 'load:' segments (deprecated)
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('load:')) {
        continue;
      } else if (parts[i].length > 0) {
        restParts.push(parts[i]);
      }
    }

    cameraStr = restParts[0] || '';
    layersStr = restParts[1] || '';

    // If cameraStr isn't a numeric camera spec and there's no explicit layersStr,
    // treat the first non-empty segment as the layers part (supports hashes like "#/+layer,...")
    const cameraLike = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){0,3}$/;
    if (!layersStr && cameraStr && !cameraLike.test(cameraStr)) {
      layersStr = cameraStr;
      cameraStr = '';
    }

    // Detect optional flags in additional segments (e.g., /mapui, /embed-ui, /static)
    const extraSegments = parts.slice(2);
    showMapUI = extraSegments.some(seg => {
      const lower = seg.toLowerCase();
      return lower === 'mapui' || lower === 'embed-ui';
    });
    isStatic = extraSegments.some(seg => seg.toLowerCase() === 'static');

    // Parse camera
    const cameraParts = cameraStr ? cameraStr.split(',').map(Number) : [];
    
    // Parse layers
    let layersOn = this.state.allStyleLayers.map(l => l.id);
    let dynamicGeojsonToLoad = [];

    if (layersStr) {
      layersOn = [];
      const layerState = {};
      
      splitLayerTokens(layersStr).forEach(token => {
        const safeToken = token.replace(/[<>"'`]/g, '').trim();
        // Updated regex to allow extensions (.geojson, .json, .csv) in baseName before counter/parens
        const match = safeToken.match(/^([+~])([^()]+?)(?:#(\d+))?(?:\(([^)]*)\))?(?::follow(\+(\d*))?)?$/);
        
        if (!match) {
          return;
        }

        const [, sign, baseName, counterStr, parenContent, plusSign, offset] = match;
        
        // Reconstruct full layer name with counter if present
        const lname = counterStr ? `${baseName}#${counterStr}` : baseName;
        const hasFollow = token.includes(':follow');
        const hasTickerFlag = !!plusSign;
        const parsedOffset = offset ? parseInt(offset, 10) : 0;

        // Parse parentheses: may include sourceHint and/or filter expressions
        const { sourceHint, filters: filterExprs } = parseParenArgs(parenContent || '');
        const filter = combineFilterExprsToMapbox(filterExprs);

        layerState[lname] = {
          sign,
          sourceHint: sourceHint || null,
          filter,
          follow: hasFollow,
          followOffset: parsedOffset,
          showTicker: hasTickerFlag
        };
      });

      // Count wayback layers to determine if repositioning is needed
      const waybackLayersInHash = Object.entries(layerState)
        .filter(([lname, { sign }]) => sign === '+' && /^wayback:\d{8}$/.test(lname))
        .map(([lname]) => lname);
      const needWaybackRepositioning = waybackLayersInHash.length > 1;

      Object.entries(layerState).forEach(([lname, { sign, sourceHint, filter, follow, followOffset: layerFollowOffset, showTicker: layerShowTicker }]) => {
        if (sign === '+') {
          const isStyleLayer = this.state.allStyleLayers.some(l => l.id === lname);
          const isExternalLayer = this.state.externalLayers.has(lname);

          // Check if this is a Wayback layer (format: wayback:YYYYMMDD)
          const waybackMatch = lname.match(/^wayback:(\d{8})$/);
          const isWaybackLayer = waybackMatch !== null;

          // Load layer if:
          // 1. It's not a style layer (new external layer)
          // 2. It's an external layer and has a sourceHint (reload with new style)
          // 3. It's a wayback layer and there are multiple wayback layers (need repositioning)
          if (!isStyleLayer || (isExternalLayer && sourceHint) || (isWaybackLayer && needWaybackRepositioning)) {
            if (isWaybackLayer) {
              const dateStr = waybackMatch[1];
              dynamicGeojsonToLoad.push({
                name: lname,
                sourceHint: sourceHint || 'overlay',
                filter,
                isWayback: true,
                waybackDate: dateStr
              });
            } else {
              // Regular GeoJSON/CSV layer
              dynamicGeojsonToLoad.push({ name: lname, sourceHint, filter });
            }
          }

          layersOn.push(lname);

          if (follow) {
            followId = lname;
            followOffset = layerFollowOffset;
            showTicker = layerShowTicker;
            followHidden = (sign === '~');
          }
        } else if (sign === '~') {
          // For ~new-id, load as invisible (unchecked) dynamic layer
          const isStyleLayer = this.state.allStyleLayers.some(l => l.id === lname);
          const isExternalLayer = this.state.externalLayers.has(lname);

          if (!isStyleLayer || (isExternalLayer && sourceHint)) {
            dynamicGeojsonToLoad.push({ name: lname, sourceHint, filter });
          }

          if (follow) {
            followId = lname;
            followOffset = layerFollowOffset;
            showTicker = layerShowTicker;
            followHidden = (sign === '~');
          }
          // Do NOT add to layersOn, so it is not visible/checked
        }
      });
    }

    // Helper: treat 0 as a valid numeric value (don't use || which treats 0 as falsy)
    const pickNum = (val, def) => {
      return (typeof val === 'number' && !isNaN(val)) ? val : def;
    };

    const result = {
      camera: {
        center: [
          pickNum(cameraParts[1], CONFIG.DEFAULT_CAMERA.center[0]),
          pickNum(cameraParts[0], CONFIG.DEFAULT_CAMERA.center[1])
        ],
        zoom: pickNum(cameraParts[2], CONFIG.DEFAULT_CAMERA.zoom),
        bearing: pickNum(cameraParts[3], CONFIG.DEFAULT_CAMERA.bearing),
        pitch: pickNum(cameraParts[4], CONFIG.DEFAULT_CAMERA.pitch)
      },
      layers: layersOn,
      dynamicGeojsonToLoad,
      followId,
      followOffset,
      showTicker,
      followHidden,
      showMapUI,
      isStatic
    };

    // Cache the result
    this.cachedHashString = hash;
    this.cachedHashState = result;

    return result;
  }

  /**
   * Update the URL hash with new camera/layer state
   * @param {Object} camera - Optional camera object { center, zoom, bearing, pitch }
   * @param {string[]} extraSegments - Additional hash segments (e.g., ['mapui', 'static'])
   */
  updateHash(camera = null, extraSegments = []) {
    const existing = window.location.hash.replace('#', '');
    const parts = existing.split('/');

    let cameraStr = parts[0] || '';

    // Update camera if provided
    if (camera) {
      const c = camera.center || this.state.map.getCenter();
      const z = (camera.zoom !== undefined ? camera.zoom : this.state.map.getZoom()).toFixed(2);
      const b = (camera.bearing !== undefined ? camera.bearing : this.state.map.getBearing()).toFixed(1);
      const p = (camera.pitch !== undefined ? camera.pitch : this.state.map.getPitch()).toFixed(1);
      cameraStr = `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${z},${b},${p}`;
    } else if (this.state.map) {
      const c = this.state.map.getCenter();
      const z = this.state.map.getZoom().toFixed(2);
      const b = this.state.map.getBearing().toFixed(1);
      const p = this.state.map.getPitch().toFixed(1);
      cameraStr = `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${z},${b},${p}`;
    }

    let layersStr = parts[1] || '';
    const trailing = parts.slice(2).filter(Boolean);

    // Add any extra segments
    const allTrailing = [...new Set([...trailing, ...extraSegments])];

    const newHash = `#${cameraStr}` +
      (layersStr ? `/${layersStr}` : '') +
      (allTrailing.length ? `/${allTrailing.join('/')}` : '');

    if (window.location.hash !== newHash) {
      window.location.replace(newHash);
      // Invalidate cache
      this.cachedHashString = '';
      this.cachedHashState = null;
    }
  }

  /**
   * Add a layer token to the hash
   * @param {string} layerId - Layer ID
   * @param {Object} options - { sign, sourceHint, filters, follow, followOffset }
   */
  addLayerToHash(layerId, options = {}) {
    const { sign = '+', sourceHint = null, filters = [], follow = false, followOffset = 0 } = options;
    
    const existing = window.location.hash.replace('#', '');
    const parts = existing.split('/');
    const cameraStr = parts[0] || '';
    const layersStr = parts[1] || '';
    const trailing = parts.slice(2);

    const tokens = layersStr ? splitLayerTokens(layersStr) : [];
    
    // Build new token
    let newToken = `${sign}${layerId}`;
    const paren = buildParenArgs(sourceHint, filters);
    if (paren) newToken += paren;
    if (follow) {
      newToken += ':follow';
      if (followOffset > 0) newToken += `+${followOffset}`;
    }

    // Remove existing token for this layer
    const escapedLayerId = layerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^[+~]${escapedLayerId}(?:\\([^)]*\\))?(?::follow(?:\\+\\d*)?)?$`);
    const filteredTokens = tokens.filter(t => !regex.test(t));
    
    // Add new token
    filteredTokens.push(newToken);

    const newLayersStr = filteredTokens.join(',');
    const newHash = `#${cameraStr}/${newLayersStr}` + (trailing.length ? `/${trailing.join('/')}` : '');
    
    window.location.hash = newHash;
    
    // Invalidate cache
    this.cachedHashString = '';
    this.cachedHashState = null;
  }

  /**
   * Remove a layer token from the hash
   * @param {string} layerId - Layer ID to remove
   */
  removeLayerFromHash(layerId) {
    const existing = window.location.hash.replace('#', '');
    const parts = existing.split('/');
    const cameraStr = parts[0] || '';
    const layersStr = parts[1] || '';
    const trailing = parts.slice(2);

    const tokens = layersStr ? splitLayerTokens(layersStr) : [];
    
    const escapedLayerId = layerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^[+~]${escapedLayerId}(?:\\([^)]*\\))?(?::follow(?:\\+\\d*)?)?$`);
    const filteredTokens = tokens.filter(t => !regex.test(t));

    const newHash = filteredTokens.length > 0
      ? `#${cameraStr}/${filteredTokens.join(',')}` + (trailing.length ? `/${trailing.join('/')}` : '')
      : `#${cameraStr}` + (trailing.length ? `/${trailing.join('/')}` : '');
    
    window.location.replace(newHash);
    
    // Invalidate cache
    this.cachedHashString = '';
    this.cachedHashState = null;
  }

  /**
   * Invalidate the hash cache (call when hash changes externally)
   */
  invalidateCache() {
    this.cachedHashString = '';
    this.cachedHashState = null;
  }

  /**
   * Get default state when hash is empty
   * @private
   */
  _getDefaultState() {
    return {
      camera: { ...CONFIG.DEFAULT_CAMERA },
      layers: this.state.allStyleLayers.map(l => l.id),
      dynamicGeojsonToLoad: [],
      followId: null,
      followOffset: 0,
      showTicker: false,
      followHidden: false,
      showMapUI: false,
      isStatic: false
    };
  }
}
