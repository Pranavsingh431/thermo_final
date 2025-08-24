/**
 * Alert context for global notifications
 * Provides alert functionality throughout the app
 */

import React, { createContext, useContext, useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const addAlert = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const alert = { id, message, type, duration };
    
    setAlerts(prev => [...prev, alert]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, duration);
    }
    
    return id;
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const success = (message, duration) => addAlert(message, 'success', duration);
  const error = (message, duration) => addAlert(message, 'error', duration);
  const warning = (message, duration) => addAlert(message, 'warning', duration);
  const info = (message, duration) => addAlert(message, 'info', duration);

  return (
    <AlertContext.Provider value={{ addAlert, removeAlert, success, error, warning, info }}>
      {children}
      <AlertContainer alerts={alerts} onRemove={removeAlert} />
    </AlertContext.Provider>
  );
};

const AlertContainer = ({ alerts, onRemove }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {alerts.map(alert => (
        <Alert key={alert.id} alert={alert} onRemove={onRemove} />
      ))}
    </div>
  );
};

const Alert = ({ alert, onRemove }) => {
  const getAlertStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className={`flex items-start p-4 border rounded-lg shadow-lg min-w-80 max-w-md ${getAlertStyles(alert.type)}`}>
      <div className="flex-shrink-0 mr-3">
        {getIcon(alert.type)}
      </div>
      <div className="flex-1 text-sm font-medium">
        {alert.message}
      </div>
      <button
        onClick={() => onRemove(alert.id)}
        className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AlertContext;
