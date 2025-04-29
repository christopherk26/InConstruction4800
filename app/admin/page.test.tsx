// app/admin/page.test.tsx

import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import AdminDashboardPage from './page';
import Link from 'next/link';

// Mock UI components used by the page
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 data-testid="card-title" {...props}>{children}</h2>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, ...props }: any) => (
    <button data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => {
    // Pass other props like className if needed, but primarily focus on href
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    // Clear mocks if any state was involved (none in this simple case)
    jest.clearAllMocks();
  });

  it('should render the main heading', () => {
    render(<AdminDashboardPage />);
    expect(screen.getByRole('heading', { name: /Admin Dashboard/i, level: 1 })).toBeInTheDocument();
  });

  it('should render the Communities card with correct title, description, and links', () => {
    render(<AdminDashboardPage />);
    const cards = screen.getAllByTestId('card');
    // Find the card by its title
    const communitiesCard = cards.find(card =>
      within(card).queryByRole('heading', { name: /Communities/i, level: 2 })
    );

    expect(communitiesCard).toBeInTheDocument();
    if (!communitiesCard) return; // Guard for TypeScript

    expect(within(communitiesCard).getByText(/Manage community settings and roles/i)).toBeInTheDocument();

    const manageLink = within(communitiesCard).getByRole('link', { name: /Manage Communities/i });
    expect(manageLink).toBeInTheDocument();
    expect(manageLink).toHaveAttribute('href', '/admin/communities/manage');

    const createLink = within(communitiesCard).getByRole('link', { name: /Create Community/i });
    expect(createLink).toBeInTheDocument();
    expect(createLink).toHaveAttribute('href', '/admin/communities/create');
    // Check button variant if needed via data-variant attribute on the button inside the link
    const createButton = within(createLink).getByRole('button');
    expect(createButton).toHaveAttribute('data-variant', 'outline');
  });

  it('should render the Database card with correct title, description, and link', () => {
    render(<AdminDashboardPage />);
    const cards = screen.getAllByTestId('card');
    const databaseCard = cards.find(card =>
      within(card).queryByRole('heading', { name: /Database/i, level: 2 })
    );

    expect(databaseCard).toBeInTheDocument();
    if (!databaseCard) return;

    expect(within(databaseCard).getByText(/View and explore database contents/i)).toBeInTheDocument();

    const viewLink = within(databaseCard).getByRole('link', { name: /View Database/i });
    expect(viewLink).toBeInTheDocument();
    expect(viewLink).toHaveAttribute('href', '/admin/database');
  });

  it('should render the Role Management card with correct title, description, and link', () => {
    render(<AdminDashboardPage />);
    const cards = screen.getAllByTestId('card');
    const roleCard = cards.find(card =>
      within(card).queryByRole('heading', { name: /Role Management/i, level: 2 })
    );

    expect(roleCard).toBeInTheDocument();
    if (!roleCard) return;

    expect(within(roleCard).getByText(/Upload and manage community roles/i)).toBeInTheDocument();

    // Note: The component code points this link to /admin/communities/manage
    const manageLink = within(roleCard).getByRole('link', { name: /Manage Roles/i });
    expect(manageLink).toBeInTheDocument();
    expect(manageLink).toHaveAttribute('href', '/admin/communities/manage');
  });

});