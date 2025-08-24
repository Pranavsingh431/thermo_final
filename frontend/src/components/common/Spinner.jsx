/**
 * Reusable loading spinner component
 */
import React from 'react';

const Spinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center space-x-3">
      <div className={`animate-spin rounded-full border-2 border-primary-600 border-t-transparent ${sizeClasses[size]}`}></div>
      {text && <span className="text-gray-600 dark:text-gray-300">{text}</span>}
    </div>
  );
};

export default Spinner;
