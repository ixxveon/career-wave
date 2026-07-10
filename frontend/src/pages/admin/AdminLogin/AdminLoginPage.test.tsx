/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_MANAGEMENT_ADMINS_QUERY_KEY } from '../../../constants/admin/adminManagementQueryKeys';
import AdminLoginPage from './AdminLoginPage';

const navigateMock = vi.hoisted(() => vi.fn());
const adminAuthMock = vi.hoisted(() => ({
  login: vi.fn(),
  setToken: vi.fn(),
  setRole: vi.fn(),
  setId: vi.fn(),
  setName: vi.fn(),
  clearAll: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}));

vi.mock('../../../api/admin/adminAuthApi', () => ({
  adminAuthApi: {
    login: adminAuthMock.login,
  },
  adminSession: {
    setToken: adminAuthMock.setToken,
    setRole: adminAuthMock.setRole,
    setId: adminAuthMock.setId,
    setName: adminAuthMock.setName,
    clearAll: adminAuthMock.clearAll,
  },
}));

function renderPage(queryClient: QueryClient) {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const inputs = result.container.querySelectorAll('input');

  fireEvent.change(inputs[0], { target: { value: 'master-admin' } });
  fireEvent.change(inputs[1], { target: { value: 'password' } });

  return result;
}

function getLoginForm(container: HTMLElement) {
  const form = container.querySelector('form');
  if (!form) {
    throw new Error('Login form not found');
  }
  return form;
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('invalidates the admin list query after a successful login', async () => {
    adminAuthMock.login.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: 'access-token',
          adminInfo: { id: '1', name: 'Master Admin', role: 'MASTER' },
        },
      },
    });
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { container } = renderPage(queryClient);

    fireEvent.submit(getLoginForm(container));

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ADMIN_MANAGEMENT_ADMINS_QUERY_KEY });
    });
    expect(navigateMock).toHaveBeenCalledOnce();
  });

  it('does not invalidate the admin list query when login fails', async () => {
    adminAuthMock.login.mockRejectedValue(new Error('login failed'));
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { container } = renderPage(queryClient);

    fireEvent.submit(getLoginForm(container));

    await waitFor(() => {
      expect(adminAuthMock.login).toHaveBeenCalledOnce();
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
