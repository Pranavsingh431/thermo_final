/**
 * Tower Management page - dedicated view for tower data and map visualization
 * Professional interface for managing tower information and location data
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Database, Filter, Search, Eye, Download } from 'lucide-react';
import { getThermalReports } from '../utils/api';

import MapView from '../components/MapView';

const TowerManagementPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCamp, setFilterCamp] = useState('ALL');
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'table'
  // Alert not used here to keep effects stable

  const fetchTowerData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getThermalReports();
      setReports(data);
    } catch (err) {
      console.error('Fetch tower data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTowerData();
  }, [fetchTowerData]);

  // Extract unique towers and their latest status
  const getTowerSummary = () => {
    const towerMap = new Map();
    
    reports.forEach(report => {
      const key = `${report.tower_name}_${report.camp_name}`;
      if (!towerMap.has(key) || new Date(report.timestamp) > new Date(towerMap.get(key).timestamp)) {
        towerMap.set(key, report);
      }
    });

    let towers = Array.from(towerMap.values());

    // Apply filters
    if (searchTerm) {
      towers = towers.filter(tower => 
        (tower.tower_name && tower.tower_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tower.camp_name && tower.camp_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterCamp !== 'ALL') {
      towers = towers.filter(tower => tower.camp_name === filterCamp);
    }

    return towers;
  };

  const towers = getTowerSummary();
  const uniqueCamps = [...new Set(reports.map(r => r.camp_name).filter(Boolean))];

  const exportTowerData = () => {
    const csvContent = [
      ['Tower Name', 'Camp', 'Latitude', 'Longitude', 'Latest Status', 'Latest Temperature', 'Last Inspection'].join(','),
      ...towers.map(t => [
        t.tower_name || '',
        t.camp_name || '',
        t.latitude || '',
        t.longitude || '',
        t.fault_level || '',
        t.image_temp || '',
        t.timestamp
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `tower_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const StatsCard = ({ title, value, subtitle, color }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );



  const getStatusBadgeClasses = (faultLevel) => {
    switch (faultLevel) {
      case 'CRITICAL': return 'px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800';
      case 'WARNING': return 'px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800';
      case 'NORMAL': return 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800';
      default: return 'px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tower Management</h1>
          <p className="text-gray-600 mt-2">Loading tower data...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const criticalTowers = towers.filter(t => t.fault_level === 'CRITICAL').length;
  const warningTowers = towers.filter(t => t.fault_level === 'WARNING').length;
  const normalTowers = towers.filter(t => t.fault_level === 'NORMAL').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tower Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor tower locations, status, and inspection history
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'map' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Map View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table View
            </button>
          </div>
          <button
            onClick={exportTowerData}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Towers"
          value={towers.length}
          subtitle="Unique locations"
          color="text-blue-600"
        />
        <StatsCard
          title="Critical Status"
          value={criticalTowers}
          subtitle="Require attention"
          color="text-red-600"
        />
        <StatsCard
          title="Warning Status"
          value={warningTowers}
          subtitle="Monitor closely"
          color="text-yellow-600"
        />
        <StatsCard
          title="Normal Status"
          value={normalTowers}
          subtitle="Operating normally"
          color="text-green-600"
        />
        <StatsCard
          title="Camps"
          value={uniqueCamps.length}
          subtitle="Operational areas"
          color="text-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Towers</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tower name or camp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Camp</label>
            <select
              value={filterCamp}
              onChange={(e) => setFilterCamp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Camps</option>
              {uniqueCamps.map(camp => (
                <option key={camp} value={camp}>{camp}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'map' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                  Tower Location Map
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Interactive map showing {towers.length} towers with latest inspection status
                </p>
              </div>
            </div>
          </div>
          
          <div className="h-96">
            <MapView reports={towers} />
          </div>

          {/* Map Legend */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Normal ({normalTowers})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Warning ({warningTowers})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Critical ({criticalTowers})</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Database className="h-5 w-5 mr-2 text-primary-600" />
              Tower Data Table
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Detailed tower information and latest inspection status
            </p>
          </div>
          
          <div className="overflow-x-auto">
            {towers.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Towers Found</h3>
                <p className="text-gray-500">
                  No towers match the current search criteria
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tower Information
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latest Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temperature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Inspection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {towers.map((tower) => (
                    <tr key={`${tower.tower_name}_${tower.camp_name}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tower.tower_name || 'Unknown Tower'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {tower.camp_name || 'Unknown Camp'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tower.latitude && tower.longitude ? (
                          <div>
                            <div>{tower.latitude.toFixed(6)}</div>
                            <div className="text-gray-500">{tower.longitude.toFixed(6)}</div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadgeClasses(tower.fault_level)}>
                          {tower.fault_level || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tower.image_temp ? `${tower.image_temp.toFixed(1)}°C` : 'N/A'}
                        {tower.delta_t !== null && tower.delta_t !== undefined && (
                          <div className={`text-xs ${tower.delta_t > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ΔT: {tower.delta_t > 0 ? '+' : ''}{tower.delta_t.toFixed(1)}°C
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tower.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            // Center map on this tower
                            setViewMode('map');
                            // You could add map centering logic here
                          }}
                          className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View on Map</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TowerManagementPage;
