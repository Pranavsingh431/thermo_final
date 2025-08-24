/**
 * Utility helper functions for Thermal Eye frontend
 */

import { format } from 'date-fns';
import { FAULT_LEVEL_COLORS, PRIORITY_COLORS } from '../config';

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Format temperature with unit
 * @param {number} temp - Temperature value
 * @returns {string} Formatted temperature
 */
export const formatTemperature = (temp) => {
  if (temp === null || temp === undefined) return 'N/A';
  return `${temp.toFixed(1)}°C`;
};

/**
 * Format distance with unit
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance
 */
export const formatDistance = (distance) => {
  if (distance === null || distance === undefined) return 'N/A';
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)}m`;
  }
  return `${distance.toFixed(2)}km`;
};

/**
 * Get color for fault level
 * @param {string} faultLevel - Fault level (NORMAL, WARNING, CRITICAL)
 * @returns {string} CSS color
 */
export const getFaultLevelColor = (faultLevel) => {
  return FAULT_LEVEL_COLORS[faultLevel] || '#6b7280';
};

/**
 * Get color for priority level
 * @param {string} priority - Priority level (MEDIUM, HIGH, CRITICAL)
 * @returns {string} CSS color
 */
export const getPriorityColor = (priority) => {
  return PRIORITY_COLORS[priority] || '#6b7280';
};

/**
 * Get icon for fault level
 * @param {string} faultLevel - Fault level
 * @returns {string} Icon name or emoji
 */
export const getFaultLevelIcon = (faultLevel) => {
  switch (faultLevel) {
    case 'NORMAL':
      return '✅';
    case 'WARNING':
      return '⚠️';
    case 'CRITICAL':
      return '🚨';
    default:
      return '❓';
  }
};

/**
 * Get badge style classes for fault level
 * @param {string} faultLevel - Fault level
 * @returns {string} CSS classes
 */
export const getFaultLevelBadgeClasses = (faultLevel) => {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';
  
  switch (faultLevel) {
    case 'NORMAL':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'WARNING':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'CRITICAL':
      return `${baseClasses} bg-red-100 text-red-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

/**
 * Get badge style classes for priority level
 * @param {string} priority - Priority level
 * @returns {string} CSS classes
 */
export const getPriorityBadgeClasses = (priority) => {
  const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
  
  switch (priority) {
    case 'CRITICAL':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'HIGH':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'MEDIUM':
      return `${baseClasses} bg-green-100 text-green-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

/**
 * Validate file for upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export const validateImageFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (!file) {
    return { valid: false, error: 'Please select a file' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG, JPEG, and PNG files are allowed' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }
  
  return { valid: true };
};

/**
 * Calculate severity score for sorting
 * @param {Object} report - Report object
 * @returns {number} Severity score (higher = more severe)
 */
export const calculateSeverityScore = (report) => {
  let score = 0;
  
  // Fault level scoring
  if (report.fault_level === 'CRITICAL') score += 100;
  else if (report.fault_level === 'WARNING') score += 50;
  else if (report.fault_level === 'NORMAL') score += 10;
  
  // Priority scoring
  if (report.priority === 'CRITICAL') score += 30;
  else if (report.priority === 'HIGH') score += 20;
  else if (report.priority === 'MEDIUM') score += 10;
  
  // Temperature delta scoring
  if (report.delta_t && report.delta_t > 0) {
    score += Math.min(report.delta_t * 2, 20); // Max 20 points for temperature
  }
  
  return score;
};

/**
 * Generate summary statistics from reports
 * @param {Array} reports - Array of reports
 * @returns {Object} Summary statistics
 */
export const generateSummaryStats = (reports) => {
  const total = reports.length;
  const faultCounts = reports.reduce((acc, report) => {
    acc[report.fault_level] = (acc[report.fault_level] || 0) + 1;
    return acc;
  }, {});
  
  const priorityCounts = reports.reduce((acc, report) => {
    acc[report.priority] = (acc[report.priority] || 0) + 1;
    return acc;
  }, {});
  
  const avgTemp = reports.length > 0 
    ? reports.filter(r => r.image_temp).reduce((sum, r) => sum + r.image_temp, 0) / reports.filter(r => r.image_temp).length
    : 0;
  
  return {
    total,
    faultCounts: {
      NORMAL: faultCounts.NORMAL || 0,
      WARNING: faultCounts.WARNING || 0,
      CRITICAL: faultCounts.CRITICAL || 0,
    },
    priorityCounts: {
      MEDIUM: priorityCounts.MEDIUM || 0,
      HIGH: priorityCounts.HIGH || 0,
      CRITICAL: priorityCounts.CRITICAL || 0,
    },
    averageTemperature: avgTemp.toFixed(1),
  };
};
