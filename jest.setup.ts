// jest.setup.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

configure({
  asyncUtilTimeout: 5000,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

window.scrollTo = jest.fn();

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const originalError = console.error;
console.error = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : args[0]?.message || '';
  if (
    message.includes('The current testing environment is not configured to support act') ||
    message.includes('ReactDOM.render is no longer supported') ||
    message.includes('Failed to fetch user') ||
    message.includes('Failed to fetch votes') ||
    message.includes('Error loading user data') ||
    message.includes('Error performing search') ||
    message.includes('Error fetching user votes') ||
    message.includes('Error fetching notifications') ||
    message.includes('Error marking all notifications as read') ||
    message.includes('Error marking notification as read') ||
    message.includes('Error deleting notification') ||
    message.includes('Error deleting all notifications') ||
    message.includes('Error updating profile') // ADD THIS LINE
  ) {
    return;
  }
  originalError.apply(console, args);
};