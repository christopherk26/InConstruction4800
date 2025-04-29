import '@testing-library/jest-dom';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import NotificationsPage from './page';
import { getCurrentUser } from '@/app/services/authService';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotificationsForUser } from '@/app/services/notificationService';
import { toast } from 'sonner';
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

jest.mock('@/app/services/notificationService', () => ({
  getUserNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  deleteAllNotificationsForUser: jest.fn(),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
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
  CardContent: ({ children, ...props }: any) => <div {...props} data-testid="card-content">{children}</div>,
  CardFooter: ({ children, ...props }: any) => <div {...props} data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, disabled, ...props }: any) => (
    <button {...props} data-variant={variant} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/notification/notification-card', () => ({
  NotificationCard: ({ notification, onMarkAsRead, onDelete }: any) => (
    <div data-testid={`notification-card-${notification.id}`}>
      <span>Notification: {notification.message}</span>
      <span>Status: {notification.status.read ? 'read' : 'unread'}</span>
      <button onClick={() => onMarkAsRead(notification.id, notification.status.read)}>
        {notification.status.read ? 'Mark as Unread' : 'Mark as Read'}
      </button>
      <button onClick={() => onDelete(notification.id)}>Delete</button>
    </div>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dialog" data-open={open}>
      {open && children}
    </div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Bell: () => <span data-testid="bell-icon">BellIcon</span>,
  Check: () => <span data-testid="check-icon">CheckIcon</span>,
  X: () => <span data-testid="x-icon">XIcon</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangleIcon</span>,
  Trash2: () => <span data-testid="trash2-icon">Trash2Icon</span>,
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href} data-testid="link">{children}</a>;
});

// Mock data
const mockUser = {
  id: '123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  isVerified: jest.fn().mockResolvedValue(true),
};

const mockNotifications = [
  {
    id: 'notif1',
    message: 'New post in Community One',
    status: { read: false },
  },
  {
    id: 'notif2',
    message: 'Your post was upvoted',
    status: { read: true },
  },
];

describe('NotificationsPage', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush, back: jest.fn() };
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (getUserNotifications as jest.Mock).mockResolvedValue(mockNotifications);
  });

  // Test Suspense fallback
  it('renders loading spinner during Suspense', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div data-testid="suspense-fallback">Suspense Loading</div>}>
          {new Promise((resolve) => setTimeout(resolve, 100)).then(() => <NotificationsPage />)}
        </Suspense>
      );
    });
    expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();
  }, 10000);

  // Test authentication flow
  it('redirects to login if user is not authenticated', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  }, 10000);

  it('redirects to verification if user is not verified', async () => {
    const unverifiedUser = { ...mockUser, isVerified: jest.fn().mockResolvedValue(false) };
    (getCurrentUser as jest.Mock).mockResolvedValue(unverifiedUser);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/authenticate-person');
    });
  }, 10000);

  // Test no notifications state
  it('displays no notifications message when there are no notifications', async () => {
    (getUserNotifications as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('No notifications to display.')).toBeInTheDocument();
    });
  }, 10000);

  // Test rendering notifications
  it('renders notifications list with correct details', async () => {
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('notification-card-notif1')).toBeInTheDocument();
      expect(screen.getByText('Notification: New post in Community One')).toBeInTheDocument();
      expect(screen.getByText('Status: unread')).toBeInTheDocument();
      expect(screen.getByTestId('notification-card-notif2')).toBeInTheDocument();
      expect(screen.getByText('Notification: Your post was upvoted')).toBeInTheDocument();
      expect(screen.getByText('Status: read')).toBeInTheDocument();
    });
  }, 10000);

  // Test navigation breadcrumbs
  it('renders navigation breadcrumbs', async () => {
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      const navDiv = screen.getByText('Dashboard').closest('div');
      expect(screen.getByTestId('link')).toHaveAttribute('href', '/dashboard');
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(within(navDiv!).getByText('Notifications')).toBeInTheDocument();
    });
  }, 10000);

  // Test mark as read/unread
  it('marks a notification as read and unread', async () => {
    (markNotificationAsRead as jest.Mock).mockResolvedValue(undefined);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('notification-card-notif1')).toBeInTheDocument();
    });
    const notifCard = screen.getByTestId('notification-card-notif1');
    const markButton = within(notifCard).getByRole('button', { name: /mark as read/i });
    await act(async () => {
      await userEvent.click(markButton);
    });
    await waitFor(() => {
      expect(markNotificationAsRead).toHaveBeenCalledWith('notif1', true);
      expect(toast.success).toHaveBeenCalledWith('Marked as read');
      expect(within(notifCard).getByText('Status: read')).toBeInTheDocument();
    });
    await act(async () => {
      const markUnreadButton = within(notifCard).getByRole('button', { name: /mark as unread/i });
      await userEvent.click(markUnreadButton);
    });
    await waitFor(() => {
      expect(markNotificationAsRead).toHaveBeenCalledWith('notif1', false);
      expect(toast.success).toHaveBeenCalledWith('Marked as unread');
      expect(within(notifCard).getByText('Status: unread')).toBeInTheDocument();
    });
  }, 10000);

  it('handles error when marking notification as read', async () => {
    (markNotificationAsRead as jest.Mock).mockRejectedValue(new Error('Failed to update status'));
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('notification-card-notif1')).toBeInTheDocument();
    });
    const notifCard = screen.getByTestId('notification-card-notif1');
    const markButton = within(notifCard).getByRole('button', { name: /mark as read/i });
    await act(async () => {
      await userEvent.click(markButton);
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update status');
    });
  }, 10000);

  // Test delete notification
  it('deletes a notification', async () => {
    (deleteNotification as jest.Mock).mockResolvedValue(undefined);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('notification-card-notif1')).toBeInTheDocument();
    });
    const notifCard = screen.getByTestId('notification-card-notif1');
    const deleteButton = within(notifCard).getByRole('button', { name: /delete/i });
    await act(async () => {
      await userEvent.click(deleteButton);
    });
    await waitFor(() => {
      expect(deleteNotification).toHaveBeenCalledWith('notif1');
      expect(toast.success).toHaveBeenCalledWith('Notification deleted');
      expect(screen.queryByTestId('notification-card-notif1')).not.toBeInTheDocument();
    });
  }, 10000);

  it('handles error when deleting a notification', async () => {
    (deleteNotification as jest.Mock).mockRejectedValue(new Error('Failed to delete'));
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('notification-card-notif1')).toBeInTheDocument();
    });
    const notifCard = screen.getByTestId('notification-card-notif1');
    const deleteButton = within(notifCard).getByRole('button', { name: /delete/i });
    await act(async () => {
      await userEvent.click(deleteButton);
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete');
    });
  }, 10000);

  // Test mark all as read
  it('marks all notifications as read', async () => {
    (markAllNotificationsAsRead as jest.Mock).mockResolvedValue(undefined);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
    });
    const markAllButton = screen.getByRole('button', { name: /mark all as read/i });
    await act(async () => {
      await userEvent.click(markAllButton);
    });
    await waitFor(() => {
      expect(markAllNotificationsAsRead).toHaveBeenCalledWith('123', true);
      expect(toast.success).toHaveBeenCalledWith('All notifications marked as read');
      expect(screen.getByTestId('notification-card-notif1')).toHaveTextContent('Status: read');
      expect(screen.getByTestId('notification-card-notif2')).toHaveTextContent('Status: read');
    });
  }, 10000);

  it('handles error when marking all notifications as read', async () => {
    (markAllNotificationsAsRead as jest.Mock).mockRejectedValue(new Error('Failed to mark all'));
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
    });
    const markAllButton = screen.getByRole('button', { name: /mark all as read/i });
    await act(async () => {
      await userEvent.click(markAllButton);
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to mark all');
    });
  }, 10000);

  // Test delete all notifications
  it('opens delete all dialog and deletes all notifications', async () => {
    (deleteAllNotificationsForUser as jest.Mock).mockResolvedValue(undefined);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete all/i })).toBeInTheDocument();
    });
    const deleteAllButton = screen.getByRole('button', { name: /delete all/i });
    await act(async () => {
      await userEvent.click(deleteAllButton);
    });
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete All Notifications');
      expect(screen.getByTestId('dialog-description')).toHaveTextContent(
        'Are you sure you want to delete all notifications? This action cannot be undone.'
      );
    });
    const dialogFooter = screen.getByTestId('dialog-footer');
    const confirmDeleteButton = within(dialogFooter).getByRole('button', { name: /delete all/i });
    await act(async () => {
      await userEvent.click(confirmDeleteButton);
    });
    await waitFor(() => {
      expect(deleteAllNotificationsForUser).toHaveBeenCalledWith('123');
      expect(toast.success).toHaveBeenCalledWith('All notifications deleted');
      expect(screen.queryByTestId('notification-card-notif1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notification-card-notif2')).not.toBeInTheDocument();
      expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false');
    });
  }, 10000);

  it('cancels delete all dialog', async () => {
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete all/i })).toBeInTheDocument();
    });
    const deleteAllButton = screen.getByRole('button', { name: /delete all/i });
    await act(async () => {
      await userEvent.click(deleteAllButton);
    });
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
    });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await act(async () => {
      await userEvent.click(cancelButton);
    });
    await waitFor(() => {
      expect(deleteAllNotificationsForUser).not.toHaveBeenCalled();
      expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false');
      expect(screen.getByTestId('notification-card-notif1')).toBeInTheDocument();
    });
  }, 10000);

  it('handles error when deleting all notifications', async () => {
    (deleteAllNotificationsForUser as jest.Mock).mockRejectedValue(new Error('Failed to delete all'));
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete all/i })).toBeInTheDocument();
    });
    const deleteAllButton = screen.getByRole('button', { name: /delete all/i });
    await act(async () => {
      await userEvent.click(deleteAllButton);
    });
    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
    });
    const dialogFooter = screen.getByTestId('dialog-footer');
    const confirmDeleteButton = within(dialogFooter).getByRole('button', { name: /delete all/i });
    await act(async () => {
      await userEvent.click(confirmDeleteButton);
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete all');
      expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false');
    });
  }, 10000);

  // Test action loading state
  it('disables buttons during action loading', async () => {
    (markAllNotificationsAsRead as jest.Mock).mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
    });
    const markAllButton = screen.getByRole('button', { name: /mark all as read/i });
    await act(async () => {
      await userEvent.click(markAllButton);
    });
    await waitFor(() => {
      expect(markAllButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete all/i })).toBeDisabled();
    });
  }, 10000);

  // Test no notifications state (no action buttons)
  it('does not render action buttons when there are no notifications', async () => {
    (getUserNotifications as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      render(<NotificationsPage />);
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /mark all as read/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete all/i })).not.toBeInTheDocument();
    });
  }, 10000);
});