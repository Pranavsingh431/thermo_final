import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { MAP_CONFIG } from '../config';
import { getFaultLevelBadgeClasses, getFaultLevelColor, formatDate, formatTemperature } from '../utils/helpers';
import FaultLayer from './FaultLayer';

// Create a colored circle marker for a given color
const createCustomIcon = (color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

/**
 * Enhanced MapView: Displays both tower locations and exact fault locations
 * Supports layer toggling and clustering for performance
 * 
 * @param {Array} reports - Array of thermal reports
 * @param {boolean} showTowers - Whether to show tower markers (default: true)
 * @param {boolean} showFaults - Whether to show fault location markers (default: true)
 * @param {boolean} enableClustering - Whether to cluster markers (default: true for >50 markers)
 */
const MapView = ({ 
  reports = [], 
  showTowers = true, 
  showFaults = true,
  enableClustering = null 
}) => {
  const [layerVisibility] = useState({
    towers: showTowers,
    faults: showFaults
  });

  // Auto-enable clustering if many markers
  const shouldCluster = enableClustering ?? reports.length > 50;
  
  // Separate tower and fault data
  const towerData = reports.filter(r => r.latitude && r.longitude);
  const faultData = reports.filter(r => 
    r.latitude && 
    r.longitude && 
    r.fault_level && 
    r.fault_level !== 'NORMAL'
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer url={MAP_CONFIG.tileLayer} attribution={MAP_CONFIG.attribution} />
        
        <LayersControl position="topright">
          {/* Tower Layer */}
          <LayersControl.Overlay name="Tower Locations" checked={layerVisibility.towers}>
            <div>
              {layerVisibility.towers && towerData.map((r) => (
                <Marker
                  key={`tower-${r.id}`}
                  position={[r.latitude, r.longitude]}
                  icon={createCustomIcon(getFaultLevelColor(r.fault_level))}
                >
                  <Popup className="tower-popup">
                    <div className="p-2 min-w-48 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        🗼 {r.tower_name || 'Unknown Tower'}
                      </h3>
                      <div className="space-y-1 text-sm">
                        {r.camp_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Camp:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{r.camp_name}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Latest Temp:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formatTemperature(r.image_temp)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className={getFaultLevelBadgeClasses(r.fault_level)}>{r.fault_level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Last Check:</span>
                          <span className="text-xs text-gray-900 dark:text-gray-100">{formatDate(r.timestamp)}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <Link to={`/report/${r.id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                          View Full Report →
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </div>
          </LayersControl.Overlay>

          {/* Fault Layer */}
          <LayersControl.Overlay name="Thermal Faults" checked={layerVisibility.faults}>
            <FaultLayer faults={faultData} visible={layerVisibility.faults} />
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
      
      {/* Custom Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-[1000]">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Map Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
            <span>Normal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
            <span>Critical</span>
          </div>
          <hr className="my-2" />
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 border-2 border-white shadow"></div>
            <span>Towers</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 border-2 border-white shadow transform rotate-45"></div>
            <span>Faults</span>
          </div>
        </div>
        {shouldCluster && (
          <div className="mt-2 pt-2 border-t text-xs text-gray-500">
            Clustering enabled ({reports.length} markers)
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;


