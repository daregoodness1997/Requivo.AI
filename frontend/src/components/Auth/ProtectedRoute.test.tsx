import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from './ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, challengeId: null, pendingEmail: null });
  });

  it('redirects signed-out users to login', () => {
    render(
      <MemoryRouter
        initialEntries={['/chat']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <p>Private workspace</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument();
  });

  it('renders protected content for an authenticated user', () => {
    useAuthStore.setState({
      user: {
        id: 'user-test',
        name: 'Test User',
        email: 'test@requivo.ai',
        role: 'SystemAdmin',
      },
    });

    render(
      <MemoryRouter
        initialEntries={['/chat']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ProtectedRoute>
          <p>Private workspace</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Private workspace')).toBeInTheDocument();
  });
});
