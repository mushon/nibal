# Interactive Map Guide

[](map/#31.30336,34.29179,9.53,37.6,0.0/~labels_he "Gaza Strip overview")

This comprehensive guide covers all features of the interactive map system. Learn hash-driven camera control, layer toggling, dynamic data loading, historical satellite imagery, filtering, and cinematic animations.


{.meta}
[](map/#31.42380,34.35370,10.00,37.6,0.0 "Basic map view")

## Introduction

The map is controlled entirely through URL hash parameters. Everything — camera position, visible layers, animations — is encoded in the URL, making every view shareable and reproducible.

**Basic hash structure:**
```
map/#lat,lng,zoom,bearing,pitch/+layerA,~layerB,+file:follow
```

**Example:**
```
map/#31.52888,34.47937,18.14,15.0,0/+satellite,+jabalia-rafah:follow
```


{.meta}
[](map/#31.52888,34.47937,18.14,15.0,0 "High zoom view of Jabalia")

## Editor Mode

Press **E** on your keyboard to open the editor panel. This reveals:
- All available layers (shown and hidden)
- Current layer visibility states
- Add Wayback imagery by date
- Copy layer tokens to clipboard
- Toggle layers on/off interactively

The editor is essential for discovering layer names and building complex hash URLs.


{.meta}
[](map/#31.52888,34.47937,18.14,15.0,0 "Jabalia at 15° rotation")

## Chapter 1: Camera Control

The camera uses five numeric parameters: **latitude, longitude, zoom, bearing, pitch**.

**Zoom levels:**
- `0-3` — Global/regional view
- `4-9` — Country/city scale  
- `10-14` — Neighborhood detail
- `15-18` — Street level
- `19-22` — Building/room detail


{.meta}
[](map/#31.52956,34.47717,14.33,22.4,60.5 "Same location with 60° tilt")

**Bearing** rotates the map (0–360°):
- `0` — North up (default)
- `90` — East up
- `180` — South up
- `270` — West up


{.meta}
[](map/#31.52956,34.47717,14.33,22.4,60.5 "3D perspective view")

**Pitch** tilts the camera (0–60°):
- `0` — Flat overhead view
- `30` — Gentle 3D perspective
- `45` — Dramatic tilt
- `60` — Maximum terrain view

**Copy to try:**
```
map/#31.52956,34.47717,14.33,22.4,60.5
```


{.meta}
[](map/#31.41976,34.39009,10.00,37.6,0.0 "Wider Gaza view")

The camera smoothly flies between positions as you scroll through chapters or click links. Duration and easing are automatic.


{.meta}
[](map/#31.42380,34.35370,10.00,37.6,0.0/+idf-poly "IDF evacuation zones")

## Chapter 2: Layer Management

### Showing Layers

Add `+layername` to show built-in style layers:

```
map/#31.42380,34.35370,10.00,37.6,0.0/+idf-poly
```


{.meta}
[](map/#31.42380,34.35370,10.00,37.6,0.0/+idf-poly,+idf-poly-outlines "Zones with fills and outlines")

### Stacking Multiple Layers

Comma-separate layer tokens to stack them:

```
map/#31.42380,34.35370,10.00,37.6,0.0/+idf-poly,+idf-poly-outlines
```

**Layer order:** Rightmost layers appear **on top** visually. First-to-last in hash = bottom-to-top on map.


{.meta}
[](map/#31.42391,34.35369,10.00,37.6,0.0/~labels_he "Hidden Hebrew labels")

### Hiding Layers

Use `~layername` to hide default basemap layers:

```
map/#31.42391,34.35369,10.00,37.6,0.0/~labels_he
```

Useful for removing labels or replacing default satellite imagery.


{.meta}
[](map/#31.52374,34.43343,15.00,37.6,0.0/+overlay,~Gaza_border_dash,~Gaza_border_base "Custom overlay without borders")

### Swapping Layers

Combine showing and hiding to swap basemap components:

```
map/#31.52374,34.43343,15.00,37.6,0.0/+overlay,~Gaza_border_dash,~Gaza_border_base
```


{.meta}
[](map/#31.53410,34.48202,15.34,37.6,0.0/+satellite,+family-home "Satellite with markers")

**Use editor mode (press E) to discover all available layer names.**


{.meta}
[](map/#31.43672,34.34664,10.16,37.6,0.0/+jabalia-rafah "Displacement path")

## Chapter 3: Loading External Data

### GeoJSON Files

Load GeoJSON from `/map/` by adding `+filename`:

```
map/#31.43672,34.34664,10.16,37.6,0.0/+jabalia-rafah
```

The system automatically finds `jabalia-rafah.geojson` in the map folder.


{.meta}
[](map/#31.47602,34.41973,11.17,37.6,0.0/+jabalia-deir-al-balah(by-foot) "Styled path")

### Style Hints

Copy styles from existing layers with `+filename(sourceHint)`:

```
map/#31.47602,34.41973,11.17,37.6,0.0/+jabalia-deir-al-balah(by-foot)
```

This applies the `by-foot` layer's appearance (dashed line, colors, width) to the loaded GeoJSON.


{.meta}
[](map/#31.45086,34.38246,11.54,37.6,0.0/+IDF_zone_060524-110524(idf-poly),+idf-poly-outlines "External polygons layered")

### Z-Index Control

Use `(sourceHint)` to control rendering order and z-index:

```
map/#31.45086,34.38246,11.54,37.6,0.0/+IDF_zone_060524-110524(idf-poly),+idf-poly-outlines
```

The external polygon adopts `idf-poly` styles and appears in the correct layer stack.


{.meta}
[](map/#31.42380,34.35370,10.00,37.6,0.0/+pois.csv(poi) "CSV point markers")

### CSV Point Data

CSV files with `lat`/`lng` columns auto-convert to markers:

```
map/#31.42380,34.35370,10.00,37.6,0.0/+pois.csv(poi)
```

**Search order:** `filename.geojson` → `filename.csv` → `data/filename.csv`


{.meta}
[](map/#31.42380,34.35370,10.00,37.6,0.0/+pois.csv(poi,id=home) "Filtered to single marker")

### Filtering Data

Add filter expressions in parentheses after sourceHint:

```
map/#31.42380,34.35370,10.00,37.6,0.0/+pois.csv(poi,id=home)
```

**Filter syntax:**
- `property=value` — Exact match
- `property!=value` — Not equal
- Comma-separate multiple filters (AND logic)


{.meta}
[](map/#31.42380,34.35370,10.00,37.6,0.0/+pois.csv(poi,id=home),+pois.csv#2(poi,id=rafah) "Multiple filtered instances")

### Multiple Instances with Filters

Use `#counter` to load the same file multiple times with different filters:

```
map/#31.42380,34.35370,10.00,37.6,0.0/+pois.csv(poi,id=home),+pois.csv#2(poi,id=rafah)
```

Each instance gets unique styling and filtering.


{.meta}
[](map/#31.37047,34.28073,15.79,40.0,1.2/+wayback:20231101 "Al-Mawasi before displacement")

## Chapter 4: Wayback Satellite Imagery

### Loading Historical Imagery

Access ESRI Wayback archive with `+wayback:YYYYMMDD`:

```
map/#31.37047,34.28073,15.79,40.0,1.2/+wayback:20231101
```

**Features:**
- 30cm resolution in urban areas (Maxar satellites)
- Historical archive: February 2014 → present
- Updated every few weeks
- Free WMTS service, max zoom level 22


{.meta}
[](map/#31.42380,34.35370,10.00,37.6,0.0/+wayback:20231007 "October 7, 2023 — day before attack")

### Specific Dates

Request specific dates — system finds closest available release:

```
map/#31.42380,34.35370,10.00,37.6,0.0/+wayback:20231007
```


{.meta}
[](map/#31.37047,34.28073,15.79,40.0,1.2/+wayback:20251005,+wayback:20231101 "Comparing two dates")

### Comparing Multiple Dates

Stack multiple Wayback layers to compare time periods:

```
map/#31.37047,34.28073,15.79,40.0,1.2/+wayback:20251005,+wayback:20231101
```

**Visual order:** Rightmost date appears on top. Toggle visibility in editor mode to compare.

**Use editor mode** to add Wayback layers by date picker.


{.meta}
[](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow "Camera animation along path")

## Chapter 5: Camera Animations

### Following Paths

Create cinematic camera movements with `+layername:follow`:

```
map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow
```

The camera flies along LineString geometry, maintaining bearing and pitch throughout.


{.meta}
[](map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow+ "Animation with distance ticker")

### Distance Ticker

Add `+` to display cumulative distance traveled:

```
map/#31.52090,34.47332,14.00,19.2,48.5/+jabalia-rafah:follow+
```

A white circular overlay appears at the line tip showing `0.0 km` → `total km` in real-time.


{.meta}
[](map/#31.47949,34.42091,12.96,0.0,39.0/+jabalia-gaza(by-car),+gaza-nuseirat(by-foot):follow+10100,+family-home "Animation with offset")

### Ticker Offset

Start the counter at a specific kilometer mark:

```
map/#31.47949,34.42091,12.96,0.0,39.0/+gaza-nuseirat(by-foot):follow+10100
```

Use `+offset` where offset is a number (e.g., `:follow+10100` starts at 10.1 km).


{.meta}
[](map/#31.52090,34.47332,14.00,19.2,48.5/~jabalia-rafah:follow,+wayback:20240215 "Hidden path with Wayback flyover")

### Hidden Animation Paths

Use `~layername:follow` to animate camera while hiding the path:

```
map/#31.52090,34.47332,14.00,19.2,48.5/~jabalia-rafah:follow,+wayback:20240215
```

Perfect for terrain visualization without visible guide lines.


{.meta}
[](map/#31.52888,34.47937,18.14,15.0,0/+jabalia "Map with caption")

## Chapter 6: Captions & Embedding

### Link Titles as Captions

Use Markdown link title syntax for overlay captions:

```markdown
[](map/#31.52888,34.47937,18.14,15.0,0/+jabalia "Your caption text here")
```


{.meta}
[](map/#31.52888,34.47937,18.14,15.0,0/+jabalia,+wayback:20241015 "Combined layers with caption")

### Iframe Embedding

Embed maps in iframes — control panel auto-hides in embedded contexts:

```html
<iframe src="map/#31.52888,34.47937,18.14,15.0,0/+jabalia"></iframe>
```

Hash updates trigger instant map changes without page reload.


{.meta}
[](map/#31.38169,34.34570,10.45,1.6,59.0/+jabalia,+rafah,+wayback:20241015 "All features combined")

## Quick Reference

**Hash structure:**
```
map/#lat,lng,zoom,bearing,pitch/+layer,~hide,+file(style,filter):follow+offset
```

**Camera:**
- `lat,lng` — WGS84 coordinates
- `zoom` — 0 (world) to 22 (extreme detail)
- `bearing` — 0–360° rotation
- `pitch` — 0–60° tilt

**Layer tokens:**
- `+layer` — Show layer
- `~layer` — Hide layer  
- `+file` — Load GeoJSON/CSV
- `+file(sourceHint)` — Copy styles
- `+file(source,filter)` — Apply filter
- `+file#N` — Load same file multiple times
- `+file:follow` — Animate camera
- `+file:follow+` — Show distance ticker
- `+file:follow+1000` — Ticker offset

**Wayback:**
- `+wayback:YYYYMMDD` — Historical satellite imagery
- Stack multiple dates for comparison
- Rightmost date appears on top

**Filters:**
- `property=value` — Exact match
- `property!=value` — Not equal
- Comma-separate for AND logic

**Distance Ticker:**
- White circular overlay (80px diameter)
- Cumulative distance: `0.0 km` → `total km`
- Real-time updates during animation
- Auto-hides on completion/cancel

**Editor Mode (press E):**
- View all available layers
- Add Wayback by date picker
- Copy layer tokens
- Toggle visibility
- Essential for building complex URLs