import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('light'); // 'light', 'dark', 'system'
  const [isDark, setIsDark] = useState(false);

  const updateDocumentTheme = useCallback((dark) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const applyTheme = useCallback((mode) => {
    let shouldBeDark = false;
    
    if (mode === 'dark') {
      shouldBeDark = true;
    } else if (mode === 'system') {
      // Safely handle matchMedia which might not be available in test environments
      if (typeof window !== 'undefined' && window.matchMedia) {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = false; // Default to light in test environments
      }
    }
    
    setIsDark(shouldBeDark);
    updateDocumentTheme(shouldBeDark);
  }, [updateDocumentTheme]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('thermal-eye-theme') || 'system';
    setThemeMode(savedTheme);
    applyTheme(savedTheme);
  }, [applyTheme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode, applyTheme]);



  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    applyTheme(newMode);
    localStorage.setItem('thermal-eye-theme', newMode);
  };

  const setTheme = (mode) => {
    setThemeMode(mode);
    applyTheme(mode);
    localStorage.setItem('thermal-eye-theme', mode);
  };

  const value = {
    isDark,
    themeMode,
    theme: isDark ? 'dark' : 'light',
    toggleTheme,
    setTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
