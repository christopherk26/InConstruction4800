// app/dashboard/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getUserCommunities, getUserCommunitySelection } from '@/app/services/communityService';
import { UserModel } from '@/app/models/UserModel';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));
jest.mock('@/app/services/communityService', () => ({
  getUserCommunities: jest.fn(),
  getUserCommunitySelection: jest.fn(),
  setUserCommunitySelection: jest.fn(),
}));

// Mock UserModel with isVerified method
const mockUserModel = (id: string, firstName: string, email: string, isVerified: boolean) => ({
  id,
  firstName,
  email,
  isVerified: jest.fn().mockResolvedValue(isVerified),
});

describe('DashboardPage', () => {
  const mockPush = jest.fn();
  const mockUser = mockUserModel('user-id-1', 'Test', 'test@example.com', true);
  const mockCommunities = [
    { id: 'community-id-1', name: 'Community 1' },
    { id: 'community-id-2', name: 'Community 2' },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserCommunities as jest.Mock).mockResolvedValue(mockCommunities);
    (getUserCommunitySelection as jest.Mock).mockReturnValue(null); // Default: no selected community
  });

  it('should render loading state initially', () => {
    (getCurrentUser as jest.Mock).mockReturnValue(new Promise(() => {})); // Simulate loading
    render(<DashboardPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toHaveClass('animate-spin');
  });

  it('should redirect to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('should redirect to authenticate-person if user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-id-unverified', 'Unverified', 'unverified@example.com', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('should render dashboard for authenticated and verified user with communities', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(`Welcome, ${mockUser.firstName}`)).toBeInTheDocument();
      expect(screen.getByText(`Your community dashboard`)).toBeInTheDocument();
      expect(screen.getByText(`You are a member of ${mockCommunities.length} communities.`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Quick Actions' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Your Communities' })).toBeInTheDocument();

      // Check quick action buttons
      expect(screen.getByRole('link', { name: 'View All Communities' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Create a New Post' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Join a Community' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'View Notifications' })).toBeInTheDocument();

      // Check community cards (up to 6)
      mockCommunities.slice(0, 6).forEach(community => {
        expect(screen.getByRole('heading', { name: community.name })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Visit', level: 4, hidden: true })).toHaveAttribute('href', `/communities/${community.id}`);
      });
    });
  });

  it('should render dashboard for authenticated and verified user with no communities', async () => {
    (getUserCommunities as jest.Mock).mockResolvedValue([]);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(`Welcome, ${mockUser.firstName}`)).toBeInTheDocument();
      expect(screen.getByText(`You are a member of 0 communities.`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Your Communities' })).toBeInTheDocument();

      // Check Quick Actions button for creating a post when there are no communities
      const createPostButton = screen.getByRole('link', { name: 'Create a New Post' });
      expect(createPostButton).toBeInTheDocument();
      expect(createPostButton).toHaveAttribute('aria-disabled', 'true'); // Assuming the button is disabled

      // Check the empty state message
      expect(screen.getByText("You haven't joined any communities yet")).toBeInTheDocument();
      expect(screen.getByText("Join a community to start participating and seeing posts.")).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Join a Community' })).toHaveAttribute('href', '/communities/apply');
    });
  });

  it('should display "View all communities" link if user has more than 6 communities', async () => {
    const manyCommunities = Array.from({ length: 7 }, (_, i) => ({
      id: `community-id-${i}`,
      name: `Community ${i}`,
    }));
    (getUserCommunities as jest.Mock).mockResolvedValue(manyCommunities);

    render(<DashboardPage />);
    await waitFor(() => {
      // Check that only the first 6 communities are displayed as cards
      manyCommunities.slice(0, 6).forEach(community => {
        expect(screen.getByRole('heading', { name: community.name })).toBeInTheDocument();
      });
      expect(screen.queryByRole('heading', { name: manyCommunities[6].name })).not.toBeInTheDocument();

      // Check for the "View all" link
      expect(screen.getByRole('link', { name: `View all ${manyCommunities.length} communities...` })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: `View all ${manyCommunities.length} communities...` })).toHaveAttribute('href', '/communities');
    });
  });

  it('should use the selected community for the "Create a New Post" link if one is selected', async () => {
    const selectedCommunityId = 'community-id-selected';
    (getUserCommunitySelection as jest.Mock).mockReturnValue(selectedCommunityId);
    const communitiesWithSelected = [
      { id: selectedCommunityId, name: 'Selected Community' },
      ...mockCommunities
    ];
    (getUserCommunities as jest.Mock).mockResolvedValue(communitiesWithSelected);


    render(<DashboardPage />);

    await waitFor(() => {
      const createPostLink = screen.getByRole('link', { name: 'Create a New Post' });
      expect(createPostLink).toBeInTheDocument();
      expect(createPostLink).toHaveAttribute('href', `/communities/${selectedCommunityId}/new-post`);
    });
  });

  it('should use the first community for the "Create a New Post" link if no community is selected', async () => {
    // getUserCommunitySelection returns null by default in beforeEach
    render(<DashboardPage />);

    await waitFor(() => {
      const createPostLink = screen.getByRole('link', { name: 'Create a New Post' });
      expect(createPostLink).toBeInTheDocument();
      // Assumes mockCommunities[0].id is the first community id
      expect(createPostLink).toHaveAttribute('href', `/communities/${mockCommunities[0].id}/new-post`);
    });
  });

  it('should disable "Create a New Post" link if user has no communities', async () => {
    (getUserCommunities as jest.Mock).mockResolvedValue([]);
    render(<DashboardPage />);
    await waitFor(() => {
      const createPostButton = screen.getByRole('link', { name: 'Create a New Post' });
      expect(createPostButton).toBeInTheDocument();
      // Expect the button to be disabled, which is represented by aria-disabled="true" for links acting as buttons
      expect(createPostButton).toHaveAttribute('aria-disabled', 'true');
    });
  });
});