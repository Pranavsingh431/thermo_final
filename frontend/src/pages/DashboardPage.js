/**
 * Dashboard page with reports table and interactive map
 * Shows all thermal inspection results with filtering and visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, MapPin, FileText, RefreshCw, TrendingUp } from 'lucide-react';
import { getThermalReports } from '../utils/api';
import { useAlert } from '../contexts/AlertContext';
import { 
  formatDate, 
  formatTemperature, 
  getFaultLevelBadgeClasses, 
  getPriorityBadgeClasses,
  generateSummaryStats,
  calculateSeverityScore
} from '../utils/helpers';

import MapView from '../components/MapView';

// Map markers are handled by MapView component

const DashboardPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryStats, setSummaryStats] = useState(null);
  const { error } = useAlert();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getThermalReports();
      setReports(data);
      setSummaryStats(generateSummaryStats(data));
    } catch (err) {
      error(`Failed to load reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    if (filterLevel !== 'ALL') {
      filtered = filtered.filter(report => report.fault_level === filterLevel);
    }
    if (filterPriority !== 'ALL') {
      filtered = filtered.filter(report => report.priority === filterPriority);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(report =>
        report.tower_name?.toLowerCase().includes(term) ||
        report.camp_name?.toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => calculateSeverityScore(b) - calculateSeverityScore(a));
    setFilteredReports(filtered);
  }, [reports, filterLevel, filterPriority, searchTerm]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">Thermal Inspection Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Monitor and analyze thermal inspection results across all towers</p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Inspections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{summaryStats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">{summaryStats.faultCounts.CRITICAL}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{summaryStats.faultCounts.WARNING}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Temperature</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{summaryStats.averageTemperature}°C</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Reports Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Inspection Reports
              </h2>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredReports.length} of {reports.length} reports
                </span>
                {/* Quick access to last combined batch PDF if available */}
                {(() => { try { return localStorage.getItem('lastCombinedPdf'); } catch(e) { return null; } })() && (
                  <a
                    href={(() => { try { return localStorage.getItem('lastCombinedPdf'); } catch(e) { return null; } })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700"
                  >
                    Open Last Batch PDF
                  </a>
                )}
              </div>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Tower name or camp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fault Level</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="ALL">All Levels</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="WARNING">Warning</option>
                  <option value="NORMAL">Normal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tower
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temperature
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      {reports.length === 0 ? 'No reports available' : 'No reports match the current filters'}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {report.tower_name || 'Unknown Tower'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {report.camp_name || 'Unknown Camp'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={getFaultLevelBadgeClasses(report.fault_level)}>
                            {report.fault_level}
                          </span>
                          {report.priority && (
                            <div>
                              <span className={getPriorityBadgeClasses(report.priority)}>
                                {report.priority}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {formatTemperature(report.image_temp)}
                        </div>
                        {report.delta_t && (
                          <div className={`text-xs ${report.delta_t > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {report.delta_t > 0 ? '+' : ''}{report.delta_t.toFixed(1)}°C
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(report.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/report/${report.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary-600" />
              Tower Locations Map
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Interactive map showing thermal inspection results by location
            </p>
          </div>
          
          <div className="h-96">
            <MapView reports={filteredReports} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
