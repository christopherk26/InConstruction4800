// jest.setup.ts

// Import the testing library and configure it
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Extend global type for TypeScript
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

// Set up React testing environment
// This is critical for React 18+ to avoid act() warnings
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Configure the testing library for React 18+
configure({
  asyncUtilTimeout: 5000, // Longer timeout for async operations
});

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for components that use it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Ensure cleanup between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Silence warnings in tests if needed
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes('The current testing environment is not configured to support act') ||
    args[0]?.includes('ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalError.apply(console, args);
};