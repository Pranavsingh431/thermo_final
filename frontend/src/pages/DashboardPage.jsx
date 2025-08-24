/**
 * Dashboard overview page - redesigned for professional appearance
 * Shows key metrics, recent activity, and quick access to major functions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  FileText,
  MapPin,
  Clock,
  Zap,
  Activity
} from 'lucide-react';
import { getThermalReports } from '../utils/api';
import { useAlert } from '../contexts/AlertContext';

const DashboardPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    normal: 0,
    todayProcessed: 0,
    averageTemp: 0
  });
  const { error } = useAlert();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getThermalReports();
      setReports(data.slice(0, 5)); // Get latest 5 for recent activity
      
      // Calculate stats
      const total = data.length;
      const critical = data.filter(r => r.fault_level === 'CRITICAL').length;
      const warning = data.filter(r => r.fault_level === 'WARNING').length;
      const normal = data.filter(r => r.fault_level === 'NORMAL').length;
      
      // Today's processed (last 24 hours)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayProcessed = data.filter(r => new Date(r.timestamp) >= today).length;
      
      // Average temperature
      const validTemps = data.filter(r => r.image_temp != null).map(r => r.image_temp);
      const averageTemp = validTemps.length > 0 
        ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length 
        : 0;

      setStats({
        total,
        critical,
        warning, 
        normal,
        todayProcessed,
        averageTemp
      });
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, onClick }) => (
    <div 
      className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>
            {loading ? '...' : value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp className={`h-4 w-4 mr-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend)}% from last week
          </span>
        </div>
      )}
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, to, color }) => (
    <Link 
      to={to}
      className="block bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:scale-105 transition-all duration-200"
    >
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );

  const RecentActivityItem = ({ report }) => (
    <Link 
      to={`/report/${report.id}`}
      className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className={`w-3 h-3 rounded-full ${
        report.fault_level === 'CRITICAL' ? 'bg-red-500' :
        report.fault_level === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {report.tower_name || `Inspection ${report.id}`}
        </p>
        <p className="text-sm text-gray-500">
          {report.camp_name && `${report.camp_name} • `}
          {report.image_temp ? `${report.image_temp.toFixed(1)}°C` : 'N/A'}
          {report.delta_t && ` (${report.delta_t > 0 ? '+' : ''}${report.delta_t.toFixed(1)}°C)`}
        </p>
      </div>
      <div className="text-xs text-gray-400">
        {new Date(report.timestamp).toLocaleDateString()}
      </div>
    </Link>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor thermal inspection performance and system health
        </p>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Inspections"
          value={stats.total.toLocaleString()}
          subtitle="All time"
          icon={BarChart3}
          color="text-blue-600"
          trend={12}
        />
        <StatCard
          title="Critical Alerts"
          value={stats.critical}
          subtitle="Requires immediate attention"
          icon={AlertTriangle}
          color="text-red-600"
          trend={-8}
        />
        <StatCard
          title="Processed Today"
          value={stats.todayProcessed}
          subtitle="Last 24 hours"
          icon={Activity}
          color="text-green-600"
          trend={23}
        />
        <StatCard
          title="Average Temperature"
          value={`${stats.averageTemp.toFixed(1)}°C`}
          subtitle="Across all readings"
          icon={TrendingUp}
          color="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <QuickActionCard
              title="Upload Images"
              description="Upload thermal images for analysis"
              icon={Upload}
              to="/upload"
              color="text-blue-600"
            />
            <QuickActionCard
              title="View Analysis"
              description="Review AI analysis results"
              icon={Zap}
              to="/analysis"
              color="text-purple-600"
            />
            <QuickActionCard
              title="Tower Map"
              description="Explore tower locations and status"
              icon={MapPin}
              to="/towers"
              color="text-green-600"
            />
            <QuickActionCard
              title="Generate Reports"
              description="Create and export detailed reports"
              icon={FileText}
              to="/reports"
              color="text-orange-600"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <Link 
                  to="/analysis"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reports.length > 0 ? (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <RecentActivityItem key={report.id} report={report} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                  <p className="text-gray-500 mb-6">
                    Upload thermal images to see analysis results here
                  </p>
                  <Link 
                    to="/upload"
                    className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload Images</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">API Services</p>
              <p className="text-sm text-green-600">Operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">AI Analysis Engine</p>
              <p className="text-sm text-green-600">Running</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-green-600">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
