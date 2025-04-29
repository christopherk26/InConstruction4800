// app/communities/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CommunitiesPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getUserCommunities } from '@/app/services/communityService';
import { UserModel } from '@/app/models/UserModel';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth service
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));

// Mock community service
jest.mock('@/app/services/communityService', () => ({
  getUserCommunities: jest.fn(),
}));

// Mock UserModel with isVerified method
const mockUserModel = (id: string, firstName: string, isVerified: boolean) => ({
  id,
  firstName,
  isVerified: jest.fn().mockResolvedValue(isVerified),
});

// Mock UI components
jest.mock('@/components/ui/main-navbar', () => ({
  MainNavbar: ({ user }: any) => <div data-testid="main-navbar">Navbar for {user.firstName}</div>,
}));

jest.mock('@/components/ui/footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children, className }: any) => <div className={className} data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      // If asChild is true, it expects a child Link component
      return <div {...props}>{children}</div>;
    }
    return <button {...props}>{children}</button>;
  },
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Users: () => <span data-testid="users-icon">UsersIcon</span>,
  Eye: () => <span data-testid="eye-icon">EyeIcon</span>,
}));


describe('CommunitiesPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };
  const mockUser = mockUserModel('user-id-1', 'Test', true);
  const mockCommunities = [
    {
      id: 'community-id-1',
      name: 'Community Alpha',
      bio: 'The first community',
      stats: { memberCount: 10 },
      location: { city: 'CityA', state: 'StateA' },
    },
    {
      id: 'community-id-2',
      name: 'Community Beta',
      bio: 'The second community',
      stats: { memberCount: 25 },
      location: { city: 'CityB', state: 'StateB' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserCommunities as jest.Mock).mockResolvedValue(mockCommunities);
  });

  it('should render loading state initially', () => {
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {})); // Simulate loading
    act(() => {
      render(<CommunitiesPage />);
    });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toHaveClass('animate-spin'); // Assuming spinner has this role/class
  });

  it('should redirect to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<CommunitiesPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('should redirect to authenticate-person if user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-id-unverified', 'Unverified', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    await act(async () => {
      render(<CommunitiesPage />);
    });
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('should render communities list for authenticated and verified user with communities', async () => {
    await act(async () => {
      render(<CommunitiesPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('My Communities')).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Test');
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check that communities are rendered
      expect(screen.getByText('Community Alpha')).toBeInTheDocument();
      expect(screen.getByText('Community Beta')).toBeInTheDocument();

      // Check details for Community Alpha
      expect(screen.getByText('The first community')).toBeInTheDocument();
      expect(screen.getByText('10 members')).toBeInTheDocument();
      expect(screen.getByText('CityA, StateA')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View Community/i, current: false })).toHaveAttribute('href', '/communities/community-id-1');
      expect(screen.getByRole('link', { name: /View Members/i })).toHaveAttribute('href', '/communities/community-id-1/users');


      // Check details for Community Beta
      expect(screen.getByText('The second community')).toBeInTheDocument();
      expect(screen.getByText('25 members')).toBeInTheDocument();
      expect(screen.getByText('CityB, StateB')).toBeInTheDocument();
      // Find the second "View Community" link by its href or surrounding text
      const viewCommunityLinks = screen.getAllByRole('link', { name: /View Community/i });
      expect(viewCommunityLinks[1]).toHaveAttribute('href', '/communities/community-id-2');

      const viewMembersLinks = screen.getAllByRole('link', { name: /View Members/i });
       expect(viewMembersLinks[1]).toHaveAttribute('href', '/communities/community-id-2/users');

      // Ensure empty state message is not present
      expect(screen.queryByText("You haven't joined any communities yet")).not.toBeInTheDocument();
    });
  });

  it('should render empty state for authenticated and verified user with no communities', async () => {
    (getUserCommunities as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      render(<CommunitiesPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('My Communities')).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Test');
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check empty state message
      expect(screen.getByText("You haven't joined any communities yet")).toBeInTheDocument();
      expect(screen.getByText("Join a community to start participating and seeing posts.")).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Join a Community' })).toHaveAttribute('href', '/communities/browse');

      // Ensure community grid is not rendered
      expect(screen.queryByText('Community Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Community Beta')).not.toBeInTheDocument();
    });
  });

  // Optional: Test error handling during data fetching
  it('should log error if fetching communities fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

    (getUserCommunities as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    await act(async () => {
      render(<CommunitiesPage />);
    });

    await waitFor(() => {
      // Check that loading state is gone
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      // Check that an error was logged (or handle error display in UI if applicable)
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data:", expect.any(Error));
      // Depending on how errors are handled in UI, assert visibility of error message if any
      // For this component, it seems errors are only logged, so we assert on the log.
    });

    consoleErrorSpy.mockRestore(); // Restore console.error
  });
});