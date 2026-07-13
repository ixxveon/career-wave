// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminLoginPage from './AdminLoginPage';
import { adminAuthApi, adminSession } from '../../../api/admin/adminAuthApi';

vi.mock('../../../api/admin/adminAuthApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin/adminAuthApi')>(
    '../../../api/admin/adminAuthApi',
  );
  return {
    ...actual,
    adminAuthApi: { login: vi.fn(), logout: vi.fn() },
  };
});

function renderPage() {
  render(
    <MemoryRouter>
      <AdminLoginPage />
    </MemoryRouter>,
  );
}

function submitLogin() {
  fireEvent.change(screen.getByPlaceholderText('아이디 또는 이메일'), { target: { value: 'admin' } });
  fireEvent.change(screen.getByPlaceholderText('비밀번호'), { target: { value: 'wrong-pass' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
}

describe('AdminLoginPage 로그인 실패 안내', () => {
  beforeEach(() => {
    vi.mocked(adminAuthApi.login).mockReset();
    adminSession.clearAll();
  });

  afterEach(() => {
    cleanup();
  });

  it('423 응답이면 서버가 내려준 잠금 메시지를 보여준다', async () => {
    vi.mocked(adminAuthApi.login).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 423, data: { message: '로그인 시도 횟수를 초과하여 계정이 잠겼습니다.' } },
    });

    renderPage();
    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toBe('로그인 시도 횟수를 초과하여 계정이 잠겼습니다.');
  });

  it('423 응답에 메시지가 없으면 기본 잠금 안내 문구로 대체한다', async () => {
    vi.mocked(adminAuthApi.login).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 423, data: {} },
    });

    renderPage();
    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toBe(
      '로그인 시도 횟수를 초과하여 계정이 잠겼습니다. 관리자에게 문의해주세요.',
    );
  });

  it('일반 인증 실패(401)에는 기존과 동일한 안내 문구를 보여준다', async () => {
    vi.mocked(adminAuthApi.login).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { message: '인증에 실패했습니다.' } },
    });

    renderPage();
    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toBe('아이디 또는 비밀번호가 올바르지 않습니다.');
  });

  it('네트워크 오류(응답 없음)에도 기존과 동일한 안내 문구로 대체한다', async () => {
    vi.mocked(adminAuthApi.login).mockRejectedValueOnce(new Error('Network Error'));

    renderPage();
    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toBe('아이디 또는 비밀번호가 올바르지 않습니다.');
  });
});
