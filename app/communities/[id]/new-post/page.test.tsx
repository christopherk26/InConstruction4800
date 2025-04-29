// app/communities/[id]/new-post/page.test.tsx

import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import NewPostPage from './page'; // Assuming default export
import { getCurrentUser } from '@/app/services/authService';
import {
  getCommunityById,
  checkCommunityMembership,
  getCommunityCategories, // Mocked but likely not directly asserted on
  formatCategoryName,     // Mocked but likely not directly asserted on
  getUserCommunities,
  getUserCommunitySelection,
  setUserCommunitySelection
} from '@/app/services/communityService';
import { checkUserPermission, getCommunityUsers } from '@/app/services/userService'; // Added getCommunityUsers
import { createPost } from '@/app/services/postService';
import { createNotificationsForCommunity } from '@/app/services/notificationService'; // Added
import { UserModel } from '@/app/models/UserModel';
import { storage } from '@/lib/firebase-client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from "firebase/firestore"; // Added

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
  getCommunityCategories: jest.fn(() => [ // Provide mock categories
    'generalDiscussion', 'safetyAndCrime', 'communityEvents', 'officialEmergencyAlerts'
    // Add other categories as needed
]) as jest.MockedFunction<any>,
formatCategoryName: jest.fn((name: string): string => name.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())) as jest.MockedFunction<(name: string) => string>, // Simple formatter mock
  getUserCommunities: jest.fn(),
  getUserCommunitySelection: jest.fn(),
  setUserCommunitySelection: jest.fn(),
}));

// Mock user service
jest.mock('@/app/services/userService', () => ({
  checkUserPermission: jest.fn(),
  getCommunityUsers: jest.fn(), // Mock this
}));

// Mock post service
jest.mock('@/app/services/postService', () => ({
  createPost: jest.fn(),
}));

// Mock notification service
jest.mock('@/app/services/notificationService', () => ({
  createNotificationsForCommunity: jest.fn(),
}));

// Mock Firebase Storage & Firestore Timestamp
jest.mock('@/lib/firebase-client', () => ({
  storage: {},
}));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
    Timestamp: {
        fromDate: jest.fn((date) => ({
            seconds: Math.floor(date.getTime() / 1000),
            nanoseconds: (date.getTime() % 1000) * 1e6,
            toDate: () => date, // Mock toDate if needed elsewhere
        })),
    }
}));


// Mock UserModel (using the 'unknown' assertion approach)
const mockUserModel = (
  id: string,
  firstName: string,
  isVerifiedValue: boolean,
  lastName: string = 'User',
  email: string = 'test@example.com',
  profilePhotoUrl: string = 'https://example.com/photo.jpg'
): UserModel => { // Return type can be just UserModel if UserType properties are included
  const mockData = {
    id,
    email,
    firstName,
    lastName,
    profilePhotoUrl,
    // Add other UserType properties if needed by the component
    phoneNumber: '555-0000',
    birthDate: { seconds: 0, nanoseconds: 0 },
    bio: '',
    verification: {
      status: isVerifiedValue ? 'verified' : 'pending',
      method: 'mock',
      documentUrls: [],
      verificationDate: { seconds: 0, nanoseconds: 0 },
    },
    createdAt: { seconds: 0, nanoseconds: 0 },
    lastLogin: { seconds: 0, nanoseconds: 0 },
    accountStatus: 'active',
    isAdmin: false,
    // Mock methods
    isVerified: jest.fn().mockResolvedValue(isVerifiedValue),
    // Mock other methods if the NewPostPage component calls them
  };
  return mockData as unknown as UserModel;
};


// Mock UI components (Simplified)
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
  Button: ({ children, onClick, disabled, variant, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} type={type || 'button'} {...props}>
      {children}
    </button>
  ),
}));
jest.mock('@/components/ui/input', () => ({
  Input: ({ id, placeholder, value, onChange, disabled, required, rows, ...props }: any) => {
    // Use textarea for rows prop, otherwise input
    const InputElement = rows ? 'textarea' : 'input';
    return (
      <InputElement
        id={id}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        required={required}
        rows={rows} // Only applies to textarea
        data-testid={id || placeholder} // Use id or placeholder for testid
        {...props}
      />
    );
  },
}));
jest.mock('@/components/ui/textarea', () => ({ // Keep Textarea separate if needed
  Textarea: ({ id, placeholder, value, onChange, disabled, required, rows, ...props }: any) => (
    <textarea
      id={id}
      placeholder={placeholder}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      required={required}
      rows={rows}
      data-testid={id || placeholder}
      {...props}
    />
  ),
}));
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange(e.target.value)} disabled={disabled}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, id }: any) => <div data-testid={`${id}-trigger`}>{children}</div>, // Mock trigger
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>, // Mock value display
  SelectContent: ({ children }: any) => <div>{children}</div>, // Mock content wrapper
  SelectItem: ({ children, value, disabled }: any) => <option value={value} disabled={disabled}>{children}</option>, // Use actual option for select mock
}));
jest.mock('@/components/ui/label', () => ({
  Label: ({ htmlFor, children }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));
jest.mock('@/components/ui/switch', () => ({
  Switch: ({ id, checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      role="switch"
    />
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span>ArrowLeft</span>,
  Image: () => <span>ImageIcon</span>,
  X: () => <span>XIcon</span>,
  AlertTriangle: () => <span>AlertTriangleIcon</span>,
}));

// Mock Link
jest.mock('next/link', () => ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>);

// Mock URL object methods
Object.defineProperty(global.URL, 'createObjectURL', { value: jest.fn(() => 'mock-object-url'), writable: true });
Object.defineProperty(global.URL, 'revokeObjectURL', { value: jest.fn(), writable: true });

// --- Test Suite ---
describe('NewPostPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn(); // Assuming you might add a back button
  const mockUser = mockUserModel('user-id-123', 'Test', true, 'User');
  const mockCommunity1 = { id: 'community-id-abc', name: 'Test Community Alpha' };
  const mockCommunity2 = { id: 'community-id-xyz', name: 'Test Community Beta' };
  const mockUserCommunities = [mockCommunity1, mockCommunity2];
  const mockCreatedPost = { id: 'new-post-456' }; // Mock response from createPost

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (useParams as jest.Mock).mockReturnValue({ id: mockCommunity1.id }); // Default to URL specifying community 1

    // Default successful mocks
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserCommunities as jest.Mock).mockResolvedValue(mockUserCommunities);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity1);
    (checkCommunityMembership as jest.Mock).mockResolvedValue(true);
    (checkUserPermission as jest.Mock).mockResolvedValue(false); // Default: No emergency post permission
    (getUserCommunitySelection as jest.Mock).mockReturnValue(null); // Default: No stored selection
    (createPost as jest.Mock).mockResolvedValue(mockCreatedPost);
    (uploadBytes as jest.Mock).mockResolvedValue({});
    (getDownloadURL as jest.Mock).mockResolvedValue('mock-download-url');
    (getCommunityUsers as jest.Mock).mockResolvedValue([{ id: 'other-user-1' }]); // Mock some other users for notifications
    (createNotificationsForCommunity as jest.Mock).mockResolvedValue(undefined);
  });

  it('should show loading state initially', () => {
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {})); // Pending promise
    render(<NewPostPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    render(<NewPostPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('should redirect to authenticate-person if user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-id-123', 'Test', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    render(<NewPostPage />);
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

   it('should display "No Communities" state if user has no communities', async () => {
    (getUserCommunities as jest.Mock).mockResolvedValue([]);
    render(<NewPostPage />);
    await waitFor(() => {
      expect(screen.getByText('No Communities')).toBeInTheDocument();
      expect(screen.getByText(/You need to join a community/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Join a Community' })).toHaveAttribute('href', '/communities/apply');
    });
   });

  it('should load and display the form with the community from URL', async () => {
    render(<NewPostPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create New Post' })).toBeInTheDocument();
      // Check if the correct community is selected in the dropdown
      expect(screen.getByTestId('select')).toHaveValue(mockCommunity1.id);
      expect(screen.getByLabelText('Post Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Post Content')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
    });
    // Check permissions loaded (default false for emergency)
    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    const emergencyOption = within(categorySelect).getByRole('option', { name: /official emergency alerts/i }) as HTMLOptionElement;
    expect(emergencyOption.disabled).toBe(true); // Should be disabled by default mock
  });

  it('should allow changing the selected community', async () => {
    // Mock return value for the second community when selected
    (getCommunityById as jest.Mock).mockResolvedValueOnce(mockCommunity1).mockResolvedValueOnce(mockCommunity2);
    (checkUserPermission as jest.Mock)
        .mockResolvedValueOnce(false) // Permission for community 1
        .mockResolvedValueOnce(true); // Permission for community 2

    render(<NewPostPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('select')).toHaveValue(mockCommunity1.id);
    });

    const communitySelect = screen.getByTestId('select');

    // Change selection to community 2
    await act(async () => {
      fireEvent.change(communitySelect, { target: { value: mockCommunity2.id } });
    });

    // Wait for details of community 2 to load
    await waitFor(() => {
      // Verify selection changed
      expect(communitySelect).toHaveValue(mockCommunity2.id);
      // Verify localStorage was updated
      expect(setUserCommunitySelection).toHaveBeenCalledWith(mockUser.id, mockCommunity2.id);
       // Check permissions for community 2 (mocked as true)
      const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
      const emergencyOption = within(categorySelect).getByRole('option', { name: /official emergency alerts/i }) as HTMLOptionElement;
      expect(emergencyOption.disabled).toBe(false); // Should be enabled now
    });
  });

  it('should allow typing in title and content', async () => {
    render(<NewPostPage />);
    await waitFor(() => {
        expect(screen.getByLabelText('Post Title')).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText('Post Title');
    const contentInput = screen.getByLabelText('Post Content'); // Using the updated Input mock

    await act(async () => {
      await userEvent.type(titleInput, 'My Test Post');
      await userEvent.type(contentInput, 'This is the post content.');
    });

    expect(titleInput).toHaveValue('My Test Post');
    expect(contentInput).toHaveValue('This is the post content.');
  });

  it('should allow selecting a category', async () => {
     render(<NewPostPage />);
     await waitFor(() => {
         expect(screen.getByLabelText('Category')).toBeInTheDocument();
     });

     const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
     expect(categorySelect).toHaveValue('generalDiscussion'); // Default

     await act(async () => {
       fireEvent.change(categorySelect, { target: { value: 'communityEvents' } });
     });

     expect(categorySelect).toHaveValue('communityEvents');
   });

  // Basic test for successful submission (happy path)
  it('should submit the form successfully and redirect', async () => {
    render(<NewPostPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Post Title')).toBeInTheDocument();
    });

    // Fill required fields
    const titleInput = screen.getByLabelText('Post Title');
    const contentInput = screen.getByLabelText('Post Content');
    await act(async () => {
      await userEvent.type(titleInput, 'Submit Test');
      await userEvent.type(contentInput, 'Submitting content.');
    });

    const submitButton = screen.getByRole('button', { name: 'Submit Post' });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    // Assertions
    await waitFor(() => {
      // Check if createPost was called
      expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Submit Test',
        content: 'Submitting content.',
        communityId: mockCommunity1.id, // Should be the initially selected community
        authorId: mockUser.id,
        categoryTag: 'generalDiscussion', // Default category
        isEmergency: false,
      }));

      // Check for success message
      expect(screen.getByText(/Post created successfully! Redirecting.../)).toBeInTheDocument();
    });

    // Check for redirect (use fake timers)
    jest.useFakeTimers();
    act(() => {
        jest.advanceTimersByTime(1500); // Match the setTimeout delay in component
    });
    expect(mockPush).toHaveBeenCalledWith(`/communities/${mockCommunity1.id}/posts/${mockCreatedPost.id}`);
    jest.useRealTimers();

  }, 10000); // Increase timeout if needed

   it('should show validation error if title or content is missing', async () => {
     render(<NewPostPage />);
     await waitFor(() => {
       expect(screen.getByRole('button', { name: 'Submit Post' })).toBeInTheDocument();
     });

     const submitButton = screen.getByRole('button', { name: 'Submit Post' });
     await act(async () => {
       await userEvent.click(submitButton);
     });

     await waitFor(() => {
       expect(screen.getByText('Please enter a title for your post')).toBeInTheDocument();
       expect(createPost).not.toHaveBeenCalled();
     });

      const titleInput = screen.getByLabelText('Post Title');
      await act(async () => {
         await userEvent.type(titleInput, 'A Title');
         await userEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Please enter a title for your post')).not.toBeInTheDocument();
        expect(screen.getByText('Please enter content for your post')).toBeInTheDocument();
        expect(createPost).not.toHaveBeenCalled();
      });
   });


    // Example test for error during post creation
   it('should display error message if post creation fails', async () => {
       const creationError = 'Failed to save post data';
       (createPost as jest.Mock).mockRejectedValue(new Error(creationError));

       render(<NewPostPage />);
       await waitFor(() => {
           expect(screen.getByLabelText('Post Title')).toBeInTheDocument();
       });

       // Fill required fields
       const titleInput = screen.getByLabelText('Post Title');
       const contentInput = screen.getByLabelText('Post Content');
       await act(async () => {
           await userEvent.type(titleInput, 'Error Test');
           await userEvent.type(contentInput, 'This will fail.');
       });

       const submitButton = screen.getByRole('button', { name: 'Submit Post' });
       await act(async () => {
           await userEvent.click(submitButton);
       });

       await waitFor(() => {
           expect(createPost).toHaveBeenCalled();
           // Check for error message
           expect(screen.getByText(/Failed to create post or send notifications. Please try again./)).toBeInTheDocument();
           // Check button is enabled again
           expect(submitButton).not.toBeDisabled();
           // No success message
           expect(screen.queryByText(/Post created successfully!/)).not.toBeInTheDocument();
           // No redirect
           expect(mockPush).not.toHaveBeenCalled();
       });
   });

   // Add more tests as needed for file handling, notifications, specific category logic, etc.

});