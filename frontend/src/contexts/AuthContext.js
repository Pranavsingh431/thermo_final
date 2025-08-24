/**
 * Authentication context for managing user state and tokens
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!localStorage.getItem('te_token');
  };

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('te_token', data.access_token);
      
      // Get user info
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      return { success: true, data };
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('te_token');
    setUser(null);
    setError(null);
  }, []);

  // Verify token and get user info
  const verifyToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isAuthenticated()) {
        setUser(null);
        return;
      }

      const token = localStorage.getItem('te_token');
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid
        localStorage.removeItem('te_token');
        setUser(null);
        setError('Session expired');
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('te_token');
      setUser(null);
      setError('Session expired');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    verifyToken,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
