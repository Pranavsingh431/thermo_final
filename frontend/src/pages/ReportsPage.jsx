/**
 * Reports & Export page - dedicated view for detailed reports and PDF generation
 * Professional interface for viewing, generating, and exporting comprehensive reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Calendar,
  Filter,
  Eye,
  BarChart3,
  PieChart,
  TrendingUp,
  Trash2
} from 'lucide-react';
import { getThermalReports, generateDetailedReport, deleteReport } from '../utils/api';
import { useAlert } from '../contexts/AlertContext';
import { formatDate, getFaultLevelBadgeClasses } from '../utils/helpers';
import { API_BASE_URL } from '../config';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [deletingReport, setDeletingReport] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const { success } = useAlert();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getThermalReports();
      setReports(data);
    } catch (err) {
      // swallow to prevent re-render loops from alerts
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerateReport = async (reportId) => {
    try {
      setGeneratingReport(reportId);
      const reportData = await generateDetailedReport(reportId);
      
      // Update the report in the list to show it has a PDF
      // Make sure to construct absolute URL for PDF path
      const absolutePdfPath = reportData.pdf_path && !reportData.pdf_path.startsWith('http') 
        ? `${API_BASE_URL}/${reportData.pdf_path.replace(/^\//, '')}` 
        : reportData.pdf_path;
        
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, pdf_path: absolutePdfPath }
          : r
      ));
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      setDeletingReport(reportId);
      await deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      setShowDeleteModal(null);
      success('Report deleted successfully!');
    } catch (err) {
      console.error('Failed to delete report:', err);
    } finally {
      setDeletingReport(null);
    }
  };

  const getFilteredReports = () => {
    let filtered = [...reports];

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      if (dateRange !== 'all') {
        filtered = filtered.filter(r => new Date(r.timestamp) >= filterDate);
      }
    }

    // Fault level filter
    if (filterLevel !== 'ALL') {
      filtered = filtered.filter(r => r.fault_level === filterLevel);
    }

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const filteredReports = getFilteredReports();

  const generateSummaryReport = () => {
    const summary = {
      total: filteredReports.length,
      critical: filteredReports.filter(r => r.fault_level === 'CRITICAL').length,
      warning: filteredReports.filter(r => r.fault_level === 'WARNING').length,
      normal: filteredReports.filter(r => r.fault_level === 'NORMAL').length,
      avgTemp: filteredReports.reduce((sum, r) => sum + (r.image_temp || 0), 0) / filteredReports.length || 0,
      dateRange: dateRange
    };

    const csvContent = [
      ['Thermal Inspection Summary Report'],
      ['Generated:', new Date().toISOString()],
      ['Date Range:', dateRange],
      [''],
      ['Metric', 'Value'],
      ['Total Inspections', summary.total],
      ['Critical Alerts', summary.critical],
      ['Warning Alerts', summary.warning],
      ['Normal Results', summary.normal],
      ['Average Temperature', `${summary.avgTemp.toFixed(1)}°C`],
      [''],
      ['Detailed Results:'],
      ['ID', 'Tower', 'Camp', 'Temperature', 'Delta T', 'Status', 'Date'],
      ...filteredReports.map(r => [
        r.id,
        r.tower_name || '',
        r.camp_name || '',
        r.image_temp ? `${r.image_temp.toFixed(1)}°C` : 'N/A',
        r.delta_t ? `${r.delta_t.toFixed(1)}°C` : 'N/A',
        r.fault_level || '',
        formatDate(r.timestamp)
      ])
    ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `thermal_summary_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    success('Summary report exported successfully!');
  };

  const StatsCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reports & Export</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading reports...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const criticalCount = filteredReports.filter(r => r.fault_level === 'CRITICAL').length;
  const warningCount = filteredReports.filter(r => r.fault_level === 'WARNING').length;
  const avgTemp = filteredReports.reduce((sum, r) => sum + (r.image_temp || 0), 0) / filteredReports.length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reports & Export</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Generate detailed reports and export thermal inspection data
          </p>
        </div>
        <button
          onClick={generateSummaryReport}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Summary</span>
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Reports"
          value={filteredReports.length}
          subtitle={`From ${reports.length} total`}
          icon={FileText}
          color="text-blue-600"
        />
        <StatsCard
          title="Critical Issues"
          value={criticalCount}
          subtitle={`${((criticalCount/filteredReports.length)*100 || 0).toFixed(1)}% of total`}
          icon={TrendingUp}
          color="text-red-600"
        />
        <StatsCard
          title="Warning Issues"
          value={warningCount}
          subtitle={`${((warningCount/filteredReports.length)*100 || 0).toFixed(1)}% of total`}
          icon={BarChart3}
          color="text-yellow-600"
        />
        <StatsCard
          title="Avg Temperature"
          value={`${avgTemp.toFixed(1)}°C`}
          subtitle="Across filtered results"
          icon={PieChart}
          color="text-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fault Level</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Levels</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning Only</option>
              <option value="NORMAL">Normal Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Detailed Reports</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredReports.length} reports available for detailed analysis and PDF generation
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Quick access to last batch PDF: {(() => { 
                try { 
                  const lastPdf = localStorage.getItem('lastCombinedPdf');
                  return lastPdf ? (
                    <a
                      href={lastPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      Open Last Batch
                    </a>
                  ) : 'None available';
                } catch(e) { 
                  return 'None available'; 
                } 
              })()}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
              <p className="text-gray-500">
                No reports match the current filter criteria
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temperature Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Report #{report.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.tower_name && `${report.tower_name} - `}
                          {report.camp_name || 'Unknown Location'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Image: {report.image_temp ? `${report.image_temp.toFixed(1)}°C` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Ambient: {report.ambient_temp ? `${report.ambient_temp.toFixed(1)}°C` : 'N/A'}
                        {report.delta_t !== null && report.delta_t !== undefined && (
                          <span className={report.delta_t > 0 ? 'text-red-600' : 'text-green-600'}>
                            {' '}(ΔT: {report.delta_t > 0 ? '+' : ''}{report.delta_t.toFixed(1)}°C)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getFaultLevelBadgeClasses(report.fault_level)}>
                        {report.fault_level || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(report.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/report/${report.id}`}
                          className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </Link>
                        
                        {report.pdf_path ? (
                          <a
                            href={report.pdf_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download PDF</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => handleGenerateReport(report.id)}
                            disabled={generatingReport === report.id}
                            className={`flex items-center space-x-1 ${
                              generatingReport === report.id
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-green-600 hover:text-green-700'
                            }`}
                          >
                            {generatingReport === report.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4" />
                                <span>Generate PDF</span>
                              </>
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => setShowDeleteModal(report.id)}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete Report #{showDeleteModal}? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReport(showDeleteModal)}
                disabled={deletingReport === showDeleteModal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletingReport === showDeleteModal ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-blue-200 dark:border-gray-600">
        <h3 className="font-semibold text-blue-900 dark:text-gray-100 mb-4 flex items-center">
          <Download className="h-5 w-5 mr-2" />
          Export Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-gray-600">
            <h4 className="font-medium text-blue-900 dark:text-gray-100 mb-2">Summary Report</h4>
            <p className="text-blue-700 dark:text-gray-400 mb-3">Export filtered data as CSV with summary statistics</p>
            <button
              onClick={generateSummaryReport}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Export CSV →
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-gray-600">
            <h4 className="font-medium text-blue-900 dark:text-gray-100 mb-2">Individual PDFs</h4>
            <p className="text-blue-700 dark:text-gray-400 mb-3">Generate detailed PDF reports for specific inspections</p>
            <p className="text-blue-600 dark:text-blue-400 font-medium">Use table actions →</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-gray-600">
            <h4 className="font-medium text-blue-900 dark:text-gray-100 mb-2">Batch Processing</h4>
            <p className="text-blue-700 dark:text-gray-400 mb-3">Upload multiple images for combined analysis report</p>
            <Link
              to="/upload"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Go to Upload →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
