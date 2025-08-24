import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook for managing map state and URL synchronization
 * Supports deep-linking to specific faults and layers
 */
export const useMapState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [mapState, setMapState] = useState({
    center: [19.07611, 72.87750], // Mumbai default
    zoom: 10,
    selectedFault: null,
    activeLayers: {
      towers: true,
      faults: true
    }
  });

  // Initialize state from URL params
  useEffect(() => {
    const faultId = searchParams.get('fault');
    const showTowers = searchParams.get('towers') !== 'false';
    const showFaults = searchParams.get('faults') !== 'false';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const zoom = searchParams.get('zoom');

    setMapState(prev => ({
      ...prev,
      selectedFault: faultId ? parseInt(faultId) : null,
      activeLayers: {
        towers: showTowers,
        faults: showFaults
      },
      center: lat && lng ? [parseFloat(lat), parseFloat(lng)] : prev.center,
      zoom: zoom ? parseInt(zoom) : prev.zoom
    }));
  }, [searchParams]);

  // Update URL when map state changes
  const updateMapState = (updates) => {
    setMapState(prev => ({ ...prev, ...updates }));
    
    const newParams = new URLSearchParams(searchParams);
    
    if (updates.selectedFault) {
      newParams.set('fault', updates.selectedFault.toString());
    } else if (updates.selectedFault === null) {
      newParams.delete('fault');
    }
    
    if (updates.center) {
      newParams.set('lat', updates.center[0].toFixed(6));
      newParams.set('lng', updates.center[1].toFixed(6));
    }
    
    if (updates.zoom) {
      newParams.set('zoom', updates.zoom.toString());
    }
    
    if (updates.activeLayers) {
      newParams.set('towers', updates.activeLayers.towers.toString());
      newParams.set('faults', updates.activeLayers.faults.toString());
    }
    
    setSearchParams(newParams);
  };

  // Helper function to focus on a specific fault
  const focusOnFault = (fault) => {
    if (fault && fault.latitude && fault.longitude) {
      updateMapState({
        center: [fault.latitude, fault.longitude],
        zoom: 16,
        selectedFault: fault.id,
        activeLayers: { towers: true, faults: true }
      });
    }
  };

  // Helper function to clear selection
  const clearSelection = () => {
    updateMapState({
      selectedFault: null
    });
  };

  return {
    mapState,
    updateMapState,
    focusOnFault,
    clearSelection
  };
};
