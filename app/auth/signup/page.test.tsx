// app/auth/signup/page.test.tsx

import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SignupPage from './page';
import { getCurrentUser } from '@/app/services/authService'; // Optional: For redirect test

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Optional: Mock authService if testing redirect for logged-in users
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));

// Mock child components
jest.mock('@/components/signup-form', () => ({
  // Use a unique data-testid for the mock
  SignupForm: (props: any) => <div data-testid="mock-signup-form" data-props={JSON.stringify(props)}>Signup Form Mock</div>,
}));
jest.mock('@/components/ui/unauthenticated-header', () => ({
  UnauthenticatedHeader: () => <div data-testid="mock-unauthenticated-header">Unauthenticated Header Mock</div>,
}));
jest.mock('@/components/ui/footer', () => ({
  Footer: () => <div data-testid="mock-footer">Footer Mock</div>,
}));

// Mock next/image (consistent with app/page.test.tsx)
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock next/link (consistent with other tests)
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});


describe('SignupPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    // Default mock: No authenticated user
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
  });

  it('should render the header, signup form, and footer', async () => {
    await act(async () => {
        render(<SignupPage />);
    });

    // Wait for potential async operations like auth check to settle
    await waitFor(() => {
        expect(screen.getByTestId('mock-unauthenticated-header')).toBeInTheDocument();
        expect(screen.getByTestId('mock-signup-form')).toBeInTheDocument();
        expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });
  });

  it('should pass the correct props to SignupForm', async () => {
    await act(async () => {
      render(<SignupPage />);
    });

    await waitFor(() => {
        const signupForm = screen.getByTestId('mock-signup-form');
        expect(signupForm).toBeInTheDocument();

        const props = JSON.parse(signupForm.getAttribute('data-props') || '{}');

        expect(props.heading).toBe('Town Hall');
        expect(props.subheading).toBe('Join your local community today.');
        expect(props.logo).toEqual({
          url: '/',
          src: '/mainlogo.png',
          alt: 'Town Hall',
        });
        expect(props.loginUrl).toBe('/auth/login');
    });
  });

  // Optional Test: Redirect if user is already logged in
  it('should redirect to dashboard if user is already authenticated', async () => {
    // Mock that a user is returned
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-123', email: 'test@test.com' });

    await act(async () => {
        render(<SignupPage />);
    });

    // Check if redirected
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

});