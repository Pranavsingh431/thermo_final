import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { formatDate, formatTemperature, getFaultLevelColor } from '../utils/helpers';

/**
 * Create fault markers with distinct styling from tower markers
 * Uses fault-specific shapes and severity indicators
 */
const createFaultIcon = (faultLevel, priority) => {
  const color = getFaultLevelColor(faultLevel);
  const size = priority === 'CRITICAL' ? 24 : priority === 'HIGH' ? 20 : 16;
  
  // Use square markers for faults to distinguish from circular tower markers
  const shape = faultLevel === 'CRITICAL' ? 'diamond' : 'square';
  
  let html;
  if (shape === 'diamond') {
    html = `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      transform: rotate(45deg);
      border-radius: 3px;
    "></div>`;
  } else {
    html = `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      border-radius: 3px;
    "></div>`;
  }
  
  return L.divIcon({
    className: 'fault-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

/**
 * FaultLayer Component - Shows exact thermal fault locations
 * Displays markers at GPS coordinates where thermal readings were taken
 * 
 * @param {Array} faults - Array of thermal reports with GPS coordinates
 * @param {boolean} visible - Whether the layer is visible
 */
const FaultLayer = ({ faults = [], visible = true }) => {
  if (!visible) return null;

  // Filter to only show faults with exact GPS coordinates
  const geolocatedFaults = faults.filter(fault => 
    fault.latitude && 
    fault.longitude && 
    fault.latitude !== 0 && 
    fault.longitude !== 0
  );

  return (
    <>
      {geolocatedFaults.map((fault) => (
        <Marker
          key={`fault-${fault.id}`}
          position={[fault.latitude, fault.longitude]}
          icon={createFaultIcon(fault.fault_level, fault.priority)}
        >
          <Popup className="fault-popup" maxWidth={300}>
            <div className="p-3 min-w-64">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  🌡️ Thermal Fault #{fault.id}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  fault.fault_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  fault.fault_level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {fault.fault_level}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                {/* Location Details */}
                <div className="bg-gray-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coordinates:</span>
                    <span className="font-mono text-xs">
                      {fault.latitude.toFixed(6)}, {fault.longitude.toFixed(6)}
                    </span>
                  </div>
                  {fault.tower_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Near Tower:</span>
                      <span className="font-medium">{fault.tower_name}</span>
                    </div>
                  )}
                  {fault.camp_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Camp:</span>
                      <span className="font-medium">{fault.camp_name}</span>
                    </div>
                  )}
                </div>

                {/* Thermal Data */}
                <div className="bg-orange-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Temperature:</span>
                    <span className="font-medium text-orange-800">
                      {formatTemperature(fault.image_temp)}
                    </span>
                  </div>
                  {fault.delta_t !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ΔT (excess):</span>
                      <span className={`font-medium ${
                        fault.delta_t > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {fault.delta_t > 0 ? '+' : ''}{fault.delta_t?.toFixed(1)}°C
                      </span>
                    </div>
                  )}
                  {fault.threshold_used && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Threshold:</span>
                      <span className="font-medium">{fault.threshold_used.toFixed(1)}°C</span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Detected:</span>
                    <span>{formatDate(fault.timestamp)}</span>
                  </div>
                  {fault.priority && (
                    <div className="flex justify-between">
                      <span>Priority:</span>
                      <span className="font-medium">{fault.priority}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="mt-3 pt-2 border-t border-gray-200 flex space-x-2">
                <Link 
                  to={`/report/${fault.id}`} 
                  className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
                >
                  View Report
                </Link>
                {fault.latitude && fault.longitude && (
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${fault.latitude},${fault.longitude}`;
                      window.open(url, '_blank');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 py-2 px-3 border border-blue-200 rounded transition-colors"
                  >
                    Maps
                  </button>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default FaultLayer;
