// app/settings/page.test.tsx

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SettingsPage from './page';
import { getCurrentUser, signOut } from '@/app/services/authService';
import { getUserCommunities, checkCommunityMembership } from '@/app/services/communityService';
import { 
  getNotificationPreferences, 
  updateNotificationPreferences 
} from '@/app/services/notificationSettingsService';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock auth service
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn()
}));

// Mock community service
jest.mock('@/app/services/communityService', () => ({
  getUserCommunities: jest.fn(),
  checkCommunityMembership: jest.fn()
}));

// Mock notification service
jest.mock('@/app/services/notificationSettingsService', () => ({
  getNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn()
}));

// Mock UI components
jest.mock('@/components/ui/main-navbar', () => ({
  MainNavbar: ({ user }: any) => <div data-testid="main-navbar">Navbar for {user.firstName}</div>
}));

jest.mock('@/components/ui/footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, asChild, ...props }: any) => {
    if (asChild) {
      return children;
    }
    return <button {...props} data-variant={variant}>{children}</button>;
  }
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props} data-testid="card">{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props} data-testid="card-title">{children}</h2>,
  CardContent: ({ children, ...props }: any) => <div {...props} data-testid="card-content">{children}</div>
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className}>Loading...</div>
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ id, checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
      role="switch"
      aria-checked={checked}
    />
  )
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => {
    return <div data-testid="select" data-value={value}>{children}</div>;
  },
  SelectTrigger: ({ children, className }: any) => <div className={className} data-testid="select-trigger" role="combobox">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children, className }: any) => <div className={className} data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, className }: any) => (
    <div 
      data-testid={`select-item-${value}`} 
      className={className}
      onClick={() => {}}
      role="option"
    >
      {children}
    </div>
  )
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Create a mock user for testing
const mockUser = {
  id: '123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  isVerified: jest.fn().mockResolvedValue(true)
};

// Create mock communities
const mockCommunities = [
  {
    id: 'community1',
    name: 'Community One',
  },
  {
    id: 'community2',
    name: 'Community Two',
  }
];

// Create mock notification preferences
const mockNotificationPrefs = {
  emergencyAlerts: true,
  generalDiscussion: true,
  safetyAndCrime: false,
  governance: true,
  disasterAndFire: true,
  businesses: false,
  resourcesAndRecovery: true,
  communityEvents: true,
  pushNotifications: true
};

describe('SettingsPage', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserCommunities as jest.Mock).mockResolvedValue(mockCommunities);
    (getNotificationPreferences as jest.Mock).mockResolvedValue(mockNotificationPrefs);
    (checkCommunityMembership as jest.Mock).mockResolvedValue(true);
  });

  // Test authentication flow
  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects to verification if user is not verified', async () => {
    const unverifiedUser = { ...mockUser, isVerified: jest.fn().mockResolvedValue(false) };
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  // Test loading states
  it('shows loading spinner while fetching user data', () => {
    // Make the getCurrentUser promise pending
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<SettingsPage />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // Test rendering user information
  it('displays user account information after loading', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(`Email: ${mockUser.email}`)).toBeInTheDocument();
      expect(screen.getByText(`Name: ${mockUser.firstName} ${mockUser.lastName}`)).toBeInTheDocument();
    });
  });

  // Test logout functionality
  it('allows user to logout', async () => {
    render(<SettingsPage />);
    
    // Wait for the component to fully render
    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
    
    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  // Test community selection
  it('displays available communities in dropdown', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Community One')).toBeInTheDocument();
    });
    
    // Click on the select trigger to open the dropdown
    const selectTrigger = screen.getByRole('combobox');
    await userEvent.click(selectTrigger);
    
    expect(screen.getByText('Community Two')).toBeInTheDocument();
  });

  // Test notification preferences rendering
  it('displays notification preferences for selected community', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Emergency Alerts')).toBeInTheDocument();
      expect(screen.getByText('General Discussion')).toBeInTheDocument();
      expect(screen.getByText('Safety & Crime')).toBeInTheDocument();
    });
  });

  // Test saving preferences - fixed to work properly
  it('saves notification preferences when save button is clicked', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByText('Save Preferences');
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(updateNotificationPreferences).toHaveBeenCalledWith(
        mockUser.id,
        'community1',
        expect.any(Object)
      );
    });
  });

  // Test error handling 
  it('displays error message when saving fails', async () => {
    const errorMessage = 'Failed to save preferences';
    (updateNotificationPreferences as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByText('Save Preferences');
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  // Test success message with increased timeout
it('displays success message after saving preferences', async () => {
    // Mock updateNotificationPreferences to resolve successfully
    (updateNotificationPreferences as jest.Mock).mockResolvedValueOnce(undefined);
  
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByText('Save Preferences');
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Preferences saved successfully!')).toBeInTheDocument();
    }, { timeout: 3000 }); // Increase timeout for this specific waitFor
  }, 10000); // Increase overall test timeout

  // Test empty communities state
  it('displays message when user has no communities', async () => {
    (getUserCommunities as jest.Mock).mockResolvedValue([]);
    
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/You are not a member of any communities yet/)).toBeInTheDocument();
      expect(screen.getByText('Browse communities')).toBeInTheDocument();
    });
  });

  // Test legal links
  it('renders legal information links', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Terms & Conditions')).toHaveAttribute('href', '/legal?tab=terms');
    expect(screen.getByText('Privacy Policy')).toHaveAttribute('href', '/legal?tab=privacy');
    expect(screen.getByText('Cookie Policy')).toHaveAttribute('href', '/legal?tab=cookies');
  });
});