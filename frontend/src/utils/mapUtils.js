/**
 * Map utility functions for thermal fault visualization
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point  
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Find the nearest tower to a given GPS coordinate
 * @param {number} lat - Target latitude
 * @param {number} lon - Target longitude
 * @param {Array} towers - Array of tower objects with lat/lon
 * @returns {Object|null} Nearest tower with distance
 */
export const findNearestTower = (lat, lon, towers) => {
  if (!towers || towers.length === 0) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  towers.forEach(tower => {
    if (tower.latitude && tower.longitude) {
      const distance = calculateDistance(lat, lon, tower.latitude, tower.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...tower, distance_km: distance };
      }
    }
  });
  
  return nearest;
};

/**
 * Map fault level to severity score for sorting/filtering
 * @param {string} faultLevel - NORMAL, WARNING, CRITICAL
 * @returns {number} Severity score (higher = more severe)
 */
export const getSeverityScore = (faultLevel) => {
  switch (faultLevel?.toUpperCase()) {
    case 'CRITICAL': return 3;
    case 'WARNING': return 2;
    case 'NORMAL': return 1;
    default: return 0;
  }
};

/**
 * Group faults by proximity for clustering
 * @param {Array} faults - Array of fault objects with lat/lon
 * @param {number} maxDistance - Maximum distance in km to group faults
 * @returns {Array} Array of fault clusters
 */
export const clusterFaultsByProximity = (faults, maxDistance = 0.1) => {
  if (!faults || faults.length === 0) return [];
  
  const clusters = [];
  const processed = new Set();
  
  faults.forEach((fault, index) => {
    if (processed.has(index) || !fault.latitude || !fault.longitude) return;
    
    const cluster = [fault];
    processed.add(index);
    
    // Find nearby faults
    faults.forEach((otherFault, otherIndex) => {
      if (
        processed.has(otherIndex) || 
        !otherFault.latitude || 
        !otherFault.longitude ||
        index === otherIndex
      ) return;
      
      const distance = calculateDistance(
        fault.latitude, fault.longitude,
        otherFault.latitude, otherFault.longitude
      );
      
      if (distance <= maxDistance) {
        cluster.push(otherFault);
        processed.add(otherIndex);
      }
    });
    
    clusters.push({
      faults: cluster,
      center: {
        latitude: cluster.reduce((sum, f) => sum + f.latitude, 0) / cluster.length,
        longitude: cluster.reduce((sum, f) => sum + f.longitude, 0) / cluster.length
      },
      severity: Math.max(...cluster.map(f => getSeverityScore(f.fault_level))),
      count: cluster.length
    });
  });
  
  return clusters;
};

/**
 * Validate GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if coordinates are valid
 */
export const isValidCoordinates = (lat, lon) => {
  return (
    typeof lat === 'number' && 
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180 &&
    lat !== 0 && lon !== 0 // Exclude null island
  );
};

/**
 * Format coordinates for display
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} precision - Decimal places
 * @returns {string} Formatted coordinate string
 */
export const formatCoordinates = (lat, lon, precision = 6) => {
  if (!isValidCoordinates(lat, lon)) return 'Invalid coordinates';
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
};
