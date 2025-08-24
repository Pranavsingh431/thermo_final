// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.matchMedia which is not available in test environment
const mockMatchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock fetch for tests
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Reset mocks between tests
beforeEach(() => {
  fetch.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  mockMatchMedia.mockClear();
});
