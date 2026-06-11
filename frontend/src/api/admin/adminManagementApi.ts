import axios from 'axios';
import axiosInstance from '../../utils/axiosInstance';
import type { AxiosInstance, AxiosResponse } from 'axios';
import {
  mapPageResultToPagedResponse,
  type ApiResponse,
  type PageResult,
  type PagedResponse,
} from '../../types/admin/index';

const ADMIN_MANAGEMENT_BASE_PATH = '/api/v1/admin';
const adminHttpClient = axiosInstance as AxiosInstance;

export interface AdminManagementSummary {
  totalAdminCount: number;
  activeAdminCount: number;
  activeAclCount: number;
  lockedAdminCount: number;
}

export const ADMIN_ROLE = {
  MASTER: 'MASTER',
  CS: 'CS',
  BACKEND: 'BACKEND',
} as const;

export type AdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE];

export const ADMIN_STATUS = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
} as const;

export type AdminStatus = (typeof ADMIN_STATUS)[keyof typeof ADMIN_STATUS];

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  scope: string;
  ip: string | null;
  createdAt: string;
  lastLoginAt: string;
  status: AdminStatus;
}

export const ACL_RISK_LEVEL = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type AclRiskLevel = (typeof ACL_RISK_LEVEL)[keyof typeof ACL_RISK_LEVEL];

export interface AdminAclRule {
  id: string;
  label: string;
  cidr: string;
  note: string;
  enabled: boolean;
  riskLevel: AclRiskLevel;
  updatedAt: string;
}

export const AUDIT_SEVERITY = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type AuditSeverity = (typeof AUDIT_SEVERITY)[keyof typeof AUDIT_SEVERITY];

const FILTER_SENTINEL = {
  ALL: 'ALL',
} as const;

type FilterSentinel = (typeof FILTER_SENTINEL)[keyof typeof FILTER_SENTINEL];

export interface AdminAuditLog {
  id: string;
  occurredAt: string;
  actor: string;
  ip: string;
  action: string;
  target: string;
  severity: AuditSeverity;
}

export interface ApiErrorBody<TData = unknown> {
  success?: false;
  statusCode?: number;
  code?: string;
  errorCode?: string;
  message?: string;
  data?: TData;
}

interface BackendAdminAccountDto {
  adminId: number;
  email: string;
  name: string;
  adminRole: AdminRole;
  status: AdminStatus;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendAdminAclRuleDto {
  ipAclId: number;
  label: string;
  ipRange: string;
  isEnabled: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BackendRequestCreateAdmin {
  email: string;
  password: string;
  name: string;
  adminRole: AdminRole;
}

interface BackendRequestUpdateAdminRole {
  adminRole: AdminRole;
}

interface BackendRequestCreateAclRule {
  label: string;
  ipRange: string;
  description: string | null;
}

interface BackendRequestUpdateAclEnabled {
  isEnabled: boolean;
}

export interface GetAdminAccountsParams {
  keyword?: string;
  role?: AdminRole | FilterSentinel;
  status?: AdminStatus | FilterSentinel;
  page?: number;
  size?: number;
}

export interface RequestCreateAdmin {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

export interface RequestUpdateAdminRole {
  role: AdminRole;
}

export interface RequestUpdateAdminStatus {
  status: AdminStatus;
}

export interface GetAdminAclRulesParams {
  page?: number;
  size?: number;
}

export interface RequestCreateAclRule {
  label: string;
  cidr: string;
  note: string;
}

export interface RequestUpdateAclEnabled {
  enabled: boolean;
}

export interface GetAdminAuditLogsParams {
  actor?: string | FilterSentinel;
  severity?: AuditSeverity | FilterSentinel;
  page?: number;
  size?: number;
}

export const ADMIN_MANAGEMENT_ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  MASTER_ROLE_REQUIRED: 'MASTER_ROLE_REQUIRED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type AdminManagementErrorCode =
  (typeof ADMIN_MANAGEMENT_ERROR_CODE)[keyof typeof ADMIN_MANAGEMENT_ERROR_CODE];

export interface AdminManagementApiError {
  code: AdminManagementErrorCode;
  statusCode: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

const adminManagementFallbackMessages: Record<AdminManagementErrorCode, string> = {
  VALIDATION_ERROR: '요청 값이 올바르지 않습니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
  FORBIDDEN: '관리자 관리 권한이 없습니다.',
  MASTER_ROLE_REQUIRED: '마스터 관리자만 수행할 수 있는 작업입니다.',
  NOT_FOUND: '대상을 찾을 수 없습니다.',
  CONFLICT: '이미 사용 중이거나 처리할 수 없는 요청입니다.',
  SERVER_ERROR: '관리자 관리 처리에 실패했습니다.',
  NETWORK_ERROR: '네트워크 연결을 확인해 주세요.',
  UNKNOWN: '요청을 처리할 수 없습니다.',
};

const adminManagementAuthMessages = {
  JWT_EXPIRED: '관리자 인증이 만료되었습니다. 다시 로그인해 주세요.',
  ROLE_ADMIN_REQUIRED: '관리자 관리 화면에 접근할 ROLE_ADMIN 권한이 없습니다.',
  MASTER_ROLE_REQUIRED: adminManagementFallbackMessages.MASTER_ROLE_REQUIRED,
} as const;

function getAdminManagementErrorCode(statusCode: number): AdminManagementErrorCode {
  if (statusCode === 0) return ADMIN_MANAGEMENT_ERROR_CODE.NETWORK_ERROR;

  switch (statusCode) {
    case 400:
      return ADMIN_MANAGEMENT_ERROR_CODE.VALIDATION_ERROR;
    case 401:
      return ADMIN_MANAGEMENT_ERROR_CODE.UNAUTHORIZED;
    case 403:
      return ADMIN_MANAGEMENT_ERROR_CODE.FORBIDDEN;
    case 404:
      return ADMIN_MANAGEMENT_ERROR_CODE.NOT_FOUND;
    case 409:
      return ADMIN_MANAGEMENT_ERROR_CODE.CONFLICT;
    case 500:
      return ADMIN_MANAGEMENT_ERROR_CODE.SERVER_ERROR;
    default:
      return statusCode >= 500 ? ADMIN_MANAGEMENT_ERROR_CODE.SERVER_ERROR : ADMIN_MANAGEMENT_ERROR_CODE.UNKNOWN;
  }
}

function getFieldErrors(data: unknown): Record<string, string> | undefined {
  if (!data || typeof data !== 'object' || !('fieldErrors' in data)) return undefined;

  const fieldErrors = (data as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== 'object') return undefined;

  return fieldErrors as Record<string, string>;
}

export function toAdminManagementApiError(error: unknown): AdminManagementApiError {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return {
      code: ADMIN_MANAGEMENT_ERROR_CODE.UNKNOWN,
      statusCode: 0,
      message: error instanceof Error ? error.message : adminManagementFallbackMessages.UNKNOWN,
    };
  }

  const axiosError = error;
  const statusCode = axiosError.response?.data?.statusCode ?? axiosError.response?.status ?? 0;
  const body = axiosError.response?.data;
  const isMasterRoleError =
    statusCode === 403
    && (body?.code === ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED
      || body?.errorCode === ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED);
  const code = isMasterRoleError
    ? ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED
    : getAdminManagementErrorCode(statusCode);

  return {
    code,
    statusCode,
    message: body?.message || adminManagementFallbackMessages[code],
    fieldErrors: getFieldErrors(body?.data),
  };
}

export function getAdminManagementAuthErrorMessage(error: AdminManagementApiError): string {
  if (error.code === ADMIN_MANAGEMENT_ERROR_CODE.UNAUTHORIZED) return adminManagementAuthMessages.JWT_EXPIRED;
  if (error.code === ADMIN_MANAGEMENT_ERROR_CODE.FORBIDDEN) return adminManagementAuthMessages.ROLE_ADMIN_REQUIRED;
  if (error.code === ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED) {
    return adminManagementAuthMessages.MASTER_ROLE_REQUIRED;
  }

  return error.message;
}

function unwrapApiResponse<TData>(response: AxiosResponse<ApiResponse<TData>>): TData {
  const payload = response.data;

  if (!payload.success) {
    const code = getAdminManagementErrorCode(payload.statusCode);

    throw {
      code,
      statusCode: payload.statusCode,
      message: payload.message || adminManagementFallbackMessages[code],
    } satisfies AdminManagementApiError;
  }

  return payload.data;
}

function normalizeAllSentinel<TParams extends object>(params: TParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== FILTER_SENTINEL.ALL && value !== undefined),
  );
}

function getAdminRoleScope(role: AdminRole): string {
  switch (role) {
    case ADMIN_ROLE.MASTER:
      return '전체 권한 통제 및 보안 승인';
    case ADMIN_ROLE.CS:
      return '회원 문의, 신고, 1차 조치';
    case ADMIN_ROLE.BACKEND:
      return 'API, DB, 배포, 장애 대응';
  }
}

function toAdminAccount(dto: BackendAdminAccountDto): AdminAccount {
  return {
    id: String(dto.adminId),
    name: dto.name,
    email: dto.email,
    role: dto.adminRole,
    scope: getAdminRoleScope(dto.adminRole),
    ip: dto.lastLoginIp,
    createdAt: dto.createdAt,
    lastLoginAt: dto.lastLoginAt ?? '',
    status: dto.status,
  };
}

export function getAclRiskLevel(cidr: unknown): AclRiskLevel {
  if (typeof cidr !== 'string' || cidr.trim() === '') return ACL_RISK_LEVEL.HIGH;

  const [, suffix] = cidr.split('/');
  if (suffix == null || suffix.trim() === '') return ACL_RISK_LEVEL.HIGH;

  const cidrSuffix = Number(suffix);
  if (!Number.isInteger(cidrSuffix)) return ACL_RISK_LEVEL.HIGH;

  let riskLevel: AclRiskLevel = ACL_RISK_LEVEL.HIGH;
  if (cidrSuffix === 32) {
    riskLevel = ACL_RISK_LEVEL.LOW;
  } else if (cidrSuffix === 24) {
    riskLevel = ACL_RISK_LEVEL.MEDIUM;
  }

  return riskLevel;
}

export function toAdminAclRule(dto: BackendAdminAclRuleDto): AdminAclRule {
  const cidr = typeof dto.ipRange === 'string' ? dto.ipRange : '';

  return {
    id: String(dto.ipAclId),
    label: dto.label,
    cidr,
    note: dto.description ?? '',
    enabled: dto.isEnabled,
    riskLevel: getAclRiskLevel(cidr),
    updatedAt: dto.updatedAt,
  };
}

export const adminManagementApiClient = {
  get: <TData>(path: string, params?: Record<string, unknown>) =>
    adminHttpClient.get<TData>(`${ADMIN_MANAGEMENT_BASE_PATH}${path}`, { params }),
  post: <TData, TBody>(path: string, body: TBody) =>
    adminHttpClient.post<TData>(`${ADMIN_MANAGEMENT_BASE_PATH}${path}`, body),
  patch: <TData, TBody>(path: string, body: TBody) =>
    adminHttpClient.patch<TData>(`${ADMIN_MANAGEMENT_BASE_PATH}${path}`, body),
  delete: <TData>(path: string) => adminHttpClient.delete<TData>(`${ADMIN_MANAGEMENT_BASE_PATH}${path}`),
};

export const getAdminManagementSummary = () =>
  adminManagementApiClient.get<ApiResponse<AdminManagementSummary>>('/admins/summary').then(unwrapApiResponse);

export const getAdminAccounts = (params: GetAdminAccountsParams = {}) =>
  adminManagementApiClient
    .get<ApiResponse<PageResult<BackendAdminAccountDto>>>('/admins', normalizeAllSentinel(params))
    .then(unwrapApiResponse)
    .then((page) => mapPageResultToPagedResponse(page))
    .then((page) => ({
      ...page,
      items: page.items.map(toAdminAccount),
    }));

export const createAdminAccount = (body: RequestCreateAdmin) =>
  adminManagementApiClient
    .post<ApiResponse<BackendAdminAccountDto>, BackendRequestCreateAdmin>('/admins', {
      email: body.email,
      password: body.password,
      name: body.name,
      adminRole: body.role,
    })
    .then(unwrapApiResponse)
    .then(toAdminAccount);

export const updateAdminRole = (adminId: string, body: RequestUpdateAdminRole) =>
  adminManagementApiClient
    .patch<ApiResponse<BackendAdminAccountDto>, BackendRequestUpdateAdminRole>(`/admins/${adminId}/role`, {
      adminRole: body.role,
    })
    .then(unwrapApiResponse)
    .then(toAdminAccount);

export const updateAdminStatus = (adminId: string, body: RequestUpdateAdminStatus) =>
  adminManagementApiClient
    .patch<ApiResponse<BackendAdminAccountDto>, RequestUpdateAdminStatus>(`/admins/${adminId}/status`, body)
    .then(unwrapApiResponse)
    .then(toAdminAccount);

export const deleteAdminAccount = (adminId: string) =>
  adminManagementApiClient.delete<ApiResponse<null>>(`/admins/${adminId}`).then(unwrapApiResponse);

export const getAdminAclRules = (params: GetAdminAclRulesParams = {}) =>
  adminManagementApiClient
    .get<ApiResponse<PageResult<BackendAdminAclRuleDto>>>('/admin-acls', { ...params })
    .then(unwrapApiResponse)
    .then((page) => mapPageResultToPagedResponse(page))
    .then((page) => ({
      ...page,
      items: page.items.map(toAdminAclRule),
    }));

export const createAdminAclRule = (body: RequestCreateAclRule) =>
  adminManagementApiClient
    .post<ApiResponse<BackendAdminAclRuleDto>, BackendRequestCreateAclRule>('/admin-acls', {
      label: body.label,
      ipRange: body.cidr,
      description: body.note || null,
    })
    .then(unwrapApiResponse)
    .then(toAdminAclRule);

export const updateAdminAclEnabled = (aclId: string, body: RequestUpdateAclEnabled) =>
  adminManagementApiClient
    .patch<ApiResponse<BackendAdminAclRuleDto>, BackendRequestUpdateAclEnabled>(`/admin-acls/${aclId}/enabled`, {
      isEnabled: body.enabled,
    })
    .then(unwrapApiResponse)
    .then(toAdminAclRule);

export const deleteAdminAclRule = (aclId: string) =>
  adminManagementApiClient.delete<ApiResponse<null>>(`/admin-acls/${aclId}`).then(unwrapApiResponse);

export const getAdminAuditLogs = (params: GetAdminAuditLogsParams = {}) =>
  adminManagementApiClient
    .get<ApiResponse<PagedResponse<AdminAuditLog>>>('/admin-audit-logs', normalizeAllSentinel(params))
    .then(unwrapApiResponse);
