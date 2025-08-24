/**
 * Tests for LoginPage component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock login function
const mockLogin = jest.fn();

// Mock contexts to avoid complex initialization
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    themeMode: 'light',
  }),
}));

// Mock the auth context
const MockProviders = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('LoginPage', () => {
  test('renders login form', () => {
    render(
      <MockProviders>
        <LoginPage />
      </MockProviders>
    );
    
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows password input field', () => {
    render(
      <MockProviders>
        <LoginPage />
      </MockProviders>
    );
    
    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput.type).toBe('password');
  });

  test('form submission calls login function', async () => {
    // Mock a successful login response
    mockLogin.mockResolvedValue({ success: true });

    render(
      <MockProviders>
        <LoginPage />
      </MockProviders>
    );
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
