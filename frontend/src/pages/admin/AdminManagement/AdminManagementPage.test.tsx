/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSession } from '../../../api/admin/adminAuthApi';
import { AUDIT_LOG_TYPE } from '../../../api/admin/auditLogApi';
import { ADMIN_ROLE } from '../../../api/admin/adminManagementApi';
import AdminManagementPage from './AdminManagementPage';

const adminManagementApiMock = vi.hoisted(() => ({
  getAdminManagementSummary: vi.fn(),
  getAdminAccounts: vi.fn(),
  getAdminAclRules: vi.fn(),
  createAdminAccount: vi.fn(),
  updateAdminRole: vi.fn(),
  updateAdminStatus: vi.fn(),
  deleteAdminAccount: vi.fn(),
  createAdminAclRule: vi.fn(),
  updateAdminAclEnabled: vi.fn(),
  deleteAdminAclRule: vi.fn(),
}));

const auditLogApiMock = vi.hoisted(() => ({
  getLogs: vi.fn(),
}));

vi.mock('../../../api/admin/adminManagementApi', () => ({
  ADMIN_ROLE: {
    MASTER: 'MASTER',
    CS: 'CS',
    BACKEND: 'BACKEND',
  },
  ACL_RISK_LEVEL: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
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
      status: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  },
  getAdminManagementAuthErrorMessage: (error: { code: string; message?: string }) => {
    if (error.code === 'MASTER_ROLE_REQUIRED') return '마스터 관리자만 수행할 수 있는 작업입니다.';
    if (error.code === 'FORBIDDEN') return '관리자 관리 권한이 없습니다.';
    return error.message ?? '요청을 처리할 수 없습니다.';
  },
  getAclRiskLevel: (cidr: unknown) => {
    if (typeof cidr !== 'string' || cidr.trim() === '') return 'HIGH';
    const [, suffix] = cidr.split('/');
    if (suffix == null || suffix.trim() === '') return 'HIGH';
    const cidrSuffix = Number(suffix);
    if (!Number.isInteger(cidrSuffix)) return 'HIGH';
    if (cidrSuffix === 32) return 'LOW';
    if (cidrSuffix === 24) return 'MEDIUM';
    return 'HIGH';
  },
}));

vi.mock('../../../api/admin/auditLogApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin/auditLogApi')>(
    '../../../api/admin/auditLogApi',
  );

  return {
    ...actual,
    auditLogApi: auditLogApiMock,
  };
});

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

function auditLogListResponse(content: unknown[] = []) {
  return {
    data: {
      success: true,
      message: 'OK',
      data: {
        content,
        page: 1,
        size: 5,
        totalElements: content.length,
        totalPages: 1,
      },
    },
  };
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
        lastLoginAt: '2026-07-02T09:06:53.949209Z',
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
        lastLoginAt: '2026-07-01T23:45:00Z',
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
        riskLevel: 'HIGH',
        updatedAt: '2026.06.09 09:00:00',
      },
    ],
    page: 1,
    size: 3,
    totalItems: 1,
    totalPages: 1,
  });
  auditLogApiMock.getLogs.mockResolvedValue(auditLogListResponse());
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

  it('formats recent login timestamps in KST for the admin account table', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);

    const { container, findByText } = renderPage();

    expect(await findByText('Master Admin')).toBeTruthy();

    const rowTexts = Array.from(container.querySelectorAll('.amCompactTable tbody tr')).map((row) => row.textContent ?? '');

    expect(rowTexts.some((text) => text.includes('Master Admin') && text.includes('2026-07-02') && text.includes('18:06'))).toBe(true);
    expect(rowTexts.some((text) => text.includes('Backend Admin') && text.includes('2026-07-02') && text.includes('08:45'))).toBe(true);
  });

  it('preemptively disables master-only controls on initial render for non-MASTER admins', async () => {
    adminSession.setRole(ADMIN_ROLE.CS);

    const { container } = renderPage();

    await waitFor(() => expect(getBackendRoleSelect(container).disabled).toBe(true));

    expect(getCreateAdminButton(container).disabled).toBe(true);
    getAclInputs(container).forEach((input) => expect(input.disabled).toBe(true));
  });

  it('submits loginId and email separately when creating an admin account', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    adminManagementApiMock.createAdminAccount.mockResolvedValueOnce({
      id: 'ADM-003',
      name: 'CS Admin',
      email: 'cs-admin@careerwave.kr',
      role: ADMIN_ROLE.CS,
      scope: '회원 문의, 신고, 1차 조치',
      ip: null,
      createdAt: '2026.06.10 09:00:00',
      lastLoginAt: '',
      status: 'ACTIVE',
    });

    const { container, findByPlaceholderText } = renderPage();

    await waitFor(() => expect(getCreateAdminButton(container).disabled).toBe(false));
    fireEvent.click(getCreateAdminButton(container));

    fireEvent.change(await findByPlaceholderText('admin_master'), { target: { value: 'csadmin01' } });
    fireEvent.change(await findByPlaceholderText('admin@career-wave.com'), { target: { value: 'cs-admin@careerwave.kr' } });
    fireEvent.change(await findByPlaceholderText('초기 비밀번호 입력'), { target: { value: 'temporary-password' } });
    fireEvent.change(await findByPlaceholderText('관리자 이름'), { target: { value: 'CS Admin' } });

    const dialog = container.querySelector<HTMLFormElement>('.amCreatePage');
    if (!dialog) throw new Error('.amCreatePage form was not found.');

    fireEvent.submit(dialog);

    await waitFor(() => {
      expect(adminManagementApiMock.createAdminAccount).toHaveBeenCalled();
    });

    expect(adminManagementApiMock.createAdminAccount.mock.calls[0]?.[0]).toEqual({
      loginId: 'csadmin01',
      email: 'cs-admin@careerwave.kr',
      password: 'temporary-password',
      name: 'CS Admin',
      role: ADMIN_ROLE.CS,
    });
  });

  it('keeps master-only controls disabled after MASTER_ROLE_REQUIRED fallback responses', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    adminManagementApiMock.updateAdminRole.mockRejectedValueOnce({
      code: 'MASTER_ROLE_REQUIRED',
      status: 403,
      message: '마스터 관리자만 수행할 수 있는 작업입니다.',
    });

    adminManagementApiMock.createAdminAclRule.mockRejectedValueOnce({
      code: 'MASTER_ROLE_REQUIRED',
      status: 403,
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

  it('renders ACL rows safely when CIDR is malformed', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    adminManagementApiMock.getAdminAclRules.mockResolvedValueOnce({
      items: [
        {
          id: 'ACL-BAD',
          label: 'Malformed Network',
          cidr: undefined,
          note: 'Malformed allowlist',
          enabled: true,
          riskLevel: 'HIGH',
          updatedAt: '2026.06.09 09:00:00',
        },
      ],
      page: 1,
      size: 3,
      totalItems: 1,
      totalPages: 1,
    });

    const { findByText } = renderPage();

    expect(await findByText('Malformed Network')).toBeTruthy();
    expect(await findByText('넓은 대역')).toBeTruthy();
  });


  it('does not render local fallback audit logs when the server returns an empty audit log list', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    auditLogApiMock.getLogs.mockResolvedValueOnce(auditLogListResponse());

    const { findByText, queryByText } = renderPage();

    expect(await findByText('Master Admin')).toBeTruthy();
    expect(await findByText('표시할 관리자 활동 로그가 없습니다.')).toBeTruthy();
    expect(queryByText('super_admin')).toBeNull();
  });

  it('renders administrator activity from the common audit log response', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    auditLogApiMock.getLogs.mockResolvedValueOnce(
      auditLogListResponse([
        {
          id: '101',
          logType: AUDIT_LOG_TYPE.ADMIN_ACTIVITY,
          logTypeLabel: '관리자 계정 관리',
          severity: 'INFO',
          summary: '관리자 권한을 변경했습니다.',
          detailSummary: '관리자 권한을 변경했습니다.',
          actorId: 'admin-1',
          targetType: 'ADMIN',
          targetId: '2',
          ipAddressMasked: '10.20.0.*',
          occurredAt: '2026-07-18 09:30:00',
        },
      ]),
    );

    const { findByText } = renderPage();

    expect(await findByText('관리자 권한을 변경했습니다.')).toBeTruthy();
    expect(await findByText('ADMIN #2')).toBeTruthy();
    expect(await findByText('admin-1')).toBeTruthy();
  });

  it('shows a retry action when audit log retrieval fails', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    auditLogApiMock.getLogs.mockRejectedValueOnce({
      code: 'UNKNOWN',
      status: 500,
      message: '감사 로그 조회에 실패했습니다.',
    });

    const { findByRole, findByText } = renderPage();

    expect(await findByText('활동 로그를 불러오지 못했습니다.')).toBeTruthy();
    const retryButton = await findByRole('button', { name: '다시 시도' });
    fireEvent.click(retryButton);

    await waitFor(() => expect(auditLogApiMock.getLogs).toHaveBeenCalledTimes(2));
  });

  it('does not show a retry action when audit log access is denied', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);
    auditLogApiMock.getLogs.mockRejectedValueOnce({
      code: 'FORBIDDEN',
      status: 403,
      message: '관리자 관리 권한이 없습니다.',
    });

    const { findByText, queryByRole } = renderPage();

    expect(await findByText('활동 로그 조회 권한이 없습니다.')).toBeTruthy();
    expect(queryByRole('button', { name: '다시 시도' })).toBeNull();
  });

  it('requests ADMIN_ACTIVITY audit logs for the security console', async () => {
    adminSession.setRole(ADMIN_ROLE.MASTER);

    const { findByText } = renderPage();

    expect(await findByText('Master Admin')).toBeTruthy();
    await waitFor(() => {
      expect(auditLogApiMock.getLogs).toHaveBeenCalledWith({
        logType: AUDIT_LOG_TYPE.ADMIN_ACTIVITY,
        page: 1,
        size: 5,
      });
    });
  });

});
