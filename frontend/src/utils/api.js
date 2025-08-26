/**
 * API service for Thermal Eye frontend
 * Handles all communication with FastAPI backend
 */

import axios from 'axios';
import { API_ENDPOINTS, API_BASE_URL } from '../config';

// Create axios instance with default config
const api = axios.create({
  timeout: 30000, // 30 seconds for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token and logging
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('te_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and auth
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle auth errors
    if (error.response?.status === 401) {
      localStorage.removeItem('te_token');
      window.location.href = '/login';
      return Promise.reject(new Error('Authentication failed'));
    }
    
    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data?.detail || 'Bad request');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    } else {
      throw new Error(error.response?.data?.detail || error.message || 'Network error');
    }
  }
);

/**
 * Upload thermal image for analysis
 * @param {File} file - Image file to upload
 * @returns {Promise<Object>} Analysis results
 */
export const uploadThermalImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(API_ENDPOINTS.upload, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      console.log(`Upload progress: ${percentCompleted}%`);
    },
  });
  
  return response.data;
};

/**
 * Upload multiple images for batch analysis
 * @param {File[]} files - Array of image files
 * @returns {Promise<Object>} Combined results
 */
export const uploadThermalImagesBatch = async (files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));

  const response = await api.post(API_ENDPOINTS.uploadBatch, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000, // allow longer for big batches
  });

  // Normalize pdf path to absolute
  if (response.data?.pdf_path && !response.data.pdf_path.startsWith('http')) {
    response.data.pdf_path = `${API_BASE_URL}/${response.data.pdf_path}`;
  }
  return response.data;
};

/**
 * Get list of all thermal inspection reports
 * @returns {Promise<Array>} List of report summaries
 */
export const getThermalReports = async () => {
  const response = await api.get(API_ENDPOINTS.reports);
  return response.data;
};

/**
 * Generate detailed AI-powered report for specific inspection
 * @param {number} reportId - Report ID
 * @returns {Promise<Object>} Detailed report with AI summary
 */
export const generateDetailedReport = async (reportId) => {
  const response = await api.get(API_ENDPOINTS.generateReport(reportId));
  return response.data;
};

/**
 * Check API health status
 * @returns {Promise<Object>} Health status
 */
export const checkApiHealth = async () => {
  const response = await api.get(API_ENDPOINTS.health);
  return response.data;
};

/**
 * Delete a specific thermal inspection report
 * @param {number} reportId - Report ID to delete
 * @returns {Promise<Object>} Delete confirmation
 */
export const deleteReport = async (reportId) => {
  const response = await api.delete(`/reports/${reportId}`);
  return response.data;
};

/**
 * Delete multiple thermal inspection reports
 * @param {number[]} reportIds - Array of report IDs to delete
 * @returns {Promise<Object>} Delete confirmation
 */
export const deleteReportsBatch = async (reportIds) => {
  const response = await api.delete('/reports/batch', { data: { ids: reportIds } });
  return response.data;
};

/**
 * Get fault progression data for radar chart
 * @param {number} reportId - Report ID
 * @returns {Promise<Array>} Fault progression data
 */
export const getFaultProgression = async (reportId) => {
  const response = await api.get(`/reports/${reportId}/fault_progression`);
  return response.data;
};

/**
 * Update email alert recipients
 * @param {string[]} recipients - Array of email addresses
 * @returns {Promise<Object>} Update confirmation
 */
export const updateEmailRecipients = async (recipients) => {
  const response = await api.put('/settings/email_recipients', recipients);
  return response.data;
};

export default api;
