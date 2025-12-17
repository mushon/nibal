# Zoom In/Out Bug Fix - Solution Explanation

## Problem Analysis

### The Original Bug
The map application had a mobile zoom adjustment that caused constant zoom oscillation:

```javascript
// OLD CODE (REMOVED)
zoom: camera.zoom + (window.innerWidth <= 1000 ? -1 : 0)
```

This adjustment happened in multiple places:
1. On initial map load (`map.jumpTo()`)
2. On hash changes (`map.flyTo()`)
3. With tracking flags (`window._mobileZoomAdjusted`, `window._skipNextHashUpdate`)

### Why It Caused Issues

1. **Reactive Adjustments**: Every time the hash changed, the code would:
   - Read zoom from hash (e.g., `10`)
   - Adjust for mobile (`10 - 1 = 9`)
   - Apply to map
   - Map's `moveend` event fires
   - Hash gets updated with new zoom (`9`)
   - Next hash change reads `9`, adjusts to `8`
   - **Result: Constant zoom drift and animation loops**

2. **Race Conditions**: Multiple flags tried to prevent the loop:
   - `window._mobileZoomAdjusted` - tracks if adjustment was applied
   - `window._skipNextHashUpdate` - prevents hash update after adjustment
   - But these didn't fully prevent the oscillation

3. **Inconsistent State**: Mobile devices would show different zoom than desktop for the same hash URL

## Solution Design

### Inspiration from SVG App

The SVG viewer (`svg/index.html`) solved a similar problem using a **reference frame** approach:

```javascript
// SVG App approach
function getReferenceFrame() {
  const refSize = Math.min(canvasWidth, canvasHeight);
  return { size: refSize, /* ... */ };
}

function render() {
  const scaleToFitInRef = Math.min(ref.size / bbox.width, ref.size / bbox.height);
  const viewportScale = state.scale * scaleToFitInRef;
  // Apply scale once, based on reference frame and current viewport
}
```

Key insights:
1. Define a reference frame (centered square)
2. Store scale/position relative to that frame
3. Calculate viewport transform based on current screen size
4. No reactive adjustments - calculate once and apply

### Adapted Approach for Map

For Mapbox, we can't transform the canvas directly, but we can use the same concept:

1. **Reference Bounds**: Define a square area (90% of smaller viewport dimension) that should fit the desired geographic coverage
2. **Visual Indicator**: Show this bounds area in edit mode (blue square)
3. **Zoom Calculation**: Function to calculate zoom level that fits desired geographic bounds
4. **No Reactive Adjustments**: Remove all automatic zoom modifications

## Implementation Details

### 1. Visual Bounds Indicator

Added a blue square overlay that shows in edit mode:

```css
#bounds-indicator {
  position: fixed;
  pointer-events: none;
  border: 3px solid rgba(0, 150, 255, 0.8);
  box-shadow: 0 0 20px rgba(0, 150, 255, 0.4);
  background: rgba(0, 150, 255, 0.05);
}
```

### 2. Bounds Calculation System

```javascript
function getReferenceBounds() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const boundsSize = Math.min(vw, vh) * 0.9;
  // Returns centered square bounds
}

function calculateOptimalZoom(desiredBoundsMeters, center) {
  // Calculate zoom level to fit desired geographic area in bounds
  const refBounds = getReferenceBounds();
  const metersPerPixelAtZoom0 = (40075017 * Math.cos(latRad)) / 256;
  const zoom = Math.log2((boundsPixels * metersPerPixelAtZoom0) / desiredBoundsMeters);
  return zoom;
}
```

### 3. Removed Reactive Adjustments

**Before:**
```javascript
// REMOVED - Caused oscillation
zoom: camera.zoom + (window.innerWidth <= 1000 ? -1 : 0)

// REMOVED - Workaround flags
if (window.innerWidth <= 1000 && !window._mobileZoomAdjusted) {
  window._mobileZoomAdjusted = true;
  window._skipNextHashUpdate = true;
}

// REMOVED - Prevent loop check
if (window._skipNextHashUpdate) {
  window._skipNextHashUpdate = false;
  return;
}
```

**After:**
```javascript
// SIMPLE - Apply zoom directly from hash
zoom: camera.zoom  // No adjustment!
```

## How It Works Now

### Loading a Map View

1. User navigates to `#31.5,34.5,12,0,0`
2. `parseHash()` extracts zoom level `12`
3. Map applies zoom `12` directly (no adjustment)
4. Visual bounds indicator shows area that will be visible
5. Zoom stays at `12` - stable!

### Changing Resolution

1. User resizes window or rotates device
2. `getReferenceBounds()` recalculates bounds size
3. Visual indicator updates position/size
4. Map zoom stays the same (no reactive change)
5. Same geographic area, different screen usage

### Future Enhancement (Optional)

The `calculateOptimalZoom()` function is ready for future use:

```javascript
// Potential future enhancement:
// Store desired coverage in hash instead of absolute zoom
// Example: #31.5,34.5,bounds:15000,0,0
// Where 15000 = desired coverage in meters
// System calculates optimal zoom for current screen

const zoom = calculateOptimalZoom(15000, { lat: 31.5, lng: 34.5 });
map.setZoom(zoom);
```

## Benefits

### 1. Stability
- ✅ No zoom oscillation
- ✅ No animation loops  
- ✅ Predictable behavior

### 2. Consistency
- ✅ Same hash URL = same zoom on all devices
- ✅ Shareable links work reliably
- ✅ No device-specific hacks

### 3. User Experience
- ✅ Smooth transitions
- ✅ Visual feedback (bounds indicator)
- ✅ Clear expectations (see what will fit)

### 4. Code Quality
- ✅ Removed workaround flags
- ✅ Removed race condition checks
- ✅ Simpler, more maintainable code

## Technical Comparison

### Zoom Levels at Different Resolutions

For a 15km geographic area:

| Resolution | Bounds Size | Calculated Zoom |
|------------|-------------|-----------------|
| Desktop (1280x720) | 648px | 12.49 |
| Tablet Landscape (1024x768) | 691px | 12.59 |
| Tablet Portrait (768x1024) | 691px | 12.59 |
| Mobile Landscape (667x375) | 338px | 11.55 |
| Mobile Portrait (375x667) | 338px | 11.55 |

**Key insight**: Smaller screens get slightly lower zoom, but this is calculated **once** when setting up the view, not reactively adjusted during use.

## Testing Strategy

### Automated Tests
- ✅ `test-bounds.html` - Visual demonstration at multiple resolutions
- ✅ Bounds calculation function tests

### Manual Tests Required
- 📋 Load on actual mobile devices
- 📋 Test hash navigation
- 📋 Test window resize behavior
- 📋 Verify edit mode bounds indicator
- 📋 Cross-browser testing

See `MANUAL_TESTING.md` for detailed test plan.

## Migration Notes

### For Users
- Existing hash URLs work the same
- May notice slightly different zoom on mobile (correct behavior)
- Press 'E' to see visual bounds indicator in edit mode

### For Developers
- No API changes
- Hash format unchanged
- New functions available: `getReferenceBounds()`, `calculateOptimalZoom()`
- Visual indicator can be styled via CSS

## Future Work

### Possible Enhancements

1. **Bounds in Hash**: Store desired coverage instead of absolute zoom
   ```
   #31.5,34.5,bounds:15000,0,0
   ```

2. **Adaptive Zoom**: Auto-calculate optimal zoom based on content density

3. **Bounds Presets**: Common bounds sizes (city, region, country)

4. **User Preferences**: Remember preferred bounds size per user

## References

- Original issue: "fix zoom in/out bug on mobile"
- SVG app reference frame: `svg/index.html` lines 1621-1720
- Mapbox zoom calculation: https://docs.mapbox.com/help/glossary/zoom-level/
