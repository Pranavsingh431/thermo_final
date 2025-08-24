/**
 * AI Analysis page - dedicated view for analysis results
 * Professional interface for viewing and filtering thermal analysis results
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Brain, 
  Filter, 
  Search, 
  Eye, 
  Download,
  Calendar,
  MapPin,
  Thermometer
} from 'lucide-react';
import { getThermalReports } from '../utils/api';
import { useAlert } from '../contexts/AlertContext';
import { 
  formatTemperature, 
  formatDate, 
  getFaultLevelBadgeClasses, 
  getPriorityBadgeClasses 
} from '../utils/helpers';

const AnalysisPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchParams] = useSearchParams();
  const { error } = useAlert();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getThermalReports();
      setReports(data);
    } catch (err) {
      error('Failed to fetch analysis reports');
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        (report.tower_name && report.tower_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.camp_name && report.camp_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Fault level filter
    if (filterLevel !== 'ALL') {
      filtered = filtered.filter(report => report.fault_level === filterLevel);
    }

    // Priority filter
    if (filterPriority !== 'ALL') {
      filtered = filtered.filter(report => report.priority === filterPriority);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredReports(filtered);
  }, [reports, searchTerm, filterLevel, filterPriority]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Handle direct link to specific analysis
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && reports.length > 0) {
      const report = reports.find(r => r.id.toString() === id);
      if (report) {
        // Scroll to or highlight the specific report
        const element = document.getElementById(`report-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary-500');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary-500');
          }, 3000);
        }
      }
    }
  }, [searchParams, reports]);

  const exportReports = () => {
    const csvContent = [
      ['ID', 'Tower', 'Camp', 'Temperature', 'Delta T', 'Fault Level', 'Priority', 'Timestamp'].join(','),
      ...filteredReports.map(r => [
        r.id,
        r.tower_name || '',
        r.camp_name || '',
        r.image_temp || '',
        r.delta_t || '',
        r.fault_level || '',
        r.priority || '',
        r.timestamp
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `thermal_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const StatsCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Analysis Results</h1>
          <p className="text-gray-600 mt-2">Loading analysis results...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const criticalCount = filteredReports.filter(r => r.fault_level === 'CRITICAL').length;
  const warningCount = filteredReports.filter(r => r.fault_level === 'WARNING').length;
  const normalCount = filteredReports.filter(r => r.fault_level === 'NORMAL').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Analysis Results</h1>
          <p className="text-gray-600 mt-2">
            Review thermal analysis results and AI-generated insights
          </p>
        </div>
        <button
          onClick={exportReports}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Results"
          value={filteredReports.length}
          icon={Brain}
          color="text-blue-600"
        />
        <StatsCard
          title="Critical"
          value={criticalCount}
          icon={Brain}
          color="text-red-600"
        />
        <StatsCard
          title="Warning"
          value={warningCount}
          icon={Brain}
          color="text-yellow-600"
        />
        <StatsCard
          title="Normal"
          value={normalCount}
          icon={Brain}
          color="text-green-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters & Search</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Fault Level</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredReports.length} of {reports.length} results
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-500">
                {reports.length === 0 
                  ? 'No analysis results available. Upload thermal images to get started.'
                  : 'No results match the current filters. Try adjusting your search criteria.'
                }
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tower & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temperature Analysis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr 
                    key={report.id} 
                    id={`report-${report.id}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.tower_name || 'Unknown Tower'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.camp_name || 'Unknown Camp'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Thermometer className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {formatTemperature(report.image_temp)}
                          </div>
                          {report.delta_t !== null && report.delta_t !== undefined && (
                            <div className={`text-xs ${report.delta_t > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ΔT: {report.delta_t > 0 ? '+' : ''}{report.delta_t.toFixed(1)}°C
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {formatDate(report.timestamp)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/report/${report.id}`}
                        className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
