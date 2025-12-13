/**
 * Layer management service for adding, removing, and styling map layers
 */

import { CONFIG } from '../config.js';

export class LayerManager {
  constructor(appState, dataLoader) {
    this.state = appState;
    this.loader = dataLoader;
  }

  /**
   * Add a GeoJSON/CSV layer to the map
   * @param {string} name - Layer name (with optional .geojson/.csv extension)
   * @param {Object} options - { visibility, sourceHint, filter, waybackLayersInHashOrder }
   * @returns {Promise<string>} Layer ID
   */
  async addGeoJSONLayer(name, options = {}) {
    const { visibility = 'visible', sourceHint = null, filter = null } = options;
    const map = this.state.getMap();
    if (!map) throw new Error('Map not initialized');

    // Load the data
    const geojson = await this.loader.loadGeoJSON(name);

    // Extract layer ID from filename
    const fileId = name.split('/').pop();
    let cleanId = fileId.replace(/(_geojson|\.geojson|\.json|\.csv)$/i, '');
    cleanId = cleanId.replace(/[^a-zA-Z0-9_#-]/g, '_'); // Allow # for counter
    const sourceId = cleanId;
    const layerId = cleanId;

    // Remove existing layer/source if present
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add source
    map.addSource(sourceId, { type: 'geojson', data: geojson });

    // Determine layer type
    let type = 'line';
    let sourceLayerFound = false;

    if (sourceHint) {
      const styleLayer = map.getStyle().layers.find(l => l.id === sourceHint);
      if (styleLayer && styleLayer.type) {
        type = styleLayer.type;
        sourceLayerFound = true;
      }
    }

    // Fallback: infer from geometry if no source layer found
    if (!sourceLayerFound && geojson.features && geojson.features.length) {
      const geomType = geojson.features[0].geometry && geojson.features[0].geometry.type;
      if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        type = 'fill';
      } else if (geomType === 'Point' || geomType === 'MultiPoint') {
        type = 'circle';
      }
    }

    // Base paint defaults
    const basePaint = type === 'line' ? { 'line-color': '#fff', 'line-width': 3 } :
                      type === 'fill' ? { 'fill-color': '#f00', 'fill-opacity': 0.5 } :
                      { 'circle-radius': 6, 'circle-color': '#f00' };

    const layerDef = {
      id: layerId,
      type,
      source: sourceId,
      layout: { visibility },
      paint: basePaint
    };

    // Copy styling from sourceHint if provided
    if (sourceHint) {
      const styleLayer = map.getStyle().layers.find(l => l.id === sourceHint);
      if (styleLayer) {
        if (styleLayer.paint) {
          layerDef.paint = JSON.parse(JSON.stringify(styleLayer.paint));
        }
        if (styleLayer.layout) {
          const copiedLayout = JSON.parse(JSON.stringify(styleLayer.layout));
          if (typeof copiedLayout.visibility !== 'undefined') {
            delete copiedLayout.visibility;
          }
          layerDef.layout = Object.assign({}, layerDef.layout, copiedLayout);
        }
      }
    }

    // Add explicit filter if provided
    if (filter) {
      layerDef.filter = filter;
    }

    // Add layer with positioning
    try {
      if (sourceHint) {
        const allLayers = map.getStyle().layers;
        const sourceIndex = allLayers.findIndex(l => l.id === sourceHint);
        if (sourceIndex >= 0 && sourceIndex < allLayers.length - 1) {
          const beforeId = allLayers[sourceIndex + 1].id;
          map.addLayer(layerDef, beforeId);
        } else {
          map.addLayer(layerDef);
        }
      } else {
        map.addLayer(layerDef);
      }
    } catch (ex) {
      // Fallback: add without positioning
      map.addLayer(layerDef);
    }

    // Update state
    this.state.addExternalLayer(layerId);
    this.state.setStyleDefaultFilter(layerId, null); // External layers start with no filter

    // Check if followable (has path geometry)
    if (geojson && geojson.features && geojson.features.length > 0) {
      const hasPathGeometry = geojson.features.some(f => {
        if (!f.geometry) return false;
        const gType = f.geometry.type;
        return gType === 'LineString' || gType === 'MultiLineString' ||
               gType === 'Polygon' || gType === 'MultiPolygon';
      });
      if (hasPathGeometry) {
        this.state.setFollowable(layerId, true);
      }
    }

    // Add to layer list if not already present
    if (!this.state.allStyleLayers.some(l => l.id === layerId)) {
      if (sourceHint) {
        const sourceIdx = this.state.allStyleLayers.findIndex(l => l.id === sourceHint);
        if (sourceIdx >= 0) {
          this.state.allStyleLayers.splice(sourceIdx + 1, 0, { id: layerId, name: cleanId });
        } else {
          this.state.allStyleLayers.push({ id: layerId, name: cleanId });
        }
      } else {
        this.state.allStyleLayers.push({ id: layerId, name: cleanId });
      }
      this.state.setStyleDefaultVisibility(layerId, 'visible');
    }

    return layerId;
  }

  /**
   * Add a Wayback satellite imagery layer
   * @param {string} dateStr - Date in YYYYMMDD format
   * @param {Object} options - { visibility, sourceHint, filter, waybackLayersInHashOrder }
   * @returns {Promise<string>} Layer ID
   */
  async addWaybackLayer(dateStr, options = {}) {
    const { visibility = 'visible', sourceHint = 'satellite', waybackLayersInHashOrder = [] } = options;
    const map = this.state.getMap();
    if (!map) throw new Error('Map not initialized');

    const layerId = `wayback:${dateStr}`;
    const sourceId = layerId;

    // Load Wayback configuration
    const { sourceConfig, metadata } = await this.loader.loadWaybackLayer(dateStr);

    // Remove existing layer/source if present
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add raster source
    map.addSource(sourceId, sourceConfig);

    // Create layer definition
    const layerDef = {
      id: layerId,
      type: 'raster',
      source: sourceId,
      layout: { visibility },
      paint: { 'raster-opacity': 1 }
    };

    // Copy paint properties from source hint if available
    if (sourceHint) {
      const styleLayer = map.getStyle().layers.find(l => l.id === sourceHint);
      if (styleLayer && styleLayer.paint && styleLayer.paint['raster-opacity'] !== undefined) {
        layerDef.paint['raster-opacity'] = styleLayer.paint['raster-opacity'];
      }
    }

    // Add layer with positioning based on hash order
    try {
      const allLayers = map.getStyle().layers;
      let beforeId = null;

      if (waybackLayersInHashOrder.length > 0) {
        const thisLayerHashIndex = waybackLayersInHashOrder.indexOf(layerId);
        if (thisLayerHashIndex >= 0) {
          // Find next wayback layer in hash order
          for (let i = thisLayerHashIndex + 1; i < waybackLayersInHashOrder.length; i++) {
            const nextLayerId = waybackLayersInHashOrder[i];
            if (map.getLayer(nextLayerId)) {
              beforeId = nextLayerId;
              break;
            }
          }

          // If no next layer, check for previous layers
          if (!beforeId && thisLayerHashIndex > 0) {
            for (let i = thisLayerHashIndex - 1; i >= 0; i--) {
              const prevLayerId = waybackLayersInHashOrder[i];
              if (map.getLayer(prevLayerId)) {
                const prevLayerIndex = allLayers.findIndex(l => l.id === prevLayerId);
                if (prevLayerIndex >= 0 && prevLayerIndex < allLayers.length - 1) {
                  beforeId = allLayers[prevLayerIndex + 1].id;
                }
                break;
              }
            }
          }

          // Fallback to sourceHint
          if (!beforeId && sourceHint) {
            const sourceIndex = allLayers.findIndex(l => l.id === sourceHint);
            if (sourceIndex >= 0 && sourceIndex < allLayers.length - 1) {
              beforeId = allLayers[sourceIndex + 1].id;
            }
          }
        }
      } else if (sourceHint) {
        const sourceIndex = allLayers.findIndex(l => l.id === sourceHint);
        if (sourceIndex >= 0 && sourceIndex < allLayers.length - 1) {
          beforeId = allLayers[sourceIndex + 1].id;
        }
      }

      if (beforeId) {
        map.addLayer(layerDef, beforeId);
      } else {
        map.addLayer(layerDef);
      }
    } catch (ex) {
      map.addLayer(layerDef);
    }

    // Update state
    this.state.addExternalLayer(layerId);
    this.state.setStyleDefaultFilter(layerId, null);

    // Add to layer list if not already present
    if (!this.state.allStyleLayers.some(l => l.id === layerId)) {
      if (sourceHint) {
        const sourceIdx = this.state.allStyleLayers.findIndex(l => l.id === sourceHint);
        if (sourceIdx >= 0) {
          this.state.allStyleLayers.splice(sourceIdx + 1, 0, { id: layerId, name: layerId });
        } else {
          this.state.allStyleLayers.push({ id: layerId, name: layerId });
        }
      } else {
        this.state.allStyleLayers.push({ id: layerId, name: layerId });
      }
      this.state.setStyleDefaultVisibility(layerId, 'visible');
    }

    return layerId;
  }

  /**
   * Remove a layer from the map
   * @param {string} layerId - Layer ID to remove
   */
  removeLayer(layerId) {
    const map = this.state.getMap();
    if (!map) return;

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(layerId)) map.removeSource(layerId);

    this.state.removeStyleLayer(layerId);
    this.state.removeExternalLayer(layerId);
    delete this.state.styleDefaultVisibility[layerId];
    delete this.state.styleDefaultFilter[layerId];
  }

  /**
   * Toggle layer visibility
   * @param {string} layerId - Layer ID
   * @param {boolean} visible - True to show, false to hide
   */
  toggleVisibility(layerId, visible) {
    const map = this.state.getMap();
    if (!map || !map.getLayer(layerId)) return;

    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  /**
   * Apply a filter to a layer
   * @param {string} layerId - Layer ID
   * @param {Array|null} filter - Mapbox GL filter array or null to clear
   */
  applyFilter(layerId, filter) {
    const map = this.state.getMap();
    if (!map || !map.getLayer(layerId)) return;

    const layer = map.getLayer(layerId);
    if (!CONFIG.FILTERABLE_LAYER_TYPES.includes(layer.type)) return;

    try {
      map.setFilter(layerId, filter);
    } catch (e) {
      console.warn(`Failed to apply filter to ${layerId}:`, e);
    }
  }

  /**
   * Fade a Wayback layer in or out
   * @param {string} layerId - Layer ID
   * @param {number} targetOpacity - Target opacity (0-1)
   * @param {number} duration - Animation duration in milliseconds
   */
  fadeWaybackLayer(layerId, targetOpacity, duration = 500) {
    const map = this.state.getMap();
    if (!map || !map.getLayer(layerId)) return;

    const currentOpacity = map.getPaintProperty(layerId, 'raster-opacity') || 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const opacity = currentOpacity + (targetOpacity - currentOpacity) * eased;

      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'raster-opacity', opacity);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // After fade out completes, hide the layer
        if (targetOpacity === 0 && map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      }
    };

    // If fading in, make visible first
    if (targetOpacity > 0 && map.getLayoutProperty(layerId, 'visibility') !== 'visible') {
      map.setLayoutProperty(layerId, 'visibility', 'visible');
    }

    requestAnimationFrame(animate);
  }

  /**
   * Check if a layer supports filtering
   * @param {string} layerId - Layer ID
   * @returns {boolean}
   */
  layerSupportsFilter(layerId) {
    const map = this.state.getMap();
    if (!map) return false;

    try {
      const layer = map.getLayer(layerId);
      if (!layer) return false;
      return CONFIG.FILTERABLE_LAYER_TYPES.includes(layer.type || '');
    } catch (e) {
      return false;
    }
  }
}
