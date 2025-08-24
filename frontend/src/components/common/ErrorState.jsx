/**
 * Reusable error state component
 */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorState = ({ 
  title = 'Something went wrong',
  message = 'An error occurred while loading the data.',
  onRetry = null,
  icon: Icon = AlertTriangle
}) => {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
