/**
 * Reusable button components with consistent styling
 */
import React from 'react';

export const PrimaryButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false, 
  className = '',
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
      )}
      {children}
    </button>
  );
};

export const SecondaryButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const DangerButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
