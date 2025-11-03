# Map — Complete Interactive Mapping Guide

[](map/#23.99000,29.92877,2.00,0.0,0.0/~Gaza_border_dash,~Gaza_border_base "Map Overview")
This comprehensive guide covers all features of the interactive map at `map/index.html`. You'll learn hash-driven camera control, layer toggling, dynamic GeoJSON/CSV loading, historical satellite imagery (Sentinel-2 & Wayback), camera path animations, and embedding best practices.

---

## Table of Contents
1. [Hash URL Syntax](#hash-url-syntax)
2. [Camera Control](#camera-control)
3. [Layer Management](#layer-management)
4. [Dynamic GeoJSON/CSV Layers](#dynamic-geojsoncsv-layers)
5. [Historical Satellite Imagery](#historical-satellite-imagery)
6. [Camera Path Animation](#camera-path-animation)
7. [Advanced Features](#advanced-features)

---

## Hash URL Syntax

The map is controlled entirely through URL hash parameters. The general format is:

```
map/#lat,lng,zoom,bearing,pitch/+layerA,~layerB,+external:modifier
```

[](map/#31.42380,34.35370,10.00,37.6,0.0 "Basic camera positioning")

**Components:**
- **Camera:** `lat,lng,zoom,bearing,pitch` (all numeric)
- **Layers:** Comma-separated tokens starting with `+` (show) or `~` (hide)
- **Modifiers:** `:follow` for path animation, `(source)` for styling

---

## Camera Control

### Basic Positioning

[](map/#31.52888,34.47937,18.14,15.0,0 "Jabalia at high zoom with slight rotation")
Camera at Jabalia, zoom 18, bearing 15°, pitch 0° (flat)

[](map/#31.52956,34.47717,14.33,22.4,60.5 "Jabalia with 3D perspective")
Same location with 60° pitch for 3D terrain view

### Camera Parameters Explained

- **lat, lng:** Latitude and longitude (decimal degrees)
- **zoom:** 0 (world) to 22 (street level)
- **bearing:** 0–360° rotation (0 = north up)
- **pitch:** 0–60° tilt (0 = flat, 60 = maximum tilt)

### Smooth Camera Transitions

[](map/#31.52888,34.47937,18.14,15.0,0 "Start: Jabalia close-up")
When scrolling or clicking between links, the camera smoothly animates between positions.

[](map/#31.41976,34.39009,10.00,37.6,0.0 "End: Gaza overview")
Fly from Jabalia to southern Gaza with automatic easing.

---

## Layer Management

### Built-in Style Layers

The map includes predefined layers from the Mapbox style:

[](map/#31.42380,34.35370,10.00,37.6,0.0/+idf-poly-outlines "IDF evacuation zone outlines")
**IDF polygon outlines** — Show evacuation zone boundaries

[](map/#31.42380,34.35370,10.00,37.6,0.0/+idf-poly,+idf-poly-outlines "IDF zones with fills and outlines")
**IDF polygons** — Combine fills and outlines for full visualization

[](map/#31.52374,34.43343,15.00,37.6,0.0/+overlay "Satellite overlay layer")
**Overlay** — Custom satellite imagery layer

[](map/#31.52929,34.47915,15.50,37.6,0.0/+satellite,+jabalia "Multiple layers active")
**Multiple layers** — Stack several layers (satellite + point markers)

### Showing and Hiding Layers

[](map/#31.43315,34.35321,10.06,37.6,0.0 "Reset to defaults")
**Reset to defaults** — Omit layer tokens to use style defaults

[](map/#31.43315,34.35321,10.06,37.6,0.0/~satellite "Hide satellite layer")
**Hide with ~** — Use `~layername` to explicitly hide a layer

[](map/#31.52374,34.43343,15.00,37.6,0.0/~satellite,+overlay "Replace default satellite")
**Replace layers** — Hide default satellite, show custom overlay

---

## Dynamic GeoJSON/CSV Layers

Load external data files directly via the hash. The map automatically detects file type and converts CSV to GeoJSON.

### Loading GeoJSON Files

[](map/#31.43672,34.34664,10.16,37.6,0.0/+jabalia-rafah "Load jabalia-rafah.geojson path")
**Simple path** — Place `jabalia-rafah.geojson` in `/map/` and load with `+jabalia-rafah`

The system searches for files in this order:
1. `map/filename.geojson`
2. `map/filename.csv`
3. `map/data/filename.csv`

### CSV Point Data

[](map/#31.42380,34.35370,10.00,37.6,0.0/+displacement-points "Load CSV points")
**CSV points** — CSV files with `lat`/`lng` columns render as point markers

**Supported column names:** `lat`, `latitude`, `y` / `lon`, `lng`, `longitude`, `x`

### Styling External Layers

[](map/#31.45086,34.38246,11.54,37.6,0.0/+jabalia-rafah(track) "Styled path using track layer")
**Copy styles** — Use `+filename(sourceLayer)` to copy paint/layout from an existing style layer

**Available source layers:**
- `track` — Thick colored lines
- `overlay` — Raster positioning reference
- `idf-poly` — Fill styling
- `idf-poly-outlines` — Stroke styling

### Layer Positioning

[](map/#31.45086,34.38246,11.54,37.6,0.0/+jabalia-rafah(track) "Layer inserted after 'track'")
When you specify a source hint like `(track)`, the new layer is inserted immediately after that layer in the render order, ensuring proper z-index.

---

## Historical Satellite Imagery

Access timestamped satellite imagery from two free, open sources—no authentication required.

### Sentinel-2 Cloudless (EOX)

[](map/#31.52374,34.43343,15.00,37.6,0.0/+s2:20240215 "Sentinel-2 imagery from Feb 15, 2024")
**Syntax:** `+s2:YYYYMMDD`

**Features:**
- 10-meter resolution
- Cloud-free annual mosaics (compiled from multiple acquisitions)
- Available from June 2015 to 2024
- Free and open via EOX WMTS service
- No watermarks, no authentication

[](map/#31.42380,34.35370,10.00,37.6,0.0/+s2:20230815 "Summer 2023 mosaic")
**2023 mosaic** — View last year's imagery

[](map/#31.52374,34.43343,15.00,37.6,0.0/+s2:20200601 "June 2020 baseline")
**Historical baseline** — Compare with pre-conflict imagery

**Technical notes:**
- Mosaics are updated annually (typically with a 1–2 year delay)
- Uses EOX's `s2cloudless` service
- TileMatrixSet: `g` (Google Maps compatible)
- Max zoom: 13

### ESRI Wayback (Maxar Satellite)

[](map/#31.52374,34.43343,15.00,37.6,0.0/+wayback:20240215 "Wayback imagery from Feb 15, 2024")
**Syntax:** `+wayback:YYYYMMDD`

**Features:**
- Very high resolution (30cm in urban areas)
- Historical archive going back to February 2014
- Updated every few weeks with new Maxar imagery
- Free public WMTS service with CORS enabled
- Ideal for detailed damage assessment

[](map/#31.42380,34.35370,10.00,37.6,0.0/+wayback:20231007 "Day before Oct 7 attack")
**Pre-conflict** — Oct 7, 2023 baseline

[](map/#31.52374,34.43343,15.00,37.6,0.0/+wayback:20241101 "Recent imagery")
**Current state** — Most recent Wayback release

**Technical notes:**
- Uses ESRI's public Wayback WMTS endpoint
- Automatically selects closest available release date
- Max zoom: 22 (extremely detailed)
- Includes Maxar, GeoEye, and other commercial satellite sources

### Combining Historical Imagery

[](map/#31.42380,34.35370,10.00,37.6,0.0/+s2:20230815,+idf-poly-outlines "Sentinel-2 with zone overlays")
**Overlay analysis** — Stack historical imagery with current zone boundaries

[](map/#31.52374,34.43343,15.00,37.6,0.0/+wayback:20241015,+jabalia "High-res with markers")
**Detailed context** — Combine Wayback's detail with vector annotations

### Date Selection Tips

- **Sentinel-2:** Request any date; system uses the annual mosaic for that year (capped at 2024)
- **Wayback:** Request any date; system picks the nearest available release (updated bi-weekly)
- Both services log the actual date/mosaic used in the browser console

---

## Camera Path Animation

Create cinematic camera movements that follow GeoJSON LineString features.

### Basic Path Following

[](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow "Animate along the displacement path")
**Syntax:** `+layername:follow`

The camera smoothly flies along the path geometry using Mapbox GL JS's FreeCamera API.

[](map/#31.52103,34.46974,12.79,-14.4,30.4/+jabalia-rafah:follow,+jabalia,+rafah "Follow path with start/end markers")
**With markers** — Show origin and destination points during animation

### Animation Behavior

- **Duration:** ~30 seconds for typical paths (auto-calculated based on length)
- **Easing:** Smooth acceleration and deceleration
- **Bearing:** Camera rotates to face direction of travel
- **Pitch:** Configurable tilt (set via initial camera pitch parameter)
- **Interruption:** User interaction cancels animation; URL updates manually resume

### Combining Animation with Imagery

[](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow,+s2:20231001 "Animate over historical imagery")
**Historical journey** — Fly over Sentinel-2 imagery from a specific date

[](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow,+wayback:20240215 "Detailed flyover")
**High-resolution flyover** — Use Wayback for detailed terrain views

---

## Advanced Features

### Layer Visibility Persistence

[](map/#31.42380,34.35370,10.00,37.6,0.0/+idf-poly "Enable IDF polygons")
Layers remain active as you navigate...

[](map/#31.52956,34.47717,14.33,22.4,60.5/+idf-poly "Polygons persist across views")
...until explicitly removed from the hash.

### Multiple External Layers

[](map/#31.43672,34.34664,10.16,37.6,0.0/+jabalia-rafah,+jabalia,+rafah "Three external layers")
Stack multiple GeoJSON/CSV files and control each independently.

### Z-Index Control via Source Hints

[](map/#31.45086,34.38246,11.54,37.6,0.0/+jabalia-rafah(track),+idf-poly-outlines "Paths above polygons")
Use `(sourceHint)` to position layers relative to existing style layers for proper rendering order.

### Removing External Layers

[](map/#31.42380,34.35370,10.00,37.6,0.0/+s2:20240215 "Load S2 layer")
Historical imagery layers are added dynamically...

[](map/#31.42380,34.35370,10.00,37.6,0.0 "S2 layer removed")
...and automatically removed from the map and UI when omitted from the hash.

### Hash-Only Updates

Changes to the hash trigger immediate map updates without page reload. This enables smooth navigation within an iframe or embedded context.

---

## Embedding Best Practices

### In an Iframe

```html
<iframe src="map/#31.42,34.35,10.0,0,0/+s2:20240215" 
        width="800" height="600" 
        style="border:none;"></iframe>
```

The layer control panel auto-hides when the map detects it's embedded.

### With Inflect

[](map/#31.52888,34.47937,18.14,15.0,0/+jabalia "Example inflection link with caption")
Use Markdown link titles to add captions that appear as overlays when the map becomes active in the Inflect viewer.

**Syntax:** `[](map/#... "Your caption text here")`

### Performance Considerations

- **Raster layers:** Sentinel-2 and Wayback tiles load on-demand; only visible tiles are fetched
- **Vector layers:** GeoJSON files are parsed once and cached by the browser
- **Animations:** Camera paths use requestAnimationFrame for smooth 60fps rendering

---

## Summary of Hash Tokens

| Token | Purpose | Example |
|-------|---------|---------|
| `+layername` | Show layer | `+satellite` |
| `~layername` | Hide layer | `~satellite` |
| `+file` | Load GeoJSON/CSV | `+jabalia-rafah` |
| `+file(source)` | Load with styling | `+path(track)` |
| `+file:follow` | Animate camera | `+path:follow` |
| `+s2:YYYYMMDD` | Sentinel-2 imagery | `+s2:20240215` |
| `+wayback:YYYYMMDD` | Wayback imagery | `+wayback:20231007` |

---

## Next Steps

- **Explore:** Try modifying the hash parameters in your browser's address bar
- **Create:** Place your own GeoJSON or CSV files in `/map/` and load them
- **Integrate:** Embed map views in your Inflect stories with caption overlays
- **Experiment:** Combine layers, imagery, and animations to tell compelling spatial narratives

[](map/#31.38169,34.34570,10.45,1.6,59.0/+jabalia,+rafah,+wayback:20241015 "Full feature demonstration")


Example URL (camera + visible layers):

`map/#lat,lng,zoom,bearing,pitch/+layerA,~layerB`

Example with camera animation animation:

[map/#31.52888,34.47937,18.14,15.0,0/](map/#31.41976,34.39009,10.00,37.6,0.0/)


Adding two layers:

[map/#31.52888,34.47937,18.14,15.0,0/+jabalia,+rafah](map/#31.41976,34.39009,10.00,37.6,0.0/+jabalia,+rafah)


Removing a layer:
[map/#31.43315,34.35321,10.06,37.6,0.0/~satellite](map/#31.43315,34.35321,10.06,37.6,0.0/~satellite)


Adding a custom satellite overlay:
[map/#31.52374,34.43343,15.00,37.6,0.0/~satellite,+overlay](map/#31.52374,34.43343,15.00,37.6,0.0/+overlay)


To reset the default layer visibility simply remove their custom mentions:
[map/#31.51448,34.44919,12.64,37.6,0.0](map/#31.51448,34.44919,12.64,37.6,0.0)


So far we've only played with camera movements and layer visibility from the existing Mapbox style. But we can also use the same syntax to load external geojson layers. For example this path from Jabalia to Rafah:
[map/#31.43672,34.34664,10.16,37.6,0.0/+jabalia-rafah](map/#31.43672,34.34664,10.16,37.6,0.0/+jabalia-rafah)

Simply place a `filename.geojson` in the `/map` directory and load it using the add layer synatax `+filename`.

From that point on it can be shown and hidden like any other layer.


[map/#31.45086,34.38246,11.54,37.6,0.0/+jabalia-rafah(track)](map/#31.45086,34.38246,11.54,37.6,0.0/+jabalia-rafah(track))


We can add a custom style to the new layer by noting which source layer should it look like. For example, we can use the hidden `track` layer as a source like this: `+filename(source)`:
[map/#31.45086,34.38246,11.54,37.6,0.0/+jabalia-rafah(track)](map/#31.45086,34.38246,11.54,37.6,0.0/+jabalia-rafah(track))


[map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow)

With externally loaded paths we can even animate the camera to follow the path by adding the `:follow` syntax:
[map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow)
[map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow)


## TBC…