/**
 * Main App component with professional sidebar layout
 * Redesigned for enterprise-grade appearance and navigation
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import TowerManagementPage from './pages/TowerManagementPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ReportPage from './pages/ReportPage'; // Keep existing report detail page
import LoginPage from './pages/LoginPage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <Router>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
                    {/* Sidebar */}
                    <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
                    
                    {/* Main Content */}
                    <div className="lg:ml-72">
                      {/* Header */}
                      <Header onSidebarToggle={toggleSidebar} />
                      
                      {/* Page Content */}
                      <main className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100">
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<DashboardPage />} />
                          <Route path="/upload" element={<UploadPage />} />
                          <Route path="/analysis" element={<AnalysisPage />} />
                          <Route path="/towers" element={<TowerManagementPage />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/report/:id" element={<ReportPage />} />
                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;