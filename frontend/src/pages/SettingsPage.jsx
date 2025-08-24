/**
 * Settings page - system configuration and preferences
 * Professional interface for managing system settings and user preferences
 */

import React, { useState } from 'react';
import { 
  Save, 
  RefreshCw, 
  Mail,
  Brain,
  MapPin,
  Monitor,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config';

const SettingsPage = () => {
  const { success, error } = useAlert();
  const { themeMode, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('system');
  const [saving, setSaving] = useState(false);

  // Mock settings state - in real app, these would come from API
  const [settings, setSettings] = useState({
    // System settings
    apiUrl: API_BASE_URL,
    maxFileSize: 10,
    batchLimit: 100,
    autoRefresh: true,
    refreshInterval: 30,
    
    // Email settings
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    emailRecipients: ['admin@thermalvision.com'],
    emailEnabled: true,
    criticalAlerts: true,
    
    // AI settings
    aiModel: 'mistral-7b-instruct',
    temperatureThreshold: 5.0,
    dynamicThresholds: true,
    ocrAccuracy: 'high',
    
    // Map settings
    mapProvider: 'openstreetmap',
    defaultZoom: 10,
    clusterMarkers: true,
    showHeatmap: false,
    
    // User preferences
    language: 'en',
    timezone: 'UTC',
    notifications: true
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Settings saved successfully!');
    } catch (err) {
      error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to default values
    setSettings(prev => ({
      ...prev,
      temperatureThreshold: 5.0,
      maxFileSize: 10,
      batchLimit: 100,
      refreshInterval: 30
    }));
    success('Settings reset to defaults');
  };

  const tabs = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'email', label: 'Email & Alerts', icon: Mail },
    { id: 'ai', label: 'AI Analysis', icon: Brain },
    { id: 'map', label: 'Map & Location', icon: MapPin },
    { id: 'user', label: 'User Preferences', icon: Users }
  ];

  const SettingCard = ({ title, description, children, status = null }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        {status && (
          <div className={`flex items-center space-x-1 ${
            status === 'active' ? 'text-green-600' : 'text-red-600'
          }`}>
            {status === 'active' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-xs font-medium capitalize">{status}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );

  const InputField = ({ label, type = 'text', value, onChange, placeholder, suffix }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {suffix && (
          <span className="absolute right-3 top-2 text-sm text-gray-500">{suffix}</span>
        )}
      </div>
    </div>
  );

  const SelectField = ({ label, value, onChange, options }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const SwitchField = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-800 transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'system':
        return (
          <div className="space-y-6">
            <SettingCard
              title="API Configuration"
              description="Configure backend API connection settings"
              status="active"
            >
              <div className="space-y-4">
                <InputField
                  label="API Base URL"
                  value={settings.apiUrl}
                  onChange={(value) => setSettings(prev => ({ ...prev, apiUrl: value }))}
                  placeholder="http://localhost:8000"
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Max File Size"
                    type="number"
                    value={settings.maxFileSize}
                    onChange={(value) => setSettings(prev => ({ ...prev, maxFileSize: parseInt(value) }))}
                    suffix="MB"
                  />
                  <InputField
                    label="Batch Upload Limit"
                    type="number"
                    value={settings.batchLimit}
                    onChange={(value) => setSettings(prev => ({ ...prev, batchLimit: parseInt(value) }))}
                    suffix="files"
                  />
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Interface Settings"
              description="Configure dashboard and interface behavior"
            >
              <div className="space-y-4">
                <SwitchField
                  label="Auto Refresh"
                  description="Automatically refresh data on dashboard"
                  checked={settings.autoRefresh}
                  onChange={(value) => setSettings(prev => ({ ...prev, autoRefresh: value }))}
                />
                <InputField
                  label="Refresh Interval"
                  type="number"
                  value={settings.refreshInterval}
                  onChange={(value) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(value) }))}
                  suffix="seconds"
                />
              </div>
            </SettingCard>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Email Server Configuration"
              description="Configure SMTP settings for email notifications"
              status={settings.emailEnabled ? 'active' : 'inactive'}
            >
              <div className="space-y-4">
                <SwitchField
                  label="Enable Email Notifications"
                  description="Send email alerts for critical thermal anomalies"
                  checked={settings.emailEnabled}
                  onChange={(value) => setSettings(prev => ({ ...prev, emailEnabled: value }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="SMTP Host"
                    value={settings.smtpHost}
                    onChange={(value) => setSettings(prev => ({ ...prev, smtpHost: value }))}
                  />
                  <InputField
                    label="SMTP Port"
                    type="number"
                    value={settings.smtpPort}
                    onChange={(value) => setSettings(prev => ({ ...prev, smtpPort: parseInt(value) }))}
                  />
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Alert Configuration"
              description="Configure when and how alerts are sent"
            >
              <div className="space-y-4">
                <SwitchField
                  label="Critical Alerts"
                  description="Send immediate alerts for critical thermal anomalies"
                  checked={settings.criticalAlerts}
                  onChange={(value) => setSettings(prev => ({ ...prev, criticalAlerts: value }))}
                />
                <InputField
                  label="Email Recipients"
                  value={settings.emailRecipients.join(', ')}
                  onChange={(value) => setSettings(prev => ({ 
                    ...prev, 
                    emailRecipients: value.split(',').map(e => e.trim()).filter(e => e)
                  }))}
                  placeholder="admin@company.com, engineer@company.com"
                />
              </div>
            </SettingCard>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <SettingCard
              title="AI Model Configuration"
              description="Configure AI analysis engine and model settings"
              status="active"
            >
              <div className="space-y-4">
                <SelectField
                  label="AI Model"
                  value={settings.aiModel}
                  onChange={(value) => setSettings(prev => ({ ...prev, aiModel: value }))}
                  options={[
                    { value: 'mistral-7b-instruct', label: 'Mistral 7B Instruct (Free)' },
                    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' }
                  ]}
                />
                <SelectField
                  label="OCR Accuracy"
                  value={settings.ocrAccuracy}
                  onChange={(value) => setSettings(prev => ({ ...prev, ocrAccuracy: value }))}
                  options={[
                    { value: 'high', label: 'High (Slower, More Accurate)' },
                    { value: 'medium', label: 'Medium (Balanced)' },
                    { value: 'fast', label: 'Fast (Faster, Less Accurate)' }
                  ]}
                />
              </div>
            </SettingCard>

            <SettingCard
              title="Temperature Analysis"
              description="Configure thermal analysis parameters and thresholds"
            >
              <div className="space-y-4">
                <SwitchField
                  label="Dynamic Thresholds"
                  description="Use equipment-specific dynamic temperature thresholds"
                  checked={settings.dynamicThresholds}
                  onChange={(value) => setSettings(prev => ({ ...prev, dynamicThresholds: value }))}
                />
                <InputField
                  label="Default Temperature Threshold"
                  type="number"
                  step="0.1"
                  value={settings.temperatureThreshold}
                  onChange={(value) => setSettings(prev => ({ ...prev, temperatureThreshold: parseFloat(value) }))}
                  suffix="°C"
                />
              </div>
            </SettingCard>
          </div>
        );

      case 'map':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Map Provider & Display"
              description="Configure map visualization and display options"
            >
              <div className="space-y-4">
                <SelectField
                  label="Map Provider"
                  value={settings.mapProvider}
                  onChange={(value) => setSettings(prev => ({ ...prev, mapProvider: value }))}
                  options={[
                    { value: 'openstreetmap', label: 'OpenStreetMap (Free)' },
                    { value: 'mapbox', label: 'Mapbox' },
                    { value: 'google', label: 'Google Maps' }
                  ]}
                />
                <InputField
                  label="Default Zoom Level"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.defaultZoom}
                  onChange={(value) => setSettings(prev => ({ ...prev, defaultZoom: parseInt(value) }))}
                />
              </div>
            </SettingCard>

            <SettingCard
              title="Map Features"
              description="Configure advanced map features and clustering"
            >
              <div className="space-y-4">
                <SwitchField
                  label="Cluster Markers"
                  description="Group nearby markers together for better performance"
                  checked={settings.clusterMarkers}
                  onChange={(value) => setSettings(prev => ({ ...prev, clusterMarkers: value }))}
                />
                <SwitchField
                  label="Show Heatmap"
                  description="Display thermal intensity heatmap overlay"
                  checked={settings.showHeatmap}
                  onChange={(value) => setSettings(prev => ({ ...prev, showHeatmap: value }))}
                />
              </div>
            </SettingCard>
          </div>
        );

      case 'user':
        return (
          <div className="space-y-6">
            <SettingCard
              title="User Interface"
              description="Customize the interface appearance and behavior"
            >
              <div className="space-y-4">
                <SelectField
                  label="Theme"
                  value={themeMode}
                  onChange={(value) => {
                    setTheme(value);
                    success('Theme updated successfully!');
                  }}
                  options={[
                    { value: 'light', label: 'Light Theme' },
                    { value: 'dark', label: 'Dark Theme' },
                    { value: 'system', label: 'Auto (System)' }
                  ]}
                />
                <SelectField
                  label="Language"
                  value={settings.language}
                  onChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' }
                  ]}
                />
              </div>
            </SettingCard>

            <SettingCard
              title="Regional Settings"
              description="Configure timezone and regional preferences"
            >
              <div className="space-y-4">
                <SelectField
                  label="Timezone"
                  value={settings.timezone}
                  onChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'Eastern Time' },
                    { value: 'America/Chicago', label: 'Central Time' },
                    { value: 'America/Denver', label: 'Mountain Time' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time' },
                    { value: 'Asia/Kolkata', label: 'India Standard Time' },
                    { value: 'Europe/London', label: 'London' }
                  ]}
                />
                <SwitchField
                  label="Browser Notifications"
                  description="Show browser notifications for important events"
                  checked={settings.notifications}
                  onChange={(value) => setSettings(prev => ({ ...prev, notifications: value }))}
                />
              </div>
            </SettingCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">System Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure system parameters, preferences, and integrations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
