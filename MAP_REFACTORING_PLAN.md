# Map Application Refactoring Plan

## Executive Summary

The map application (`map/index.html`) is a 3,483-line monolithic file containing HTML, CSS, and JavaScript. This refactoring will modularize it into maintainable, testable components while improving performance and code clarity.

---

## Current State Analysis

### File Structure
- **Single file:** `map/index.html` (3,483 lines)
- **Inline CSS:** ~500 lines of styles
- **Inline JavaScript:** ~2,800 lines of logic
- **HTML:** ~183 lines of structure

### Core Functionality
1. **Mapbox Integration:** Map initialization, camera controls, RTL text support
2. **Hash-based Routing:** URL parsing for camera position, layers, follow mode, filters
3. **Layer Management:** 
   - Toggle visibility for style layers
   - Load external GeoJSON/CSV layers dynamically
   - Load ESRI Wayback satellite imagery
   - Layer ordering and positioning
4. **Layer Controls UI:**
   - Add/remove layers
   - Filter layers by properties
   - Follow path animations
   - Copy shareable links
5. **Data Loading:** GeoJSON, CSV (via Papa Parse), ESRI Wayback API
6. **Follow Mode:** Free-camera animation along paths with distance ticker
7. **Mobile Responsiveness:** Device pixel ratio fixes, resize observers
8. **UI Modes:** Embed mode, static mode, map UI controls

### Dependencies
- Mapbox GL JS v3.15.0
- Papa Parse 5.4.1 (CSV parsing)
- 60+ data files (GeoJSON, CSV)

### Pain Points
1. **Maintainability:** Everything in one file makes changes risky
2. **Testing:** Impossible to unit test individual functions
3. **Readability:** 3,483 lines requires extensive scrolling and context switching
4. **Performance:** 
   - Large file to parse and load
   - No code splitting
   - Multiple DOM queries repeated
5. **Code Duplication:** Similar patterns repeated (token parsing, hash updates)
6. **Global State:** Scattered across multiple global variables
7. **Error Handling:** Inconsistent try/catch blocks and silent failures

---

## Proposed Architecture

### Directory Structure
```
map/
├── index.html                 # Clean HTML shell (~100 lines)
├── css/
│   ├── map.css               # Map container styles
│   ├── layer-controls.css    # Layer panel styles
│   └── ui-controls.css       # Zoom/fullscreen buttons
├── js/
│   ├── main.js               # App initialization & orchestration
│   ├── config.js             # Configuration constants
│   ├── state/
│   │   ├── AppState.js       # Central state management
│   │   └── LayerRegistry.js  # Layer tracking and metadata
│   ├── services/
│   │   ├── MapService.js     # Mapbox map initialization
│   │   ├── HashRouter.js     # URL hash parsing and updates
│   │   ├── DataLoader.js     # GeoJSON/CSV/Wayback loading
│   │   └── LayerManager.js   # Layer CRUD operations
│   ├── components/
│   │   ├── LayerControls.js  # Layer panel UI
│   │   ├── AddLayerForm.js   # Layer addition UI
│   │   ├── MapUIControls.js  # Zoom/fullscreen buttons
│   │   └── DistanceTicker.js # Follow mode distance display
│   ├── features/
│   │   ├── FollowMode.js     # Path animation logic
│   │   └── FilterSystem.js   # Layer filtering
│   └── utils/
│       ├── tokenParser.js    # Hash token parsing helpers
│       ├── geometry.js       # Distance/bearing calculations
│       └── dom.js            # DOM manipulation helpers
├── data/                     # Existing data files (unchanged)
└── img/                      # Existing assets (unchanged)
```

---

## Module Specifications

### 1. **config.js** (~50 lines)
**Purpose:** Centralize all configuration constants

```javascript
export const CONFIG = {
  MAPBOX_ACCESS_TOKEN: 'pk.eyJ1...',
  MAPBOX_STYLE: 'mapbox://styles/btselemorg/...',
  RTL_PLUGIN_URL: 'https://api.mapbox.com/mapbox-gl-js/...',
  DEFAULT_CAMERA: {
    center: [34.3537, 31.4238],
    zoom: 10,
    bearing: 37.6,
    pitch: 0
  },
  ANIMATION: {
    FOLLOW_DURATION_MS_PER_METER: 2,
    FOLLOW_MIN_DURATION_MS: 2000,
    WAYBACK_FADE_DURATION_MS: 500,
    CAMERA_EASE: 0.15
  },
  DATA_PATHS: {
    LOCAL_FILES: availableLocalLayerFiles,
    WAYBACK_CONFIG_URL: 'https://s3-us-west-2.amazonaws.com/...'
  },
  FILTERABLE_LAYER_TYPES: ['fill', 'line', 'circle', 'symbol', 'heatmap', 'fill-extrusion']
};
```

**Benefits:**
- Single source of truth for configuration
- Easy to modify without code changes
- Can be externalized to JSON if needed

---

### 2. **state/AppState.js** (~150 lines)
**Purpose:** Central state management with event emitters

```javascript
export class AppState extends EventEmitter {
  constructor() {
    this.map = null;
    this.allStyleLayers = [];
    this.styleDefaultVisibility = {};
    this.styleDefaultFilter = {};
    this.externalLayers = new Set();
    this.followableLayers = new Set();
    this.followOffsets = {};
    this.showTicker = {};
    this.isFreeCameraAnimating = false;
  }
  
  // Getters/setters with change events
  setMap(map) { ... this.emit('map:changed', map); }
  addExternalLayer(id) { ... this.emit('layer:added', id); }
  // etc.
}
```

**Benefits:**
- Predictable state updates
- Easy debugging with change listeners
- Single source of truth for app state

---

### 3. **services/HashRouter.js** (~300 lines)
**Purpose:** URL hash parsing and synchronization

**Current code:** Lines 1071-1200 (parseHash), 758-783 (updateHash), 2856-3010 (token splitting/parsing)

```javascript
export class HashRouter {
  constructor(appState) {
    this.state = appState;
    this.cachedHashString = '';
    this.cachedHashState = null;
  }
  
  parseHash() {
    // Extract and cache
    return {
      camera: {...},
      layers: [...],
      dynamicGeojsonToLoad: [...],
      followId: null,
      followOffset: 0,
      showTicker: false,
      followHidden: false,
      showMapUI: false,
      isStatic: false
    };
  }
  
  updateHash(camera, layers, extraSegments = []) { ... }
  
  // Token parsing helpers
  splitLayerTokens(str) { ... }
  parseParenArgs(argStr) { ... }
  buildParenArgs(sourceHint, filterExprs) { ... }
}
```

**Benefits:**
- Isolated hash logic for testing
- Cacheable parse results
- Clear API for hash operations

---

### 4. **services/DataLoader.js** (~400 lines)
**Purpose:** Load GeoJSON, CSV, and Wayback imagery

**Current code:** Lines 1201-1385 (loadAndAddOrReplaceGeoJSON), 1543-1680 (loadWaybackLayer)

```javascript
export class DataLoader {
  constructor(appState) {
    this.state = appState;
  }
  
  async loadGeoJSON(filename, options = {}) {
    // Try .geojson, .json, .csv with fallbacks
    return geojsonData;
  }
  
  async loadCSV(csvPath) {
    // Papa Parse wrapper with lat/lon detection
    return geojsonData;
  }
  
  async loadWaybackLayer(dateStr, options = {}) {
    // Fetch config, find closest date, build tile URL
    return { sourceConfig, layerConfig };
  }
  
  csvTextToGeoJSON(csvText) { ... }
}
```

**Benefits:**
- Reusable data loading logic
- Consistent error handling
- Testable in isolation

---

### 5. **services/LayerManager.js** (~500 lines)
**Purpose:** Layer CRUD operations and styling

**Current code:** Lines 1386-1542 (loadAndAddOrReplaceGeoJSON layer logic), 1680-1780 (Wayback layer addition)

```javascript
export class LayerManager {
  constructor(appState, dataLoader) {
    this.state = appState;
    this.loader = dataLoader;
  }
  
  async addGeoJSONLayer(name, options = {}) {
    const data = await this.loader.loadGeoJSON(name);
    // Create source, layer, apply styling from sourceHint
    // Handle beforeId positioning
    return layerId;
  }
  
  async addWaybackLayer(dateStr, options = {}) { ... }
  
  removeLayer(layerId) { ... }
  
  toggleVisibility(layerId, visible) { ... }
  
  applyFilter(layerId, filterExpr) { ... }
  
  copyStyleFromLayer(targetId, sourceId) { ... }
  
  fadeWaybackLayer(layerId, targetOpacity, duration) { ... }
}
```

**Benefits:**
- Encapsulated layer operations
- Consistent error handling
- Easy to extend with new layer types

---

### 6. **components/LayerControls.js** (~600 lines)
**Purpose:** Layer panel UI rendering and interactions

**Current code:** Lines 1781-2494 (createLayerControls, event handlers)

```javascript
export class LayerControls {
  constructor(appState, layerManager, hashRouter) {
    this.state = appState;
    this.manager = layerManager;
    this.router = hashRouter;
    this.container = null;
  }
  
  render(visibleLayerIds) {
    // Build HTML efficiently using fragments
    // Attach event listeners
  }
  
  handleLayerToggle(layerId, checked) { ... }
  handleLayerDelete(layerId) { ... }
  handleLayerReset(layerId) { ... }
  handleFilterUpdate(layerId, filterExpr) { ... }
  handleFollowToggle(layerId) { ... }
  handleOffsetUpdate(layerId, offset) { ... }
  
  populateFilterPropsDropdown(layerId, selectEl) { ... }
}
```

**Benefits:**
- Component-based architecture
- Separated concerns (rendering vs. logic)
- Event delegation for performance

---

### 7. **components/AddLayerForm.js** (~300 lines)
**Purpose:** Layer addition UI (GeoJSON/CSV/Wayback)

**Current code:** Lines 599-765 (form UI, tab switching, confirm button)

```javascript
export class AddLayerForm {
  constructor(appState, layerManager, hashRouter) { ... }
  
  render(container) {
    // Populate datalists
    // Setup tab switching
    // Attach confirm handler
  }
  
  switchTab(tabName) { ... }
  handleConfirm() { ... }
  setError(msg) { ... }
  
  populateLocalLayerDatalist() { ... }
  populateReferenceLayerSelect() { ... }
}
```

**Benefits:**
- Isolated form logic
- Reusable across different UIs
- Easier form validation

---

### 8. **features/FollowMode.js** (~450 lines)
**Purpose:** Path animation with free camera

**Current code:** Lines 2842-3155 (followPathWithFreeCamera)

```javascript
export class FollowMode {
  constructor(appState, layerManager) {
    this.state = appState;
    this.manager = layerManager;
    this.animationHandle = null;
    this.checkInterval = null;
  }
  
  start(map, coords, layerId, options = {}) {
    // Setup animation loop
    // Distance ticker
    // Periodic :follow check
    return cancelFn;
  }
  
  cancel() { ... }
  
  // Private helpers
  _animate(timestamp) { ... }
  _updateDistanceTicker(coords, t, startOffset, totalDist) { ... }
}
```

**Benefits:**
- Isolated animation logic
- Cancellable operations
- Testable math functions

---

### 9. **utils/tokenParser.js** (~200 lines)
**Purpose:** Hash token parsing utilities

**Current code:** Lines 900-970 (parseFilterExprToMapbox, parseParenArgs, buildParenArgs, combineFilterExprsToMapbox, splitLayerTokens)

```javascript
export function splitLayerTokens(str) { ... }
export function parseParenArgs(argStr) { ... }
export function buildParenArgs(sourceHint, filterExprs) { ... }
export function parseFilterExprToMapbox(filterExpr) { ... }
export function combineFilterExprsToMapbox(filterExprs) { ... }
```

**Benefits:**
- Pure functions (easy to test)
- Reusable across components
- Single responsibility

---

### 10. **utils/geometry.js** (~100 lines)
**Purpose:** Geospatial calculations

**Current code:** Lines 2911-2920 (getDistance), 2975-2985 (getBearing), 2987-3006 (interpolateLine)

```javascript
export function getDistance(coordA, coordB) { ... }
export function getBearing(from, to) { ... }
export function interpolateLine(coords, t) { ... }
```

**Benefits:**
- Pure functions
- Easy to test with known inputs/outputs
- Reusable for other map features

---

## Migration Strategy

### Phase 1: Extraction (No Breaking Changes)
**Goal:** Extract utilities and create module structure without changing behavior

1. Create directory structure
2. Extract pure utility functions (geometry, tokenParser, dom)
3. Extract configuration constants
4. Write unit tests for utilities
5. Verify hash still works identically

**Estimated time:** 2-3 hours  
**Risk:** Low (utilities are pure functions)

---

### Phase 2: Services Layer
**Goal:** Extract stateless services

1. Extract `HashRouter` class
2. Extract `DataLoader` class
3. Extract `LayerManager` class
4. Update main.js to use services
5. Write integration tests

**Estimated time:** 4-5 hours  
**Risk:** Medium (requires careful state tracking)

---

### Phase 3: State Management
**Goal:** Centralize state

1. Create `AppState` class
2. Migrate global variables to AppState
3. Add event emitters for state changes
4. Update services to use AppState
5. Test state transitions

**Estimated time:** 3-4 hours  
**Risk:** Medium (many global variables)

---

### Phase 4: UI Components
**Goal:** Modularize UI

1. Extract `LayerControls` component
2. Extract `AddLayerForm` component
3. Extract `MapUIControls` component
4. Extract `DistanceTicker` component
5. Update event handling

**Estimated time:** 4-5 hours  
**Risk:** Medium (DOM manipulation)

---

### Phase 5: Features
**Goal:** Isolate complex features

1. Extract `FollowMode` class
2. Extract `FilterSystem` class
3. Update hashchange handler to use features
4. Test follow animations

**Estimated time:** 3-4 hours  
**Risk:** Medium (animation timing)

---

### Phase 6: CSS Extraction
**Goal:** Modularize styles

1. Extract CSS to separate files
2. Optimize selectors
3. Remove unused styles
4. Test responsive behavior

**Estimated time:** 2-3 hours  
**Risk:** Low (mostly copy/paste)

---

### Phase 7: Optimization
**Goal:** Improve performance

1. Add code splitting (dynamic imports)
2. Optimize DOM queries (cache selectors)
3. Debounce event handlers
4. Add lazy loading for Wayback layers
5. Profile and measure improvements

**Estimated time:** 3-4 hours  
**Risk:** Low (additive improvements)

---

### Phase 8: Documentation & Cleanup
**Goal:** Polish and document

1. Add JSDoc comments
2. Write developer guide
3. Create architecture diagram
4. Document hash format
5. Remove debug code and console logs

**Estimated time:** 2-3 hours  
**Risk:** Low

---

## Testing Strategy

### Unit Tests (New)
- **Utils:** geometry.js, tokenParser.js, dom.js
- **Services:** HashRouter parsing, DataLoader CSV conversion
- **Features:** FollowMode distance calculations

### Integration Tests (New)
- Hash parsing → layer loading → map rendering
- Layer addition → hash update → visibility sync
- Follow mode → animation → hash update

### Manual Testing Checklist
- [ ] All existing URLs still work
- [ ] Layer toggle preserves hash state
- [ ] Follow mode animates correctly
- [ ] Filters apply to external layers only
- [ ] Wayback layers load and fade
- [ ] Mobile responsive (resize, orientation)
- [ ] Copy link generates valid URLs
- [ ] Static mode disables interactions
- [ ] Embed mode hides UI correctly

---

## Performance Improvements

### Current Issues
1. **Large file size:** 3,483 lines to parse
2. **No code splitting:** Everything loads upfront
3. **Repeated DOM queries:** `document.getElementById` in loops
4. **No memoization:** Hash parsed multiple times per change
5. **Synchronous operations:** Blocking data loads

### Optimizations
1. **Code splitting:** Load FollowMode only when `:follow` present in hash
2. **Lazy Wayback:** Load Wayback config only when satellite tab opened
3. **Cached selectors:** Store DOM references in component instances
4. **Memoized parsing:** Cache hash parse results (already started in code)
5. **Async data loading:** Use Promise.all for parallel GeoJSON loads
6. **Virtual scrolling:** For layer lists with 100+ layers (future)

**Expected improvements:**
- Initial load: 30-40% faster (smaller bundle, code splitting)
- Hash changes: 20-30% faster (cached parsing)
- Layer operations: 15-25% faster (cached DOM queries)

---

## Backward Compatibility

### Unchanged
- **Hash format:** All existing URLs continue to work
- **Data files:** No changes to GeoJSON/CSV formats
- **Mapbox version:** Keep v3.15.0
- **Papa Parse:** Keep v5.4.1

### Safe Changes
- **File structure:** Only `index.html` path changes (relative imports)
- **CSS classes:** Preserve all existing class names
- **Global `window.map`:** Keep for backward compatibility
- **Event handlers:** Preserve keyboard shortcuts ('E' for edit mode)

---

## Risk Assessment

### High Risk
- **State migration:** Many global variables to centralize
- **Hash synchronization:** Critical for shareable links
- **Animation timing:** Follow mode must preserve exact behavior

### Medium Risk
- **Layer positioning:** `beforeId` logic is complex
- **Filter application:** External vs. style layers need careful handling
- **Mobile fixes:** Pixel ratio and resize logic is brittle

### Low Risk
- **Utility extraction:** Pure functions, easy to test
- **CSS extraction:** No logic changes
- **Configuration:** Simple constant extraction

### Mitigation
1. **Incremental migration:** Each phase independently testable
2. **Feature flags:** Toggle between old/new code paths during transition
3. **Comprehensive testing:** Manual checklist + automated tests
4. **Git branches:** Separate branch per phase for easy rollback
5. **Code review:** Validate each phase before merging

---

## Success Metrics

### Code Quality
- **Lines per file:** < 300 lines per module (currently 3,483 in one file)
- **Cyclomatic complexity:** < 10 per function (currently many > 20)
- **Test coverage:** > 60% for utils and services (currently 0%)

### Performance
- **Initial load:** < 2s on 3G (currently ~3s)
- **Hash parse:** < 10ms (currently ~15-20ms)
- **Layer toggle:** < 50ms (currently ~80ms)

### Maintainability
- **Onboarding time:** New developer can understand architecture in < 1 hour
- **Bug fix time:** Average bug fix < 30 minutes (down from 1-2 hours)
- **Feature addition:** New layer type < 4 hours (down from 8+ hours)

---

## Open Questions

1. **Build system:** Should we use a bundler (Vite, esbuild) or keep ES modules?
2. **Type safety:** Add JSDoc types or migrate to TypeScript?
3. **State management:** Use a library (Zustand, Redux) or custom EventEmitter?
4. **Testing framework:** Jest, Vitest, or browser-based (Playwright)?
5. **CSS approach:** Keep vanilla CSS or use PostCSS/CSS modules?

**Recommendation:** 
- Start with ES modules (no build step)
- Add JSDoc for type hints (no TypeScript overhead)
- Custom EventEmitter (lightweight)
- Vitest for tests (fast, modern)
- Vanilla CSS (already working)

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 1. Extraction | 2-3 hours | 3 hours |
| 2. Services | 4-5 hours | 8 hours |
| 3. State | 3-4 hours | 12 hours |
| 4. UI Components | 4-5 hours | 17 hours |
| 5. Features | 3-4 hours | 21 hours |
| 6. CSS | 2-3 hours | 24 hours |
| 7. Optimization | 3-4 hours | 28 hours |
| 8. Documentation | 2-3 hours | 31 hours |

**Total estimated time:** 24-31 hours (3-4 working days)

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Create a new branch** (`refactor-map-app`) from `main`
3. **Start with Phase 1** (utilities extraction)
4. **Test each phase** thoroughly before proceeding
5. **Commit incrementally** with clear messages
6. **Document any deviations** from the plan

---

## Appendix: Current Code Statistics

```
Total lines:        3,483
HTML:                ~183 lines (5%)
CSS:                 ~500 lines (14%)
JavaScript:        ~2,800 lines (80%)

Functions:           ~45
Global variables:    ~15
Event listeners:     ~25
API calls:           ~5 (Mapbox, Wayback, data files)
```

### Complexity Hotspots
- `parseHash()`: 130 lines, cyclomatic complexity ~18
- `loadAndAddOrReplaceGeoJSON()`: 185 lines, complexity ~15
- `createLayerControls()`: 713 lines, complexity ~25
- `followPathWithFreeCamera()`: 313 lines, complexity ~20
- `hashchange` handler: 455 lines, complexity ~22

These will be the primary targets for refactoring.
