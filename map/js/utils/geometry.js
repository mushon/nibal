/**
 * Geospatial utility functions for distance and bearing calculations
 */

/**
 * Calculate the great-circle distance between two coordinates using the Haversine formula
 * @param {[number, number]} coordA - [longitude, latitude] of point A
 * @param {[number, number]} coordB - [longitude, latitude] of point B
 * @returns {number} Distance in meters
 */
export function getDistance(coordA, coordB) {
  const R = 6371000; // Earth's radius in meters
  const toRad = Math.PI / 180;
  const dLat = (coordB[1] - coordA[1]) * toRad;
  const dLng = (coordB[0] - coordA[0]) * toRad;
  const lat1 = coordA[1] * toRad;
  const lat2 = coordB[1] * toRad;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos(lat1) * Math.cos(lat2) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate the bearing (direction) from one point to another in radians
 * @param {[number, number]} from - [longitude, latitude] of starting point
 * @param {[number, number]} to - [longitude, latitude] of destination point
 * @returns {number} Bearing in radians
 */
export function getBearing(from, to) {
  const rad = Math.PI / 180;
  const lat1 = from[1] * rad;
  const lat2 = to[1] * rad;
  const dLon = (to[0] - from[0]) * rad;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
}

/**
 * Interpolate a point along a line at a given fraction
 * @param {Array<[number, number]>} coords - Array of [longitude, latitude] coordinates
 * @param {number} t - Interpolation parameter (0-1, where 0 is start and 1 is end)
 * @returns {[number, number]} Interpolated [longitude, latitude]
 */
export function interpolateLine(coords, t) {
  // Calculate total distance
  let total = 0;
  for (let j = 1; j < coords.length; j++) {
    total += getDistance(coords[j-1], coords[j]);
  }
  
  // Find target distance along the line
  const target = t * total;
  
  // Find the segment containing the target point
  let dist = 0;
  let segStart = coords[0];
  let segEnd = coords[1];
  
  for (let j = 1; j < coords.length; j++) {
    const segLen = getDistance(coords[j-1], coords[j]);
    if (dist + segLen >= target) {
      segStart = coords[j-1];
      segEnd = coords[j];
      break;
    }
    dist += segLen;
  }
  
  // Interpolate within the segment
  const segDist = getDistance(segStart, segEnd);
  const segT = segDist > 0 ? (target - dist) / segDist : 0;
  
  return [
    segStart[0] + (segEnd[0] - segStart[0]) * segT,
    segStart[1] + (segEnd[1] - segStart[1]) * segT
  ];
}

/**
 * Easing function for smooth animations (ease-in-out quadratic)
 * @param {number} x - Input value (0-1)
 * @returns {number} Eased value (0-1)
 */
export function easeInOutQuad(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
