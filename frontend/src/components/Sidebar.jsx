/**
 * Sidebar navigation component for professional layout
 * Provides navigation to all major sections of the thermal inspection system
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Upload, 
  Brain, 
  MapPin, 
  FileText, 
  Settings,
  Thermometer,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const { isDark, themeMode, toggleTheme } = useTheme();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/dashboard',
      description: 'Overview & Quick Stats'
    },
    {
      id: 'upload',
      label: 'Upload & Scan',
      icon: Upload,
      path: '/upload',
      description: 'Thermal Image Upload'
    },
    {
      id: 'analysis',
      label: 'AI Analysis',
      icon: Brain,
      path: '/analysis',
      description: 'Analysis Results & Reports'
    },
    {
      id: 'towers',
      label: 'Tower Management',
      icon: MapPin,
      path: '/towers',
      description: 'Tower Locations & Map'
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileText,
      path: '/reports',
      description: 'Detailed Reports & PDFs'
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      path: '/settings',
      description: 'Configuration & Preferences'
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-80 lg:w-72 shadow-lg dark:shadow-2xl
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-600 dark:bg-primary-700 rounded-lg">
              <Thermometer className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Thermal Eye</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional Edition</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
              title={`Current: ${themeMode} theme - Click to toggle`}
            >
              {isDark ? 
                <Sun className="h-4 w-4 text-yellow-400" /> : 
                <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              }
            </button>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onToggle()}
                className={`
                  flex items-start space-x-3 p-4 rounded-xl transition-all duration-200 group
                  ${active 
                    ? 'bg-primary-50 dark:bg-gray-800 border border-primary-200 dark:border-gray-700 shadow-sm' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                  }
                `}
              >
                <div className={`
                  p-2 rounded-lg transition-colors
                  ${active 
                    ? 'bg-primary-100 dark:bg-gray-700 text-primary-700 dark:text-gray-100' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                  }
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`
                    font-medium transition-colors
                    ${active ? 'text-primary-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-gray-100'}
                  `}>
                    {item.label}
                  </p>
                  <p className={`
                    text-sm mt-1 transition-colors
                    ${active ? 'text-primary-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
                  `}>
                    {item.description}
                  </p>
                </div>
                {active && (
                  <div className="w-1 h-8 bg-primary-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Thermal Eye v2.0 Professional
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              AI-Powered Thermal Analysis System
            </p>
            <div className="mt-2 flex items-center justify-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-green-400' : 'bg-orange-400'}`}></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {themeMode} theme
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
