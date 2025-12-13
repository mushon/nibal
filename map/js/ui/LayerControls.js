/**
 * Layer controls panel UI component
 * Manages layer list with visibility toggles, filters, follow mode, and deletion
 */

import { splitLayerTokens, parseParenArgs, buildParenArgs } from '../utils/tokenParser.js';

export class LayerControls {
  constructor(appState, hashRouter, layerManager) {
    this.state = appState;
    this.hashRouter = hashRouter;
    this.layerManager = layerManager;
    this.container = null;
    this.createTimeout = null;
  }

  /**
   * Initialize layer controls in the specified container
   * @param {string} containerId - DOM container ID
   */
  initialize(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`LayerControls: Container #${containerId} not found`);
      return;
    }
  }

  /**
   * Debounced version of createControls for expensive operations
   */
  createDebounced() {
    if (this.createTimeout) clearTimeout(this.createTimeout);
    this.createTimeout = setTimeout(() => {
      this.create();
    }, 10);
  }

  /**
   * Create/update layer controls based on current state
   */
  create() {
    if (!this.container) return;

    const map = this.state.map;
    if (!map) return;

    // Performance: Build HTML in array then join once
    const htmlParts = [];
    let foundLayer = false;

    // Parse current hash for explicit toggles and :follow flags
    const hash = window.location.hash.replace('#', '');
    const [, layersStr] = hash.split('/');

    // Use cached hash state from AppState
    const { explicitState, followState, followOffsets, showTicker, layerFilters } = 
      this.hashRouter.parseHash();

    // Include all style layers and any geojson-above-* layers
    const allLayers = [
      ...this.state.allStyleLayers,
      ...map.getStyle().layers
        .filter(l => l.id.startsWith('geojson-above-') && 
                    !this.state.allStyleLayers.some(s => s.id === l.id))
        .map(l => ({ id: l.id }))
    ];

    // Order from highest (topmost) to lowest (bottommost)
    allLayers.reverse();

    allLayers.forEach(layer => {
      if (map.getLayer(layer.id)) {
        foundLayer = true;
        const vis = map.getLayoutProperty(layer.id, 'visibility');
        const defaultVis = this.state.getStyleDefaultVisibility(layer.id) || 'visible';
        
        let checked, bold, showReset = false;
        
        if (explicitState[layer.id] === '+') {
          checked = 'checked';
          bold = true;
          showReset = (defaultVis !== 'visible');
        } else if (explicitState[layer.id] === '~') {
          checked = '';
          bold = true;
          showReset = (defaultVis !== 'none');
        } else {
          checked = (defaultVis === 'visible') ? 'checked' : '';
          bold = false;
          showReset = false;
        }

        let label = layer.name || layer.id;
        // Strip file extensions from label for cleaner display
        label = label.replace(/\.(geojson|json|csv)$/i, '');

        // Append sourceHint if present in hash
        let sourceHintForLabel = null;
        if (layersStr) {
          const tokensRaw = splitLayerTokens(layersStr);
          for (const t of tokensRaw) {
            const m = t.match(/^([+~])([^()#]+?(?:#\d+)?)(?:\(([^)]*)\))?(?::follow(?:\+\d*)?)?$/);
            if (m) {
              const [, , lnameMaybe, parenContent] = m;
              if (lnameMaybe === layer.id && parenContent) {
                const parsed = parseParenArgs(parenContent);
                if (parsed.sourceHint) sourceHintForLabel = parsed.sourceHint;
                break;
              }
            }
          }
        }
        if (sourceHintForLabel) {
          label += ` (${sourceHintForLabel})`;
        }

        // Check layer properties
        const isExternalLayer = this.state.externalLayers.has(layer.id);
        const isFollowable = this.state.followableLayers.has(layer.id);
        const isFollowing = followState[layer.id] || false;
        const hasTickerFlag = showTicker[layer.id] || false;
        const layerFilter = layerFilters[layer.id] || '';
        const hasFilter = !!layerFilter;

        // Apply styling
        const labelStyle = isExternalLayer ? 
          'font-weight:bold;color:#4caf50;' : 
          (bold ? 'font-weight:bold;' : '');

        // Build button HTML
        let buttonHtml = '';

        // Add filter button/input only for external layers
        if (isExternalLayer && this.layerManager.layerSupportsFilter(layer.id)) {
          const filterClass = hasFilter ? ' class="active"' : '';
          const filterInputClass = hasFilter ? ' class="active"' : '';
          buttonHtml += ` <button data-filter="${layer.id}" title="Add/edit feature filter"${filterClass}>ᯤ</button>`;
          buttonHtml += ` <input type="text" data-filter-input="${layer.id}" value="${layerFilter}" placeholder="key=value[,key=value]"${filterInputClass} class="filter-input" title="Filter expressions (comma-separated), e.g., name=jabalia or name=jabalia|beit_hanoun or name=jabalia,type!=boundary)">`;
          const propSelectActive = hasFilter ? ' active' : '';
          buttonHtml += ` <select data-filter-prop="${layer.id}" class="filter-prop-select${propSelectActive}" title="Common properties for ${layer.id}"><option value="">— property —</option></select>`;
        }

        // Add follow button for followable layers
        if (isFollowable) {
          const followClass = isFollowing ? ' class="active"' : '';
          const offsetValue = followOffsets[layer.id] || 0;
          const shouldShowInput = isFollowing || hasTickerFlag;
          const inputClass = shouldShowInput ? ' class="active"' : '';
          const inputValue = (isFollowing && !hasTickerFlag) ? '+' : offsetValue;
          buttonHtml += ` <button data-follow="${layer.id}" title="Toggle follow animation"${followClass}>➠</button>`;
          buttonHtml += ` <input type="text" data-follow-offset="${layer.id}" value="${inputValue}" placeholder="+"${inputClass} class="follow-offset-input" title="Distance offset in meters, or + to show ticker from 0">`;
        }

        if (isExternalLayer) {
          buttonHtml += ` <button data-delete="${layer.id}" title="Delete layer">×</button>`;
        } else if (explicitState[layer.id]) {
          buttonHtml += ` <button data-reset="${layer.id}" title="Reset to style default">↻</button>`;
        }

        // Build comprehensive tooltip
        const tooltipParts = [];
        tooltipParts.push(`Layer: ${layer.id}`);
        if (sourceHintForLabel) tooltipParts.push(`Source style: ${sourceHintForLabel}`);
        if (isExternalLayer) tooltipParts.push('External data layer');
        if (isFollowable) tooltipParts.push('Path geometry (followable)');
        if (isFollowing) tooltipParts.push(`Following path${showTicker[layer.id] ? ' (ticker active)' : ''}`);
        if (hasFilter) tooltipParts.push(`Filter: ${layerFilter}`);
        const itemTitle = tooltipParts.join(' • ');

        htmlParts.push(`<span class="layer-list-item" data-layer-item="${layer.id}" title="${itemTitle}"><label style="${labelStyle}" title="${itemTitle}"><input type="checkbox" data-layer="${layer.id}" ${checked} title="Toggle visibility for ${layer.id}"> ${label}</label>${buttonHtml}</span>`);
      }
    });

    if (!foundLayer) {
      htmlParts.push('<em>No toggleable layers found in the current style.</em>');
    }

    // Performance: Single DOM update
    this.container.innerHTML = htmlParts.join('');

    // Populate active property dropdowns
    this.container.querySelectorAll('select[data-filter-prop].active').forEach(sel => {
      const lid = sel.getAttribute('data-filter-prop');
      this._populateFilterPropsDropdown(lid, sel);
    });

    // Attach event listeners
    this._attachEventListeners();
  }

  /**
   * Attach all event listeners to layer control elements
   */
  _attachEventListeners() {
    if (!this.container) return;

    const map = this.state.map;

    // Checkbox listeners
    this.container.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        this._handleVisibilityToggle(cb.getAttribute('data-layer'), cb.checked);
      });
    });

    // Reset button listeners
    this.container.querySelectorAll('button[data-reset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleReset(btn.getAttribute('data-reset'));
      });
    });

    // Follow button listeners
    this.container.querySelectorAll('button[data-follow]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleFollowToggle(btn.getAttribute('data-follow'));
      });
    });

    // Follow offset input listeners
    this.container.querySelectorAll('input[data-follow-offset]').forEach(input => {
      const handleUpdate = (e) => this._handleFollowOffsetUpdate(input, e);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleUpdate(e);
        }
      });
      input.addEventListener('change', handleUpdate);
    });

    // Delete button listeners
    this.container.querySelectorAll('button[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleDelete(btn.getAttribute('data-delete'));
      });
    });

    // Filter button listeners
    this.container.querySelectorAll('button[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleFilterButtonClick(btn.getAttribute('data-filter'));
      });
    });

    // Filter input listeners
    this.container.querySelectorAll('input[data-filter-input]').forEach(input => {
      const handleUpdate = () => this._handleFilterUpdate(input);
      input.addEventListener('blur', handleUpdate);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        }
      });
    });

    // Property dropdown listeners
    this.container.querySelectorAll('select[data-filter-prop]').forEach(sel => {
      sel.addEventListener('change', () => {
        this._handleFilterPropSelect(sel);
      });
    });
  }

  /**
   * Handle visibility toggle for a layer
   */
  _handleVisibilityToggle(layerId, checked) {
    const map = this.state.map;
    if (!map.getLayer(layerId)) return;

    const hash = window.location.hash.replace('#', '');
    const [cameraStr, layersStr] = hash.split('/');
    const tokenMap = {};

    if (layersStr) {
      splitLayerTokens(layersStr).forEach(token => {
        const match = token.match(/^([+~])([^()]+?)(?:\([^)]*\))?(?::follow(?:\+\d*)?)?$/);
        if (!match) return;
        const [, sign, lname] = match;
        tokenMap[lname] = token;
      });
    }

    if (checked) {
      if (tokenMap[layerId]) {
        tokenMap[layerId] = tokenMap[layerId].replace(/^[+~]/, '+');
      } else {
        tokenMap[layerId] = `+${layerId}`;
      }
      map.setLayoutProperty(layerId, 'visibility', 'visible');
    } else {
      if (tokenMap[layerId]) {
        tokenMap[layerId] = tokenMap[layerId].replace(/^[+~]/, '~');
      } else {
        tokenMap[layerId] = `~${layerId}`;
      }
      map.setLayoutProperty(layerId, 'visibility', 'none');
    }

    const tokens = Object.values(tokenMap);
    this.hashRouter.updateHash({ layerTokens: tokens });
  }

  /**
   * Handle reset button click
   */
  _handleReset(layerId) {
    const map = this.state.map;
    const hash = window.location.hash.replace('#', '');
    const [cameraStr, layersStr] = hash.split('/');
    const explicitState = {};

    if (layersStr) {
      splitLayerTokens(layersStr).forEach(token => {
        const match = token.match(/^([+~])(.+)$/);
        if (!match) return;
        const [, sign, lname] = match;
        explicitState[lname] = sign;
      });
    }

    delete explicitState[layerId];
    const defaultVis = this.state.getStyleDefaultVisibility(layerId) || 'visible';
    map.setLayoutProperty(layerId, 'visibility', defaultVis);

    const tokens = Object.entries(explicitState).map(([lname, sign]) => `${sign}${lname}`);
    this.hashRouter.updateHash({ layerTokens: tokens });
  }

  /**
   * Handle follow button toggle
   */
  _handleFollowToggle(layerId) {
    const hash = window.location.hash.replace('#', '');
    const [cameraStr, layersStr] = hash.split('/');

    if (!layersStr) return;

    const tokens = splitLayerTokens(layersStr).map(token => {
      const match = token.match(/^([+~])([^()]+?)(?:\(([^)]*)\))?(?::follow(\+(\d*))?)?$/);
      if (!match) return token;
      const [, sign, lname, parenContent, followFlag] = match;
      const { sourceHint, filters } = parseParenArgs(parenContent || '');

      if (lname === layerId) {
        let newToken = `${sign}${lname}`;
        const paren = buildParenArgs(sourceHint, filters);
        if (paren) newToken += paren;

        if (followFlag) {
          // Remove :follow
          return newToken;
        } else {
          // Add :follow and focus offset input
          setTimeout(() => {
            const input = this.container.querySelector(`input[data-follow-offset="${layerId}"]`);
            if (input) {
              input.focus();
              const len = input.value.length;
              input.setSelectionRange(len, len);
            }
          }, 100);
          return newToken + ':follow';
        }
      }

      return token;
    });

    this.hashRouter.updateHash({ layerTokens: tokens });
  }

  /**
   * Handle follow offset input update
   */
  _handleFollowOffsetUpdate(input, e) {
    const layerId = input.getAttribute('data-follow-offset');
    const inputValue = input.value.trim();

    const hash = window.location.hash.replace('#', '');
    const [cameraStr, layersStr] = hash.split('/');

    if (!layersStr) return;

    const tokens = splitLayerTokens(layersStr).map(token => {
      const match = token.match(/^([+~])([^()]+?)(?:\(([^)]*)\))?(?::follow(\+(\d*))?)?$/);
      if (!match) return token;
      const [, sign, lname, parenContent, followFlag] = match;
      const { sourceHint, filters } = parseParenArgs(parenContent || '');
      const hasFollow = !!followFlag;

      if (lname === layerId && hasFollow) {
        let newToken = `${sign}${lname}`;
        const paren = buildParenArgs(sourceHint, filters);
        if (paren) newToken += paren;

        let followSuffix;
        if (inputValue === '') {
          followSuffix = ':follow';
          input.value = '+';
        } else if (inputValue === '+') {
          followSuffix = ':follow+';
          input.value = '+';
        } else if (inputValue === '0' || inputValue === '+0') {
          followSuffix = ':follow+0';
          input.value = '0';
        } else {
          const cleanValue = inputValue.startsWith('+') ? inputValue.slice(1) : inputValue;
          const numValue = parseInt(cleanValue, 10);
          if (!isNaN(numValue) && numValue >= 0) {
            followSuffix = `:follow+${numValue}`;
            input.value = numValue.toString();
          } else {
            followSuffix = ':follow+';
            input.value = '+';
          }
        }
        return newToken + followSuffix;
      }

      return token;
    });

    this.hashRouter.updateHash({ layerTokens: tokens });
  }

  /**
   * Handle delete button click
   */
  _handleDelete(layerId) {
    const map = this.state.map;
    const hash = window.location.hash.replace('#', '');
    const [cameraStr, layersStr] = hash.split('/');
    const tokens = layersStr ? splitLayerTokens(layersStr) : [];

    const escapedLayerId = layerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^[+~]${escapedLayerId}(?:\\([^)]*\\))?(?::follow(?:\\+\\d*)?)?$`);
    const filteredTokens = tokens.filter(t => !regex.test(t));

    // Remove from map and state
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(layerId)) map.removeSource(layerId);
    
    const idx = this.state.allStyleLayers.findIndex(l => l.id === layerId);
    if (idx !== -1) this.state.allStyleLayers.splice(idx, 1);
    
    this.state.removeStyleDefaultVisibility(layerId);
    this.state.externalLayers.delete(layerId);
    this.state.followableLayers.delete(layerId);

    this.hashRouter.updateHash({ layerTokens: filteredTokens });
  }

  /**
   * Handle filter button click
   */
  _handleFilterButtonClick(layerId) {
    const filterInput = this.container.querySelector(`input[data-filter-input="${layerId}"]`);
    const propSelect = this.container.querySelector(`select[data-filter-prop="${layerId}"]`);
    const filterBtn = this.container.querySelector(`button[data-filter="${layerId}"]`);

    if (filterInput) {
      filterInput.classList.toggle('active');
      filterBtn.classList.toggle('active');

      if (filterInput.classList.contains('active')) {
        filterInput.focus();
      } else {
        if (!filterInput.value.trim()) {
          this._updateFilterInHash(layerId, '');
        }
      }
    }

    if (propSelect) {
      propSelect.classList.toggle('active');
      if (propSelect.classList.contains('active')) {
        this._populateFilterPropsDropdown(layerId, propSelect);
      }
    }
  }

  /**
   * Handle filter input update
   */
  _handleFilterUpdate(input) {
    const layerId = input.getAttribute('data-filter-input');
    const filterExpr = input.value.trim();
    this._updateFilterInHash(layerId, filterExpr);
  }

  /**
   * Handle filter property dropdown selection
   */
  _handleFilterPropSelect(selectEl) {
    const layerId = selectEl.getAttribute('data-filter-prop');
    const prop = selectEl.value;
    if (!prop) return;

    const filterInput = this.container.querySelector(`input[data-filter-input="${layerId}"]`);
    if (filterInput) {
      const prev = (filterInput.value || '').trim();
      if (!prev || !prev.startsWith(prop + '=')) {
        filterInput.value = `${prop}=`;
      }
      filterInput.focus();
      const len = filterInput.value.length;
      filterInput.setSelectionRange(len, len);
    }
  }

  /**
   * Update filter in hash
   */
  _updateFilterInHash(layerId, filterExpr) {
    const hash = window.location.hash.replace('#', '');
    const [cameraStr, layersStr] = hash.split('/');

    if (!layersStr) return;

    const tokens = splitLayerTokens(layersStr).map(token => {
      const match = token.match(/^([+~])([^()]+?(?:#\d+)?)(?:\(([^)]*)\))?(?::follow(\+(\d*))?)?$/);
      if (!match) return token;
      const [, sign, lname, parenContent, followFlag] = match;
      const { sourceHint, filters } = parseParenArgs(parenContent || '');
      
      if (lname === layerId) {
        let newToken = `${sign}${lname}`;
        const newFilters = (filterExpr && filterExpr.trim()) ? 
          filterExpr.split(',').map(s => s.trim()).filter(Boolean) : [];
        const paren = buildParenArgs(sourceHint, newFilters);
        if (paren) newToken += paren;
        if (followFlag) newToken += ':follow' + followFlag;
        return newToken;
      }

      return token;
    });

    this.hashRouter.updateHash({ layerTokens: tokens });
  }

  /**
   * Populate common properties dropdown
   */
  _populateFilterPropsDropdown(layerId, selectEl) {
    if (!selectEl) return;

    const map = this.state.map;
    
    try {
      let feats = [];
      
      // Try rendered features first
      try {
        feats = map.queryRenderedFeatures(undefined, { layers: [layerId] }) || [];
      } catch(e) { feats = []; }

      // Try source data if no rendered features
      if (!feats.length) {
        const src = map.getSource(layerId);
        if (src && src._data && src._data.features) {
          feats = src._data.features.map(f => ({ properties: f.properties || {} }));
        }
      }

      // Try vector tile cache
      if (!feats.length) {
        const styleLayer = (map.getStyle().layers || []).find(l => l.id === layerId);
        if (styleLayer && styleLayer.source && styleLayer['source-layer']) {
          try {
            const srcFeats = map.querySourceFeatures(styleLayer.source, { 
              sourceLayer: styleLayer['source-layer'] 
            }) || [];
            feats = srcFeats.map(f => ({ properties: f.properties || {} }));
          } catch(e) {}
        }
      }

      const sampleSize = Math.min(100, feats.length);
      const propsCount = {};
      
      for (let i = 0; i < sampleSize; i++) {
        const f = feats[i];
        if (!f || !f.properties) continue;
        Object.keys(f.properties).forEach(k => {
          if (!k) return;
          propsCount[k] = (propsCount[k] || 0) + 1;
        });
      }

      const commonProps = Object.entries(propsCount)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key)
        .slice(0, 30);

      // Preserve placeholder
      const placeholder = selectEl.querySelector('option[value=""]');
      selectEl.innerHTML = '';
      
      if (placeholder) {
        selectEl.appendChild(placeholder);
      } else {
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = '— property —';
        selectEl.appendChild(ph);
      }

      commonProps.forEach(prop => {
        const opt = document.createElement('option');
        opt.value = prop;
        opt.textContent = prop;
        selectEl.appendChild(opt);
      });
    } catch(e) {
      console.error('Error populating filter properties:', e);
    }
  }

  /**
   * Setup reset-all button handler
   */
  setupResetAllButton(buttonId) {
    const resetAllBtn = document.getElementById(buttonId);
    if (!resetAllBtn) return;

    resetAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const map = this.state.map;

      // Reset all layers to style defaults
      Object.keys(this.state.styleDefaultVisibility).forEach(layerId => {
        const defaultVis = this.state.getStyleDefaultVisibility(layerId);
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', defaultVis);
        }
      });

      // Clear all explicit layer states from hash
      this.hashRouter.updateHash({ layerTokens: [] });
    });
  }
}
