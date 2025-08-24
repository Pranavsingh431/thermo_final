/**
 * Navigation bar component
 * Professional navigation with active state management
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Thermometer, Upload, BarChart3 } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  ];
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <Link to="/upload" className="flex items-center space-x-3 text-primary-700 font-bold text-xl">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Thermometer className="h-6 w-6 text-primary-600" />
            </div>
            <span>Thermal Eye</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive(path)
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
