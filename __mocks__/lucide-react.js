// __mocks__/lucide-react.js

const lucideReact = {
    ...jest.requireActual('lucide-react')
  };
  
  // Mock all lucide icons
  const defaultExport = new Proxy({}, {
    get: function(target, prop) {
      if (prop === '__esModule') {
        return true;
      }
      return function MockIcon(props) {
        return `<div data-testid="lucide-icon">${prop}</div>`;
      };
    }
  });
  
  // Add specific mocks for icons used in your components
  const specificMocks = {
    LogOut: () => <div data-testid="logout-icon">LogOut</div>,
    ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
    Check: () => <div data-testid="check-icon">Check</div>,
    // Add more specific icon mocks as needed
  };
  
  module.exports = {
    ...lucideReact,
    ...specificMocks,
    __esModule: true,
    default: defaultExport,
  };