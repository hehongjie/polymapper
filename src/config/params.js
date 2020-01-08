const DEFAULT_MARKER_RADIUS = 20; // In Google Maps units (~meters), if divided by RADIUS_COEFFICIENT
const MIN_MARKER_RADIUS = 1;
const MAX_MARKER_RADIUS = 500;
const RADIUS_COEFFICIENT = 2000;

const DEFAULT_MARKER_COLOR = '#0000ff';
const DEFAULT_POLYGON_COLOR = '#ff0000';

const MARKER_STROKE_OPACITY = 1.0;
const MARKER_FILL_OPACITY = 0.4;
const POLYGON_STROKE_OPACITY = 1.0;
const POLYGON_FILL_OPACITY = 0.4;

const NEW_POLYGON_RATIO = 4.0; // The new square’s side will be this times less than Maps’ least dimension

const MAP_OPTIONS = {
  zoom: 2,
  center: {lat: 0, lng: 0},
  mapTypeId: 'terrain',
  streetViewControl: false,
  rotateControl: false
};