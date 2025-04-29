// app/communities/[id]/page.test.tsx

import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import CommunityPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import {
  getCommunityById,
  checkCommunityMembership,
  getCommunityPosts,
  getCommunityCategories,
  formatCategoryName
} from '@/app/services/communityService';
import { getUserVotesForPosts } from '@/app/services/postService';
import { DocumentSnapshot } from 'firebase/firestore'; // Import type
import { UserModel } from '@/app/models/UserModel';
import { Post } from '@/app/types/database';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock auth service
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));

// Mock community service
jest.mock('@/app/services/communityService', () => ({
  getCommunityById: jest.fn(),
  checkCommunityMembership: jest.fn(),
  getCommunityPosts: jest.fn(),
  getCommunityCategories: jest.fn(() => [ // Provide mock categories
    'generalDiscussion', 'safetyAndCrime', 'communityEvents', 'officialEmergencyAlerts'
    // Add other categories as needed
  ]),
  // Fixed: Added explicit : string type for str parameter
  formatCategoryName: jest.fn(name => name.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())),
}));

// Mock post service
jest.mock('@/app/services/postService', () => ({
  getUserVotesForPosts: jest.fn(),
}));

// Mock UserModel (using the 'unknown' assertion approach)
const mockUserModel = (
  id: string,
  firstName: string,
  isVerifiedValue: boolean,
  lastName: string = 'User',
  email: string = 'test@example.com',
  profilePhotoUrl: string = 'https://example.com/photo.jpg'
): UserModel => {
  const mockData = {
    id, email, firstName, lastName, profilePhotoUrl,
    // Add other required UserType properties if needed by MainNavbar or other parts
    phoneNumber: '555-0000', birthDate: { seconds: 0, nanoseconds: 0 }, bio: '',
    verification: { status: isVerifiedValue ? 'verified' : 'pending', method: 'mock', documentUrls: [], verificationDate: { seconds: 0, nanoseconds: 0 } },
    createdAt: { seconds: 0, nanoseconds: 0 }, lastLogin: { seconds: 0, nanoseconds: 0 }, accountStatus: 'active', isAdmin: false,
    // Mock methods
    isVerified: jest.fn().mockResolvedValue(isVerifiedValue),
  };
  return mockData as unknown as UserModel;
};

// Mock UI components
jest.mock('@/components/ui/main-navbar', () => ({
  MainNavbar: ({ user }: any) => <div data-testid="main-navbar">Navbar for {user?.firstName}</div>,
}));
jest.mock('@/components/ui/footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props} data-testid="card">{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props} data-testid="card-title">{children}</h2>,
  CardDescription: ({ children, ...props }: any) => <p {...props} data-testid="card-description">{children}</p>,
  CardContent: ({ children, ...props }: any) => <div {...props} data-testid="card-content">{children}</div>,
  CardFooter: ({ children, ...props }: any) => <div {...props} data-testid="card-footer">{children}</div>,
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => (
    // Use role="combobox" for accessibility testing if needed
    <select data-testid="select" value={value} onChange={(e) => onValueChange(e.target.value)} {...props}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div data-testid="select-trigger" {...props}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectItem: ({ children, value, ...props }: any) => <option value={value} {...props}>{children}</option>,
}));
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className}>Loading Skeleton</div>,
}));
// Mock PostCard: Focus on testing the CommunityPage, not the card itself
jest.mock('@/components/community/post-card', () => ({
  PostCard: ({ post, userVote }: { post: Post, userVote?: 'upvote' | 'downvote' }) => (
    <div data-testid={`post-card-${post.id}`}>
      <h3>{post.title}</h3>
      <p>Vote: {userVote || 'none'}</p>
    </div>
  ),
}));

// Mock Link
jest.mock('next/link', () => ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>);

// --- Test Data ---
const mockUser = mockUserModel('user-1', 'Tester', true);
const mockCommunityId = 'comm-123';
const mockCommunityData = {
  id: mockCommunityId,
  name: 'Awesome Community',
  bio: 'A place to test things.',
  stats: { memberCount: 100 },
  location: { city: 'Testville', state: 'TS' },
};
// Fixed: Added missing communityId to mock post objects
const mockInitialPosts: Post[] = [
  { id: 'post-1', title: 'First Post', authorId: 'author-1', communityId: mockCommunityId, content: '...', categoryTag: 'generalDiscussion', createdAt: { seconds: 1000, nanoseconds: 0 }, author: { name: 'A1', role: '', badgeUrl: ''}, stats: { upvotes: 5, downvotes: 0, commentCount: 1}, geographicTag: '', mediaUrls: [], status: 'active', isEmergency: false },
  { id: 'post-2', title: 'Second Post', authorId: 'author-2', communityId: mockCommunityId, content: '...', categoryTag: 'safetyAndCrime', createdAt: { seconds: 900, nanoseconds: 0 }, author: { name: 'A2', role: '', badgeUrl: ''}, stats: { upvotes: 10, downvotes: 1, commentCount: 2}, geographicTag: '', mediaUrls: [], status: 'active', isEmergency: false },
];
// Fixed: Added missing communityId to mock post objects
const mockMorePosts: Post[] = [
    { id: 'post-3', title: 'Third Post', authorId: 'author-3', communityId: mockCommunityId, content: '...', categoryTag: 'generalDiscussion', createdAt: { seconds: 800, nanoseconds: 0 }, author: { name: 'A3', role: '', badgeUrl: ''}, stats: { upvotes: 2, downvotes: 0, commentCount: 0}, geographicTag: '', mediaUrls: [], status: 'active', isEmergency: false },
];
const mockLastVisible = { id: 'mock-doc-snapshot' } as DocumentSnapshot; // Simple mock for DocumentSnapshot

// --- Test Suite ---
describe('CommunityPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useParams as jest.Mock).mockReturnValue({ id: mockCommunityId });

    // Default successful mocks
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (checkCommunityMembership as jest.Mock).mockResolvedValue(true);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunityData);
    (getCommunityPosts as jest.Mock).mockResolvedValue({
      posts: mockInitialPosts,
      lastVisible: mockLastVisible, // Mock that there might be more
    });
    (getUserVotesForPosts as jest.Mock).mockResolvedValue({ 'post-1': 'upvote' }); // Example vote
  });

  it('should show loading state initially', () => {
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {})); // Pending promise
    render(<CommunityPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText(mockCommunityData.name)).not.toBeInTheDocument(); // Community name not yet visible
  });

  it('should redirect to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    render(<CommunityPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('should redirect to authenticate-person if user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-1', 'Tester', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    render(<CommunityPage />);
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('should redirect to access-denied if user is not a member', async () => {
    (checkCommunityMembership as jest.Mock).mockResolvedValue(false);
    render(<CommunityPage />);
    await waitFor(() => {
      expect(checkCommunityMembership).toHaveBeenCalledWith(mockUser.id, mockCommunityId);
      expect(mockPush).toHaveBeenCalledWith(`/communities/access-denied?community=${mockCommunityId}`);
    });
  });

  it('should render community details and initial posts', async () => {
    render(<CommunityPage />);
    await waitFor(() => {
      // Check community details
      expect(screen.getByRole('heading', { name: mockCommunityData.name })).toBeInTheDocument();
      expect(screen.getByText(mockCommunityData.bio)).toBeInTheDocument();
      expect(screen.getByText(mockCommunityData.stats.memberCount.toString())).toBeInTheDocument();
      expect(screen.getByText(`${mockCommunityData.location.city}, ${mockCommunityData.location.state}`)).toBeInTheDocument();

      // Check initial posts are rendered (using PostCard mock)
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
      expect(screen.getByText('First Post')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-2')).toBeInTheDocument();
      expect(screen.getByText('Second Post')).toBeInTheDocument();

       // Check vote state is passed
      expect(within(screen.getByTestId('post-card-post-1')).getByText('Vote: upvote')).toBeInTheDocument();
      expect(within(screen.getByTestId('post-card-post-2')).getByText('Vote: none')).toBeInTheDocument();

      // Check filter/sort defaults
      const categorySelect = screen.getAllByTestId('select')[0] as HTMLSelectElement; // Assuming category is first select
      const sortSelect = screen.getAllByTestId('select')[1] as HTMLSelectElement; // Assuming sort is second select
      expect(categorySelect).toHaveValue('all');
      expect(sortSelect).toHaveValue('recent');

      // Check "Load More" button is present (since mock returned lastVisible)
      expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
    });
  });

  it('should filter posts when category is changed', async () => {
    render(<CommunityPage />);
    await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument(); // Wait for initial posts
    });

    const categorySelect = screen.getAllByTestId('select')[0] as HTMLSelectElement;

    // Reset mock for the next call
    (getCommunityPosts as jest.Mock).mockClear().mockResolvedValue({ posts: [mockInitialPosts[1]], lastVisible: null }); // Only return the safety post
    (getUserVotesForPosts as jest.Mock).mockClear().mockResolvedValue({}); // Reset votes

    // Change category
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'safetyAndCrime' } });
    });

    await waitFor(() => {
        // Check getCommunityPosts was called with the new category
        expect(getCommunityPosts).toHaveBeenCalledWith(mockCommunityId, expect.objectContaining({
            categoryTag: 'safetyAndCrime',
            sortBy: 'recent', // Sort should remain the same initially
            limit: 10,
            lastVisible: undefined // New query, no lastVisible
        }));
        // Check only the filtered post is shown
        expect(screen.queryByText('First Post')).not.toBeInTheDocument();
        expect(screen.getByText('Second Post')).toBeInTheDocument();
        // Check Load More button is gone (mock returned lastVisible: null)
        expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
    });
  });

  it('should sort posts when sort option is changed', async () => {
    render(<CommunityPage />);
    await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
    });

    const sortSelect = screen.getAllByTestId('select')[1] as HTMLSelectElement;

    // Reset mock for the next call
    (getCommunityPosts as jest.Mock).mockClear().mockResolvedValue({ posts: [mockInitialPosts[1], mockInitialPosts[0]], lastVisible: mockLastVisible }); // Return posts in different order
    (getUserVotesForPosts as jest.Mock).mockClear().mockResolvedValue({ 'post-1': 'upvote' });

    // Change sort
    await act(async () => {
      fireEvent.change(sortSelect, { target: { value: 'upvoted' } });
    });

    await waitFor(() => {
        // Check getCommunityPosts was called with the new sort option
        expect(getCommunityPosts).toHaveBeenCalledWith(mockCommunityId, expect.objectContaining({
            categoryTag: undefined, // Still 'all' category
            sortBy: 'upvoted',
            limit: 10,
            lastVisible: undefined
        }));
        // Check posts are potentially re-rendered (order check depends on mock return)
        expect(screen.getByText('First Post')).toBeInTheDocument();
        expect(screen.getByText('Second Post')).toBeInTheDocument();
    });
  });

  it('should load more posts when "Load More" is clicked', async () => {
      render(<CommunityPage />);
      await waitFor(() => {
          expect(screen.getByText('First Post')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: 'Load More' });

      // Configure mock for the "load more" call
      (getCommunityPosts as jest.Mock).mockClear().mockResolvedValue({ posts: mockMorePosts, lastVisible: null }); // Return new posts, no more after this
      (getUserVotesForPosts as jest.Mock).mockClear().mockResolvedValue({}); // Votes for new posts

      await act(async () => {
          await userEvent.click(loadMoreButton);
      });

      await waitFor(() => {
          // Check getCommunityPosts called with lastVisible
          expect(getCommunityPosts).toHaveBeenCalledWith(mockCommunityId, expect.objectContaining({
              lastVisible: mockLastVisible // Use the lastVisible from the initial load
          }));
          // Check new post is rendered
          expect(screen.getByText('Third Post')).toBeInTheDocument();
          // Check original posts are still there
          expect(screen.getByText('First Post')).toBeInTheDocument();
          expect(screen.getByText('Second Post')).toBeInTheDocument();
          // Check Load More button is gone
          expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
      });
  });

  it('should display "No posts found" message', async () => {
      (getCommunityPosts as jest.Mock).mockResolvedValue({ posts: [], lastVisible: null }); // No posts
      render(<CommunityPage />);
      await waitFor(() => {
          expect(screen.getByText('No posts found for the selected category.')).toBeInTheDocument();
          expect(screen.queryByText('First Post')).not.toBeInTheDocument();
      });
  });

});