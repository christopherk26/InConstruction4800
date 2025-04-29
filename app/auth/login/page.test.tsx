// app/auth/login/page.test.tsx

import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LoginPage from './page';
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
jest.mock('@/components/login-form', () => ({
  // Use a unique data-testid for the mock
  LoginForm: (props: any) => <div data-testid="mock-login-form" data-props={JSON.stringify(props)}>Login Form Mock</div>,
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


describe('LoginPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    // Default mock: No authenticated user
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
  });

  it('should render the header, login form, and footer', async () => {
    await act(async () => {
        render(<LoginPage />);
    });

    // Wait for potential async operations like auth check to settle
    await waitFor(() => {
        expect(screen.getByTestId('mock-unauthenticated-header')).toBeInTheDocument();
        expect(screen.getByTestId('mock-login-form')).toBeInTheDocument();
        expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });
  });

  it('should pass the correct props to LoginForm', async () => {
    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
        const loginForm = screen.getByTestId('mock-login-form');
        expect(loginForm).toBeInTheDocument();

        const props = JSON.parse(loginForm.getAttribute('data-props') || '{}');

        expect(props.heading).toBe('Town Hall');
        expect(props.subheading).toBe('Welcome back. Log in to your account.');
        expect(props.logo).toEqual({
          url: '/',
          src: '/mainlogo.png',
          alt: 'Town Hall',
        });
        expect(props.signupUrl).toBe('/auth/signup');
    });
  });

  // Optional Test: Redirect if user is already logged in
  it('should redirect to dashboard if user is already authenticated', async () => {
    // Mock that a user is returned
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-123', email: 'test@test.com' });

    await act(async () => {
        render(<LoginPage />);
    });

    // Check if redirected
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

});