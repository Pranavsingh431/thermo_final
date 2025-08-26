/**
 * Detailed report page with AI-generated summary
 * Shows comprehensive analysis for a specific thermal inspection
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft, 
  MapPin, 
  Thermometer, 
  Zap, 
  AlertTriangle,
  TrendingUp,
  Settings,
  RefreshCw
} from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { generateDetailedReport, getFaultProgression } from '../utils/api';
import { API_BASE_URL } from '../config';
import { useAlert } from '../contexts/AlertContext';
import { 
  formatDate, 
  formatTemperature, 
  formatDistance,
  getFaultLevelBadgeClasses, 
  getPriorityBadgeClasses 
} from '../utils/helpers';

const ReportPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [faultProgression, setFaultProgression] = useState([]);
  const [ambientTempData, setAmbientTempData] = useState([]);
  const { error, success } = useAlert();

  useEffect(() => {
    if (id) {
      // invoke directly to avoid dependency on unstable context functions
      (async () => {
        try {
          setLoading(true);
          const data = await generateDetailedReport(parseInt(id));
          setReport(data);
        } catch (err) {
          setReport(null);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  useEffect(() => {
    if (report?.report_data?.id) {
      getFaultProgression(report.report_data.id)
        .then(data => setFaultProgression(data))
        .catch(err => console.error('Failed to fetch fault progression:', err));
      
      const ambientData = [{
        name: 'Current Reading',
        ambient_temp: report.report_data.ambient_temp || 0,
        image_temp: report.report_data.image_temp || 0
      }];
      setAmbientTempData(ambientData);
    }
  }, [report]);

  const regenerateAISummary = async () => {
    try {
      setGeneratingAI(true);
      const data = await generateDetailedReport(parseInt(id));
      setReport(data);
      success('AI summary regenerated successfully');
    } catch (err) {
      error(`Failed to regenerate AI summary: ${err.message}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading detailed report...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Report Not Found</h3>
          <p className="text-gray-500 mb-4">The requested thermal inspection report could not be found.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Safely destructure the report data
  const { report_data: data, ai_summary, pdf_path } = report || {};
  
  // Check if we have the required data
  if (!data) {
    console.error('Report data is missing:', report);
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Report Data</h3>
          <p className="text-gray-500 mb-4">The report data is malformed or missing required fields.</p>
          <Link
            to="/analysis"
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Analysis</span>
          </Link>
        </div>
      </div>
    );
  }
  
  const pdfHref = pdf_path
    ? (pdf_path.startsWith('http')
        ? pdf_path
        : `${API_BASE_URL}/${pdf_path.replace(/^\//, '')}`)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/analysis"
            className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Analysis</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Thermal Inspection Report</h1>
          <p className="text-gray-600 mt-1">Report ID: #{data.id} • {formatDate(data.timestamp)}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={getFaultLevelBadgeClasses(data.fault_level)}>
            {data.fault_level}
          </span>
          {data.priority && (
            <span className={getPriorityBadgeClasses(data.priority)}>
              {data.priority} Priority
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Report Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI-Generated Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                AI Analysis Summary
              </h2>
              <div className="flex items-center space-x-3">
                {pdfHref && (
                  <a
                    href={pdfHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Open PDF</span>
                  </a>
                )}
                <button
                  onClick={regenerateAISummary}
                  disabled={generatingAI}
                  className="flex items-center space-x-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${generatingAI ? 'animate-spin' : ''}`} />
                  <span>{generatingAI ? 'Generating...' : 'Regenerate'}</span>
                </button>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                {ai_summary}
              </p>
            </div>
          </div>

          {/* Temperature Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Thermometer className="h-5 w-5 mr-2 text-orange-500" />
              Temperature Analysis
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-900 mb-1">
                    {formatTemperature(data.image_temp)}
                  </div>
                  <div className="text-sm text-orange-700 font-medium">Thermal Reading</div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-900 mb-1">
                    {formatTemperature(data.ambient_temp)}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">Ambient Temperature</div>
                </div>
              </div>
            </div>

            {/* Temperature Delta Analysis */}
            {data.delta_t !== null && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Temperature Excess</span>
                  <span className={`text-2xl font-bold ${
                    data.delta_t > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {data.delta_t > 0 ? '+' : ''}{data.delta_t.toFixed(1)}°C
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Dynamic Threshold: {formatTemperature(data.threshold_used)}</span>
                  <span className={data.delta_t > (data.threshold_used || 5) ? 'text-red-600' : 'text-green-600'}>
                    {data.delta_t > (data.threshold_used || 5) ? 'EXCEEDED' : 'WITHIN LIMITS'}
                  </span>
                </div>
                
                {/* Visual threshold indicator */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>0°C</span>
                    <span>Threshold: {data.threshold_used?.toFixed(1)}°C</span>
                    <span>+{Math.max(data.threshold_used || 5, data.delta_t) + 5}°C</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        data.delta_t > (data.threshold_used || 5) ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (data.delta_t / (Math.max(data.threshold_used || 5, data.delta_t) + 5)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-500" />
              Analysis Details
            </h2>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Analysis Status:</span>
                  <span className={`font-medium ${
                    data.analysis_status === 'success' ? 'text-green-600' : 
                    data.analysis_status === 'partial' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {data.analysis_status.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="font-medium">{formatDate(data.timestamp)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Dynamic Threshold:</span>
                  <span className="font-medium">{formatTemperature(data.threshold_used)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {data.latitude && data.longitude && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">GPS Coordinates:</span>
                    <span className="font-medium text-xs">
                      {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Report ID:</span>
                  <span className="font-medium">#{data.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">System Version:</span>
                  <span className="font-medium">Thermal Eye v1.0</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fault Progression Charts */}
          {faultProgression.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
                Fault Progression Analysis
              </h2>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={faultProgression.map(item => ({
                    date: new Date(item.date).toLocaleDateString(),
                    temperature: item.temperature,
                    threshold: item.threshold,
                    delta: item.delta_t
                  }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="date" />
                    <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} />
                    <Radar name="Temperature" dataKey="temperature" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                    <Radar name="Threshold" dataKey="threshold" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {faultProgression.length <= 1 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Not enough data for fault progression analysis. Upload more images of the same fault to see trends.
              </p>
            </div>
          )}

          {/* Temperature Comparison Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Thermometer className="h-5 w-5 mr-2 text-blue-500" />
              Temperature Comparison
            </h2>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ambientTempData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ambient_temp" stroke="#3b82f6" name="Ambient Temperature (°C)" />
                  <Line type="monotone" dataKey="image_temp" stroke="#ef4444" name="Image Temperature (°C)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tower Information */}
          {data.tower_name && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                Tower Details
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block">Tower Name</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.tower_name}</span>
                </div>
                
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block">Camp Location</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{data.camp_name}</span>
                </div>
                
                <div>
                  <span className="text-gray-600 dark:text-gray-400 block">Distance from Image</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatDistance(data.distance_km)}</span>
                </div>
                
                {data.voltage_kv && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 block">Voltage Level</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.voltage_kv}kV</span>
                  </div>
                )}
                
                {data.capacity_amps && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 block">Capacity</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.capacity_amps}A</span>
                  </div>
                )}
                
                <div className="pt-3 border-t">
                  <span className="text-gray-600 block mb-1">Coordinates</span>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Lat: {data.latitude?.toFixed(6)}</div>
                    <div>Lon: {data.longitude?.toFixed(6)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Quick Stats
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                  <span className="text-sm text-gray-700">Max Temperature</span>
                </div>
                <span className="font-semibold text-gray-900">{formatTemperature(data.image_temp)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    data.delta_t > 0 ? 'bg-red-400' : 'bg-green-400'
                  }`}></div>
                  <span className="text-sm text-gray-700">Delta T</span>
                </div>
                <span className={`font-semibold ${
                  data.delta_t > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {data.delta_t > 0 ? '+' : ''}{data.delta_t?.toFixed(1)}°C
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span className="text-sm text-gray-700">Classification</span>
                </div>
                <span className={getFaultLevelBadgeClasses(data.fault_level)}>
                  {data.fault_level}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setLoading(true);
                  generateDetailedReport(parseInt(id))
                    .then(data => {
                      setReport(data);
                      setLoading(false);
                    })
                    .catch(err => {
                      console.error('Error refreshing report:', err);
                      setLoading(false);
                    });
                }}
                className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Report</span>
              </button>
              
              <Link
                to="/analysis"
                className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
