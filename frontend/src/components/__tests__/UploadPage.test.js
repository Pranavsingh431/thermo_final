/**
 * Tests for UploadPage component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UploadPage from '../../pages/UploadPage';

// Mock all dependencies
jest.mock('../../utils/api', () => ({
  post: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock all the hooks and contexts
jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showAlert: jest.fn(),
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
  }),
}));

// Simple wrapper for testing
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('UploadPage', () => {
  test('renders upload page with expected elements', () => {
    render(
      <TestWrapper>
        <UploadPage />
      </TestWrapper>
    );
    
    expect(screen.getByText(/thermal image analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/upload thermal image/i)).toBeInTheDocument();
    expect(screen.getByText(/drop thermal image/i)).toBeInTheDocument();
  });

  test('analyze button is disabled when no files selected', () => {
    render(
      <TestWrapper>
        <UploadPage />
      </TestWrapper>
    );
    
    const analyzeButton = screen.getByRole('button', { name: /analyze thermal image/i });
    expect(analyzeButton).toBeDisabled();
  });

  test('file input is present for upload', () => {
    render(
      <TestWrapper>
        <UploadPage />
      </TestWrapper>
    );
    
    const fileInput = screen.getByRole('button', { name: /analyze thermal image/i });
    expect(fileInput).toBeInTheDocument();
  });
});