//app/communities/[id]/users/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import CommunityUsersPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getCommunityById, checkCommunityMembership } from '@/app/services/communityService';
import { getCommunityUsers } from '@/app/services/userService';
import { UserModel } from '@/app/models/UserModel';
import { User as UserType } from "@/app/types/database"; // Import the UserType

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
  getCommunityUsers: jest.fn(),
}));

// Mock UserModel with isVerified method
const mockUserModel = (id: string, firstName: string, isVerified: boolean) => ({
  id,
  firstName,
  isVerified: jest.fn().mockResolvedValue(isVerified),
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
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, className, onClick, ...props }: any) => (
    <button className={className} onClick={onClick} {...props}>
      {children}
    </button>
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

// Mock shared UserCard component
jest.mock('@/components/shared/UserCard', () => ({
  UserCard: ({ user, communityId }: any) => (
    <div data-testid={`user-card-${user.id}`}>
      UserCard for {user.firstName} {user.lastName} in {communityId}
    </div>
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeftIcon</span>,
  Search: () => <span data-testid="search-icon">SearchIcon</span>,
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});


describe('CommunityUsersPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockRouter = { push: mockPush, back: mockBack };
  const mockUser = mockUserModel('user-id-1', 'Current', true);
  const mockCommunityId = 'community-id-abc';
  const mockCommunity = {
    id: mockCommunityId,
    name: 'Test Community',
    // Add other community properties if needed
  };
  const mockCommunityUsers: UserType[] = [
    {
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      phoneNumber: '555-0101',
      birthDate: { seconds: 0, nanoseconds: 0 }, // Mock FirestoreTimestamp
      bio: 'Loves gardening',
      profilePhotoUrl: 'https://example.com/photos/alice.jpg',
      verification: {
        status: 'verified', // or 'pending', 'rejected'
        method: 'document',
        documentUrls: ['https://example.com/docs/alice_proof.pdf'],
        verificationDate: { seconds: 0, nanoseconds: 0 }, // Mock FirestoreTimestamp
      },
      createdAt: { seconds: 0, nanoseconds: 0 }, // Mock FirestoreTimestamp
      lastLogin: { seconds: 0, nanoseconds: 0 }, // Mock FirestoreTimestamp
      accountStatus: 'active', // or 'suspended', 'deactivated'
      isAdmin: false, // Optional field
    },
    {
      id: 'user-2',
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Johnson',
      phoneNumber: '555-0102',
      birthDate: { seconds: 0, nanoseconds: 0 },
      bio: 'Plays guitar',
      profilePhotoUrl: 'https://example.com/photos/bob.jpg',
      verification: {
        status: 'verified',
        method: 'document',
        documentUrls: ['https://example.com/docs/bob_proof.pdf'],
        verificationDate: { seconds: 0, nanoseconds: 0 },
      },
      createdAt: { seconds: 0, nanoseconds: 0 },
      lastLogin: { seconds: 0, nanoseconds: 0 },
      accountStatus: 'active',
      isAdmin: false,
    },
    {
      id: 'user-3',
      email: 'charlie@example.com',
      firstName: 'Charlie',
      lastName: 'Brown',
      phoneNumber: '555-0103',
      birthDate: { seconds: 0, nanoseconds: 0 },
      bio: 'Enjoys hiking',
      profilePhotoUrl: 'https://example.com/photos/charlie.jpg',
      verification: {
        status: 'verified',
        method: 'document',
        documentUrls: ['https://example.com/docs/charlie_proof.pdf'],
        verificationDate: { seconds: 0, nanoseconds: 0 },
      },
      createdAt: { seconds: 0, nanoseconds: 0 },
      lastLogin: { seconds: 0, nanoseconds: 0 },
      accountStatus: 'active',
      isAdmin: false,
    },
    {
      id: 'user-4',
      email: 'david@other.com',
      firstName: 'David',
      lastName: 'Miller',
      phoneNumber: '555-0104',
      birthDate: { seconds: 0, nanoseconds: 0 },
      bio: 'Tech enthusiast',
      profilePhotoUrl: 'https://example.com/photos/david.jpg',
      verification: {
        status: 'verified',
        method: 'document',
        documentUrls: ['https://example.com/docs/david_proof.pdf'],
        verificationDate: { seconds: 0, nanoseconds: 0 },
      },
      createdAt: { seconds: 0, nanoseconds: 0 },
      lastLogin: { seconds: 0, nanoseconds: 0 },
      accountStatus: 'active',
      isAdmin: false,
    },
  ];


  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: mockCommunityId });
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (checkCommunityMembership as jest.Mock).mockResolvedValue(true); // Default: User is a member
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (getCommunityUsers as jest.Mock).mockResolvedValue(mockCommunityUsers); // Default: Return mock users
  });

  it('shows loading spinner and text while fetching initial data (user, community, users)', async () => {
      // Simulate initial loading of user data
      (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));

      await act(async () => {
        render(<CommunityUsersPage />);
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
      expect(screen.queryByText(`Members of ${mockCommunity.name}`)).not.toBeInTheDocument();

       // Simulate user data loading, but community data pending
      (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
      (getCommunityById as jest.Mock).mockImplementation(() => new Promise(() => {}));

       await act(async () => {
         render(<CommunityUsersPage />);
       });

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });

       // Simulate community data loading, but users data pending
       (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
       (getCommunityUsers as jest.Mock).mockImplementation(() => new Promise(() => {}));

        await act(async () => {
          render(<CommunityUsersPage />);
        });

       await waitFor(() => {
         // Check that the members header is rendered but user cards are not
         expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
         expect(screen.queryByTestId('user-card-user-1')).not.toBeInTheDocument();
         // Check for the loading spinner specific to users
         expect(screen.getByText('Loading...')).toBeInTheDocument(); // This text is reused for user loading
       });


    }, 15000); // Increased timeout


  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<CommunityUsersPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects to authenticate-person if user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-id-unverified', 'Unverified', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    await act(async () => {
      render(<CommunityUsersPage />);
    });
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('redirects to access denied page if user is not a member of the community', async () => {
    (checkCommunityMembership as jest.Mock).mockResolvedValue(false); // User is NOT a member
    await act(async () => {
      render(<CommunityUsersPage />);
    });
    await waitFor(() => {
      expect(checkCommunityMembership).toHaveBeenCalledWith(mockUser.id, mockCommunityId);
      expect(mockPush).toHaveBeenCalledWith(`/communities/access-denied?community=${mockCommunityId}`);
    });
  });

  it('renders community users when authenticated, verified, and a member', async () => {
    await act(async () => {
      render(<CommunityUsersPage />);
    });
    await waitFor(() => {
      expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Current');
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check if all user cards are rendered
      expect(screen.getByTestId('user-card-user-1')).toBeInTheDocument();
      expect(screen.getByTestId('user-card-user-2')).toBeInTheDocument();
      expect(screen.getByTestId('user-card-user-3')).toBeInTheDocument();
      expect(screen.getByTestId('user-card-user-4')).toBeInTheDocument();

      // Check initial member count
      expect(screen.getByText(`${mockCommunityUsers.length} members`)).toBeInTheDocument();

      // Check back button and breadcrumbs
      expect(screen.getByRole('button', { name: 'ArrowLeftIcon Back' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: 'Communities' })).toHaveAttribute('href', '/communities');
      expect(screen.getByRole('link', { name: mockCommunity.name })).toHaveAttribute('href', `/communities/${mockCommunityId}`);
      expect(screen.getByText('Members')).toBeInTheDocument();
    });
  });

   it('renders no members found message when getCommunityUsers returns empty array', async () => {
    (getCommunityUsers as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      render(<CommunityUsersPage />);
    });
    await waitFor(() => {
      expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
      expect(screen.getByText('No members found in this community.')).toBeInTheDocument();
      expect(screen.queryByTestId('user-card-user-1')).not.toBeInTheDocument(); // No user cards should be rendered
       expect(screen.getByText('0 members')).toBeInTheDocument(); // Member count should be 0
    });
  });

  // Test search functionality
  it('filters users by name on search', async () => {
    await act(async () => {
      render(<CommunityUsersPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
     });

    const searchInput = screen.getByPlaceholderText('Search members by name or bio...');
    await act(async () => {
      await userEvent.type(searchInput, 'Alice');
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-card-user-1')).toBeInTheDocument();
      expect(screen.queryByTestId('user-card-user-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-card-user-3')).not.toBeInTheDocument();
       expect(screen.queryByTestId('user-card-user-4')).not.toBeInTheDocument();
      expect(screen.getByText('1 member')).toBeInTheDocument(); // Member count should update
    });
  });

   it('filters users by email on search', async () => {
     await act(async () => {
       render(<CommunityUsersPage />);
     });
      await waitFor(() => {
          expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
      });

     const searchInput = screen.getByPlaceholderText('Search members by name or bio...');
     await act(async () => {
       await userEvent.type(searchInput, 'other.com');
     });

     await waitFor(() => {
       expect(screen.queryByTestId('user-card-user-1')).not.toBeInTheDocument();
       expect(screen.queryByTestId('user-card-user-2')).not.toBeInTheDocument();
       expect(screen.queryByTestId('user-card-user-3')).not.toBeInTheDocument();
        expect(screen.getByTestId('user-card-user-4')).toBeInTheDocument();
       expect(screen.getByText('1 member')).toBeInTheDocument(); // Member count should update
     });
   });

    it('filters users by bio on search', async () => {
      await act(async () => {
        render(<CommunityUsersPage />);
      });
       await waitFor(() => {
           expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
       });

      const searchInput = screen.getByPlaceholderText('Search members by name or bio...');
      await act(async () => {
        await userEvent.type(searchInput, 'guitar');
      });

      await waitFor(() => {
        expect(screen.queryByTestId('user-card-user-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('user-card-user-2')).toBeInTheDocument();
        expect(screen.queryByTestId('user-card-user-3')).not.toBeInTheDocument();
         expect(screen.queryByTestId('user-card-user-4')).not.toBeInTheDocument();
        expect(screen.getByText('1 member')).toBeInTheDocument(); // Member count should update
      });
    });


  it('handles no search results', async () => {
    await act(async () => {
      render(<CommunityUsersPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
     });

    const searchInput = screen.getByPlaceholderText('Search members by name or bio...');
    await act(async () => {
      await userEvent.type(searchInput, 'nonexistent user');
    });

    await waitFor(() => {
      expect(screen.queryByTestId('user-card-user-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-card-user-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-card-user-3')).not.toBeInTheDocument();
       expect(screen.queryByTestId('user-card-user-4')).not.toBeInTheDocument();
      expect(screen.getByText('No members match your search criteria.')).toBeInTheDocument();
      expect(screen.getByText('0 members')).toBeInTheDocument(); // Member count should be 0
    });
  });

  it('clears search and shows all users when search query is cleared', async () => {
     await act(async () => {
       render(<CommunityUsersPage />);
     });
      await waitFor(() => {
          expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
      });

     const searchInput = screen.getByPlaceholderText('Search members by name or bio...');
     await act(async () => {
       await userEvent.type(searchInput, 'Alice');
     });

      await waitFor(() => {
       expect(screen.getByTestId('user-card-user-1')).toBeInTheDocument();
       expect(screen.queryByTestId('user-card-user-2')).not.toBeInTheDocument();
     });

     await act(async () => {
       await userEvent.clear(searchInput);
     });

     await waitFor(() => {
       // Check if all user cards are rendered again
       expect(screen.getByTestId('user-card-user-1')).toBeInTheDocument();
       expect(screen.getByTestId('user-card-user-2')).toBeInTheDocument();
       expect(screen.getByTestId('user-card-user-3')).toBeInTheDocument();
        expect(screen.getByTestId('user-card-user-4')).toBeInTheDocument();
       expect(screen.getByText(`${mockCommunityUsers.length} members`)).toBeInTheDocument(); // Member count should revert
     });
   });


  // Test error handling for fetching data
  it('displays error message if fetching user fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

    (getCurrentUser as jest.Mock).mockRejectedValue(new Error('Failed to fetch user'));

    await act(async () => {
      render(<CommunityUsersPage />);
    });

    await waitFor(() => {
       // Check that loading state is gone
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      // Check for the error message display
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Error loading community data. Please try again.')).toBeInTheDocument();
      // Check that an error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error checking access:", expect.any(Error));
       // Navbar and Footer might still render depending on state initialization on error
       expect(screen.queryByTestId('main-navbar')).toBeInTheDocument(); // Assuming navbar renders even without user object
       expect(screen.queryByTestId('footer')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore(); // Restore console.error
  });

   it('displays error message if checking membership fails', async () => {
     const consoleErrorSpy = jest.spyOn(console, 'error');
     consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

     (checkCommunityMembership as jest.Mock).mockRejectedValue(new Error('Failed to check membership'));

     await act(async () => {
       render(<CommunityUsersPage />);
     });

     await waitFor(() => {
        // Check that loading state is gone
       expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
       // Check for the error message display
       expect(screen.getByText('Error')).toBeInTheDocument();
       expect(screen.getByText('Error loading community data. Please try again.')).toBeInTheDocument();
       // Check that an error was logged
       expect(consoleErrorSpy).toHaveBeenCalledWith("Error checking access:", expect.any(Error));
     });

     consoleErrorSpy.mockRestore(); // Restore console.error
   });

   it('displays error message if fetching community details fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

      (getCommunityById as jest.Mock).mockRejectedValue(new Error('Failed to fetch community details'));

      await act(async () => {
        render(<CommunityUsersPage />);
      });

      await waitFor(() => {
         // Check that loading state is gone
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        // Check for the error message display
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Error loading community data. Please try again.')).toBeInTheDocument();
        // Check that an error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error checking access:", expect.any(Error));
      });

      consoleErrorSpy.mockRestore(); // Restore console.error
    });

    it('displays error message if fetching community users fails', async () => {
       const consoleErrorSpy = jest.spyOn(console, 'error');
       consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

       (getCommunityUsers as jest.Mock).mockRejectedValue(new Error('Failed to fetch users'));

       await act(async () => {
         render(<CommunityUsersPage />);
       });

       await waitFor(() => {
          // Check that loading state is gone
         expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
         // Check for the error message display
         expect(screen.getByText('Error')).toBeInTheDocument();
         expect(screen.getByText('Error loading community data. Please try again.')).toBeInTheDocument();
         // Check that an error was logged
         expect(consoleErrorSpy).toHaveBeenCalledWith("Error checking access:", expect.any(Error));
       });

       consoleErrorSpy.mockRestore(); // Restore console.error
     });


  // Test back button functionality
  it('calls router.back() when back button is clicked', async () => {
    await act(async () => {
      render(<CommunityUsersPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Members of ${mockCommunity.name}`)).toBeInTheDocument();
     });

    const backButton = screen.getByRole('button', { name: 'ArrowLeftIcon Back' });
    await act(async () => {
      await userEvent.click(backButton);
    });

    expect(mockBack).toHaveBeenCalled();
  });

});