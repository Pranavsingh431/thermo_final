// Frontend configuration for Thermal Eye
// Per spec: fixed base URL, no environment branching
export const API_BASE_URL = "http://localhost:8000";

// Map defaults (Leaflet + OSM)
export const MAP_CONFIG = {
  center: [19.07611, 72.87750],
  zoom: 10,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

// REST endpoints consumed by the frontend (no mocks; hits live backend)
export const API_ENDPOINTS = {
  upload: `${API_BASE_URL}/upload`,
  uploadBatch: `${API_BASE_URL}/upload_batch`,
  reports: `${API_BASE_URL}/reports`,
  generateReport: (id) => `${API_BASE_URL}/generate_report/${id}`,
  health: `${API_BASE_URL}/`
};

// Colors for badges/markers by level/priority
export const FAULT_LEVEL_COLORS = {
  NORMAL: '#22c55e',
  WARNING: '#eab308',
  CRITICAL: '#ef4444'
};

export const PRIORITY_COLORS = {
  MEDIUM: '#22c55e',
  HIGH: '#eab308',
  CRITICAL: '#ef4444'
};
