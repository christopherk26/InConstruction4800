import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getUserCommunities } from '@/app/services/communityService';
import { searchUsers, searchPosts } from '@/app/services/searchService';
import { getUserVotesForPosts } from '@/app/services/postService';
import { Suspense } from 'react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock services
jest.mock('@/app/services/authService', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/app/services/communityService', () => ({
  getUserCommunities: jest.fn(),
}));

jest.mock('@/app/services/searchService', () => ({
  searchUsers: jest.fn(),
  searchPosts: jest.fn(),
}));

jest.mock('@/app/services/postService', () => ({
  getUserVotesForPosts: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/main-navbar', () => ({
  MainNavbar: ({ user }: any) => <div data-testid="main-navbar">Navbar for {user.firstName}</div>,
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
  Button: ({ children, variant, asChild, ...props }: any) => {
    if (asChild) {
      return children;
    }
    return <button {...props} data-variant={variant}>{children}</button>;
  },
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input
      value={value}
      onChange={(e) => onChange({ target: { value: e.target.value } })}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange('community2')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className, id }: any) => (
    <div id={id} className={className} data-testid="select-trigger" role="combobox">
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children, className }: any) => (
    <div className={className} data-testid="select-content">
      {children}
    </div>
  ),
  SelectItem: ({ children, value, className }: any) => (
    <div
      data-testid={`select-item-${value}`}
      className={className}
      onClick={() => {}}
      role="option"
    >
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue, onValueChange }: any) => (
    <div data-testid="tabs" data-value={defaultValue} onClick={() => onValueChange(defaultValue)}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div className={className} data-testid="tabs-list">
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, className }: any) => (
    <button className={className} data-testid={`tab-${value}`} data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('@/components/shared/UserCard', () => ({
  UserCard: ({ user, communityId }: any) => (
    <div data-testid={`user-card-${user.id}`}>
      User: {user.firstName} {user.lastName} in {communityId}
    </div>
  ),
}));

jest.mock('@/components/community/post-card', () => ({
  PostCard: ({ post, communityId, userVote, refreshPosts }: any) => (
    <div data-testid={`post-card-${post.id}`}>
      Post: {post.title} in {communityId}, Vote: {userVote || 'none'}
      <button onClick={refreshPosts}>Refresh</button>
    </div>
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon">SearchIcon</span>,
  Users: () => <span data-testid="users-icon">UsersIcon</span>,
  FileText: () => <span data-testid="file-text-icon">FileTextIcon</span>,
  Filter: () => <span data-testid="filter-icon">FilterIcon</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircleIcon</span>,
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Mock data
const mockUser = {
  id: '123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  isVerified: jest.fn().mockResolvedValue(true),
};

const mockCommunities = [
  { id: 'community1', name: 'Community One' },
  { id: 'community2', name: 'Community Two' },
];

const mockUsers = [
  { id: 'user1', firstName: 'Jane', lastName: 'Smith' },
  { id: 'user2', firstName: 'Bob', lastName: 'Jones' },
  { id: 'user3', firstName: 'Alice', lastName: 'Brown' },
  { id: 'user4', firstName: 'Charlie', lastName: 'Davis' },
];

const mockPosts = [
  { id: 'post1', title: 'First Post', communityId: 'community1' },
  { id: 'post2', title: 'Second Post', communityId: 'community1' },
  { id: 'post3', title: 'Third Post', communityId: 'community1' },
  { id: 'post4', title: 'Fourth Post', communityId: 'community1' },
];

const mockVotes = {
  post1: 'upvote',
  post2: 'downvote',
  post3: 'upvote',
  post4: 'downvote',
};

describe('SearchPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserCommunities as jest.Mock).mockResolvedValue(mockCommunities);
    (searchUsers as jest.Mock).mockResolvedValue([]);
    (searchPosts as jest.Mock).mockResolvedValue([]);
    (getUserVotesForPosts as jest.Mock).mockResolvedValue({});
    window.history.pushState = jest.fn();
  });

  // Test Suspense fallback
  it('renders loading spinner during Suspense', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div data-testid="suspense-fallback">Suspense Loading</div>}>
          {/* Simulate delayed loading */}
          {new Promise((resolve) => setTimeout(resolve, 100)).then(() => <SearchPage />)}
        </Suspense>
      );
    });
    expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
  }, 10000);

  // Test authentication flow
  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  }, 10000);

  it('redirects to verification if user is not verified', async () => {
    const unverifiedUser = { ...mockUser, isVerified: jest.fn().mockResolvedValue(false) };
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  }, 10000);

  // Test loading state
  it('shows loading spinner while fetching user data', async () => {
    (getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  }, 10000);

  // Test no communities state
  it('displays message when user has no communities', async () => {
    (getUserCommunities as jest.Mock).mockResolvedValue([]);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No Communities Joined')).toBeInTheDocument();
      expect(screen.getByText('Join a Community')).toHaveAttribute('href', '/communities/apply');
    });
  }, 10000);

  // Test error handling
  it('displays error message when loading user data fails', async () => {
    (getCurrentUser as jest.Mock).mockRejectedValue(new Error('Failed to fetch user'));
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load user data. Please try again.')).toBeInTheDocument();
    });
  }, 10000);

  // Test rendering main UI
  it('renders search form and community selector', async () => {
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search for People and Posts')).toBeInTheDocument();
      expect(screen.getByTestId('select')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by name, bio, or content...')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  }, 10000);

  // Test search submission
  it('performs search and updates URL on form submission', async () => {
    (searchUsers as jest.Mock).mockResolvedValue(mockUsers);
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    (getUserVotesForPosts as jest.Mock).mockResolvedValue(mockVotes);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: '/search?q=test%20query&tab=all&community=community1' },
        '',
        '/search?q=test%20query&tab=all&community=community1'
      );
      expect(searchUsers).toHaveBeenCalledWith('test query', 'community1');
      expect(searchPosts).toHaveBeenCalledWith('test query', 'community1');
      expect(getUserVotesForPosts).toHaveBeenCalledWith('123', ['post1', 'post2', 'post3', 'post4']);
    });
  }, 10000);

  // Test error on search without community
  it('displays error when searching without selecting a community', async () => {
    (getUserCommunities as jest.Mock).mockResolvedValue([]);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Join a Community')).toBeInTheDocument();
    });
    
    // Re-render with communities but no selected community
    (getUserCommunities as jest.Mock).mockResolvedValue(mockCommunities);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Please select a community to search in')).toBeInTheDocument();
    });
  }, 10000);

  // Test search results
  it('displays user and post results in all tab', async () => {
    (searchUsers as jest.Mock).mockResolvedValue(mockUsers);
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    (getUserVotesForPosts as jest.Mock).mockResolvedValue(mockVotes);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('People')).toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();
      expect(screen.getByTestId('user-card-user1')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post1')).toBeInTheDocument();
      expect(screen.getByText('View All 4 People')).toBeInTheDocument();
      expect(screen.getByText('View All 4 Posts')).toBeInTheDocument();
    });
  }, 10000);

  // Test view all buttons
  it('switches to users tab when clicking view all people', async () => {
    (searchUsers as jest.Mock).mockResolvedValue(mockUsers);
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      const viewAllButton = screen.getByText('View All 4 People');
      userEvent.click(viewAllButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-users')).toBeInTheDocument();
      expect(screen.getByTestId('user-card-user4')).toBeInTheDocument();
    });
  }, 10000);

  // Test empty search results
  it('displays no results message when search returns nothing', async () => {
    (searchUsers as jest.Mock).mockResolvedValue([]);
    (searchPosts as jest.Mock).mockResolvedValue([]);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('We couldn\'t find any matches for "test query" in this community. Please try a different search term.')).toBeInTheDocument();
    });
  }, 10000);

  // Test empty query state
  it('displays enter search term message when no query is provided', async () => {
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Enter a search term')).toBeInTheDocument();
      expect(screen.getByText('Search for people and posts in your selected community.')).toBeInTheDocument();
    });
  }, 10000);

  // Test suggestions dropdown
  it('displays suggestions dropdown when typing query', async () => {
    (searchUsers as jest.Mock).mockResolvedValue(mockUsers);
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by name, bio, or content...')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      await userEvent.type(input, 'test');
    });
    
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('First Post')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toHaveAttribute('href', '/communities/community1/users/user1');
      expect(screen.getByText('First Post')).toHaveAttribute('href', '/communities/community1/posts/post1');
    }, { timeout: 1000 });
  }, 10000);

  // Test useDebounce hook
  it('debounces query input', async () => {
    (searchUsers as jest.Mock).mockResolvedValue([]);
    (searchPosts as jest.Mock).mockResolvedValue([]);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by name, bio, or content...')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      await userEvent.type(input, 'test');
    });
    
    // Should not call search immediately
    expect(searchUsers).not.toHaveBeenCalled();
    
    // Wait for debounce (300ms)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    
    expect(searchUsers).toHaveBeenCalledWith('test', 'community1');
  }, 10000);

  // Test error in suggestions fetch
  it('handles error when fetching suggestions', async () => {
    (searchUsers as jest.Mock).mockRejectedValue(new Error('Failed to fetch suggestions'));
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by name, bio, or content...')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      await userEvent.type(input, 'test');
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  }, 10000);

  // Test error in fetching user votes
  it('handles error when fetching user votes', async () => {
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    (getUserVotesForPosts as jest.Mock).mockRejectedValue(new Error('Failed to fetch votes'));
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('post-card-post1')).toBeInTheDocument();
      expect(screen.getByText('Vote: none')).toBeInTheDocument();
    });
  }, 10000);

  // Test refresh search
  it('refreshes search when refreshPosts is called', async () => {
    (searchUsers as jest.Mock).mockResolvedValue(mockUsers);
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('post-card-post1')).toBeInTheDocument();
    });
    
    await act(async () => {
      const refreshButton = screen.getByText('Refresh');
      await userEvent.click(refreshButton);
    });
    
    await waitFor(() => {
      expect(searchPosts).toHaveBeenCalledTimes(2);
    });
  }, 10000);

  // Test initial query from search params
  it('performs search with initial query from search params', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('q=test&tab=posts&community=community1'));
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    (getUserVotesForPosts as jest.Mock).mockResolvedValue(mockVotes);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(searchPosts).toHaveBeenCalledWith('test', 'community1');
      expect(screen.getByTestId('post-card-post1')).toBeInTheDocument();
    });
  }, 10000);

  // Test no results in users tab
  it('displays no users message in users tab', async () => {
    (searchUsers as jest.Mock).mockResolvedValue([]);
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      const usersTab = screen.getByTestId('tab-users');
      userEvent.click(usersTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No users match your search criteria.')).toBeInTheDocument();
    });
  }, 10000);

  // Test no results in posts tab
  it('displays no posts message in posts tab', async () => {
    (searchUsers as jest.Mock).mockResolvedValue(mockUsers);
    (searchPosts as jest.Mock).mockResolvedValue([]);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      const postsTab = screen.getByTestId('tab-posts');
      userEvent.click(postsTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No posts match your search criteria.')).toBeInTheDocument();
    });
  }, 10000);

  // Test community selection
  it('changes selected community and performs search', async () => {
    (searchUsers as jest.Mock).mockResolvedValue(mockUsers);
    (searchPosts as jest.Mock).mockResolvedValue(mockPosts);
    
    await act(async () => {
      render(<SearchPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
    
    await act(async () => {
      const select = screen.getByTestId('select');
      await userEvent.click(select);
      
      const input = screen.getByPlaceholderText('Search by name, bio, or content...');
      const searchButton = screen.getByText('Search');
      
      await userEvent.type(input, 'test query');
      await userEvent.click(searchButton);
    });
    
    await waitFor(() => {
      expect(searchUsers).toHaveBeenCalledWith('test query', 'community2');
      expect(searchPosts).toHaveBeenCalledWith('test query', 'community2');
    });
  }, 10000);
});