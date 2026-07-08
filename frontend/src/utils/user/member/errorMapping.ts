import type { ApiErrorBody, LoginRouteDecision } from '../../../types/user/member';
import type { ApiError } from '../../../types/apiError';

export const MEMBER_ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DUPLICATED: 'DUPLICATED',
  LOCKED: 'LOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type MemberErrorCode = (typeof MEMBER_ERROR_CODE)[keyof typeof MEMBER_ERROR_CODE];

export interface MemberApiError extends ApiError {
  code: MemberErrorCode;
  fieldErrors?: Record<string, string>;
  data?: unknown;
}

export const LOGIN_BLOCK_SERVER_CODE = {
  AUTH_ACCOUNT_SUSPENDED:      'AUTH_ACCOUNT_SUSPENDED',
  AUTH_ACCOUNT_BANNED:         'AUTH_ACCOUNT_BANNED',
  AUTH_ACCOUNT_WITHDRAWN:      'AUTH_ACCOUNT_WITHDRAWN',
  AUTH_COMPANY_PENDING_REVIEW: 'AUTH_COMPANY_PENDING_REVIEW',
  AUTH_COMPANY_REJECTED:       'AUTH_COMPANY_REJECTED',
  AUTH_COMPANY_NEEDS_REVISION: 'AUTH_COMPANY_NEEDS_REVISION',
} as const;

const ACCOUNT_RESTRICTION_SERVER_CODES: Record<(typeof LOGIN_BLOCK_SERVER_CODE)[keyof typeof LOGIN_BLOCK_SERVER_CODE], LoginRouteDecision & { type: 'BLOCK' }> = {
  [LOGIN_BLOCK_SERVER_CODE.AUTH_ACCOUNT_SUSPENDED]:      { type: 'BLOCK', reason: 'RESTRICTED' },
  [LOGIN_BLOCK_SERVER_CODE.AUTH_ACCOUNT_BANNED]:         { type: 'BLOCK', reason: 'RESTRICTED' },
  [LOGIN_BLOCK_SERVER_CODE.AUTH_ACCOUNT_WITHDRAWN]:      { type: 'BLOCK', reason: 'RESTRICTED' },
  [LOGIN_BLOCK_SERVER_CODE.AUTH_COMPANY_PENDING_REVIEW]: { type: 'BLOCK', reason: 'COMPANY_PENDING' },
  [LOGIN_BLOCK_SERVER_CODE.AUTH_COMPANY_REJECTED]:       { type: 'BLOCK', reason: 'COMPANY_REJECTED' },
  [LOGIN_BLOCK_SERVER_CODE.AUTH_COMPANY_NEEDS_REVISION]: { type: 'BLOCK', reason: 'COMPANY_NEEDS_REVISION' },
};

type LoginBlockServerCode = (typeof LOGIN_BLOCK_SERVER_CODE)[keyof typeof LOGIN_BLOCK_SERVER_CODE];

function isLoginBlockServerCode(code: string): code is LoginBlockServerCode {
  return Object.values(LOGIN_BLOCK_SERVER_CODE).includes(code as LoginBlockServerCode);
}

export function parseLoginBlockedDecision(
  error: MemberApiError,
): (LoginRouteDecision & { type: 'BLOCK' }) | null {
  if (error.status !== 403) return null;
  if (!error.serverCode || !isLoginBlockServerCode(error.serverCode)) return null;
  return ACCOUNT_RESTRICTION_SERVER_CODES[error.serverCode];
}

const fallbackMessages: Record<MemberErrorCode, string> = {
  VALIDATION_ERROR: '입력값을 다시 확인해주세요.',
  UNAUTHORIZED: '아이디 또는 비밀번호를 확인해주세요.',
  FORBIDDEN: '현재 계정으로 이용할 수 없는 요청입니다.',
  DUPLICATED: '이미 사용 중인 정보입니다.',
  LOCKED: '보안상 계정 이용이 일시적으로 제한되었습니다.',
  RATE_LIMITED: '요청이 많습니다. 잠시 후 다시 시도해주세요.',
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 연결을 확인한 뒤 다시 시도해주세요.',
  UNKNOWN: '요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.',
};

export function getMemberErrorCode(statusCode: number): MemberErrorCode {
  if (statusCode === 0) return MEMBER_ERROR_CODE.NETWORK_ERROR;

  switch (statusCode) {
    case 400:
      return MEMBER_ERROR_CODE.VALIDATION_ERROR;
    case 401:
      return MEMBER_ERROR_CODE.UNAUTHORIZED;
    case 403:
      return MEMBER_ERROR_CODE.FORBIDDEN;
    case 409:
      return MEMBER_ERROR_CODE.DUPLICATED;
    case 423:
      return MEMBER_ERROR_CODE.LOCKED;
    case 429:
      return MEMBER_ERROR_CODE.RATE_LIMITED;
    case 500:
      return MEMBER_ERROR_CODE.SERVER_ERROR;
    default:
      return statusCode >= 500 ? MEMBER_ERROR_CODE.SERVER_ERROR : MEMBER_ERROR_CODE.UNKNOWN;
  }
}

export function toMemberApiError(statusCode: number, body?: ApiErrorBody): MemberApiError {
  const code = getMemberErrorCode(statusCode);
  const data = body?.data;
  const fieldErrors =
    data && typeof data === 'object' && 'fieldErrors' in data
      ? (data.fieldErrors as Record<string, string>)
      : undefined;

  return {
    code,
    status: statusCode,
    message: body?.message || fallbackMessages[code],
    serverCode: body?.code,
    fieldErrors,
    data: body?.data,
  };
}

export function getSafeLoginMessage(error: MemberApiError): string {
  if (error.code === MEMBER_ERROR_CODE.NETWORK_ERROR) return fallbackMessages.NETWORK_ERROR;
  if (error.code === MEMBER_ERROR_CODE.SERVER_ERROR || error.status >= 500) return fallbackMessages.SERVER_ERROR;
  if (error.code === MEMBER_ERROR_CODE.LOCKED) return fallbackMessages.LOCKED;
  if (error.code === MEMBER_ERROR_CODE.RATE_LIMITED) return fallbackMessages.RATE_LIMITED;
  if (error.code === MEMBER_ERROR_CODE.FORBIDDEN) return fallbackMessages.FORBIDDEN;
  return fallbackMessages[MEMBER_ERROR_CODE.UNAUTHORIZED];
}
