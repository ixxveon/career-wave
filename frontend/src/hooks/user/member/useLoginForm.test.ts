// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FormEvent } from 'react';

// ── vi.hoisted: mock 팩토리 내에서 사용할 변수 선언 ────────────────
const {
  mockNavigate,
  mockSearchParamsGet,
  mockMutateAsync,
  mockClear,
  mockSetTokens,
  mockSetMember,
  mockGetLoginRouteDecision,
  mockIsNextPathCompatible,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSearchParamsGet: vi.fn().mockReturnValue(null),
  mockMutateAsync: vi.fn(),
  mockClear: vi.fn(),
  mockSetTokens: vi.fn(),
  mockSetMember: vi.fn(),
  mockGetLoginRouteDecision: vi.fn(),
  mockIsNextPathCompatible: vi.fn().mockReturnValue(true),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [{ get: mockSearchParamsGet }, vi.fn()],
}));

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: {
    clear: mockClear,
    setTokens: mockSetTokens,
    setMember: mockSetMember,
    getAccessToken: vi.fn().mockReturnValue(null),
    getRefreshToken: vi.fn().mockReturnValue(null),
  },
}));

vi.mock('./useLogin', () => ({
  useLogin: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  getLoginRouteDecision: mockGetLoginRouteDecision,
  isNextPathCompatible: mockIsNextPathCompatible,
}));

import { useLoginForm, CROSS_TAB_ERROR_MESSAGES } from './useLoginForm';
import {
  MEMBER_TYPE,
  MEMBER_STATUS,
  COMPANY_APPROVAL_STATUS,
} from '../../../types/user/member';

// ── 공통 mock 데이터 ──────────────────────────────
const PERSONAL_MEMBER = {
  memberId: 'uuid-001',
  loginId: 'testuser01',
  name: '테스트유저',
  memberType: MEMBER_TYPE.USER,
  memberStatus: MEMBER_STATUS.ACTIVE,
  companyApprovalStatus: COMPANY_APPROVAL_STATUS.NONE,
  lastLoginAt: null,
};

const COMPANY_MEMBER = {
  memberId: 'uuid-002',
  loginId: 'testcompany01',
  name: '테스트기업',
  memberType: MEMBER_TYPE.COMPANY,
  memberStatus: MEMBER_STATUS.ACTIVE,
  companyApprovalStatus: COMPANY_APPROVAL_STATUS.APPROVED,
  lastLoginAt: null,
};

const BASE_RESPONSE = { accessToken: 'mock-access', refreshToken: 'mock-refresh' };

// ── 테스트 헬퍼 ───────────────────────────────────
function setValidCredentials(result: ReturnType<typeof renderHook<ReturnType<typeof useLoginForm>, void>>['result']) {
  act(() => {
    result.current.updateCredential('loginId', 'testuser01');
    result.current.updateCredential('password', 'Test1234!');
  });
}

async function submitForm(result: ReturnType<typeof renderHook<ReturnType<typeof useLoginForm>, void>>['result']) {
  await act(async () => {
    await result.current.handleSubmit({
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>);
  });
}

// ── 테스트 ───────────────────────────────────────
describe('useLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsGet.mockReturnValue(null);
    mockIsNextPathCompatible.mockReturnValue(true);
  });

  describe('BLOCK 결정 처리', () => {
    it('BLOCK 결정 시 authSession.clear() 호출 후 blockedDecision이 설정되고 navigate가 호출되지 않는다', async () => {
      mockMutateAsync.mockResolvedValue({ ...BASE_RESPONSE, member: PERSONAL_MEMBER });
      mockGetLoginRouteDecision.mockReturnValue({ type: 'BLOCK', reason: 'RESTRICTED' });

      const { result } = renderHook(() => useLoginForm());
      setValidCredentials(result);
      await submitForm(result);

      expect(mockClear).toHaveBeenCalled();
      expect(result.current.blockedDecision).toEqual({ type: 'BLOCK', reason: 'RESTRICTED' });
      expect(mockSetTokens).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('로그인 탭-회원 유형 불일치', () => {
    it('기업 탭에서 개인 회원 로그인 시 에러 메시지가 표시되고 navigate가 호출되지 않는다', async () => {
      mockMutateAsync.mockResolvedValue({ ...BASE_RESPONSE, member: PERSONAL_MEMBER });
      mockGetLoginRouteDecision.mockReturnValue({ type: 'ALLOW', path: '/' });

      const { result } = renderHook(() => useLoginForm());
      act(() => { result.current.updateLoginType('company'); });
      setValidCredentials(result);
      await submitForm(result);

      expect(mockClear).toHaveBeenCalled();
      expect(result.current.fieldErrors.form).toBe(CROSS_TAB_ERROR_MESSAGES.company);
      expect(mockSetTokens).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('개인 탭에서 기업 회원 로그인 시 에러 메시지가 표시되고 navigate가 호출되지 않는다', async () => {
      mockMutateAsync.mockResolvedValue({ ...BASE_RESPONSE, member: COMPANY_MEMBER });
      mockGetLoginRouteDecision.mockReturnValue({ type: 'ALLOW', path: '/dashboard/company' });

      const { result } = renderHook(() => useLoginForm());
      setValidCredentials(result);
      await submitForm(result);

      expect(mockClear).toHaveBeenCalled();
      expect(result.current.fieldErrors.form).toBe(CROSS_TAB_ERROR_MESSAGES.personal);
      expect(mockSetTokens).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('next 파라미터 호환성 검사', () => {
    it('호환되지 않는 next 경로는 무시하고 decision.path로 이동한다', async () => {
      mockMutateAsync.mockResolvedValue({ ...BASE_RESPONSE, member: PERSONAL_MEMBER });
      mockGetLoginRouteDecision.mockReturnValue({ type: 'ALLOW', path: '/' });
      mockSearchParamsGet.mockReturnValue('/dashboard/company');
      mockIsNextPathCompatible.mockReturnValue(false);

      const { result } = renderHook(() => useLoginForm());
      setValidCredentials(result);
      await submitForm(result);

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('호환되는 next 경로는 해당 경로로 이동한다', async () => {
      mockMutateAsync.mockResolvedValue({ ...BASE_RESPONSE, member: PERSONAL_MEMBER });
      mockGetLoginRouteDecision.mockReturnValue({ type: 'ALLOW', path: '/' });
      mockSearchParamsGet.mockReturnValue('/mypage');
      mockIsNextPathCompatible.mockReturnValue(true);

      const { result } = renderHook(() => useLoginForm());
      setValidCredentials(result);
      await submitForm(result);

      expect(mockNavigate).toHaveBeenCalledWith('/mypage', { replace: true });
    });
  });
});
