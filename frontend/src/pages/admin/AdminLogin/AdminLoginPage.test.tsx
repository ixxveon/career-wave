/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function renderPage(queryClient: QueryClient = new QueryClient()) {
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

describe('AdminLoginPage 로그인 실패 안내', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('423 응답이면 서버가 내려준 잠금 메시지를 보여준다', async () => {
    adminAuthMock.login.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 423, data: { message: '로그인 시도 횟수를 초과하여 계정이 잠겼습니다.' } },
    });

    const { container } = renderPage();
    fireEvent.submit(getLoginForm(container));

    expect((await screen.findByRole('alert')).textContent).toBe('로그인 시도 횟수를 초과하여 계정이 잠겼습니다.');
  });

  it('423 응답에 메시지가 없으면 기본 잠금 안내 문구로 대체한다', async () => {
    adminAuthMock.login.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 423, data: {} },
    });

    const { container } = renderPage();
    fireEvent.submit(getLoginForm(container));

    expect((await screen.findByRole('alert')).textContent).toBe(
      '로그인 시도 횟수를 초과하여 계정이 잠겼습니다. 관리자에게 문의해주세요.',
    );
  });

  it('일반 인증 실패(401)에는 기존과 동일한 안내 문구를 보여준다', async () => {
    adminAuthMock.login.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { message: '인증에 실패했습니다.' } },
    });

    const { container } = renderPage();
    fireEvent.submit(getLoginForm(container));

    expect((await screen.findByRole('alert')).textContent).toBe('아이디 또는 비밀번호가 올바르지 않습니다.');
  });

  it('네트워크 오류(응답 없음)에도 기존과 동일한 안내 문구로 대체한다', async () => {
    adminAuthMock.login.mockRejectedValueOnce(new Error('Network Error'));

    const { container } = renderPage();
    fireEvent.submit(getLoginForm(container));

    expect((await screen.findByRole('alert')).textContent).toBe('아이디 또는 비밀번호가 올바르지 않습니다.');
  });
});
