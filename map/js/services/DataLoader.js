/**
 * Data loading service for GeoJSON, CSV, and Wayback satellite imagery
 */

import { CONFIG } from '../config.js';

export class DataLoader {
  constructor(appState) {
    this.state = appState;
  }

  /**
   * Load GeoJSON or CSV data with automatic fallback
   * Supports explicit file extensions (.geojson, .csv) and searches multiple paths
   * @param {string} filename - File name (with or without extension)
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   */
  async loadGeoJSON(filename) {
    // Extract base filename components
    const counterMatch = filename.match(/^(.+?)(#\d+)?(\.(?:geo)?json|\.csv)?$/);
    const baseName = counterMatch ? counterMatch[1] : filename.replace(/\.(geo)?json$|\.csv$/i, '');
    const extension = counterMatch ? (counterMatch[3] || '') : '';
    
    // Use explicit extension if provided, otherwise try both
    const baseFile = extension ? (baseName + extension) : baseName;
    
    return await this._loadAsGeoJSONOrCSV(baseFile);
  }

  /**
   * Load Wayback satellite imagery layer configuration
   * @param {string} dateStr - Date in YYYYMMDD format
   * @returns {Promise<Object>} Layer configuration with tile URL and metadata
   */
  async loadWaybackLayer(dateStr) {
    // Validate date format
    if (!/^\d{8}$/.test(dateStr)) {
      throw new Error('Invalid date format. Expected YYYYMMDD, got: ' + dateStr);
    }
    
    // Parse date
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const requestDate = `${year}-${month}-${day}`;
    
    // Fetch Wayback configuration
    const configResponse = await fetch(CONFIG.DATA_PATHS.WAYBACK_CONFIG_URL);
    if (!configResponse.ok) {
      throw new Error('Failed to fetch Wayback configuration');
    }
    
    const config = await configResponse.json();
    
    // Parse releases and find closest one to requested date
    const releases = Object.entries(config).map(([releaseId, info]) => {
      // Extract date from title like "World Imagery (Wayback 2024-11-18)"
      const match = info.itemTitle.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return {
          releaseId,
          date: match[1],
          dateObj: new Date(match[1]),
          title: info.itemTitle
        };
      }
      return null;
    }).filter(r => r !== null);
    
    // Sort by date
    releases.sort((a, b) => a.dateObj - b.dateObj);
    
    // Find closest release to requested date
    const targetDate = new Date(requestDate);
    let closestRelease = releases[0];
    let minDiff = Math.abs(targetDate - releases[0].dateObj);
    
    for (const release of releases) {
      const diff = Math.abs(targetDate - release.dateObj);
      if (diff < minDiff) {
        minDiff = diff;
        closestRelease = release;
      }
      // If we've passed the target date, stop
      if (release.dateObj > targetDate) {
        break;
      }
    }
    
    // ESRI Wayback tile URL
    const tileUrl = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/world_imagery/wmts/1.0.0/default028mm/mapserver/tile/${closestRelease.releaseId}/{z}/{y}/{x}`;
    
    return {
      sourceConfig: {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 22,
        attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
      },
      metadata: {
        releaseId: closestRelease.releaseId,
        date: closestRelease.date,
        title: closestRelease.title
      }
    };
  }

  /**
   * Convert CSV text to GeoJSON using Papa Parse
   * @param {string} csvText - Raw CSV text
   * @returns {Object} GeoJSON FeatureCollection
   * @private
   */
  _csvTextToGeoJSON(csvText) {
    if (typeof Papa === 'undefined' || !Papa.parse) {
      throw new Error('CSV parsing library not loaded.');
    }
    
    const res = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
    
    if (res.errors && res.errors.length) {
      console.warn('CSV parse warnings:', res.errors);
    }
    
    const rows = res.data || [];
    if (!rows.length) {
      return { type: 'FeatureCollection', features: [] };
    }
    
    // Find lat/lon columns (case-insensitive)
    const keys = Object.keys(rows[0] || {});
    const lowerMap = Object.fromEntries(keys.map(k => [k.toLowerCase(), k]));
    const latCandidates = ['lat', 'latitude', 'y'];
    const lonCandidates = ['lon', 'lng', 'long', 'longitude', 'x'];
    const latKey = latCandidates.map(k => lowerMap[k]).find(Boolean);
    const lonKey = lonCandidates.map(k => lowerMap[k]).find(Boolean);
    
    if (!latKey || !lonKey) {
      throw new Error('CSV missing latitude/longitude columns');
    }
    
    const features = [];
    for (const row of rows) {
      const lat = parseFloat(row[latKey]);
      const lon = parseFloat(row[lonKey]);
      if (!isFinite(lat) || !isFinite(lon)) continue;
      
      const props = { ...row };
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: props
      });
    }
    
    return { type: 'FeatureCollection', features };
  }

  /**
   * Load file as GeoJSON or CSV with automatic fallback
   * Tries multiple paths: same dir, ./data/, ../data/
   * @param {string} path - File path
   * @returns {Promise<Object>} GeoJSON FeatureCollection
   * @private
   */
  async _loadAsGeoJSONOrCSV(path) {
    const lower = path.toLowerCase();
    const isCSV = lower.endsWith('.csv');
    const isJSON = lower.endsWith('.geojson') || lower.endsWith('.json');
    
    // Remove extension to get base name
    const base = path.replace(/\.(geo)?json$/i, '').replace(/\.csv$/i, '');
    const nameOnly = base.split('/').pop();
    
    // Build paths
    const sameDirGeo = `${base}.geojson`;
    const sameDirCsv = `${base}.csv`;
    const dataDirCsv = `${base.substring(0, base.lastIndexOf('/')) !== '' ? base.substring(0, base.lastIndexOf('/')) + '/' : ''}data/${nameOnly}.csv`;
    const upDataDirCsv = `../data/${nameOnly}.csv`;

    // If explicit extension provided, try that first with fallbacks
    if (isJSON) {
      try {
        const r = await fetch(path);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } catch (e) {
        // Fallback to CSV beside it
        try {
          const r2 = await fetch(sameDirCsv);
          if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
          const txt = await r2.text();
          return this._csvTextToGeoJSON(txt);
        } catch (e2) {
          // Try ./data/ and ../data/
          try {
            const r3 = await fetch(dataDirCsv);
            if (!r3.ok) throw new Error(`HTTP ${r3.status}`);
            const txt3 = await r3.text();
            return this._csvTextToGeoJSON(txt3);
          } catch (e3) {
            try {
              const r4 = await fetch(upDataDirCsv);
              if (!r4.ok) throw new Error(`HTTP ${r4.status}`);
              const txt4 = await r4.text();
              return this._csvTextToGeoJSON(txt4);
            } catch (e4) {
              throw new Error(`Failed to load as GeoJSON (${path}) or CSV (${sameDirCsv} | ${dataDirCsv} | ${upDataDirCsv}).`);
            }
          }
        }
      }
    } else if (isCSV) {
      try {
        const r = await fetch(path);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const txt = await r.text();
        return this._csvTextToGeoJSON(txt);
      } catch (e) {
        // Fallback to GeoJSON beside it
        try {
          const r2 = await fetch(sameDirGeo);
          if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
          return await r2.json();
        } catch (e2) {
          throw new Error(`Failed to load as CSV (${path}) or GeoJSON (${sameDirGeo}).`);
        }
      }
    } else {
      // No extension provided: try .geojson then .csv
      try {
        const r = await fetch(sameDirGeo);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } catch (e) {
        try {
          const r2 = await fetch(sameDirCsv);
          if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
          const txt = await r2.text();
          return this._csvTextToGeoJSON(txt);
        } catch (e2) {
          // Try ./data/ and ../data/
          try {
            const r3 = await fetch(dataDirCsv);
            if (!r3.ok) throw new Error(`HTTP ${r3.status}`);
            const txt3 = await r3.text();
            return this._csvTextToGeoJSON(txt3);
          } catch (e3) {
            try {
              const r4 = await fetch(upDataDirCsv);
              if (!r4.ok) throw new Error(`HTTP ${r4.status}`);
              const txt4 = await r4.text();
              return this._csvTextToGeoJSON(txt4);
            } catch (e4) {
              throw new Error(`Failed to load ${nameOnly} as .geojson or .csv (searched: ${sameDirGeo}, ${sameDirCsv}, ${dataDirCsv}, ${upDataDirCsv})`);
            }
          }
        }
      }
    }
  }
}
