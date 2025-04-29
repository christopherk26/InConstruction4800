//app/communities/[id]/users/[userId]/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import UserProfilePage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getCommunityById, checkCommunityMembership } from '@/app/services/communityService';
import { getUserProfile, getUserCommunityRole, getUserCommunityPosts } from '@/app/services/userService';
import { UserModel } from '@/app/models/UserModel';
import { Post, User as UserType, FirestoreTimestamp } from '@/app/types/database'; // Import necessary types

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
}));

// Mock user service
jest.mock('@/app/services/userService', () => ({
  getUserProfile: jest.fn(),
  getUserCommunityRole: jest.fn(),
  getUserCommunityPosts: jest.fn(),
}));

// Mock UserModel with isVerified method
const mockUserModel = (id: string, firstName: string, isVerified: boolean) => ({
  id,
  firstName,
  isVerified: jest.fn().mockResolvedValue(isVerified),
  // Add other user properties if needed by MainNavbar mock
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
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, className, onClick, asChild, ...props }: any) => {
    if (asChild) {
      return <div className={className} {...props}>{children}</div>; // Render children (Link)
    }
    return (
      <button className={className} onClick={onClick} {...props}>
        {children}
      </button>
    );
  },
}));

// Mock shared PostCard component
jest.mock('@/components/community/post-card', () => ({
  PostCard: ({ post, communityId, userVote, refreshPosts }: any) => (
    <div data-testid={`post-card-${post.id}`}>
      PostCard for "{post.title}" in {communityId}
    </div>
  ),
}));


// Mock icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeftIcon</span>,
  Mail: () => <span data-testid="mail-icon">MailIcon</span>,
  Calendar: () => <span data-testid="calendar-icon">CalendarIcon</span>,
  MessageSquare: () => <span data-testid="message-square-icon">MessageSquareIcon</span>,
  User: () => <span data-testid="user-icon">UserIcon</span>,
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock the formatDate function used in the component to control its output
const mockFormatDate = jest.fn();
// Assume a helper or utility for formatting dates exists or mock the inline function
// For simplicity, we'll mock the effect of the inline function's output in tests directly
// If formatDate was in a separate module, we would mock that module.
// Since it's inline, we'll just verify its *usage* with expected mock data timestamps.


describe('UserProfilePage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockRouter = { push: mockPush, back: mockBack };
  const mockCurrentUser = mockUserModel('current-user-id', 'Current', true);
  const mockCommunityId = 'community-id-abc';
  const mockProfileUserId = 'profile-user-id-123';

  const mockCommunity = {
    id: mockCommunityId,
    name: 'Test Community',
    // Add other community properties as needed
  };

  const mockProfileUser: UserType = {
    id: mockProfileUserId,
    email: 'profile@example.com',
    firstName: 'Profile',
    lastName: 'User',
    phoneNumber: '555-0201',
    birthDate: { seconds: 0, nanoseconds: 0 } as FirestoreTimestamp, // Mock Timestamp
    bio: 'This is a test bio.',
    profilePhotoUrl: 'https://example.com/photos/profile.jpg',
    verification: {
      status: 'verified',
      method: 'document',
      documentUrls: [],
      verificationDate: { seconds: 0, nanoseconds: 0 } as FirestoreTimestamp,
    },
    createdAt: { seconds: 1678886400, nanoseconds: 0 } as FirestoreTimestamp, // Mock Timestamp (Mar 15, 2023)
    lastLogin: { seconds: 0, nanoseconds: 0 } as FirestoreTimestamp, // Mock Timestamp
    accountStatus: 'active',
  };

  const mockUserRole = {
     userId: mockProfileUserId,
     communityId: mockCommunityId,
     title: 'Community Moderator',
     fullName: 'Profile User',
     permissions: { canPin: true, canArchive: true, canPostEmergency: true, canModerate: true },
     badge: { emoji: '🛡️', color: '#4CAF50' },
     assignedAt: { seconds: 0, nanoseconds: 0 } as FirestoreTimestamp,
     roleDetails: { // Add roleDetails to match component usage
        title: 'Community Moderator',
        displayName: 'Moderator',
        badge: { iconUrl: '🛡️', color: '#4CAF50' }
     }
  };

  const mockUserPosts: Post[] = [
    {
      id: 'post-1',
      authorId: mockProfileUserId,
      communityId: mockCommunityId,
      title: 'First Post',
      content: 'Content of the first post.',
      categoryTag: 'General',
      geographicTag: 'Area A',
      mediaUrls: [],
      stats: { upvotes: 5, downvotes: 0, commentCount: 2 },
      author: { name: 'Profile User', role: 'Member', badgeUrl: '' },
      status: 'active',
      isEmergency: false,
      createdAt: { seconds: 1678886400, nanoseconds: 0 } as FirestoreTimestamp,
    },
    {
      id: 'post-2',
      authorId: mockProfileUserId,
      communityId: mockCommunityId,
      title: 'Second Post',
      content: 'Content of the second post.',
      categoryTag: 'Events',
      geographicTag: 'Area B',
      mediaUrls: [],
      stats: { upvotes: 10, downvotes: 1, commentCount: 5 },
      author: { name: 'Profile User', role: 'Member', badgeUrl: '' },
      status: 'active',
      isEmergency: false,
      createdAt: { seconds: 1678886400, nanoseconds: 0 } as FirestoreTimestamp,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: mockCommunityId, userId: mockProfileUserId });
    (getCurrentUser as jest.Mock).mockResolvedValue(mockCurrentUser);
    (checkCommunityMembership as jest.Mock).mockResolvedValue(true); // Default: User is a member
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser);
    (getUserCommunityRole as jest.Mock).mockResolvedValue(null); // Default: No role
    (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // Default: No posts

    // Mock the Date.toLocaleDateString to control formatDate output in tests
    jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('3/15/2023');
  });

  afterEach(() => {
      jest.restoreAllMocks(); // Restore Date.prototype mock
  });

  it('shows loading spinner and text while fetching initial data (current user, profile)', async () => {
      // Simulate initial loading of current user data
      (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));

      await act(async () => {
        render(<UserProfilePage />);
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
      expect(screen.queryByText(`Profile User`)).not.toBeInTheDocument();

       // Simulate current user data loading, but profile data pending
      (getCurrentUser as jest.Mock).mockResolvedValue(mockCurrentUser);
      (getUserProfile as jest.Mock).mockImplementation(() => new Promise(() => {}));

       await act(async () => {
         render(<UserProfilePage />);
       });

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument(); // Still loading profile
      });

    }, 15000); // Increased timeout

  it('redirects to login if current user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<UserProfilePage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects to authenticate-person if current user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-id-unverified', 'Unverified', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    await act(async () => {
      render(<UserProfilePage />);
    });
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('redirects to access denied page if current user is not a member of the community', async () => {
    (checkCommunityMembership as jest.Mock).mockResolvedValue(false); // User is NOT a member
    await act(async () => {
      render(<UserProfilePage />);
    });
    await waitFor(() => {
      expect(checkCommunityMembership).toHaveBeenCalledWith(mockCurrentUser.id, mockCommunityId);
      expect(mockPush).toHaveBeenCalledWith(`/communities/access-denied?community=${mockCommunityId}`);
    });
  });

  it('renders user profile when authenticated, verified, and a member, and data is loaded', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getUserCommunityPosts as jest.Mock).mockResolvedValue(mockUserPosts); // Load with posts

    await act(async () => {
      render(<UserProfilePage />);
    });

    await waitFor(() => {
      // Check profile header
      expect(screen.getByText(`${mockProfileUser.firstName} ${mockProfileUser.lastName}`)).toBeInTheDocument();
      expect(screen.getByAltText(`${mockProfileUser.firstName} ${mockProfileUser.lastName}`)).toHaveAttribute('src', mockProfileUser.profilePhotoUrl);
      expect(screen.getByText(mockProfileUser.email)).toBeInTheDocument();
      expect(screen.getByText(`Member since 3/15/2023`)).toBeInTheDocument(); // Uses mocked formatDate output

      // Check bio section
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText(mockProfileUser.bio)).toBeInTheDocument();

      // Check recent posts section
      expect(screen.getByText('Recent Posts')).toBeInTheDocument();
      expect(screen.getByTestId(`post-card-${mockUserPosts[0].id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`post-card-${mockUserPosts[1].id}`)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'View All Posts' })).toHaveAttribute('href', `/communities/${mockCommunityId}?author=${mockProfileUserId}`);

      // Check community role section (should not be present by default mock)
      expect(screen.queryByText('Community Role')).not.toBeInTheDocument();

      // Check Navbar and Footer
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Current');
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check back button and breadcrumbs
      expect(screen.getByRole('button', { name: 'ArrowLeftIcon Back' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: 'Communities' })).toHaveAttribute('href', '/communities');
      expect(screen.getByRole('link', { name: mockCommunity.name })).toHaveAttribute('href', `/communities/${mockCommunityId}`);
      expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', `/communities/${mockCommunityId}/users`);
      expect(screen.getByText(`${mockProfileUser.firstName} ${mockProfileUser.lastName}`)).toBeInTheDocument();
    });
  });

   it('renders default profile icon if profilePhotoUrl is missing', async () => {
      const userWithoutPhoto = { ...mockProfileUser, profilePhotoUrl: '' };
      (getUserProfile as jest.Mock).mockResolvedValue(userWithoutPhoto);
      (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
      (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // No posts

      await act(async () => {
        render(<UserProfilePage />);
      });

      await waitFor(() => {
         expect(screen.getByTestId('user-icon')).toBeInTheDocument();
         expect(screen.queryByAltText(`${userWithoutPhoto.firstName} ${userWithoutPhoto.lastName}`)).not.toBeInTheDocument();
      });
   });


  it('renders "No bio available" if bio is missing', async () => {
    const userWithoutBio = { ...mockProfileUser, bio: '' };
    (getUserProfile as jest.Mock).mockResolvedValue(userWithoutBio);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // No posts

    await act(async () => {
      render(<UserProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('No bio available')).toBeInTheDocument();
    });
  });


  it('renders "No recent posts" message when user has no posts', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // No posts

    await act(async () => {
      render(<UserProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText(`${mockProfileUser.firstName} hasn't posted anything in this community yet.`)).toBeInTheDocument();
      expect(screen.queryByTestId('post-card-post-1')).not.toBeInTheDocument(); // No post cards
      expect(screen.queryByRole('link', { name: 'View All Posts' })).not.toBeInTheDocument(); // No view all button
    });
  });

  it('renders community role section if user has a role', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getUserCommunityRole as jest.Mock).mockResolvedValue(mockUserRole); // User has a role
    (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // No posts

    await act(async () => {
      render(<UserProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Community Role')).toBeInTheDocument();
      expect(screen.getByText(mockUserRole.roleDetails.title)).toBeInTheDocument();
      expect(screen.getByText(mockUserRole.roleDetails.displayName)).toBeInTheDocument();
      expect(screen.getByText('This member has special responsibilities in the community.')).toBeInTheDocument();
      // Check badge icon and color (mocked as text span and style)
      expect(screen.getByText(mockUserRole.roleDetails.badge.iconUrl)).toBeInTheDocument();
      // Checking style is difficult with mocks, rely on the text content for icon representation
    });
  });

   it('does not render community role section if user has no role', async () => {
      (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser);
      (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
      (getUserCommunityRole as jest.Mock).mockResolvedValue(null); // User has NO role
      (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // No posts

      await act(async () => {
        render(<UserProfilePage />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Community Role')).not.toBeInTheDocument();
      });
   });


  // Test error handling
   it('displays error message if fetching profile data fails', async () => {
     const consoleErrorSpy = jest.spyOn(console, 'error');
     consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

     (getUserProfile as jest.Mock).mockRejectedValue(new Error('Failed to fetch profile'));
     (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity); // Community data succeeds
     (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // Posts succeed or are not reached

     await act(async () => {
       render(<UserProfilePage />);
     });

     await waitFor(() => {
        // Check that loading state is gone
       expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
       // Check for the error message display
       expect(screen.getByText('Error')).toBeInTheDocument();
       expect(screen.getByText('Error loading user profile. Please try again.')).toBeInTheDocument();
       // Check that an error was logged
       expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading data:", expect.any(Error));
       // Navbar and Footer should still render
       expect(screen.getByTestId('main-navbar')).toBeInTheDocument();
       expect(screen.getByTestId('footer')).toBeInTheDocument();
     });

     consoleErrorSpy.mockRestore(); // Restore console.error
   });

    it('displays error message if fetching community details fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

      (getCommunityById as jest.Mock).mockRejectedValue(new Error('Failed to fetch community'));
      (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser); // Profile succeeds
      (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // Posts succeed or are not reached

      await act(async () => {
        render(<UserProfilePage />);
      });

      await waitFor(() => {
         // Check that loading state is gone
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        // Check for the error message display
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Error loading user profile. Please try again.')).toBeInTheDocument();
        // Check that an error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading data:", expect.any(Error));
      });

      consoleErrorSpy.mockRestore(); // Restore console.error
    });

    it('displays error message if fetching user role fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

      (getUserCommunityRole as jest.Mock).mockRejectedValue(new Error('Failed to fetch role'));
      (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser); // Profile succeeds
      (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity); // Community succeeds
      (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // Posts succeed or are not reached

      await act(async () => {
        render(<UserProfilePage />);
      });

      await waitFor(() => {
         // Check that loading state is gone
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        // Check for the error message display (it's the same generic error message)
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Error loading user profile. Please try again.')).toBeInTheDocument();
        // Check that an error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading data:", expect.any(Error));
        // Profile details should still render even if role fetch fails
         expect(screen.getByText(`${mockProfileUser.firstName} ${mockProfileUser.lastName}`)).toBeInTheDocument();
         expect(screen.queryByText('Community Role')).not.toBeInTheDocument(); // Role section should not appear on error
      });

      consoleErrorSpy.mockRestore(); // Restore console.error
    });

     it('displays error message if fetching user posts fails', async () => {
       const consoleErrorSpy = jest.spyOn(console, 'error');
       consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

       (getUserCommunityPosts as jest.Mock).mockRejectedValue(new Error('Failed to fetch posts'));
       (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser); // Profile succeeds
       (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity); // Community succeeds
       (getUserCommunityRole as jest.Mock).mockResolvedValue(null); // Role succeeds (returns null)

       await act(async () => {
         render(<UserProfilePage />);
       });

       await waitFor(() => {
          // Check that loading state is gone
         expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
         // Check for the error message display (it's the same generic error message)
         expect(screen.getByText('Error')).toBeInTheDocument();
         expect(screen.getByText('Error loading user profile. Please try again.')).toBeInTheDocument();
         // Check that an error was logged
         expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading data:", expect.any(Error));
         // Profile details should still render even if posts fetch fails
          expect(screen.getByText(`${mockProfileUser.firstName} ${mockProfileUser.lastName}`)).toBeInTheDocument();
          expect(screen.queryByText('Recent Posts')).not.toBeInTheDocument(); // Post section might not render on error, or show error within section
          // Checking the code, the error is caught higher up and sets the main error state,
          // so the entire main content is replaced by the error card.
       });

       consoleErrorSpy.mockRestore(); // Restore console.error
     });


  // Test back button functionality
  it('calls router.back() when back button is clicked', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue(mockProfileUser);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getUserCommunityPosts as jest.Mock).mockResolvedValue([]); // No posts

    await act(async () => {
      render(<UserProfilePage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`${mockProfileUser.firstName} ${mockProfileUser.lastName}`)).toBeInTheDocument();
     });

    const backButton = screen.getByRole('button', { name: 'ArrowLeftIcon Back' });
    await act(async () => {
      await userEvent.click(backButton);
    });

    expect(mockBack).toHaveBeenCalled();
  });
});