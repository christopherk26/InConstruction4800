// app/communities/browse/page.test.tsx
import '@testing-library/jest-dom';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import BrowseCommunitiesPage from './page'; // Correct import for default export
import { getCurrentUser } from '@/app/services/authService';
import { getAllCommunities, checkCommunityMembership } from '@/app/services/communityService';
import { UserModel } from '@/app/models/UserModel';
import { Suspense } from 'react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock auth service
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));

// Mock community service
jest.mock('@/app/services/communityService', () => ({
  getAllCommunities: jest.fn(),
  checkCommunityMembership: jest.fn(),
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

jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="select">
      {children}
    </select>
  ),
  SelectTrigger: ({ children, className }: any) => <div className={className} data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children, className }: any) => <div className={className} data-testid="select-content">{children}</div>,
  SelectItem: ({ value, children, className }: any) => <option value={value} className={className} data-testid={`select-item-${value}`}>{children}</option>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeftIcon</span>,
  Search: () => <span data-testid="search-icon">SearchIcon</span>,
  Filter: () => <span data-testid="filter-icon">FilterIcon</span>,
  MapPin: () => <span data-testid="map-pin-icon">MapPinIcon</span>,
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock window.history.pushState
const mockPushState = jest.fn();
Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
  },
  writable: true,
});


describe('BrowseCommunitiesPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush, back: jest.fn() };
  const mockUser = mockUserModel('user-id-1', 'Test', true);
  const mockCommunities = [
    {
      id: 'community-id-1',
      name: 'Alpha Community',
      bio: 'The first community',
      location: { city: 'City A', state: 'State A', zipCodes: ['10001', '10002'] },
      stats: { memberCount: 10 },
    },
    {
      id: 'community-id-2',
      name: 'Beta Community',
      bio: 'The second community',
      location: { city: 'City B', state: 'State B', zipCodes: ['20001'] },
      stats: { memberCount: 25 },
    },
    {
      id: 'community-id-3',
      name: 'Gamma Community',
      bio: 'Third one is the best',
      location: { city: 'City A', state: 'State A', zipCodes: ['10003'] },
      stats: { memberCount: 5 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams()); // Default empty search params
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getAllCommunities as jest.Mock).mockResolvedValue(mockCommunities);
    // Default mock for checkCommunityMembership - assume not a member
    (checkCommunityMembership as jest.Mock).mockResolvedValue(false);
  });

  // Test Suspense fallback
  it('renders loading spinner during Suspense', async () => {
    // Simulate Suspense loading
    await act(async () => {
      render(
        <Suspense fallback={<div data-testid="suspense-fallback">Suspense Loading</div>}>
          {/* Render the actual component after a delay */}
          {new Promise((resolve) => setTimeout(resolve, 100)).then(() => <BrowseCommunitiesPage />)}
        </Suspense>
      );
    });
    expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
  }, 10000); // Increased timeout for Suspense test


  // Test component's internal loading state
  it('shows loading spinner and text while fetching initial data', async () => {
      // Simulate the initial loading state by having getCurrentUser return a pending promise
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });

    // Wait for the loading text to appear, which indicates the component's internal loading state
    await waitFor(() => {
      expect(screen.getByText('Loading communities...')).toBeInTheDocument();
        // Assuming spinner has role 'img' with hidden true or a specific class/testid
      const spinner = screen.getByRole('img', { hidden: true }) || screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

      // Assert that the main content is NOT present while loading
    expect(screen.queryByText('Browse Communities')).not.toBeInTheDocument();
  }, 10000);


  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('redirects to authenticate-person if user is not verified', async () => {
    const unverifiedUser = mockUserModel('user-id-unverified', 'Unverified', false);
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
    await waitFor(() => {
      expect(unverifiedUser.isVerified).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  });

  it('renders all communities by default when authenticated and verified', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      expect(screen.getByTestId('main-navbar')).toHaveTextContent('Navbar for Test');
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check if all communities are rendered
      expect(screen.getByText('Alpha Community')).toBeInTheDocument();
      expect(screen.getByText('Beta Community')).toBeInTheDocument();
      expect(screen.getByText('Gamma Community')).toBeInTheDocument();

      // Check initial filter/sort info
      expect(screen.getByText(`Found ${mockCommunities.length} communities`)).toBeInTheDocument();
      // Check sort select initial value
      expect(screen.getByTestId('select')).toHaveValue('name');
    });
  });

    it('renders no communities found message when getAllCommunities returns empty array', async () => {
    (getAllCommunities as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      expect(screen.getByText('No communities found')).toBeInTheDocument();
      expect(screen.getByText('No communities match your search criteria. Try adjusting your filters or browse all available communities.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View All Communities' })).toBeInTheDocument();
    });
  });


  // Test initial search params
  it('applies initial filter and sort from search params', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ q: 'alpha', zip: '10001', sortBy: 'size' }));

    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });

    await waitFor(() => {
      // Check if input fields are pre-filled
      expect(screen.getByPlaceholderText('Search by name or description')).toHaveValue('alpha');
      expect(screen.getByPlaceholderText('Zip code')).toHaveValue('10001');
        // Check if sort select initial value is set
      expect(screen.getByTestId('select')).toHaveValue('size');

      // Check if filtering is applied (only Alpha Community has zip 10001 and name alpha)
      expect(screen.getByText('Alpha Community')).toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
      expect(screen.getByText('Found 1 community')).toBeInTheDocument();
    });
  });


  // Test search functionality
  it('filters communities by name on search', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(searchInput, 'alpha');
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha Community')).toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
      expect(screen.getByText('Found 1 community')).toBeInTheDocument();
      // Check URL update
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?q=alpha' }, '', '/communities/browse?q=alpha');
    });
  });

    it('filters communities by bio on search', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(searchInput, 'second');
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
      expect(screen.getByText('Beta Community')).toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
        expect(screen.getByText('Found 1 community')).toBeInTheDocument();
      // Check URL update
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?q=second' }, '', '/communities/browse?q=second');
    });
  });

  it('handles no results for search query', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(searchInput, 'nonexistent');
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
      expect(screen.getByText('No communities found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View All Communities' })).toBeInTheDocument();
        // Check URL update
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?q=nonexistent' }, '', '/communities/browse?q=nonexistent');
    });
  });

  it('filters communities by zip code', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const zipInput = screen.getByPlaceholderText('Zip code');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(zipInput, '10001');
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha Community')).toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
      expect(screen.getByText('Found 1 community')).toBeInTheDocument();
        // Check URL update
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?zip=10001' }, '', '/communities/browse?zip=10001');
    });
  });

    it('handles no results for zip code filter', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const zipInput = screen.getByPlaceholderText('Zip code');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(zipInput, '99999');
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
      expect(screen.getByText('No communities found')).toBeInTheDocument();
        // Check URL update
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?zip=99999' }, '', '/communities/browse?zip=99999');
    });
  });


  it('filters communities by both search query and zip code', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    const zipInput = screen.getByPlaceholderText('Zip code');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(searchInput, 'gamma');
      await userEvent.type(zipInput, '10003');
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.getByText('Gamma Community')).toBeInTheDocument();
      expect(screen.getByText('Found 1 community')).toBeInTheDocument();
        // Check URL update
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?q=gamma&zip=10003' }, '', '/communities/browse?q=gamma&zip=10003');
    });
  });

    it('handles no results for combined filters', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    const zipInput = screen.getByPlaceholderText('Zip code');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(searchInput, 'alpha');
      await userEvent.type(zipInput, '20001'); // Alpha is not in 20001 zip
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Alpha Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
      expect(screen.getByText('No communities found')).toBeInTheDocument();
        // Check URL update
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?q=alpha&zip=20001' }, '', '/communities/browse?q=alpha&zip=20001');
    });
  });


    it('trims whitespace from search query and zip code inputs', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    const zipInput = screen.getByPlaceholderText('Zip code');
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(searchInput, '  Alpha Community  ');
      await userEvent.type(zipInput, '  10001  ');
      fireEvent.submit(searchButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha Community')).toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Community')).not.toBeInTheDocument();
      expect(screen.getByText('Found 1 community')).toBeInTheDocument();
      // Check URL update - should use trimmed values
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse?q=Alpha+Community&zip=10001' }, '', '/communities/browse?q=Alpha+Community&zip=10001');
    });
  });


  // Test sorting functionality
    it('sorts communities by name (A-Z)', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Browse Communities')).toBeInTheDocument();
        // Default sort is name, so just check order
      const communityNames = screen.getAllByTestId('card-title').map(title => title.textContent);
      expect(communityNames).toEqual(['Alpha Community', 'Beta Community', 'Gamma Community']);
    });
  });

  it('sorts communities by size (Largest first)', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
    await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const sortSelect = screen.getByTestId('select'); // Use the mocked select element
    await act(async () => {
        // Select the 'size' option
      fireEvent.change(sortSelect, { target: { value: 'size' } });
    });


    await waitFor(() => {
      const communityNames = screen.getAllByTestId('card-title').map(title => title.textContent);
      // Expected order: Beta (25), Alpha (10), Gamma (5)
      expect(communityNames).toEqual(['Beta Community', 'Alpha Community', 'Gamma Community']);
    });
  });

  it('sorts communities by location (City, State A-Z)', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
    await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const sortSelect = screen.getByTestId('select'); // Use the mocked select element
      await act(async () => {
        // Select the 'location' option
      fireEvent.change(sortSelect, { target: { value: 'location' } });
    });


    await waitFor(() => {
      const communityNames = screen.getAllByTestId('card-title').map(title => title.textContent);
      // Expected order: Alpha (City A, State A), Gamma (City A, State A), Beta (City B, State B)
      // For communities in the same location, the original order from the mock array is preserved by applyFilters before sorting.
      // However, the localeCompare logic in applyFilters for location will put 'City A, State A' before 'City B, State B'.
      // Within 'City A, State A', Alpha comes before Gamma in the original mock array, so they should remain in that relative order after location sort.
      expect(communityNames).toEqual(['Alpha Community', 'Gamma Community', 'Beta Community']);
    });
  });

    it('applies sorting after filtering', async () => {
    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });
      await waitFor(() => {
          expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });

    const searchInput = screen.getByPlaceholderText('Search by name or description');
    const sortSelect = screen.getByTestId('select'); // Use the mocked select element
    const searchButton = screen.getByRole('button', { name: 'Search Communities' });

    await act(async () => {
      await userEvent.type(searchInput, 'community'); // Matches all
        fireEvent.submit(searchButton);
        // Change sort to size after initial filter
      fireEvent.change(sortSelect, { target: { value: 'size' } });
    });


    await waitFor(() => {
      const communityNames = screen.getAllByTestId('card-title').map(title => title.textContent);
        // Should be sorted by size: Beta (25), Alpha (10), Gamma (5)
      expect(communityNames).toEqual(['Beta Community', 'Alpha Community', 'Gamma Community']);
    });
  });


  // Test user membership status and buttons
    it('shows "Apply to Join" button for communities user is not a member of', async () => {
      // Default mock is checkCommunityMembership returning false
      await act(async () => {
        render(<BrowseCommunitiesPage />);
      });

      await waitFor(() => {
        const alphaCommunityCard = screen.getByText('Alpha Community').closest('[data-testid="card"]');
        const betaCommunityCard = screen.getByText('Beta Community').closest('[data-testid="card"]');
        const gammaCommunityCard = screen.getByText('Gamma Community').closest('[data-testid="card"]');

        expect(within(alphaCommunityCard as HTMLElement).getByRole('link', { name: 'Apply to Join' })).toHaveAttribute('href', '/communities/apply/community-id-1');
        expect(within(betaCommunityCard as HTMLElement).getByRole('link', { name: 'Apply to Join' })).toHaveAttribute('href', '/communities/apply/community-id-2');
        expect(within(gammaCommunityCard as HTMLElement).getByRole('link', { name: 'Apply to Join' })).toHaveAttribute('href', '/communities/apply/community-id-3');

        // Ensure the "Already a Member" button is not present
        expect(screen.queryByRole('button', { name: 'Already a Member' })).not.toBeInTheDocument();
      });
    });

    it('shows "Already a Member" button for communities user is a member of', async () => {
      // Mock checkCommunityMembership to return true for specific communities
     (checkCommunityMembership as jest.Mock).mockImplementation((userId, communityId) => {
        if (communityId === 'community-id-1' || communityId === 'community-id-3') {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      await act(async () => {
        render(<BrowseCommunitiesPage />);
      });

      await waitFor(() => {
        const alphaCommunityCard = screen.getByText('Alpha Community').closest('[data-testid="card"]');
        const betaCommunityCard = screen.getByText('Beta Community').closest('[data-testid="card"]');
        const gammaCommunityCard = screen.getByText('Gamma Community').closest('[data-testid="card"]');

        expect(within(alphaCommunityCard as HTMLElement).getByRole('button', { name: 'Already a Member' })).toBeInTheDocument();
        expect(within(betaCommunityCard as HTMLElement).getByRole('link', { name: 'Apply to Join' })).toBeInTheDocument();
        expect(within(gammaCommunityCard as HTMLElement).getByRole('button', { name: 'Already a Member' })).toBeInTheDocument();
      });
    });


  // Test "View All Communities" button
  it('clears filters and shows all communities when "View All Communities" is clicked', async () => {
    // Start with applied filters
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ q: 'alpha', zip: '10001' }));

    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });

    // Wait for the filtered state to be rendered (only Alpha)
    await waitFor(() => {
      expect(screen.getByText('Alpha Community')).toBeInTheDocument();
      expect(screen.queryByText('Beta Community')).not.toBeInTheDocument();
      expect(screen.getByText('Found 1 community')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by name or description')).toHaveValue('alpha');
      expect(screen.getByPlaceholderText('Zip code')).toHaveValue('10001');
    });

      // Simulate clicking "View All Communities" button from the 'No communities found' state
      // To test this flow, we need to force the 'No communities found' state first.
      // A better test would be to click this button when it appears after a search returns no results.
      // Let's simulate a search that yields no results first.

      const searchInput = screen.getByPlaceholderText('Search by name or description');
      const searchButton = screen.getByRole('button', { name: 'Search Communities' });

      await act(async () => {
         await userEvent.clear(searchInput);
         await userEvent.type(searchInput, 'nonexistent');
         fireEvent.submit(searchButton);
      });

      await waitFor(() => {
          expect(screen.getByText('No communities found')).toBeInTheDocument();
      });

    const viewAllButton = screen.getByRole('button', { name: 'View All Communities' });
    await act(async () => {
      await userEvent.click(viewAllButton);
    });

    await waitFor(() => {
      // Check if filters are cleared
      expect(screen.getByPlaceholderText('Search by name or description')).toHaveValue('');
      expect(screen.getByPlaceholderText('Zip code')).toHaveValue('');

      // Check if all communities are shown again
      expect(screen.getByText('Alpha Community')).toBeInTheDocument();
      expect(screen.getByText('Beta Community')).toBeInTheDocument();
      expect(screen.getByText('Gamma Community')).toBeInTheDocument();
      expect(screen.getByText(`Found ${mockCommunities.length} communities`)).toBeInTheDocument();

      // Check URL update - search params should be removed
      expect(mockPushState).toHaveBeenCalledWith({ path: '/communities/browse' }, '', '/communities/browse');
    });
  });


  // Test error handling
  it('displays error message if fetching communities fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

    (getAllCommunities as jest.Mock).mockRejectedValue(new Error('Failed to fetch communities'));

    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });

    await waitFor(() => {
      // Check that loading state is gone
      expect(screen.queryByText('Loading communities...')).not.toBeInTheDocument();
      // Check for the error message display
      expect(screen.getByText('Failed to load communities. Please try again.')).toBeInTheDocument();
        // Check that an error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching data:", expect.any(Error));
    });

    consoleErrorSpy.mockRestore(); // Restore console.error
  });

    it('logs error if checking community membership fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(() => {}); // Suppress console error in test output

    (checkCommunityMembership as jest.Mock).mockRejectedValue(new Error('Failed to check membership'));

    await act(async () => {
      render(<BrowseCommunitiesPage />);
    });

    await waitFor(() => {
      // Wait for communities to load and membership checks to run
      expect(screen.getByText('Browse Communities')).toBeInTheDocument();
        // Check that an error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error checking community memberships:", expect.any(Error));

        // Although there was an error fetching memberships, the component should still render communities
        expect(screen.getByText('Alpha Community')).toBeInTheDocument();
        // Membership status might be undefined or false depending on how the state is initialized on error,
        // but the key is that the error was caught and logged.
    });

    consoleErrorSpy.mockRestore(); // Restore console.error
  });


});

// Helper function to check the order of communities by name

// This helper function might be useful for more complex sorting tests
// async function expectOrder(names: string[]) {
//    await waitFor(() => {
//      const communityCards = screen.getAllByTestId('card');
//      const orderedNames = communityCards.map(card => within(card as HTMLElement).getByTestId('card-title').textContent);
//      expect(orderedNames).toEqual(names);
//    });
// }