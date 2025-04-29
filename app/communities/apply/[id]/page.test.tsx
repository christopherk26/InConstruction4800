// app/communities/apply/[id]/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import CommunityApplicationPage from './page'; // Correct import for default export
import { getCurrentUser } from '@/app/services/authService';
import { getCommunityById } from '@/app/services/communityService';
import { UserModel } from '@/app/models/UserModel';
import { httpsCallable } from "firebase/functions";
import { storage, functions } from "@/lib/firebase-client";
import { ref, uploadBytes } from "firebase/storage";
// Removed Suspense import as it's not used in the corrected tests
// import { Suspense } from 'react';


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
  // Also mock getAllCommunities and checkCommunityMembership if they were implicitly used,
  // but based on the component code, only getCommunityById is used here.
}));

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

// Mock Firebase Storage
jest.mock('@/lib/firebase-client', () => ({
  storage: {}, // Mock storage instance
  functions: {}, // Mock functions instance
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  // No need to mock getDownloadURL here as it's not used in this component
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
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, disabled, asChild, className, ...props }: any) => {
    if (asChild) {
      return <div {...props}>{children}</div>; // Render children (Link)
    }
    return <button {...props} disabled={disabled} className={className}>{children}</button>;
  },
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ id, placeholder, value, onChange, className, required, disabled, ...props }: any) => (
    <input
      type="text"
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      required={required}
      disabled={disabled}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ htmlFor, children }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ id, placeholder, value, onChange, className, rows, ...props }: any) => (
    <textarea
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      rows={rows}
      {...props}
    />
  ),
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
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeftIcon</span>,
  MapPin: () => <span data-testid="map-pin-icon">MapPinIcon</span>,
  Home: () => <span data-testid="home-icon">HomeIcon</span>,
  Upload: () => <span data-testid="upload-icon">UploadIcon</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircleIcon</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircleIcon</span>,
  Loader2: () => <span data-testid="loader-icon">LoaderIcon</span>, // Assuming loader icon might be used
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock URL.createObjectURL and revokeObjectURL using Object.defineProperty
Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn() as jest.Mock<(obj: Blob | MediaSource) => string>,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn() as jest.Mock<(url: string) => void>,
});

describe('CommunityApplicationPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockRouter = { push: mockPush, back: mockBack };
  const mockUser = mockUserModel('user-id-1', 'Test', true);
  const mockCommunity = {
    id: 'community-id-abc',
    name: 'Test Community',
    bio: 'A community for testing',
    location: { city: 'Testville', state: 'TS', zipCodes: ['12345', '12346'] },
    stats: { memberCount: 50 },
  };

  const mockApplyForCommunityFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: mockCommunity.id });
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getCommunityById as jest.Mock).mockResolvedValue(mockCommunity);
    (httpsCallable as jest.Mock).mockReturnValue(mockApplyForCommunityFunction);
    (ref as jest.Mock).mockReturnValue({}); // Mock storage ref
    (uploadBytes as jest.Mock).mockResolvedValue(undefined); // Mock upload success
    (global.URL.createObjectURL as jest.Mock).mockReturnValue('mocked-file-preview-url');
    (global.URL.revokeObjectURL as jest.Mock).mockClear();
  });

  // Test component's internal loading state
  it('shows loading spinner and text while fetching initial data', async () => {
    // Simulate the initial loading state by having getCurrentUser return a pending promise
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<CommunityApplicationPage />);
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
    expect(screen.queryByText('Apply to Join')).not.toBeInTheDocument();
  }, 10000); // Increased timeout

  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<CommunityApplicationPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects to authenticate-person if user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-id-unverified', 'Unverified', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    await act(async () => {
      render(<CommunityApplicationPage />);
    });
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('displays community not found message if community does not exist', async () => {
    (getCommunityById as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<CommunityApplicationPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Community not found')).toBeInTheDocument();
      expect(screen.getByText("We couldn't find the community you're looking for.")).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Browse Communities' })).toHaveAttribute('href', '/communities/browse');
    });
  });

  it('renders the application form when authenticated and verified', async () => {
    await act(async () => {
      render(<CommunityApplicationPage />);
    });
    await waitFor(() => {
      expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Test');
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check Community Info Card
      expect(screen.getByText(`About ${mockCommunity.name}`)).toBeInTheDocument();
      expect(screen.getByText(mockCommunity.bio)).toBeInTheDocument();
      expect(screen.getByText(`${mockCommunity.location.city}, ${mockCommunity.location.state}`)).toBeInTheDocument();
      expect(screen.getByText(`${mockCommunity.stats.memberCount}`)).toBeInTheDocument();

      // Check Address Information section
      expect(screen.getByText('Address Information')).toBeInTheDocument();
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument();
      expect(screen.getByLabelText('City')).toBeInTheDocument();
      expect(screen.getByLabelText('State')).toBeInTheDocument();
      expect(screen.getByLabelText('Zip Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Proof of Residence')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Share your reasons for joining this community...')).toBeInTheDocument();

      // Check Notification Preferences section
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByLabelText('Emergency Alerts')).toBeInTheDocument();
      expect(screen.getByLabelText('Push Notifications')).toBeInTheDocument();

      // Check submit button
      expect(screen.getByRole('button', { name: 'Submit Application' })).toBeInTheDocument();

      // Check back button and breadcrumbs
      expect(screen.getByRole('button', { name: 'ArrowLeftIcon Back' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: 'Browse Communities' })).toHaveAttribute('href', '/communities/browse');
      expect(screen.getByText(`${mockCommunity.name} Application`)).toBeInTheDocument();
    });
  });

  it('pre-fills city and state if provided by community data', async () => {
    await act(async () => {
      render(<CommunityApplicationPage />);
    });
    await waitFor(() => {
      expect(screen.getByLabelText('City')).toHaveValue(mockCommunity.location.city);
      expect(screen.getByLabelText('City')).toBeDisabled(); // Should be disabled if pre-filled
      expect(screen.getByLabelText('State')).toHaveValue(mockCommunity.location.state);
      expect(screen.getByLabelText('State')).toBeDisabled(); // Should be disabled if pre-filled
    });
  });

  it('allows changing city and state if NOT provided by community data', async () => {
     const communityWithoutLocation = {
      id: 'community-id-xyz',
      name: 'Community Without Location',
      bio: 'No location info',
      location: {}, // Empty location
      stats: { memberCount: 5 },
    };
    (getCommunityById as jest.Mock).mockResolvedValue(communityWithoutLocation);
    (useParams as jest.Mock).mockReturnValue({ id: communityWithoutLocation.id });

    await act(async () => {
      render(<CommunityApplicationPage />);
    });
    await waitFor(() => {
      expect(screen.getByLabelText('City')).toHaveValue(''); // Should be empty
      expect(screen.getByLabelText('City')).not.toBeDisabled(); // Should NOT be disabled
      expect(screen.getByLabelText('State')).toHaveValue(''); // Should be empty
      expect(screen.getByLabelText('State')).not.toBeDisabled(); // Should NOT be disabled
    });
     // Check if user can type
     await userEvent.type(screen.getByLabelText('City'), 'NewCity');
     expect(screen.getByLabelText('City')).toHaveValue('NewCity');
     await userEvent.type(screen.getByLabelText('State'), 'NS');
     expect(screen.getByLabelText('State')).toHaveValue('NS');
  });

  // Test file selection and preview
  it('allows selecting a valid file and shows preview', async () => {
    const file = new File(['dummy'], 'proof.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

    await act(async () => {
      render(<CommunityApplicationPage />);
    });
    await waitFor(() => {
        expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
    });

    // Find the hidden file input (assuming it's linked by label or has a data-testid)
    // Based on the code, it's linked by label 'residenceProof'
    const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');

    // Simulate clicking the custom upload area
    const uploadArea = screen.getByText('Upload proof of residence').closest('div'); // Assuming this div is clickable
     await act(async () => {
       await userEvent.click(uploadArea!); // Click the visible div
     });

    // Fire the change event on the hidden input
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });


    await waitFor(() => {
      expect(screen.getByAltText('Document preview')).toBeInTheDocument();
      expect(screen.getByAltText('Document preview')).toHaveAttribute('src', 'mocked-file-preview-url');
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(screen.queryByText(/file size must be less than 5mb/i)).not.toBeInTheDocument();
    });
  });

   it('shows error for file larger than 5MB', async () => {
    const file = new File(['dummy'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }); // 6MB

    await act(async () => {
      render(<CommunityApplicationPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
     });

    const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');
     const uploadArea = screen.getByText('Upload proof of residence').closest('div');
     await act(async () => {
       await userEvent.click(uploadArea!);
     });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('File size must be less than 5MB')).toBeInTheDocument();
      expect(screen.queryByAltText('Document preview')).not.toBeInTheDocument();
      expect(global.URL.createObjectURL).not.toHaveBeenCalled(); // No preview created on error
      expect(screen.getByText('Upload proof of residence')).toBeInTheDocument(); // Ensure original state is shown
    });
  });

  // Test form submission
  it('submits the form successfully and redirects', async () => {
    const file = new File(['dummy'], 'proof.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

    // Mock the Cloud Function call to simulate success
    mockApplyForCommunityFunction.mockResolvedValue({ data: { success: true, message: 'Application approved' } });

    await act(async () => {
      render(<CommunityApplicationPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
     });

    // Fill out the form
    await act(async () => {
      await userEvent.type(screen.getByLabelText('Street Address'), '456 Oak Ave');
      // City and State are pre-filled and disabled in this mock case
      await userEvent.type(screen.getByLabelText('Zip Code'), '12345');
      await userEvent.type(screen.getByPlaceholderText('Share your reasons for joining this community...'), 'I want to participate');

       // Select the file
      const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');
      const uploadArea = screen.getByText('Upload proof of residence').closest('div');
      await userEvent.click(uploadArea!);
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

     // Wait for file state update
    await waitFor(() => {
      expect(screen.getByAltText('Document preview')).toBeInTheDocument();
    });


    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Submit Application' });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    // Wait for submission state and success message
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Submitting...');
      expect(screen.getByText('Application Submitted Successfully')).toBeInTheDocument();
      expect(screen.getByText("Your application to join Test Community has been submitted. We'll notify you when it's approved.")).toBeInTheDocument();
    });

    // Check if Firebase Storage upload was called
    expect(ref).toHaveBeenCalledWith(storage, expect.stringContaining(`residence_proofs/${mockUser.id}/`));
    expect(uploadBytes).toHaveBeenCalledWith(expect.anything(), file); // Check with the file object

    // Check if Cloud Function was called with correct payload
    expect(httpsCallable).toHaveBeenCalledWith(functions, 'applyForCommunity');
    expect(mockApplyForCommunityFunction).toHaveBeenCalledWith({
      communityID: mockCommunity.id,
      userAddress: '456 Oak Ave', // Only street was typed
      userZip: '12345',
      docUrl: expect.stringContaining(`residence_proofs/${mockUser.id}/`), // Check for the storage path format
      fullAddress: {
        street: '456 Oak Ave',
        city: mockCommunity.location.city, // Should use pre-filled/disabled value
        state: mockCommunity.location.state, // Should use pre-filled/disabled value
        zipCode: '12345',
      },
      notificationPreferences: { // Should match default state
        emergencyAlerts: true,
        generalDiscussion: true,
        safetyAndCrime: true,
        governance: true,
        disasterAndFire: true,
        businesses: true,
        resourcesAndRecovery: true,
        communityEvents: true,
        pushNotifications: true,
      },
    });


    // Check for redirect after delay
    jest.useFakeTimers();
    await act(async () => {
        jest.advanceTimersByTime(3000);
    });
    expect(mockPush).toHaveBeenCalledWith('/communities');
    jest.useRealTimers();
  }, 20000); // Increased timeout for async operations

  it('handles Cloud Function returning pending review status', async () => {
     const file = new File(['dummy'], 'proof.png', { type: 'image/png' });
     Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

     // Mock the Cloud Function call to simulate pending review
     mockApplyForCommunityFunction.mockResolvedValue({ data: { success: false, message: 'Application is under review', membershipId: 'pending-id-123' } });

     await act(async () => {
       render(<CommunityApplicationPage />);
     });
     await waitFor(() => {
         expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
     });

     // Fill out the form
     await act(async () => {
       await userEvent.type(screen.getByLabelText('Street Address'), '456 Oak Ave');
       await userEvent.type(screen.getByLabelText('Zip Code'), '12345');
       const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');
       const uploadArea = screen.getByText('Upload proof of residence').closest('div');
       await userEvent.click(uploadArea!);
       fireEvent.change(fileInput, { target: { files: [file] } });
     });

      await waitFor(() => {
       expect(screen.getByAltText('Document preview')).toBeInTheDocument();
     });

     // Submit the form
     const submitButton = screen.getByRole('button', { name: 'Submit Application' });
     await act(async () => {
       await userEvent.click(submitButton);
     });

     // Wait for submission state and success/error messages
     await waitFor(() => {
       expect(submitButton).toBeDisabled();
       expect(submitButton).toHaveTextContent('Submitting...');
       expect(screen.getByText('Application Submitted Successfully')).toBeInTheDocument(); // Success state
       expect(screen.getByText("Your application to join Test Community has been submitted. Application is under review")).toBeInTheDocument(); // Specific message from CF
     });

     // Check if Cloud Function was called
     expect(mockApplyForCommunityFunction).toHaveBeenCalled();


     // Check for redirect after delay
     jest.useFakeTimers();
     await act(async () => {
         jest.advanceTimersByTime(5000); // Redirect delay for pending is 5000ms
     });
     expect(mockPush).toHaveBeenCalledWith('/communities');
     jest.useRealTimers();
   }, 20000); // Increased timeout

   it('handles Cloud Function returning application failed status', async () => {
      const file = new File(['dummy'], 'proof.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

      // Mock the Cloud Function call to simulate failure
      mockApplyForCommunityFunction.mockResolvedValue({ data: { success: false, message: 'Invalid address provided' } });

      await act(async () => {
        render(<CommunityApplicationPage />);
      });
      await waitFor(() => {
          expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
      });

      // Fill out the form
      await act(async () => {
        await userEvent.type(screen.getByLabelText('Street Address'), 'Invalid Address');
        await userEvent.type(screen.getByLabelText('Zip Code'), '00000');
        const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');
        const uploadArea = screen.getByText('Upload proof of residence').closest('div');
        await userEvent.click(uploadArea!);
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

       await waitFor(() => {
        expect(screen.getByAltText('Document preview')).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Submit Application' });
      await act(async () => {
        await userEvent.click(submitButton);
      });

      // Wait for error message
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).toHaveTextContent('Submit Application'); // Button text reverts
        expect(screen.getByText('Application failed: Invalid address provided')).toBeInTheDocument(); // Specific message from CF
        expect(screen.queryByText('Application Submitted Successfully')).not.toBeInTheDocument(); // Success message should not be shown
      });

      // Check if Cloud Function was called
      expect(mockApplyForCommunityFunction).toHaveBeenCalled();
      // Ensure no redirect happened
      expect(mockPush).not.toHaveBeenCalledWith('/communities');

    }, 20000); // Increased timeout

  it('handles error during Firebase Storage upload', async () => {
    const file = new File(['dummy'], 'proof.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

    // Mock uploadBytes to simulate an error
    (uploadBytes as jest.Mock).mockRejectedValue(new Error('Storage upload failed'));

    await act(async () => {
      render(<CommunityApplicationPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
     });

    // Fill out the form
    await act(async () => {
      await userEvent.type(screen.getByLabelText('Street Address'), '456 Oak Ave');
      await userEvent.type(screen.getByLabelText('Zip Code'), '12345');
      const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');
       const uploadArea = screen.getByText('Upload proof of residence').closest('div');
       await userEvent.click(uploadArea!);
       fireEvent.change(fileInput, { target: { files: [file] } });
    });

     await waitFor(() => {
      expect(screen.getByAltText('Document preview')).toBeInTheDocument();
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Submit Application' });
    await act(async () => {
      await userEvent.click(submitButton);
    });

    // Wait for error message
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Submit Application'); // Button text reverts
      expect(screen.getByText('Failed to submit application: Storage upload failed')).toBeInTheDocument();
      expect(screen.queryByText('Application Submitted Successfully')).not.toBeInTheDocument();
    });

    // Check if uploadBytes was called
    expect(uploadBytes).toHaveBeenCalled();
    // Check that the Cloud Function was NOT called
    expect(mockApplyForCommunityFunction).not.toHaveBeenCalled();
    // Ensure no redirect happened
    expect(mockPush).not.toHaveBeenCalledWith('/communities');

  }, 20000); // Increased timeout

   it('handles error during Cloud Function call', async () => {
     const file = new File(['dummy'], 'proof.png', { type: 'image/png' });
     Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

     // Mock the Cloud Function call to simulate an error
     mockApplyForCommunityFunction.mockRejectedValue(new Error('Cloud Function error'));

     await act(async () => {
       render(<CommunityApplicationPage />);
     });
      await waitFor(() => {
          expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
      });

     // Fill out the form
     await act(async () => {
       await userEvent.type(screen.getByLabelText('Street Address'), '456 Oak Ave');
       await userEvent.type(screen.getByLabelText('Zip Code'), '12345');
       const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');
        const uploadArea = screen.getByText('Upload proof of residence').closest('div');
        await userEvent.click(uploadArea!);
        fireEvent.change(fileInput, { target: { files: [file] } });
     });

      await waitFor(() => {
       expect(screen.getByAltText('Document preview')).toBeInTheDocument();
     });

     // Submit the form
     const submitButton = screen.getByRole('button', { name: 'Submit Application' });
     await act(async () => {
       await userEvent.click(submitButton);
     });

     // Wait for error message
     await waitFor(() => {
       expect(submitButton).not.toBeDisabled();
       expect(submitButton).toHaveTextContent('Submit Application'); // Button text reverts
       expect(screen.getByText('Failed to submit application: Cloud Function error')).toBeInTheDocument();
       expect(screen.queryByText('Application Submitted Successfully')).not.toBeInTheDocument();
     });

     // Check if Cloud Function was called
     expect(mockApplyForCommunityFunction).toHaveBeenCalled();
     // Ensure no redirect happened
     expect(mockPush).not.toHaveBeenCalledWith('/communities');
   }, 20000); // Increased timeout


  // Test form validation
  it('shows error if required address fields are missing on submit', async () => {
     const file = new File(['dummy'], 'proof.png', { type: 'image/png' });
     Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB

     await act(async () => {
       render(<CommunityApplicationPage />);
     });
      await waitFor(() => {
          expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
      });

     // Select the file (but don't fill address fields)
     const fileInput: HTMLInputElement = screen.getByLabelText('Proof of Residence');
     const uploadArea = screen.getByText('Upload proof of residence').closest('div');
     await act(async () => {
       await userEvent.click(uploadArea!);
       fireEvent.change(fileInput, { target: { files: [file] } });
     });

      await waitFor(() => {
       expect(screen.getByAltText('Document preview')).toBeInTheDocument();
     });

     // Submit the form
     const submitButton = screen.getByRole('button', { name: 'Submit Application' });
     await act(async () => {
       await userEvent.click(submitButton);
     });

     // Wait for error message
     await waitFor(() => {
       expect(screen.getByText('Please fill in all address fields')).toBeInTheDocument();
       expect(mockApplyForCommunityFunction).not.toHaveBeenCalled(); // Cloud Function should not be called
       expect(uploadBytes).not.toHaveBeenCalled(); // Upload should not happen either
     });
  });

  it('shows error if proof of residence document is missing on submit', async () => {
     await act(async () => {
       render(<CommunityApplicationPage />);
     });
      await waitFor(() => {
          expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
      });

     // Fill out address fields (but don't select a file)
     await act(async () => {
       await userEvent.type(screen.getByLabelText('Street Address'), '456 Oak Ave');
       await userEvent.type(screen.getByLabelText('Zip Code'), '12345');
     });

     // Submit the form
     const submitButton = screen.getByRole('button', { name: 'Submit Application' });
     await act(async () => {
       await userEvent.click(submitButton);
     });

     // Wait for error message
     await waitFor(() => {
       expect(screen.getByText('Please upload proof of residence')).toBeInTheDocument();
       expect(mockApplyForCommunityFunction).not.toHaveBeenCalled(); // Cloud Function should not be called
       expect(uploadBytes).not.toHaveBeenCalled(); // Upload should not happen
     });
  });


  // Test zip code validation message
  it('displays zip code validation message if zip is not in community zip codes', async () => {
     await act(async () => {
       render(<CommunityApplicationPage />);
     });
      await waitFor(() => {
          expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
      });

     const zipInput = screen.getByLabelText('Zip Code');
     await act(async () => {
       await userEvent.type(zipInput, '99999'); // Zip not in mockCommunity.location.zipCodes
     });

     await waitFor(() => {
       expect(screen.getByText(/This zip code is not within the community's service area/)).toBeInTheDocument();
       expect(screen.getByText(`Common zip codes for this community are: ${mockCommunity.location.zipCodes.join(", ")}`)).toBeInTheDocument();
     });
  });

   it('does NOT display zip code validation message if zip is in community zip codes', async () => {
      await act(async () => {
        render(<CommunityApplicationPage />);
      });
       await waitFor(() => {
           expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
       });

      const zipInput = screen.getByLabelText('Zip Code');
      await act(async () => {
        await userEvent.type(zipInput, '12345'); // Zip IS in mockCommunity.location.zipCodes
      });

      // Wait for state update, but the message should not appear
      await waitFor(() => {
        expect(screen.queryByText(/This zip code is not within the community's service area/)).not.toBeInTheDocument();
      });
   });


  // Test back button functionality
  it('calls router.back() when back button is clicked', async () => {
    await act(async () => {
      render(<CommunityApplicationPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
     });

    const backButton = screen.getByRole('button', { name: 'ArrowLeftIcon Back' });
    await act(async () => {
      await userEvent.click(backButton);
    });

    expect(mockBack).toHaveBeenCalled();
  });

  // Test notification preference toggles
  it('allows toggling notification preferences', async () => {
    await act(async () => {
      render(<CommunityApplicationPage />);
    });
     await waitFor(() => {
         expect(screen.getByText(`Apply to Join ${mockCommunity.name}`)).toBeInTheDocument();
     });

     const emergencyAlertsSwitch: HTMLInputElement = screen.getByLabelText('Emergency Alerts');
     const pushNotificationsSwitch: HTMLInputElement = screen.getByLabelText('Push Notifications');

     // Check initial state (default true)
     expect(emergencyAlertsSwitch).toBeChecked();
     expect(pushNotificationsSwitch).toBeChecked();

     // Toggle Emergency Alerts
     await act(async () => {
       await userEvent.click(emergencyAlertsSwitch);
     });
     expect(emergencyAlertsSwitch).not.toBeChecked();

      // Toggle Push Notifications
     await act(async () => {
       await userEvent.click(pushNotificationsSwitch);
     });
     expect(pushNotificationsSwitch).not.toBeChecked();

     // Toggle back
     await act(async () => {
       await userEvent.click(emergencyAlertsSwitch);
     });
     expect(emergencyAlertsSwitch).toBeChecked();
  });
});