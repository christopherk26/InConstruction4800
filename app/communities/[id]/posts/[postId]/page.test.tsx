// app/communities/[communityId]/posts/[postId]/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import PostDetailPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getCommunityById, checkCommunityMembership, formatCategoryName } from '@/app/services/communityService';
import { getPostById, getPostComments, createComment, voteOnPost, voteOnComment, getUserVotesForPosts, getUserVotesForComments } from '@/app/services/postService';
import { UserModel } from '@/app/models/UserModel';
import { Post, Comment, NestedComment, FirestoreTimestamp, User as UserType } from '@/app/types/database'; // Import UserType
import { format } from 'date-fns'; // Import format from date-fns

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock date-fns format
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => 'Mocked Date'), // Mock the format function
}));

// Mock auth service
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));

// Mock community service
jest.mock('@/app/services/communityService', () => ({
  getCommunityById: jest.fn(),
  checkCommunityMembership: jest.fn(),
  formatCategoryName: jest.fn(name => `Formatted ${name}`), // Mock category formatter
}));

// Mock post service
jest.mock('@/app/services/postService', () => ({
  getPostById: jest.fn(),
  getPostComments: jest.fn(),
  createComment: jest.fn(),
  voteOnPost: jest.fn(),
  voteOnComment: jest.fn(),
  getUserVotesForPosts: jest.fn(),
  getUserVotesForComments: jest.fn(),
}));

// --- START FIX for TS(2352) ---
// Mock UserModel using type assertion via 'unknown' as suggested by the error
const mockUserModel = (
  id: string,
  firstName: string,
  isVerifiedValue: boolean, // Renamed parameter
  lastName: string = 'User',
  email: string = 'test@example.com',
  profilePhotoUrl: string = 'https://example.com/profile.jpg'
): UserModel & UserType => {
  const mockData = {
    // Properties matching UserType
    id,
    email,
    firstName,
    lastName,
    phoneNumber: '555-0000',
    birthDate: { seconds: 0, nanoseconds: 0 } as FirestoreTimestamp,
    bio: '',
    profilePhotoUrl,
    verification: {
      status: (isVerifiedValue ? 'verified' : 'pending') as 'verified' | 'pending' | 'rejected', // Use parameter value
      method: 'mock',
      documentUrls: [] as string[], // Ensure type match
      verificationDate: { seconds: 0, nanoseconds: 0 } as FirestoreTimestamp,
    },
    createdAt: { seconds: 1678886400, nanoseconds: 0 } as FirestoreTimestamp,
    lastLogin: { seconds: 1678886400, nanoseconds: 0 } as FirestoreTimestamp,
    accountStatus: 'active' as 'active' | 'suspended' | 'deactivated',
    isAdmin: false,

    // --- Mock methods explicitly needed by the component ---
    isVerified: jest.fn().mockResolvedValue(isVerifiedValue),

    // Add mocks for any OTHER specific UserModel methods the component *actually* calls
    // e.g., getFullName: jest.fn().mockReturnValue(`${firstName} ${lastName}`),

    // We intentionally omit the many other methods from UserModel class definition
    // unless the component under test requires them.
  };

  // Use assertion via 'unknown' to bypass strict overlap checks
  return mockData as unknown as UserModel & UserType;
};
// --- END FIX ---


// Mock UI components (as in previous tests)
jest.mock('@/components/ui/main-navbar', () => ({
  MainNavbar: ({ user }: any) => <div data-testid="main-navbar">Navbar for {user?.firstName}</div>,
}));

jest.mock('@/components/ui/footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children, className }: any) => <div className={className} data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, size, className, onClick, disabled, asChild, ...props }: any) => {
    if (asChild) {
      return <div className={className} {...props}>{children}</div>; // Render children (Link)
    }
    return (
      <button
        className={className}
        onClick={onClick}
        disabled={disabled}
        data-variant={variant} // Use data attributes for variant/size if needed for assertions
        data-size={size}
        {...props}
      >
        {children}
      </button>
    );
  },
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ placeholder, value, onChange, rows, className, ...props }: any) => (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      className={className}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className, ...props }: any) => (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    />
  ),
}));


// Mock shared components
jest.mock('@/components/community/post-action-dropdown', () => ({
    PostActionDropdown: ({ post, currentUser, communityId, onActionComplete }: any) => (
      <div data-testid={`post-action-dropdown-${post.id}`}>PostActionDropdown</div>
    ),
}));

jest.mock('@/components/community/comment-action-dropdown', () => ({
  CommentActionDropdown: ({ comment, currentUser, communityId, onActionComplete }: any) => (
    <div data-testid={`comment-action-dropdown-${comment.id}`}>CommentActionDropdown</div>
  ),
}));


// Mock icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeftIcon</span>,
  ThumbsUp: () => <span data-testid="thumbs-up-icon">ThumbsUpIcon</span>,
  ThumbsDown: () => <span data-testid="thumbs-down-icon">ThumbsDownIcon</span>,
  Flag: () => <span data-testid="flag-icon">FlagIcon</span>,
  MessageCircle: () => <span data-testid="message-circle-icon">MessageCircleIcon</span>,
  Share2: () => <span data-testid="share-icon">ShareIcon</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">ChevronDownIcon</span>,
  ChevronRight: () => <span data-testid="chevron-right-icon">ChevronRightIcon</span>,
  MapPin: () => <span data-testid="map-pin-icon">MapPinIcon</span>,
  User: () => <span data-testid="user-icon">UserIcon</span>,
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock the formatDateTime function used in the component to control its output
// Since it's defined inside the component, we'll rely on the mock of date-fns/format
// and verify its usage with expected mock data timestamps.


describe('PostDetailPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockRouter = { push: mockPush, back: mockBack, refresh: jest.fn() };
  // Call mock function correctly
  const mockCurrentUser = mockUserModel('current-user-id', 'Current', true);
  const mockCommunityId = 'community-id-abc';
  const mockPostId = 'post-id-123';

  const mockCommunity = {
    id: mockCommunityId,
    name: 'Test Community',
    // Add other community properties as needed
  };

  const mockPost: Post = {
    id: mockPostId,
    authorId: 'author-id-1',
    communityId: mockCommunityId,
    title: 'Test Post Title',
    content: 'This is the content of the test post.\nWith multiple lines.',
    categoryTag: 'General',
    geographicTag: 'Downtown',
    mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.png'],
    stats: { upvotes: 10, downvotes: 2, commentCount: 3 },
    author: { name: 'Post Author', role: 'Member', badgeUrl: 'https://example.com/author.jpg' },
    status: 'active',
    isEmergency: false,
    createdAt: { seconds: 1678886400, nanoseconds: 0 } as FirestoreTimestamp, // Mock Timestamp
  };

   const mockPostPinned: Post = {
    ...mockPost,
    id: 'post-id-pinned',
    title: 'Pinned Post',
    status: 'pinned',
    isEmergency: true, // Can be pinned and emergency
   };


  const mockComments: NestedComment[] = [
    {
      id: 'comment-1',
      postId: mockPostId,
      authorId: 'comment-author-1',
      content: 'This is the first comment.',
      stats: { upvotes: 5, downvotes: 0 },
      author: { name: 'Commenter 1', role: 'Member', badgeUrl: 'https://example.com/commenter1.jpg' },
      status: 'active',
      createdAt: { seconds: 1678887000, nanoseconds: 0 } as FirestoreTimestamp, // Mock Timestamp
      replies: [
        {
          id: 'reply-1-1',
          postId: mockPostId,
          authorId: 'comment-author-2',
          parentCommentId: 'comment-1',
          content: 'This is a reply to the first comment.',
          stats: { upvotes: 2, downvotes: 0 },
          author: { name: 'Commenter 2', role: 'Moderator', badgeUrl: 'https://example.com/commenter2.jpg', badge: { emoji: '🛡️', color: '#4CAF50'} },
          status: 'active',
          createdAt: { seconds: 1678887600, nanoseconds: 0 } as FirestoreTimestamp, // Mock Timestamp
          replies: [], // No nested replies for simplicity in this mock
        },
      ],
    },
    {
      id: 'comment-2',
      postId: mockPostId,
      authorId: 'comment-author-3',
      content: 'This is the second comment.',
      stats: { upvotes: 0, downvotes: 1 },
      author: { name: 'Commenter 3', role: 'Member', badgeUrl: '' }, // No badgeUrl
      status: 'active',
      createdAt: { seconds: 1678888000, nanoseconds: 0 } as FirestoreTimestamp, // Mock Timestamp
      replies: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: mockCommunityId, postId: mockPostId });
    // Use the corrected mockUserModel function
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUserModel('current-user-id', 'Current', true));
    (checkCommunityMembership as jest.Mock).mockResolvedValue(true); // Default: User is a member
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getPostById as jest.Mock).mockResolvedValue(mockPost); // Default: Return mock post
    (getPostComments as jest.Mock).mockResolvedValue(mockComments); // Default: Return mock comments
    (getUserVotesForPosts as jest.Mock).mockResolvedValue({}); // Default: No user post votes
    (getUserVotesForComments as jest.Mock).mockResolvedValue({}); // Default: No user comment votes
    (createComment as jest.Mock).mockResolvedValue(undefined); // Mock comment creation success
    (voteOnPost as jest.Mock).mockResolvedValue(null); // Mock post vote success
    (voteOnComment as jest.Mock).mockResolvedValue(null); // Mock comment vote success

    // Mock date-fns format output
    (format as jest.Mock).mockReturnValue('Mocked Date Format');
     // Mock the inline formatDateTime by making it use the mocked format from date-fns
      jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('Mocked Date'); // Still needed for AccessDeniedPage error state footer, but component uses date-fns now
  });

   afterEach(() => {
      jest.restoreAllMocks(); // Restore Date.prototype mock
   });


  it('shows loading spinner and text while fetching initial data', async () => {
    // Simulate initial loading state (fetching user, post, comments in parallel roughly)
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<PostDetailPage />);
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
    expect(screen.queryByText(mockPost.title)).not.toBeInTheDocument();

    // Simulate current user loaded, but post/community/comments loading
    // Use the corrected mockUserModel function
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUserModel('current-user-id', 'Current', true));
    (getPostById as jest.Mock).mockImplementation(() => new Promise(() => {})); // Post loading

    await act(async () => {
       // Re-render the component to simulate the state update after user loads
       render(<PostDetailPage />, { container: document.body });
    });

     await waitFor(() => {
       expect(screen.getByText('Loading...')).toBeInTheDocument(); // Still loading
     });

     // Simulate community/post loaded, but comments loading
      (getPostById as jest.Mock).mockResolvedValue(mockPost);
      (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
      (getPostComments as jest.Mock).mockImplementation(() => new Promise(() => {})); // Comments loading


      await act(async () => {
         // Re-render the component to simulate the state update
         render(<PostDetailPage />, { container: document.body });
      });

      await waitFor(() => {
          // Post content should be visible, but comments section might show its own loading
          expect(screen.getByText(mockPost.title)).toBeInTheDocument();
          expect(screen.getByText('Loading comments...')).toBeInTheDocument(); // Specific comment loading text
      });


  }, 15000); // Increased timeout

  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<PostDetailPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects to authenticate-person if user is not verified', async () => {
    // Use the corrected mockUserModel function
    const unverifiedUser = mockUserModel('user-id-unverified', 'Unverified', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    await act(async () => {
      render(<PostDetailPage />);
    });
    await waitFor(() => {
      // Check the mocked method on the returned object
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('redirects to access denied page if user is not a member of the community', async () => {
    // Ensure getCurrentUser resolves with the correct mock structure first
    const currentUser = mockUserModel('current-user-id', 'Current', true);
    (getCurrentUser as jest.Mock).mockResolvedValue(currentUser);
    (checkCommunityMembership as jest.Mock).mockResolvedValue(false); // User is NOT a member

    await act(async () => {
      render(<PostDetailPage />);
    });
    await waitFor(() => {
      // Pass the ID from the resolved current user mock
      expect(checkCommunityMembership).toHaveBeenCalledWith(currentUser.id, mockCommunityId);
      expect(mockPush).toHaveBeenCalledWith(`/communities/access-denied?community=${mockCommunityId}`);
    });
  });

  it('displays "Post not found" state if getPostById returns null', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

    (getPostById as jest.Mock).mockResolvedValue(null); // Post not found
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity); // Community found
    (getPostComments as jest.Mock).mockResolvedValue([]); // No comments

    await act(async () => {
      render(<PostDetailPage />);
    });

    await waitFor(() => {
      // Check for the error message and "Post not found" title
      expect(screen.getByText('Post not found')).toBeInTheDocument();
      expect(screen.getByText("The post you're looking for could not be loaded. It may have been removed or you may not have access.")).toBeInTheDocument();
      // Check the "Return to Community" link
      expect(screen.getByRole('link', { name: 'Return to Community' })).toHaveAttribute('href', `/communities/${mockCommunityId}`);
      // Check back button is present in error state
      expect(screen.getByRole('button', { name: 'ArrowLeftIcon Back' })).toBeInTheDocument();
      // Navbar and Footer should still render
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Current');
      expect(screen.getByTestId('footer')).toBeInTheDocument();
       // An error log should also be present because getPostById returned null
       expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data:", expect.any(Error)); // The component logs a generic error
    });
    consoleErrorSpy.mockRestore();
  });

   it('displays "An error occurred" state if fetching community details fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

      (getPostById as jest.Mock).mockResolvedValue(mockPost); // Post found
      (getCommunityById as jest.Mock).mockRejectedValue(new Error('Failed to fetch community')); // Community fetch fails
      (getPostComments as jest.Mock).mockResolvedValue([]); // No comments (this fetch might not even happen or its result is ignored on main error)


      await act(async () => {
        render(<PostDetailPage />);
      });

      await waitFor(() => {
         // Check that loading state is gone
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        // Check for the generic error message display
        expect(screen.getByText('An error occurred while loading the post.')).toBeInTheDocument();
         // The title in the error card is also 'An error occurred while loading the post.'
        expect(screen.getByText('An error occurred while loading the post.')).toBeInTheDocument();


         // Check the "Return to Community" link (it will still try to link to the community ID from params)
        expect(screen.getByRole('link', { name: 'Return to Community' })).toHaveAttribute('href', `/communities/${mockCommunityId}`);
        // Check back button is present in error state
        expect(screen.getByRole('button', { name: 'ArrowLeftIcon Back' })).toBeInTheDocument();
        // Check that an error was logged
         expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data:", expect.any(Error));
        // Navbar and Footer should still render
        expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Current');
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      });
      consoleErrorSpy.mockRestore();
   });

   it('displays "An error occurred" state if fetching post details fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

      (getPostById as jest.Mock).mockRejectedValue(new Error('Failed to fetch post')); // Post fetch fails
      (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity); // Community found
      (getPostComments as jest.Mock).mockResolvedValue([]); // Comments fetch might not happen

      await act(async () => {
        render(<PostDetailPage />);
      });

      await waitFor(() => {
         // Check that loading state is gone
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        // Check for the generic error message display
        expect(screen.getByText('An error occurred while loading the post.')).toBeInTheDocument();
         // Title is also generic error
         expect(screen.getByText('An error occurred while loading the post.')).toBeInTheDocument();

         // Check the "Return to Community" link
        expect(screen.getByRole('link', { name: 'Return to Community' })).toHaveAttribute('href', `/communities/${mockCommunityId}`);
        // Check back button is present
        expect(screen.getByRole('button', { name: 'ArrowLeftIcon Back' })).toBeInTheDocument();
        // Check that an error was logged
         expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data:", expect.any(Error));
        // Navbar and Footer
        expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Current');
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      });
      consoleErrorSpy.mockRestore();
    });


  it('renders post details, comments, and interactions when data is loaded', async () => {
    // Use the resolved currentUser mock
    const currentUser = await (getCurrentUser as jest.Mock)();

    await act(async () => {
      render(<PostDetailPage />);
    });

    await waitFor(() => {
      // Check post title and emergency status
      expect(screen.getByText(mockPost.title)).toBeInTheDocument();
      expect(screen.queryByText('🚨')).not.toBeInTheDocument(); // Not an emergency post in mock

      // Check author details
      expect(screen.getByText(mockPost.author.name)).toBeInTheDocument();
       expect(screen.getByAltText(`${mockPost.author.name}'s profile`)).toHaveAttribute('src', mockPost.author.badgeUrl);
      expect(screen.getByText(mockPost.author.role)).toBeInTheDocument();
      expect(screen.getByText('Mocked Date Format')).toBeInTheDocument(); // Uses mocked format

      // Check tags
      expect(screen.getByText(`Formatted ${mockPost.categoryTag}`)).toBeInTheDocument(); // Uses mocked formatter
      expect(screen.getByText(mockPost.geographicTag)).toBeInTheDocument();
      expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();

      // Check post content
      expect(screen.getByText('This is the content of the test post.')).toBeInTheDocument();
      expect(screen.getByText('With multiple lines.')).toBeInTheDocument();

      // Check media
      expect(screen.getByAltText(`Media for ${mockPost.title}`)).toHaveAttribute('src', mockPost.mediaUrls[0]);
      // Assuming both images are rendered, check the second one too
       const mediaImages = screen.getAllByAltText(`Media for ${mockPost.title}`);
       expect(mediaImages).toHaveLength(mockPost.mediaUrls.length);
       expect(mediaImages[1]).toHaveAttribute('src', mockPost.mediaUrls[1]);


      // Check stats
      expect(screen.getByText(mockPost.stats.upvotes.toString())).toBeInTheDocument();
      expect(screen.getByText(mockPost.stats.downvotes.toString())).toBeInTheDocument();
      expect(screen.getByText(mockPost.stats.commentCount.toString())).toBeInTheDocument();

      // Check initial vote button classes (default is no vote)
      expect(screen.getByRole('button', { name: mockPost.stats.upvotes.toString() })).not.toHaveClass(/bg-blue/);
      expect(screen.getByRole('button', { name: mockPost.stats.downvotes.toString() })).not.toHaveClass(/bg-red/);

      // Check "Add Your Comment" section
      expect(screen.getByText('Add Your Comment')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Write your comment here...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Post Comment' })).toBeInTheDocument();

      // Check comments section header
      expect(screen.getByText(`Comments (${mockComments.length})`)).toBeInTheDocument();

      // Check if top-level comments are rendered using CommentWithReplies mock
      // Note: CommentWithReplies uses its own internal mocks for user icons.
       const comment1 = screen.getByText(mockComments[0].content).closest('[data-testid="card"]');
       const comment2 = screen.getByText(mockComments[1].content).closest('[data-testid="card"]');
       expect(comment1).toBeInTheDocument();
       expect(comment2).toBeInTheDocument();
       expect(within(comment1 as HTMLElement).getByTestId('user-icon')).toBeInTheDocument(); // Check user icon within comment card
       expect(within(comment2 as HTMLElement).getByTestId('user-icon')).toBeInTheDocument();


      // Check Navbar and Footer
      expect(screen.getByTestId('main-navbar')).toHaveTextContent(`Navbar for ${currentUser.firstName}`);
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check back button and breadcrumbs
      expect(screen.getByRole('button', { name: 'ArrowLeftIcon Back' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: 'Communities' })).toHaveAttribute('href', '/communities');
      expect(screen.getByRole('link', { name: mockCommunity.name })).toHaveAttribute('href', `/communities/${mockCommunityId}`);
      expect(screen.getByText('Post')).toBeInTheDocument();

       // Check PostActionDropdown is present
       expect(screen.getByTestId(`post-action-dropdown-${mockPostId}`)).toBeInTheDocument();
    });
  });

  it('renders emergency post title with alert icon', async () => {
    (getPostById as jest.Mock).mockResolvedValue(mockPostPinned); // Use pinned/emergency post mock
    await act(async () => {
      render(<PostDetailPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('🚨 Pinned Post')).toBeInTheDocument();
      expect(screen.getByText('Pinned')).toBeInTheDocument(); // Check pinned status badge
    });
  });


  it('renders default author icon if author badgeUrl is missing', async () => {
     const postWithoutAuthorPhoto = { ...mockPost, author: { ...mockPost.author, badgeUrl: '' } };
     (getPostById as jest.Mock).mockResolvedValue(postWithoutAuthorPhoto);

     await act(async () => {
       render(<PostDetailPage />);
     });

     await waitFor(() => {
        // Check the main post author icon
        expect(screen.getByTestId('user-icon')).toBeInTheDocument();
        expect(screen.queryByAltText(`${postWithoutAuthorPhoto.author.name}'s profile`)).not.toBeInTheDocument();
     });
  });


  it('renders no comments message when getPostComments returns empty array', async () => {
    (getPostComments as jest.Mock).mockResolvedValue([]); // No comments
    await act(async () => {
      render(<PostDetailPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Comments (0)')).toBeInTheDocument();
      expect(screen.getByText('No comments yet. Be the first to leave a comment!')).toBeInTheDocument();
      expect(screen.queryByTestId('user-card-comment-author-1')).not.toBeInTheDocument(); // No comment cards
    });
  });


  // Test post voting
  it('calls voteOnPost and updates UI on upvote click', async () => {
    const currentUser = await (getCurrentUser as jest.Mock)();
    const initialUpvotes = mockPost.stats.upvotes;
    const updatedPostAfterUpvote = { ...mockPost, stats: { ...mockPost.stats, upvotes: initialUpvotes + 1 } };
    (voteOnPost as jest.Mock).mockResolvedValue(updatedPostAfterUpvote); // Simulate vote success

    await act(async () => {
      render(<PostDetailPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(initialUpvotes.toString())).toBeInTheDocument();
     });

    const upvoteButton = screen.getByRole('button', { name: initialUpvotes.toString() }); // Find button by initial count

    await act(async () => {
      await userEvent.click(upvoteButton);
    });

    await waitFor(() => {
      expect(voteOnPost).toHaveBeenCalledWith(mockPostId, currentUser.id, mockCommunityId, 'upvote');
      // Check if stats are updated
      expect(screen.getByText(updatedPostAfterUpvote.stats.upvotes.toString())).toBeInTheDocument();
      // Check if button class changes to indicate active vote
      expect(screen.getByRole('button', { name: updatedPostAfterUpvote.stats.upvotes.toString() })).toHaveClass(/bg-blue/);
      expect(screen.getByRole('button', { name: mockPost.stats.downvotes.toString() })).not.toHaveClass(/bg-red/);
    });
  });

   it('calls voteOnPost and updates UI on downvote click', async () => {
     const currentUser = await (getCurrentUser as jest.Mock)();
     const initialDownvotes = mockPost.stats.downvotes;
     const updatedPostAfterDownvote = { ...mockPost, stats: { ...mockPost.stats, downvotes: initialDownvotes + 1 } };
     (voteOnPost as jest.Mock).mockResolvedValue(updatedPostAfterDownvote); // Simulate vote success

     await act(async () => {
       render(<PostDetailPage />);
     });
      await waitFor(() => {
          expect(screen.getByText(initialDownvotes.toString())).toBeInTheDocument();
      });


     const downvoteButton = screen.getByRole('button', { name: initialDownvotes.toString() }); // Find button by initial count

     await act(async () => {
       await userEvent.click(downvoteButton);
     });

     await waitFor(() => {
       expect(voteOnPost).toHaveBeenCalledWith(mockPostId, currentUser.id, mockCommunityId, 'downvote');
       // Check if stats are updated
       expect(screen.getByText(updatedPostAfterDownvote.stats.downvotes.toString())).toBeInTheDocument();
       // Check if button class changes to indicate active vote
       expect(screen.getByRole('button', { name: mockPost.stats.upvotes.toString() })).not.toHaveClass(/bg-blue/);
       expect(screen.getByRole('button', { name: updatedPostAfterDownvote.stats.downvotes.toString() })).toHaveClass(/bg-red/);
     });
   });

   it('toggles off upvote if clicking upvote again', async () => {
      const currentUser = await (getCurrentUser as jest.Mock)();
      const initialUpvotes = mockPost.stats.upvotes;
      // Simulate user having already upvoted
      (getUserVotesForPosts as jest.Mock).mockResolvedValue({ [mockPostId]: 'upvote' });
      const postAfterToggle = { ...mockPost, stats: { ...mockPost.stats, upvotes: initialUpvotes - 1 } }; // Upvote count decreases
      (voteOnPost as jest.Mock).mockResolvedValue(postAfterToggle); // Simulate toggle off success


      await act(async () => {
        render(<PostDetailPage />);
      });
       await waitFor(() => {
           // Initial state should show upvote active
           expect(screen.getByRole('button', { name: initialUpvotes.toString() })).toHaveClass(/bg-blue/);
       });

      const upvoteButton = screen.getByRole('button', { name: initialUpvotes.toString() });

      await act(async () => {
        await userEvent.click(upvoteButton);
      });

      await waitFor(() => {
        expect(voteOnPost).toHaveBeenCalledWith(mockPostId, currentUser.id, mockCommunityId, 'upvote'); // Still called with upvote
        // Check if stats are updated (decreased)
        expect(screen.getByText(postAfterToggle.stats.upvotes.toString())).toBeInTheDocument();
        // Check if button class reverts
        expect(screen.getByRole('button', { name: postAfterToggle.stats.upvotes.toString() })).not.toHaveClass(/bg-blue/);
      });
   });

   it('switches vote from downvote to upvote', async () => {
      const currentUser = await (getCurrentUser as jest.Mock)();
      const initialUpvotes = mockPost.stats.upvotes;
      const initialDownvotes = mockPost.stats.downvotes;
      // Simulate user having already downvoted
      (getUserVotesForPosts as jest.Mock).mockResolvedValue({ [mockPostId]: 'downvote' });
      // On switching from downvote to upvote: downvote decreases, upvote increases
      const postAfterSwitch = { ...mockPost, stats: { upvotes: initialUpvotes + 1, downvotes: initialDownvotes - 1, commentCount: mockPost.stats.commentCount } };
      (voteOnPost as jest.Mock).mockResolvedValue(postAfterSwitch); // Simulate switch success


      await act(async () => {
        render(<PostDetailPage />);
      });
       await waitFor(() => {
           // Initial state should show downvote active
           expect(screen.getByRole('button', { name: initialDownvotes.toString() })).toHaveClass(/bg-red/);
       });

      const upvoteButton = screen.getByRole('button', { name: initialUpvotes.toString() });

      await act(async () => {
        await userEvent.click(upvoteButton);
      });

      await waitFor(() => {
        expect(voteOnPost).toHaveBeenCalledWith(mockPostId, currentUser.id, mockCommunityId, 'upvote'); // Called with the new vote type
        // Check if stats are updated
        expect(screen.getByText(postAfterSwitch.stats.upvotes.toString())).toBeInTheDocument();
        expect(screen.getByText(postAfterSwitch.stats.downvotes.toString())).toBeInTheDocument();
        // Check if button classes update
        expect(screen.getByRole('button', { name: postAfterSwitch.stats.upvotes.toString() })).toHaveClass(/bg-blue/);
        expect(screen.getByRole('button', { name: postAfterSwitch.stats.downvotes.toString() })).not.toHaveClass(/bg-red/);
      });
   });


  // Test comment submission
  it('allows user to type and submit a new comment', async () => {
    const currentUser = await (getCurrentUser as jest.Mock)();
    const newCommentContent = "This is a new test comment.";
     // Simulate comment creation success and return updated comments/post
    (createComment as jest.Mock).mockResolvedValue(undefined);
    const updatedCommentsAfterComment = [
      ...mockComments,
      { // Mock the new comment structure (simplified)
        id: 'new-comment-1', postId: mockPostId, authorId: currentUser.id, content: newCommentContent,
        stats: { upvotes: 0, downvotes: 0 }, author: { name: `${currentUser.firstName} ${currentUser.lastName}`, role: '', badgeUrl: currentUser.profilePhotoUrl },
        status: 'active', createdAt: { seconds: Date.now() / 1000, nanoseconds: 0} as FirestoreTimestamp, replies: []
      } as NestedComment,
    ];
    (getPostComments as jest.Mock).mockResolvedValueOnce(mockComments).mockResolvedValueOnce(updatedCommentsAfterComment); // First call initial, second call after submit
    const updatedPostAfterComment = { ...mockPost, stats: { ...mockPost.stats, commentCount: mockPost.stats.commentCount + 1 } };
     (getPostById as jest.Mock).mockResolvedValueOnce(mockPost).mockResolvedValueOnce(updatedPostAfterComment); // First call initial, second call after submit


    await act(async () => {
      render(<PostDetailPage />);
    });
     await waitFor(() => {
         expect(screen.getByText('Add Your Comment')).toBeInTheDocument();
     });

    const commentInput: HTMLInputElement = screen.getByPlaceholderText('Write your comment here...');
    const postCommentButton = screen.getByRole('button', { name: 'Post Comment' });

    // Button should be disabled initially
    expect(postCommentButton).toBeDisabled();

    // Type comment
    await act(async () => {
      await userEvent.type(commentInput, newCommentContent);
    });

    // Button should be enabled after typing
    expect(postCommentButton).not.toBeDisabled();

    // Submit comment
    await act(async () => {
      await userEvent.click(postCommentButton);
    });

     // Check submitting state
     await waitFor(() => {
         expect(postCommentButton).toBeDisabled();
         expect(postCommentButton).toHaveTextContent('Posting...');
         // Check progress bar appears (check for width > 0 initially)
          const progressBar = screen.getByRole('progressbar'); // Assuming a role is applied
          expect(progressBar).toBeInTheDocument();
          // Detailed progress checks might be complex, verify it starts and finishes
     });


    await waitFor(() => {
      // Check if createComment was called with correct data
      expect(createComment).toHaveBeenCalledWith({
        postId: mockPostId,
        authorId: currentUser.id,
        content: newCommentContent,
        parentCommentId: undefined, // Top-level comment
        author: {
            name: `${currentUser.firstName} ${currentUser.lastName}`, // Should use user's name
            role: "", // Role might be empty string for regular users
            badgeUrl: currentUser.profilePhotoUrl // Should use user's profile photo URL
        },
      });

       // Check if comment input is cleared
       expect(commentInput).toHaveValue('');
       // Check if comments and post data are refreshed
       expect(getPostComments).toHaveBeenCalledTimes(2); // Called initially and after post
       expect(getPostById).toHaveBeenCalledTimes(2); // Called initially and after post
       // Check if the new comment appears in the list
       expect(screen.getByText(newCommentContent)).toBeInTheDocument(); // Assuming CommentWithReplies renders content
       // Check if comment count is updated
       expect(screen.getByText(`Comments (${updatedCommentsAfterComment.length})`)).toBeInTheDocument();

       // Check progress bar disappears or resets
       expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(); // Or check width is 0
        // Check success message appears briefly
        expect(screen.getByText('Comment posted successfully!')).toBeInTheDocument();
    });

     jest.useFakeTimers(); // Use fake timers for setTimeout
     // Wait for success message to disappear (due to setTimeout)
     await act(async () => {
         jest.advanceTimersByTime(1000);
     });
     expect(screen.queryByText('Comment posted successfully!')).not.toBeInTheDocument();
     jest.useRealTimers();

  }, 20000); // Increased timeout

   it('handles error during comment creation', async () => {
     const consoleErrorSpy = jest.spyOn(console, 'error');
     consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

     const newCommentContent = "This comment will fail.";
      // Simulate comment creation failure
     (createComment as jest.Mock).mockRejectedValue(new Error('Comment creation failed'));

     await act(async () => {
       render(<PostDetailPage />);
     });
      await waitFor(() => {
          expect(screen.getByText('Add Your Comment')).toBeInTheDocument();
      });

     const commentInput: HTMLInputElement = screen.getByPlaceholderText('Write your comment here...');
     const postCommentButton = screen.getByRole('button', { name: 'Post Comment' });

     await act(async () => {
       await userEvent.type(commentInput, newCommentContent);
       await userEvent.click(postCommentButton);
     });

      // Check submitting state starts
      await waitFor(() => {
          expect(postCommentButton).toBeDisabled();
          expect(postCommentButton).toHaveTextContent('Posting...');
      });


     await waitFor(() => {
        // Check if createComment was called
       expect(createComment).toHaveBeenCalled();
       // Check submitting state ends
       expect(postCommentButton).not.toBeDisabled();
       expect(postCommentButton).toHaveTextContent('Post Comment');
        // Check input is NOT cleared on error
       expect(commentInput).toHaveValue(newCommentContent);
        // Check progress bar disappears or resets
       expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        // Check that an error was logged
       expect(consoleErrorSpy).toHaveBeenCalledWith("Error posting comment or reply:", expect.any(Error));
        // No success message should appear
       expect(screen.queryByText('Comment posted successfully!')).not.toBeInTheDocument();
        // Comments list and post stats should not have been updated
       expect(getPostComments).toHaveBeenCalledTimes(1); // Only initially
       expect(getPostById).toHaveBeenCalledTimes(1); // Only initially
     });

     consoleErrorSpy.mockRestore(); // Restore console.error
   });

  // Test comment replies
  it('allows user to reply to a comment', async () => {
    const currentUser = await (getCurrentUser as jest.Mock)();
    const replyContentText = "This is a test reply.";
      // Simulate reply creation success and return updated comments/post
    (createComment as jest.Mock).mockResolvedValue(undefined);
     // Simulate the updated comments list including the new reply
     const updatedCommentsAfterReply = mockComments.map(comment => {
        if (comment.id === 'comment-1') {
           return {
              ...comment,
              replies: [
                 ...comment.replies!,
                 { // Mock the new reply structure (simplified)
                    id: 'new-reply-1-1', postId: mockPostId, authorId: currentUser.id, content: replyContentText, parentCommentId: 'comment-1',
                    stats: { upvotes: 0, downvotes: 0 }, author: { name: `${currentUser.firstName} ${currentUser.lastName}`, role: '', badgeUrl: currentUser.profilePhotoUrl },
                     status: 'active', createdAt: { seconds: Date.now() / 1000, nanoseconds: 0} as FirestoreTimestamp, replies: []
                 } as NestedComment,
              ]
           };
        }
        return comment;
     });
    (getPostComments as jest.Mock).mockResolvedValueOnce(mockComments).mockResolvedValueOnce(updatedCommentsAfterReply); // First call initial, second call after submit
     const updatedPostAfterReply = { ...mockPost, stats: { ...mockPost.stats, commentCount: mockPost.stats.commentCount + 1 } }; // Post comment count increases
     (getPostById as jest.Mock).mockResolvedValueOnce(mockPost).mockResolvedValueOnce(updatedPostAfterReply); // First call initial, second call after submit


    await act(async () => {
      render(<PostDetailPage />);
    });
     await waitFor(() => {
         // Ensure comments are loaded and visible
         expect(screen.getByText(mockComments[0].content)).toBeInTheDocument();
     });

    // Find the "Reply" button for the first comment
    const firstCommentCard = screen.getByText(mockComments[0].content).closest('[data-testid="card"]');
    const replyButton = within(firstCommentCard as HTMLElement).getByRole('button', { name: 'Reply' });

    // Click reply button to show reply form
    await act(async () => {
      await userEvent.click(replyButton);
    });

    // Check if reply form appears under the comment
    const replyInput: HTMLInputElement = within(firstCommentCard as HTMLElement).getByPlaceholderText('Write a reply...');
    const postReplyButton = within(firstCommentCard as HTMLElement).getByRole('button', { name: 'Post Reply' });

    expect(replyInput).toBeInTheDocument();
    expect(postReplyButton).toBeDisabled(); // Should be disabled initially

    // Type reply content
    await act(async () => {
      await userEvent.type(replyInput, replyContentText);
    });

    expect(postReplyButton).not.toBeDisabled(); // Should be enabled after typing

    // Submit reply
    await act(async () => {
      await userEvent.click(postReplyButton);
    });

      // Check submitting state
      await waitFor(() => {
          expect(postReplyButton).toBeDisabled();
          expect(postReplyButton).toHaveTextContent('Posting...');
          // Check progress bar appears within the comment card
           const progressBar = within(firstCommentCard as HTMLElement).getByRole('progressbar');
           expect(progressBar).toBeInTheDocument();
      });


    await waitFor(() => {
      // Check if createComment was called with correct data and parent ID
      expect(createComment).toHaveBeenCalledWith({
        postId: mockPostId,
        authorId: currentUser.id,
        content: replyContentText,
        parentCommentId: mockComments[0].id, // Should have parent ID
        author: {
             name: `${currentUser.firstName} ${currentUser.lastName}`,
             role: "",
             badgeUrl: currentUser.profilePhotoUrl
         },
      });

       // Check if reply input is cleared and form is closed
       expect(replyInput).not.toBeInTheDocument(); // The form should be hidden
        // Check if comments and post data are refreshed
       expect(getPostComments).toHaveBeenCalledTimes(2); // Called initially and after post
       expect(getPostById).toHaveBeenCalledTimes(2); // Called initially and after post
       // Check if the new reply appears under the comment (check within the first comment card's replies)
        const updatedFirstCommentCard = screen.getByText(mockComments[0].content).closest('[data-testid="card"]');
        expect(within(updatedFirstCommentCard as HTMLElement)).toHaveTextContent(replyContentText);

       // Check comment count is updated
       expect(screen.getByText(`Comments (${updatedCommentsAfterReply.length})`)).toBeInTheDocument();

        // Check progress bar disappears or resets
       expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

       // No success message appears for replies based on component code
       expect(screen.queryByText('Comment posted successfully!')).not.toBeInTheDocument();
    });

  }, 20000); // Increased timeout

  it('allows voting on comments and updates UI', async () => {
      const currentUser = await (getCurrentUser as jest.Mock)();
      // Simulate user having already upvoted comment-1
      (getUserVotesForComments as jest.Mock).mockResolvedValue({ 'comment-1': 'upvote' });

       // Simulate vote success for comment-1 upvote (toggling off)
       const comment1AfterToggle = { ...mockComments[0], stats: { upvotes: mockComments[0].stats.upvotes - 1, downvotes: mockComments[0].stats.downvotes } };
       (voteOnComment as jest.Mock).mockResolvedValue(comment1AfterToggle);


      await act(async () => {
        render(<PostDetailPage />);
      });
     await waitFor(() => {
         // Ensure comments are loaded
         expect(screen.getByText(mockComments[0].content)).toBeInTheDocument();
     });


      // Find the first comment card
      const firstCommentCard = screen.getByText(mockComments[0].content).closest('[data-testid="card"]');
      // Find the upvote button for the first comment
      const comment1UpvoteButton = within(firstCommentCard as HTMLElement).getByRole('button', { name: mockComments[0].stats.upvotes.toString() });

      // Initial state check for comment-1 (upvote should be active)
      await waitFor(() => { // Use waitFor here as userVote state is fetched async
          expect(within(firstCommentCard as HTMLElement).getByRole('button', { name: mockComments[0].stats.upvotes.toString() })).toHaveClass(/bg-blue/);
      });


      // Click comment-1 upvote to toggle off
      await act(async () => {
          await userEvent.click(comment1UpvoteButton);
      });

      await waitFor(() => {
           // Check if voteOnComment was called
          expect(voteOnComment).toHaveBeenCalledWith(mockComments[0].id, currentUser.id, mockCommunityId, 'upvote');
          // Check if stats are updated on the UI for comment-1
          expect(within(firstCommentCard as HTMLElement).getByRole('button', { name: comment1AfterToggle.stats.upvotes.toString() })).toBeInTheDocument();
          // Check if button class reverts
          expect(within(firstCommentCard as HTMLElement).getByRole('button', { name: comment1AfterToggle.stats.upvotes.toString() })).not.toHaveClass(/bg-blue/);
      });

      // Simulate vote success for comment-2 downvote
      const comment2AfterDownvote = { ...mockComments[1], stats: { upvotes: mockComments[1].stats.upvotes, downvotes: mockComments[1].stats.downvotes + 1 } };
      (voteOnComment as jest.Mock).mockResolvedValue(comment2AfterDownvote);

      // Find the second comment card
      const secondCommentCard = screen.getByText(mockComments[1].content).closest('[data-testid="card"]');
      // Find the downvote button for the second comment
      const comment2DownvoteButton = within(secondCommentCard as HTMLElement).getByRole('button', { name: mockComments[1].stats.downvotes.toString() });

      // Initial state check for comment-2 (no vote)
       expect(within(secondCommentCard as HTMLElement).getByRole('button', { name: mockComments[1].stats.downvotes.toString() })).not.toHaveClass(/bg-red/);

      // Click comment-2 downvote
      await act(async () => {
         await userEvent.click(comment2DownvoteButton);
      });

       await waitFor(() => {
          // Check if voteOnComment was called
         expect(voteOnComment).toHaveBeenCalledWith(mockComments[1].id, currentUser.id, mockCommunityId, 'downvote');
         // Check if stats are updated on the UI for comment-2
         expect(within(secondCommentCard as HTMLElement).getByRole('button', { name: comment2AfterDownvote.stats.downvotes.toString() })).toBeInTheDocument();
         // Check if button class changes
         expect(within(secondCommentCard as HTMLElement).getByRole('button', { name: comment2AfterDownvote.stats.downvotes.toString() })).toHaveClass(/bg-red/);
       });

  }, 20000); // Increased timeout

  it('allows expanding and collapsing comment replies', async () => {
    await act(async () => {
      render(<PostDetailPage />);
    });
     await waitFor(() => {
         // Ensure comments are loaded
         expect(screen.getByText(mockComments[0].content)).toBeInTheDocument();
     });

    // Find the first comment card and its "Show Replies" button
    const firstCommentCard = screen.getByText(mockComments[0].content).closest('[data-testid="card"]');
    const showRepliesButton = within(firstCommentCard as HTMLElement).getByRole('button', { name: `Show ${mockComments[0].replies?.length} Replies` });

    // Initially, the reply should NOT be visible
    expect(screen.queryByText(mockComments[0].replies![0].content)).not.toBeInTheDocument();
    expect(showRepliesButton).toBeInTheDocument(); // Button should be "Show Replies"

    // Click "Show Replies"
    await act(async () => {
      await userEvent.click(showRepliesButton);
    });

    // Reply should become visible
    await waitFor(() => {
      expect(screen.getByText(mockComments[0].replies![0].content)).toBeInTheDocument();
      // Button should change to "Hide Replies"
      expect(within(firstCommentCard as HTMLElement).getByRole('button', { name: 'Hide Replies' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: `Show ${mockComments[0].replies?.length} Replies` })).not.toBeInTheDocument();
      // Check Chevron icon changes
       expect(within(firstCommentCard as HTMLElement).getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    // Find the "Hide Replies" button
    const hideRepliesButton = within(firstCommentCard as HTMLElement).getByRole('button', { name: 'Hide Replies' });

    // Click "Hide Replies"
    await act(async () => {
      await userEvent.click(hideRepliesButton);
    });

    // Reply should be hidden again
    await waitFor(() => {
      expect(screen.queryByText(mockComments[0].replies![0].content)).not.toBeInTheDocument();
      // Button should change back to "Show Replies"
      expect(within(firstCommentCard as HTMLElement).getByRole('button', { name: `Show ${mockComments[0].replies?.length} Replies` })).toBeInTheDocument();
       // Check Chevron icon changes back
       expect(within(firstCommentCard as HTMLElement).getByTestId('chevron-right-icon')).toBeInTheDocument();
    });
  });


  // Test back button functionality
  it('calls router.back() when back button is clicked', async () => {
    await act(async () => {
      render(<PostDetailPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(mockPost.title)).toBeInTheDocument();
     });

    const backButton = screen.getByRole('button', { name: 'ArrowLeftIcon Back' });
    await act(async () => {
      await userEvent.click(backButton);
    });

    expect(mockBack).toHaveBeenCalled();
  });

   it('logs error if fetching user votes for posts fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

      (getUserVotesForPosts as jest.Mock).mockRejectedValue(new Error('Failed to fetch post votes'));

      await act(async () => {
        render(<PostDetailPage />);
      });

      await waitFor(() => {
          // Data should still load, but an error should be logged
          expect(screen.getByText(mockPost.title)).toBeInTheDocument();
          expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching user votes:", expect.any(Error));
      });

      consoleErrorSpy.mockRestore(); // Restore console.error
   });

   it('logs error if fetching user votes for comments fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

      (getUserVotesForComments as jest.Mock).mockRejectedValue(new Error('Failed to fetch comment votes'));

      await act(async () => {
        render(<PostDetailPage />);
      });

      await waitFor(() => {
          // Data should still load, but an error should be logged
          expect(screen.getByText(mockPost.title)).toBeInTheDocument();
           // Comments should still render, but user vote state might be default/null
           expect(screen.getByText(mockComments[0].content)).toBeInTheDocument();
          expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching user votes:", expect.any(Error));
      });

      consoleErrorSpy.mockRestore(); // Restore console.error
   });

    it('handles error during voteOnPost', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error');
        consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

        (voteOnPost as jest.Mock).mockRejectedValue(new Error('Post voting failed'));

        await act(async () => {
            render(<PostDetailPage />);
        });
        await waitFor(() => {
            expect(screen.getByText(mockPost.title)).toBeInTheDocument();
        });

        const upvoteButton = screen.getByRole('button', { name: mockPost.stats.upvotes.toString() });

        await act(async () => {
            await userEvent.click(upvoteButton);
        });

        await waitFor(() => {
            // Vote call should happen
            expect(voteOnPost).toHaveBeenCalled();
            // Stats and button classes should NOT change from initial state
            expect(screen.getByText(mockPost.stats.upvotes.toString())).toBeInTheDocument();
            expect(screen.getByRole('button', { name: mockPost.stats.upvotes.toString() })).not.toHaveClass(/bg-blue/);
             // Error should be logged
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error voting on post:", expect.any(Error));
        });

        consoleErrorSpy.mockRestore();
    });

     it('handles error during voteOnComment', async () => {
         const consoleErrorSpy = jest.spyOn(console, 'error');
         consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

         (voteOnComment as jest.Mock).mockRejectedValue(new Error('Comment voting failed'));

         await act(async () => {
             render(<PostDetailPage />);
         });
         await waitFor(() => {
             expect(screen.getByText(mockComments[0].content)).toBeInTheDocument();
         });

         // Find the first comment card and its upvote button
         const firstCommentCard = screen.getByText(mockComments[0].content).closest('[data-testid="card"]');
         const comment1UpvoteButton = within(firstCommentCard as HTMLElement).getByRole('button', { name: mockComments[0].stats.upvotes.toString() });

         await act(async () => {
             await userEvent.click(comment1UpvoteButton);
         });

         await waitFor(() => {
             // Vote call should happen
             expect(voteOnComment).toHaveBeenCalled();
             // Stats and button classes for the comment should NOT change from initial state
              expect(within(firstCommentCard as HTMLElement).getByRole('button', { name: mockComments[0].stats.upvotes.toString() })).toBeInTheDocument();
              expect(within(firstCommentCard as HTMLElement).getByRole('button', { name: mockComments[0].stats.upvotes.toString() })).not.toHaveClass(/bg-blue/);
              // Error should be logged
             expect(consoleErrorSpy).toHaveBeenCalledWith("Error voting on comment:", expect.any(Error));
         });

         consoleErrorSpy.mockRestore();
     });


});