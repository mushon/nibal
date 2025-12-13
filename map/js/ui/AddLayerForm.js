/**
 * Add Layer form UI component
 * Handles adding GeoJSON/CSV layers and Wayback satellite imagery
 */

import { splitLayerTokens } from '../utils/tokenParser.js';
import { CONFIG } from '../config.js';

export class AddLayerForm {
  constructor(appState, hashRouter) {
    this.state = appState;
    this.hashRouter = hashRouter;
    this.currentTab = 'geodata';
  }

  /**
   * Initialize the add layer form
   */
  initialize() {
    const toggleBtn = document.getElementById('add-layer-btn');
    const form = document.getElementById('add-layer-form');
    
    if (toggleBtn && form) {
      toggleBtn.addEventListener('click', () => {
        const wasHidden = !form.classList.contains('active');
        form.classList.toggle('active');
        if (wasHidden) {
          this._populateReferenceLayerSelect();
        }
      });
    }

    this._setupTabs();
    this._setupForm();
    this._setupTooltips();
  }

  /**
   * Setup tab switching between geodata and satellite
   */
  _setupTabs() {
    const tabGeodataBtn = document.getElementById('tab-geodata');
    const tabSatelliteBtn = document.getElementById('tab-satellite');

    if (tabGeodataBtn) {
      tabGeodataBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._switchTab('geodata');
      });
    }

    if (tabSatelliteBtn) {
      tabSatelliteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._switchTab('satellite');
      });
    }
  }

  /**
   * Setup form submission
   */
  _setupForm() {
    const confirmBtn = document.getElementById('add-layer-confirm-btn');
    if (!confirmBtn) return;

    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this._handleSubmit();
    });
  }

  /**
   * Setup tooltips for form elements
   */
  _setupTooltips() {
    const tabGeodataBtn = document.getElementById('tab-geodata');
    const tabSatelliteBtn = document.getElementById('tab-satellite');
    const geojsonInput = document.getElementById('new-layer-input');
    const satelliteDateInput = document.getElementById('satellite-date-input');
    const refSelect = document.getElementById('reference-layer-select');

    if (tabGeodataBtn) tabGeodataBtn.title = 'Add a GeoJSON/CSV data layer';
    if (tabSatelliteBtn) tabSatelliteBtn.title = 'Add a satellite imagery layer (Wayback)';
    
    if (geojsonInput) {
      geojsonInput.title = 'Type or choose a local filename or URL';
      geojsonInput.addEventListener('input', () => {
        geojsonInput.title = geojsonInput.value || 'Type or choose a local filename or URL';
      });
    }
    
    if (satelliteDateInput) {
      satelliteDateInput.title = 'Pick a date (YYYY-MM-DD)';
      satelliteDateInput.addEventListener('change', () => {
        satelliteDateInput.title = satelliteDateInput.value || 'Pick a date (YYYY-MM-DD)';
      });
    }
    
    if (refSelect) {
      const updateRefTitle = () => {
        const selOpt = refSelect.options[refSelect.selectedIndex];
        refSelect.title = selOpt ? (selOpt.textContent || refSelect.title) : refSelect.title;
      };
      updateRefTitle();
      if (!refSelect.dataset.titleHandler) {
        refSelect.addEventListener('change', updateRefTitle);
        refSelect.dataset.titleHandler = '1';
      }
    }
  }

  /**
   * Switch between tabs
   */
  _switchTab(tabName) {
    this.currentTab = tabName;

    const tabGeodataBtn = document.getElementById('tab-geodata');
    const tabSatelliteBtn = document.getElementById('tab-satellite');
    const geojsonGroup = document.getElementById('geojson-input-group');
    const satelliteGroup = document.getElementById('satellite-input-group');

    // Update tab button states
    if (tabGeodataBtn && tabSatelliteBtn) {
      tabGeodataBtn.classList.toggle('active', tabName === 'geodata');
      tabSatelliteBtn.classList.toggle('active', tabName === 'satellite');
    }

    // Show/hide input groups
    if (geojsonGroup) geojsonGroup.style.display = tabName === 'geodata' ? 'block' : 'none';
    if (satelliteGroup) satelliteGroup.style.display = tabName === 'satellite' ? 'block' : 'none';

    // Update Wayback link with current map view
    if (tabName === 'satellite') {
      const openLink = document.getElementById('wayback-open-new');
      if (openLink && this.state.map) {
        const center = this.state.map.getCenter();
        const zoom = Math.round(this.state.map.getZoom());
        const url = `https://livingatlas.arcgis.com/wayback/#mapCenter=${center.lng.toFixed(5)}%2C${center.lat.toFixed(5)}%2C${zoom}`;
        openLink.href = url;
      }
    }
  }

  /**
   * Handle form submission
   */
  _handleSubmit() {
    const errorEl = document.getElementById('add-layer-error');
    const setError = (msg) => { if (errorEl) errorEl.textContent = msg || ''; };
    
    setError('');

    const refSelect = document.getElementById('reference-layer-select');
    const geojsonInput = document.getElementById('new-layer-input');
    const satelliteDateInput = document.getElementById('satellite-date-input');

    const layerType = this.currentTab === 'satellite' ? 'satellite' : 'geojson';
    const refLayer = refSelect ? refSelect.value.trim() : '';
    let baseLayerId = '';
    let layerId = '';
    let newToken = '';

    // Build layer ID based on type
    if (layerType === 'geojson') {
      const raw = (geojsonInput.value || '').trim();
      if (!raw) {
        setError('Enter a local filename or URL.');
        return;
      }
      baseLayerId = raw;
    } else if (layerType === 'satellite') {
      const dateValue = ((satelliteDateInput ? satelliteDateInput.value : '') || '').trim();
      if (!dateValue) {
        setError('Select a satellite image date.');
        return;
      }
      // Convert YYYY-MM-DD to YYYYMMDD
      const dateStr = dateValue.replace(/-/g, '');
      baseLayerId = `wayback:${dateStr}`;
    }

    // Auto-increment layer ID if base layer already exists
    layerId = baseLayerId;
    let counter = 2;
    while (this.state.map && this.state.map.getLayer && this.state.map.getLayer(layerId)) {
      layerId = `${baseLayerId}#${counter}`;
      counter++;
    }

    // Build token with potentially incremented layerId
    newToken = `+${layerId}`;
    if (refLayer) {
      if (layerType === 'satellite' && refLayer === 'satellite') {
        // Omit (satellite) since it's the default sourceHint
        newToken = `+${layerId}`;
      } else {
        newToken = `+${layerId}(${refLayer})`;
      }
    }

    // Update hash with new layer
    const existing = window.location.hash.replace('#', '');
    const parts = existing.split('/');
    let cameraStr = parts[0] || '';
    
    if (!cameraStr && this.state.map) {
      const c = this.state.map.getCenter();
      cameraStr = `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${this.state.map.getZoom().toFixed(2)},${this.state.map.getBearing().toFixed(1)},${this.state.map.getPitch().toFixed(1)}`;
    }
    
    let layersStr = parts[1] || '';
    const tokens = layersStr ? splitLayerTokens(layersStr) : [];

    // Check if this exact layer ID already exists and replace, otherwise append
    const escapedLayerId = layerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^[+~]${escapedLayerId}(?:\\([^)]*\\))?(?::follow(?:\\+\\d*)?)?$`);
    const idx = tokens.findIndex(t => regex.test(t));
    
    if (idx >= 0) {
      tokens[idx] = newToken;
    } else {
      tokens.push(newToken);
    }

    this.hashRouter.updateHash({ layerTokens: tokens });

    // Clear inputs
    if (geojsonInput) geojsonInput.value = '';
    if (satelliteDateInput) satelliteDateInput.value = '';
    if (refSelect) refSelect.value = '';

    // Hide form
    const form = document.getElementById('add-layer-form');
    if (form) form.classList.remove('active');
  }

  /**
   * Populate reference layer dropdown with current layers
   */
  _populateReferenceLayerSelect() {
    const refSelect = document.getElementById('reference-layer-select');
    if (!refSelect || !this.state.map) return;

    // Preserve first option (default positioning)
    const defaultOption = refSelect.querySelector('option[value=""]');
    refSelect.innerHTML = '';
    if (defaultOption) {
      refSelect.appendChild(defaultOption);
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Default positioning';
      refSelect.appendChild(opt);
    }

    // Add all visible layers
    this.state.allStyleLayers.forEach(layer => {
      if (this.state.map.getLayer(layer.id)) {
        const opt = document.createElement('option');
        opt.value = layer.id;
        opt.textContent = layer.name || layer.id;
        refSelect.appendChild(opt);
      }
    });
  }
}
