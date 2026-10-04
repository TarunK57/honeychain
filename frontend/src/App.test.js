import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import supabase from './config/supabase';

// Mock variables for easy control in tests
const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('./config/supabase', () => {
  return {
    __esModule: true,
    default: {
      auth: {
        getSession: (...args) => mockGetSession(...args),
        onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
        signOut: (...args) => mockSignOut(...args)
      },
      from: (...args) => mockFrom(...args)
    }
  };
});

// A dummy component that consumes useAuth to display/test things
const TestComponent = () => {
  const { user, profile, logout } = useAuth();

  React.useEffect(() => {
    if (profile?.role) {
      document.body.className = `theme-${profile.role}`;
    } else {
      document.body.className = '';
    }
    return () => {
      document.body.className = '';
    };
  }, [profile]);

  return (
    <div>
      <div data-testid="user">{user ? user.email : 'guest'}</div>
      <div data-testid="role">{profile ? profile.role : 'none'}</div>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  );
};

describe('Role-Based Themes', () => {
  beforeEach(() => {
    document.body.className = '';
    jest.clearAllMocks();
    
    // Set up database chaining mocks
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    // Default mock implementations to avoid undefined destructuring issues
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    });
    mockSingle.mockResolvedValue({ data: null, error: null });
    
    // Clear global fetch mock if set
    if (global.fetch) {
      jest.restoreAllMocks();
    }
  });

  test('body className is empty by default when not logged in', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for loading to finish and verify body class is empty
    await waitFor(() => {
      expect(document.body.className).toBe('');
    });
  });

  test('body className is theme-superadmin when logged in as superadmin', async () => {
    const mockSession = {
      user: { id: 'super-user-id', email: 'super@honeychain.local' }
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: mockSession } });
    mockSingle.mockResolvedValueOnce({
      data: { id: 'super-user-id', role: 'superadmin' },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(document.body.className).toBe('theme-superadmin');
    });
  });

  test('body className is theme-admin when logged in as admin', async () => {
    const mockSession = {
      user: { id: 'admin-user-id', email: 'admin@honeychain.local' }
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: mockSession } });
    mockSingle.mockResolvedValueOnce({
      data: { id: 'admin-user-id', role: 'admin' },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(document.body.className).toBe('theme-admin');
    });
  });

  test('body className is theme-patient when logged in as patient', async () => {
    const mockSession = {
      user: { id: 'beekeeper-user-id', email: 'keeper@honeychain.local' }
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: mockSession } });
    mockSingle.mockResolvedValueOnce({
      data: { id: 'patient-user-id', role: 'patient' },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(document.body.className).toBe('theme-patient');
    });
  });

  test('body className is reset to empty when logout is called', async () => {
    const mockSession = {
      user: { id: 'admin-user-id', email: 'admin@honeychain.local' }
    };
    mockGetSession.mockResolvedValueOnce({ data: { session: mockSession } });
    mockSingle.mockResolvedValueOnce({
      data: { id: 'admin-user-id', role: 'admin' },
      error: null
    });
    
    // Mock global fetch for backend logout call
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Verify theme is initially applied
    await waitFor(() => {
      expect(document.body.className).toBe('theme-admin');
    });

    // Call logout
    await act(async () => {
      getByTestId('logout-btn').click();
    });

    // Verify theme is cleared
    await waitFor(() => {
      expect(document.body.className).toBe('');
    });

    // Restore fetch
    global.fetch = originalFetch;
  });
});
