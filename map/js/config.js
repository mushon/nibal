/**
 * Configuration constants for the map application
 */

export const CONFIG = {
  // Mapbox configuration
  MAPBOX_ACCESS_TOKEN: 'pk.eyJ1IjoiYnRzZWxlbW9yZyIsImEiOiJjbWhuNnF6djQwNTVlMnNzZjAxd2dqeWFyIn0.jw164iQiqRTNP1QMu-cbTg',
  MAPBOX_STYLE: 'mapbox://styles/btselemorg/cmhncne5l004p01qu9tpp7ih8',
  RTL_PLUGIN_URL: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
  
  // Default camera position
  DEFAULT_CAMERA: {
    center: [34.3537, 31.4238],
    zoom: 10,
    bearing: 37.6,
    pitch: 0
  },
  
  // Animation settings
  ANIMATION: {
    FOLLOW_DURATION_MS_PER_METER: 2,
    FOLLOW_MIN_DURATION_MS: 2000,
    WAYBACK_FADE_DURATION_MS: 500,
    CAMERA_EASE: 0.15,
    FLY_TO_DURATION_MS: 1200
  },
  
  // Data paths
  DATA_PATHS: {
    WAYBACK_CONFIG_URL: 'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json'
  },
  
  // Layer configuration
  FILTERABLE_LAYER_TYPES: ['fill', 'line', 'circle', 'symbol', 'heatmap', 'fill-extrusion'],
  
  // Mobile settings
  MOBILE: {
    MAX_WIDTH: 1000,
    ZOOM_ADJUSTMENT: -1
  },
  
  // Available local layer files (for datalist autocomplete)
  AVAILABLE_LOCAL_FILES: [
    'al-mawasi-jabalia.geojson',
    'al-zawaida-al-mawasi.geojson',
    'Areas_Designated_for_Evacuation_by_the_IDF.geojson',
    'evac-orders-dec2.geojson',
    'evac-orders-dec4.geojson',
    'evac-orders-dec5.geojson',
    'gaza-deir-al-balah.geojson',
    'gaza-khan-younis.geojson',
    'gaza-nuseirat.geojson',
    'gaza.geojson',
    'home-gaza-city.geojson',
    'IDF_Oct23_Oct25.geojson',
    'IDF_zone_010724-210724_NEW.geojson',
    'IDF_zone_010924_101025.geojson',
    'IDF_zone_041223-281223_NEW.geojson',
    'IDF_zone_060524-110524_NEW.geojson',
    'IDF_zone_061024_NEW.geojson',
    'IDF_zone_081023.geojson',
    'IDF_zone_090925_NEW.geojson',
    'IDF_zone_110824_150824_NEW.geojson',
    'IDF_zone_160824_200824_NEW.geojson',
    'IDF_zone_191025.geojson',
    'IDF_zone_21_25_03_25.geojson',
    'IDF_zone_210724-100824_NEW.geojson',
    'IDF_zone_210824_240824_NEW.geojson',
    'IDF_zone_250824_280824_NEW.geojson',
    'IDF_zone_290824_NEW.geojson',
    'IDF_zone_300824_NEW.geojson',
    'IDF_zone_ALL_UNTIL_101025.geojson',
    'IDF_Zones.geojson',
    'IL_map_places_final.geojson',
    'jabalia-al-mawasi.geojson',
    'jabalia-deir-al-balah.geojson',
    'jabalia-gaza.geojson',
    'jabalia-rafah.geojson',
    'netzarim.geojson',
    'nuseirat-rafah.geojson',
    'oct7_23_hamas.geojson',
    'rafah-bureij.geojson',
    'safe-area.geojson',
    'UNOSAT_Gaza_hex2_0.geojson',
    'UNOSAT_Gaza_hexbins_25-04-04.geojson',
    'UNOSAT_jabalia_25-07.geojson',
    'pois.csv',
    'pois-ar.csv',
    'pois-he.csv',
    'oct7-hamas.csv',
    'oct7-hamas-ar.csv',
    'oct7-hamas-en.csv',
    'oct23_idf.csv'
  ]
};
