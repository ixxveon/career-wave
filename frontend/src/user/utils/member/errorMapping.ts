import type { ApiErrorBody } from '../../types/member';

export type MemberErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DUPLICATED'
  | 'LOCKED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface MemberApiError {
  code: MemberErrorCode;
  statusCode: number;
  message: string;
  fieldErrors?: Record<string, string>;
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
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 409:
      return 'DUPLICATED';
    case 423:
      return 'LOCKED';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'SERVER_ERROR';
    default:
      return statusCode >= 500 ? 'SERVER_ERROR' : 'UNKNOWN';
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
    statusCode,
    message: body?.message || fallbackMessages[code],
    fieldErrors,
  };
}

export function getSafeLoginMessage(error: MemberApiError): string {
  if (error.code === 'LOCKED') return fallbackMessages.LOCKED;
  if (error.code === 'RATE_LIMITED') return fallbackMessages.RATE_LIMITED;
  if (error.code === 'FORBIDDEN') return fallbackMessages.FORBIDDEN;
  return '아이디 또는 비밀번호를 확인해주세요.';
}
