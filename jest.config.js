// jest.config.js
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Fix module naming collision
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/.firebase/',
  ],
  
  // Handle module aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js',
    '\\.svg': '<rootDir>/__mocks__/svgMock.js'
  },
  
  // Handle ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!lucide-react)',
  ],
  
  // Ignore test files in .next directory
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/.firebase/',
  ],
  
  // Critical for React 18 testing
  globals: {
    'IS_REACT_ACT_ENVIRONMENT': true
  }
};

export default createJestConfig(customJestConfig);