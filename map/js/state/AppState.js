/**
 * Central application state management
 * Provides a single source of truth for all map-related state
 */
export class AppState {
  constructor() {
    // Core map instance
    this.map = null;
    
    // Layer registry
    this.allStyleLayers = []; // { id, name } objects
    this.styleDefaultVisibility = {}; // layerId -> 'visible'|'none'
    this.styleDefaultFilter = {}; // layerId -> filter array or null
    
    // Layer sets
    this.externalLayers = new Set(); // Dynamically loaded layers (GeoJSON, CSV, Wayback)
    this.followableLayers = new Set(); // Layers with path geometry
    
    // Follow mode state
    this.followOffsets = {}; // layerId -> offset in meters
    this.showTicker = {}; // layerId -> boolean (show distance ticker)
    this.isFreeCameraAnimating = false;
    this._followHandle = null; // Current follow animation handle
    
    // Mobile state
    this._mobileZoomAdjusted = false;
    this._skipNextHashUpdate = false;
    
    // Hash state tracking
    this._lastHashState = '';
    this._suppressNextFollowCancel = false;
    this._isFollowStarted = false;
    
    // Change listeners
    this._listeners = {};
  }
  
  // Map management
  setMap(map) {
    this.map = map;
    this.emit('map:changed', map);
  }
  
  getMap() {
    return this.map;
  }
  
  // Layer management
  addStyleLayer(layerInfo) {
    if (!this.allStyleLayers.some(l => l.id === layerInfo.id)) {
      this.allStyleLayers.push(layerInfo);
      this.emit('layer:added', layerInfo);
    }
  }
  
  removeStyleLayer(layerId) {
    const index = this.allStyleLayers.findIndex(l => l.id === layerId);
    if (index !== -1) {
      this.allStyleLayers.splice(index, 1);
      this.emit('layer:removed', layerId);
    }
  }
  
  addExternalLayer(layerId) {
    this.externalLayers.add(layerId);
    this.emit('externalLayer:added', layerId);
  }
  
  removeExternalLayer(layerId) {
    this.externalLayers.delete(layerId);
    this.followableLayers.delete(layerId);
    delete this.followOffsets[layerId];
    delete this.showTicker[layerId];
    this.emit('externalLayer:removed', layerId);
  }
  
  isExternalLayer(layerId) {
    return this.externalLayers.has(layerId);
  }
  
  // Followable layers
  setFollowable(layerId, isFollowable) {
    if (isFollowable) {
      this.followableLayers.add(layerId);
    } else {
      this.followableLayers.delete(layerId);
    }
    this.emit('layer:followable:changed', { layerId, isFollowable });
  }
  
  isFollowable(layerId) {
    return this.followableLayers.has(layerId);
  }
  
  // Follow mode
  setFollowOffset(layerId, offset) {
    this.followOffsets[layerId] = offset;
    this.emit('follow:offset:changed', { layerId, offset });
  }
  
  setShowTicker(layerId, show) {
    this.showTicker[layerId] = show;
    this.emit('follow:ticker:changed', { layerId, show });
  }
  
  setFreeCameraAnimating(isAnimating) {
    this.isFreeCameraAnimating = isAnimating;
    this.emit('follow:animating:changed', isAnimating);
  }
  
  setFollowHandle(handle) {
    this._followHandle = handle;
  }
  
  getFollowHandle() {
    return this._followHandle;
  }
  
  // Layer defaults
  setStyleDefaultVisibility(layerId, visibility) {
    this.styleDefaultVisibility[layerId] = visibility;
  }
  
  getStyleDefaultVisibility(layerId) {
    return this.styleDefaultVisibility[layerId] || 'visible';
  }
  
  removeStyleDefaultVisibility(layerId) {
    delete this.styleDefaultVisibility[layerId];
  }
  
  setStyleDefaultFilter(layerId, filter) {
    this.styleDefaultFilter[layerId] = filter;
  }
  
  getStyleDefaultFilter(layerId) {
    return this.styleDefaultFilter[layerId];
  }
  
  // Hash state flags
  setMobileZoomAdjusted(adjusted) {
    this._mobileZoomAdjusted = adjusted;
  }
  
  getMobileZoomAdjusted() {
    return this._mobileZoomAdjusted;
  }
  
  setSkipNextHashUpdate(skip) {
    this._skipNextHashUpdate = skip;
  }
  
  getSkipNextHashUpdate() {
    return this._skipNextHashUpdate;
  }
  
  setLastHashState(hash) {
    this._lastHashState = hash;
  }
  
  getLastHashState() {
    return this._lastHashState;
  }
  
  setSuppressNextFollowCancel(suppress) {
    this._suppressNextFollowCancel = suppress;
  }
  
  getSuppressNextFollowCancel() {
    return this._suppressNextFollowCancel;
  }
  
  setFollowStarted(started) {
    this._isFollowStarted = started;
  }
  
  getFollowStarted() {
    return this._isFollowStarted;
  }
  
  // Event system
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  }
  
  off(event, callback) {
    if (!this._listeners[event]) return;
    const index = this._listeners[event].indexOf(callback);
    if (index !== -1) {
      this._listeners[event].splice(index, 1);
    }
  }
  
  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(callback => callback(data));
  }
  
  // Utility: Get all visible layers
  getVisibleLayerIds() {
    if (!this.map) return [];
    return this.allStyleLayers
      .filter(l => {
        const layer = this.map.getLayer(l.id);
        return layer && this.map.getLayoutProperty(l.id, 'visibility') === 'visible';
      })
      .map(l => l.id);
  }
  
  // Reset state (for testing)
  reset() {
    this.map = null;
    this.allStyleLayers = [];
    this.styleDefaultVisibility = {};
    this.styleDefaultFilter = {};
    this.externalLayers.clear();
    this.followableLayers.clear();
    this.followOffsets = {};
    this.showTicker = {};
    this.isFreeCameraAnimating = false;
    this._followHandle = null;
    this._mobileZoomAdjusted = false;
    this._skipNextHashUpdate = false;
    this._lastHashState = '';
    this._suppressNextFollowCancel = false;
    this._isFollowStarted = false;
    this._listeners = {};
  }
}
