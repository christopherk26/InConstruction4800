// app/page.test.tsx

import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LandingPage from './page'
import { getCurrentUser } from '@/app/services/authService'

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock the image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} alt={props.alt} />
  }
}))

// Mock the auth service
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn()
}))

// Mock framer-motion
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock components
jest.mock('@/components/ui/unauthenticated-header', () => ({
  UnauthenticatedHeader: () => <div data-testid="unauthenticated-header">Header</div>
}))

jest.mock('@/components/ui/footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return children;
    }
    return <button {...props}>{children}</button>;
  }
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

// Mock Link from next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

describe('LandingPage', () => {
  const mockPush = jest.fn()
  const mockRouter = {
    push: mockPush
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(getCurrentUser as jest.Mock).mockResolvedValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('redirects to dashboard if user is authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: '123', name: 'Test User' })
    
    await act(async () => {
      render(<LandingPage />)
    })
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows loading state initially', async () => {
    // Make getCurrentUser a pending promise to see loading state
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    await act(async () => {
      render(<LandingPage />)
    });
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders the landing page content after loading', async () => {
    await act(async () => {
      render(<LandingPage />)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Welcome to Town Hall')).toBeInTheDocument()
    })
    
    expect(screen.getByAltText('Town Hall Logo')).toBeInTheDocument()
  })

  it('animates the text content', async () => {
    await act(async () => {
      render(<LandingPage />)
    })
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Fast-forward through all text animation timers
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Check for animated text
    await waitFor(() => {
      const textElement = screen.getByText((content) => 
        content.includes('Town Hall is a secure, verified platform')
      )
      expect(textElement).toBeInTheDocument()
    })
  })

  it('displays login and signup buttons after animation completes', async () => {
    await act(async () => {
      render(<LandingPage />)
    })
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Fast-forward through all animations and delays
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Check that both buttons appear
    await waitFor(() => {
      expect(screen.getByText('Log In')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })
  })

  it('shows the "Why join Town Hall?" card after animation', async () => {
    await act(async () => {
      render(<LandingPage />)
    })
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Fast-forward through all animations
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Check that card content appears
    await waitFor(() => {
      expect(screen.getByText('Why join Town Hall?')).toBeInTheDocument()
      expect(screen.getByText('Verified Identity')).toBeInTheDocument()
      expect(screen.getByText('Geographic Focus')).toBeInTheDocument()
      expect(screen.getByText('Emergency Alerts')).toBeInTheDocument()
    })
  })

  it('navigates to login when login button is clicked', async () => {
    await act(async () => {
      render(<LandingPage />)
    })
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Fast-forward through all animations
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Wait for button to appear before querying
    await waitFor(() => {
      expect(screen.getByText('Log In')).toBeInTheDocument()
    })
    
    // Find login link and check href
    const loginLink = screen.getByText('Log In').closest('a')
    expect(loginLink).toHaveAttribute('href', '/auth/login')
  })

  it('handles auth check errors gracefully', async () => {
    (getCurrentUser as jest.Mock).mockRejectedValue(new Error('Auth error'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    await act(async () => {
      render(<LandingPage />)
    })
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error checking auth:', expect.any(Error))
    })
    
    // Should still render the page despite the error
    await waitFor(() => {
      expect(screen.getByText('Welcome to Town Hall')).toBeInTheDocument()
    })
    
    consoleSpy.mockRestore()
  })
})