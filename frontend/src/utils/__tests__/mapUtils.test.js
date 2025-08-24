import {
  calculateDistance,
  findNearestTower,
  getSeverityScore,
  clusterFaultsByProximity,
  isValidCoordinates,
  formatCoordinates
} from '../mapUtils';

describe('mapUtils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between Mumbai coordinates correctly', () => {
      // Distance between Mumbai Central and Mumbai Airport
      const mumbaiCentral = [19.0176, 72.8562];
      const mumbaiAirport = [19.0896, 72.8656];
      const distance = calculateDistance(...mumbaiCentral, ...mumbaiAirport);
      
      expect(distance).toBeCloseTo(8.0, 0); // Approximately 8km
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(19.0176, 72.8562, 19.0176, 72.8562);
      expect(distance).toBeCloseTo(0, 5);
    });

    it('should calculate global distances correctly', () => {
      // Distance between Mumbai and Delhi
      const mumbai = [19.0760, 72.8777];
      const delhi = [28.7041, 77.1025];
      const distance = calculateDistance(...mumbai, ...delhi);
      
      expect(distance).toBeCloseTo(1150, -1); // Approximately 1150km
    });
  });

  describe('findNearestTower', () => {
    const mockTowers = [
      { id: 1, name: 'Tower A', latitude: 19.0000, longitude: 72.8000 },
      { id: 2, name: 'Tower B', latitude: 19.0100, longitude: 72.8100 },
      { id: 3, name: 'Tower C', latitude: 19.0200, longitude: 72.8200 }
    ];

    it('should find the nearest tower', () => {
      const nearest = findNearestTower(19.0050, 72.8050, mockTowers);
      expect(nearest.id).toBe(2); // Tower B should be nearest
      expect(nearest.distance_km).toBeDefined();
      expect(nearest.distance_km).toBeGreaterThan(0);
    });

    it('should return null for empty tower array', () => {
      const nearest = findNearestTower(19.0000, 72.8000, []);
      expect(nearest).toBeNull();
    });

    it('should ignore towers without coordinates', () => {
      const towersWithMissingCoords = [
        { id: 1, name: 'Tower A' }, // Missing coordinates
        { id: 2, name: 'Tower B', latitude: 19.0100, longitude: 72.8100 }
      ];
      
      const nearest = findNearestTower(19.0050, 72.8050, towersWithMissingCoords);
      expect(nearest.id).toBe(2);
    });
  });

  describe('getSeverityScore', () => {
    it('should return correct severity scores', () => {
      expect(getSeverityScore('CRITICAL')).toBe(3);
      expect(getSeverityScore('WARNING')).toBe(2);
      expect(getSeverityScore('NORMAL')).toBe(1);
      expect(getSeverityScore('UNKNOWN')).toBe(0);
      expect(getSeverityScore(null)).toBe(0);
      expect(getSeverityScore(undefined)).toBe(0);
    });

    it('should be case insensitive', () => {
      expect(getSeverityScore('critical')).toBe(3);
      expect(getSeverityScore('Critical')).toBe(3);
      expect(getSeverityScore('CRITICAL')).toBe(3);
    });
  });

  describe('clusterFaultsByProximity', () => {
    const mockFaults = [
      { id: 1, latitude: 19.0000, longitude: 72.8000, fault_level: 'CRITICAL' },
      { id: 2, latitude: 19.0001, longitude: 72.8001, fault_level: 'WARNING' }, // Very close to fault 1
      { id: 3, latitude: 19.0500, longitude: 72.8500, fault_level: 'NORMAL' },  // Far from others
    ];

    it('should cluster nearby faults', () => {
      const clusters = clusterFaultsByProximity(mockFaults, 0.2); // 0.2km threshold
      
      expect(clusters).toHaveLength(2); // Should create 2 clusters
      expect(clusters[0].faults).toHaveLength(2); // First cluster has 2 faults
      expect(clusters[1].faults).toHaveLength(1); // Second cluster has 1 fault
    });

    it('should calculate cluster center correctly', () => {
      const clusters = clusterFaultsByProximity(mockFaults, 0.2);
      const firstCluster = clusters[0];
      
      expect(firstCluster.center.latitude).toBeCloseTo(19.0000, 3);
      expect(firstCluster.center.longitude).toBeCloseTo(72.8000, 3);
    });

    it('should handle empty input', () => {
      const clusters = clusterFaultsByProximity([]);
      expect(clusters).toEqual([]);
    });

    it('should ignore faults without coordinates', () => {
      const faultsWithMissingCoords = [
        { id: 1, fault_level: 'CRITICAL' }, // Missing coordinates
        { id: 2, latitude: 19.0000, longitude: 72.8000, fault_level: 'WARNING' }
      ];
      
      const clusters = clusterFaultsByProximity(faultsWithMissingCoords);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].faults).toHaveLength(1);
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(19.0760, 72.8777)).toBe(true); // Mumbai
      expect(isValidCoordinates(-33.8688, 151.2093)).toBe(true); // Sydney
      expect(isValidCoordinates(90, 180)).toBe(true); // Edge cases
      expect(isValidCoordinates(-90, -180)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinates(91, 72.8777)).toBe(false); // Lat > 90
      expect(isValidCoordinates(19.0760, 181)).toBe(false); // Lon > 180
      expect(isValidCoordinates(-91, 72.8777)).toBe(false); // Lat < -90
      expect(isValidCoordinates(19.0760, -181)).toBe(false); // Lon < -180
      expect(isValidCoordinates(0, 0)).toBe(false); // Null island
      expect(isValidCoordinates('invalid', 72.8777)).toBe(false); // String input
      expect(isValidCoordinates(null, undefined)).toBe(false); // Null/undefined
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with specified precision', () => {
      expect(formatCoordinates(19.076047, 72.877656, 2)).toBe('19.08, 72.88');
      expect(formatCoordinates(19.076047, 72.877656, 4)).toBe('19.0760, 72.8777');
      expect(formatCoordinates(19.076047, 72.877656, 6)).toBe('19.076047, 72.877656');
    });

    it('should handle invalid coordinates', () => {
      expect(formatCoordinates(91, 72.8777)).toBe('Invalid coordinates');
      expect(formatCoordinates(0, 0)).toBe('Invalid coordinates');
      expect(formatCoordinates(null, undefined)).toBe('Invalid coordinates');
    });

    it('should use default precision of 6', () => {
      expect(formatCoordinates(19.076047, 72.877656)).toBe('19.076047, 72.877656');
    });
  });
});
