/** @vitest-environment jsdom */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSession } from '../../../api/admin/adminAuthApi';
import { ADMIN_ROLE } from '../../../api/admin/adminManagementApi';
import AdminManagementPage from './AdminManagementPage';

const adminManagementApiMock = vi.hoisted(() => ({
  getAdminManagementSummary: vi.fn(),
  getAdminAccounts: vi.fn(),
  getAdminAclRules: vi.fn(),
  getAdminAuditLogs: vi.fn(),
  createAdminAccount: vi.fn(),
  updateAdminRole: vi.fn(),
  updateAdminStatus: vi.fn(),
  deleteAdminAccount: vi.fn(),
  createAdminAclRule: vi.fn(),
  updateAdminAclEnabled: vi.fn(),
  deleteAdminAclRule: vi.fn(),
}));

vi.mock('../../../api/admin/adminManagementApi', () => ({
  ADMIN_ROLE: {
    MASTER: 'MASTER',
    CS: 'CS',
    BACKEND: 'BACKEND',
  },
  ADMIN_MANAGEMENT_ERROR_CODE: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    MASTER_ROLE_REQUIRED: 'MASTER_ROLE_REQUIRED',
  },
  ...adminManagementApiMock,
  toAdminManagementApiError: (error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error) {
      return error;
    }

    return {
      code: 'UNKNOWN',
      statusCode: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  },
  getAdminManagementAuthErrorMessage: (error: { code: string; message?: string }) => {
    if (error.code === 'MASTER_ROLE_REQUIRED') return '마스터 관리자만 수행할 수 있는 작업입니다.';
    if (error.code === 'FORBIDDEN') return '관리자 관리 권한이 없습니다.';
    return error.message ?? '요청을 처리할 수 없습니다.';
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AdminManagementPage />
    </QueryClientProvider>,
  );
}

function seedApiMocks() {
  adminManagementApiMock.getAdminManagementSummary.mockResolvedValue({
    totalAdminCount: 2,
    activeAdminCount: 2,
    activeAclCount: 1,
    lockedAdminCount: 0,
  });
  adminManagementApiMock.getAdminAccounts.mockResolvedValue({
    items: [
      {
        id: 'ADM-001',
        name: 'Master Admin',
        email: 'master@example.com',
        role: ADMIN_ROLE.MASTER,
        scope: '전체 권한 통제 및 보안 승인',
        ip: '10.20.0.1',
        createdAt: '2026.06.01 09:00:00',
        lastLoginAt: '2026.06.09 09:00:00',
        status: 'ACTIVE',
      },
      {
        id: 'ADM-002',
        name: 'Backend Admin',
        email: 'backend@example.com',
        role: ADMIN_ROLE.BACKEND,
        scope: 'API, DB, 배포, 장애 대응',
        ip: '10.20.0.2',
        createdAt: '2026.06.01 09:00:00',
        lastLoginAt: '2026.06.09 09:00:00',
        status: 'ACTIVE',
      },
    ],
    page: 1,
    size: 20,
    totalItems: 2,
    totalPages: 1,
  });
  adminManagementApiMock.getAdminAclRules.mockResolvedValue({
    items: [
      {
        id: 'ACL-001',
        label: 'Office Network',
        cidr: '10.20.0.0/16',
        note: 'Office allowlist',
        enabled: true,
        riskLevel: 'LOW',
        updatedAt: '2026.06.09 09:00:00',
      },
    ],
    page: 1,
    size: 3,
    totalItems: 1,
    totalPages: 1,
  });
  adminManagementApiMock.getAdminAuditLogs.mockResolvedValue({
    items: [],
    page: 1,
    size: 5,
    totalItems: 0,
    totalPages: 1,
  });
  adminManagementApiMock.updateAdminRole.mockResolvedValue({
    id: 'ADM-002',
    name: 'Backend Admin',
    email: 'backend@example.com',
    role: ADMIN_ROLE.CS,
    scope: '회원 문의, 신고, 1차 조치',
    ip: '10.20.0.2',
    createdAt: '2026.06.01 09:00:00',
    lastLoginAt: '2026.06.09 09:00:00',
    status: 'ACTIVE',
  });
}

function getCreateAdminButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('.amCreateAdminButton');
  if (!button) throw new Error('.amCreateAdminButton button was not found.');
  return button;
}

function getBackendRoleSelect(container: HTMLElement): HTMLSelectElement {
  const selects = Array.from(container.querySelectorAll<HTMLSelectElement>('.amInlineSelect'));
  const select = selects.find((item) => item.value === ADMIN_ROLE.BACKEND);
  if (!select) throw new Error('BACKEND role select was not found.');
  return select;
}

function getAclInputs(container: HTMLElement) {
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('.amAclForm input'));
  expect(inputs).toHaveLength(3);
  return inputs;
}

function getAddAclButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('.amAclForm .amPrimaryButton');
  if (!button) throw new Error('.amAclForm .amPrimaryButton button was not found.');
  return button;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  seedApiMocks();
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('AdminManagementPage master-only controls', () => {
  it('enables master-only controls on initial render for MASTER admins', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);

    const { container } = renderPage();

    await waitFor(() => expect(getBackendRoleSelect(container).disabled).toBe(false));

    expect(getCreateAdminButton(container).disabled).toBe(false);
    getAclInputs(container).forEach((input) => expect(input.disabled).toBe(false));
  });

  it('preemptively disables master-only controls on initial render for non-MASTER admins', async () => {
    adminSession.setRole(ADMIN_ROLE.CS);

    const { container } = renderPage();

    await waitFor(() => expect(getBackendRoleSelect(container).disabled).toBe(true));

    expect(getCreateAdminButton(container).disabled).toBe(true);
    getAclInputs(container).forEach((input) => expect(input.disabled).toBe(true));
  });

  it('keeps master-only controls disabled after MASTER_ROLE_REQUIRED fallback responses', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    adminManagementApiMock.updateAdminRole.mockRejectedValueOnce({
      code: 'MASTER_ROLE_REQUIRED',
      statusCode: 403,
      message: '마스터 관리자만 수행할 수 있는 작업입니다.',
    });

    adminManagementApiMock.createAdminAclRule.mockRejectedValueOnce({
      code: 'MASTER_ROLE_REQUIRED',
      statusCode: 403,
      message: '마스터 관리자만 수행할 수 있는 작업입니다.',
    });

    const { container, findAllByText } = renderPage();
    const roleSelect = await waitFor(() => getBackendRoleSelect(container));

    fireEvent.change(roleSelect, { target: { value: ADMIN_ROLE.CS } });

    const [labelInput, cidrInput] = getAclInputs(container);
    fireEvent.change(labelInput, { target: { value: 'Office' } });
    fireEvent.change(cidrInput, { target: { value: '10.20.0.0/16' } });
    fireEvent.click(getAddAclButton(container));
    await waitFor(() => expect(getAddAclButton(container).disabled).toBe(true));

    expect(await findAllByText('마스터 관리자만 수행할 수 있는 작업입니다.')).toHaveLength(2);
    await waitFor(() => expect(getBackendRoleSelect(container).disabled).toBe(true));
    expect(getCreateAdminButton(container).disabled).toBe(true);
    getAclInputs(container).forEach((input) => expect(input.disabled).toBe(true));
  });
});
