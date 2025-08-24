import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAlert } from './AlertContext';

const Navbar = () => {
  const { pathname } = useLocation();
  const isActive = (path) => pathname.startsWith(path);

  const { toggleDark, dark } = useAlert();
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-primary-600 font-bold text-lg">Thermal Eye</div>
          </div>
          <div className="flex items-center space-x-6">
            <Link
              to="/upload"
              className={`text-sm font-medium hover:text-primary-700 ${
                isActive('/upload') ? 'text-primary-600' : 'text-gray-700'
              }`}
            >
              Upload
            </Link>
            <Link
              to="/dashboard"
              className={`text-sm font-medium hover:text-primary-700 ${
                isActive('/dashboard') ? 'text-primary-600' : 'text-gray-700'
              }`}
            >
              Dashboard
            </Link>
            <button
              onClick={toggleDark}
              className="text-sm font-medium text-gray-700 hover:text-primary-700"
              title="Toggle dark mode"
            >
              {dark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


