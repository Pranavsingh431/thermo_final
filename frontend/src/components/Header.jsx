/**
 * Header component for professional layout
 * Provides user info, notifications, and sidebar toggle
 */

import React from 'react';
import { Menu, Bell, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ onSidebarToggle }) => {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Left side - Menu toggle and breadcrumb */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onSidebarToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="hidden lg:block">
            <nav className="text-sm text-gray-500 dark:text-gray-300">
              <span className="text-primary-600 dark:text-primary-400 font-medium">Thermal Eye</span>
              <span className="mx-2">/</span>
              <span>Dashboard</span>
            </nav>
          </div>
        </div>

        {/* Right side - User actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.email || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.role || 'viewer'}
              </p>
            </div>
            
            <div className="relative group">
              <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="h-8 w-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                </div>
              </button>
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left">
                  <SettingsIcon className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                <button 
                  onClick={logout}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
