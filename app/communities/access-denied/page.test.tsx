// app/access-denied/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AccessDeniedPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getCommunityById } from '@/app/services/communityService';
import { UserModel } from '@/app/models/UserModel';
// Removed Suspense import as it's not used in the corrected tests
// import { Suspense } from 'react';


// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock auth service
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));

// Mock community service
jest.mock('@/app/services/communityService', () => ({
  getCommunityById: jest.fn(),
}));

// Mock UserModel (simplified)
const mockUserModel = (id: string, firstName: string) => ({
  id,
  firstName,
  // Add other user properties if needed by MainNavbar mock or component
});

// Mock UI components
jest.mock('@/components/ui/main-navbar', () => ({
  MainNavbar: ({ user }: any) => <div data-testid="main-navbar">Navbar for {user?.firstName}</div>,
}));

jest.mock('@/components/ui/footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
     if (asChild) {
       return <div {...props}>{children}</div>; // Render children (Link)
     }
    return <button {...props}>{children}</button>;
   },
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});


describe('AccessDeniedPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };
  const mockUser = mockUserModel('user-id-1', 'Test');
  const mockCommunity = {
    id: 'community-id-123',
    name: 'Restricted Community',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams()); // Default empty search params
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCommunityById as jest.Mock).mockResolvedValue(null); // Default: Community not found
  });


  // Test component's internal loading state
  it('shows loading spinner and text while fetching initial data', async () => {
    // Simulate the initial loading state by having getCurrentUser return a pending promise
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<AccessDeniedPage />);
    });

    // Wait for the loading text to appear, which indicates the component's internal loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
        // Assuming spinner has role 'img' with hidden true or a specific class/testid
      const spinner = screen.getByRole('img', { hidden: true }) || screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    // Assert that the main content is NOT present while loading
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  }, 10000); // Increased timeout


  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<AccessDeniedPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('renders generic access denied message when authenticated but no communityId', async () => {
    await act(async () => {
      render(<AccessDeniedPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText("You don't have access to this community.")).toBeInTheDocument();
      expect(screen.getByText("To access this community, you need to be a verified member of the community.")).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Test');
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });

  it('renders community-specific access denied message when authenticated and community is found', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ community: mockCommunity.id }));
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);

    await act(async () => {
      render(<AccessDeniedPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(`You don't have access to ${mockCommunity.name}.`)).toBeInTheDocument();
      expect(screen.getByText("To access this community, you need to be a verified member of the community.")).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Test');
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });

  it('renders generic access denied message when authenticated and communityId is present but community not found', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ community: 'nonexistent-id' }));
    (getCommunityById as jest.Mock).mockResolvedValue(null); // Explicitly return null

    await act(async () => {
      render(<AccessDeniedPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText("You don't have access to this community.")).toBeInTheDocument(); // Should fall back to generic
      expect(screen.getByText("To access this community, you need to be a verified member of the community.")).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Test');
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });

  it('logs error if fetching community data fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ community: mockCommunity.id }));
    (getCommunityById as jest.Mock).mockRejectedValue(new Error('Failed to fetch community'));

    await act(async () => {
      render(<AccessDeniedPage />);
    });

    await waitFor(() => {
       // Check that loading state is gone
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      // Check that the generic access denied message is still displayed
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText("You don't have access to this community.")).toBeInTheDocument();
      // Check that an error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data:", expect.any(Error));
    });

    consoleErrorSpy.mockRestore(); // Restore console.error
  });
});