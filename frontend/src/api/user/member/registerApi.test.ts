// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { memberRegisterApi } from './registerApi';
import type { CheckBusinessNumberResponse } from '../../../types/user/member';

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: {
    getAccessToken: vi.fn().mockReturnValue(null),
    setAccessToken: vi.fn(),
    clear: vi.fn(),
  },
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── checkBusinessNumber ─────────────────────────────────────────────────────

describe('memberRegisterApi.checkBusinessNumber', () => {
  it('정상 사업자 응답 시 valid=true, CONTINUING을 반환한다', async () => {
    const body: CheckBusinessNumberResponse = { valid: true, businessStatus: 'CONTINUING' };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberRegisterApi.checkBusinessNumber({ businessNumber: '1234567890' });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/company/business-number/check');
    expect(init?.method).toBe('POST');
    const sent = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(sent.businessNumber).toBe('1234567890');
    expect(result.valid).toBe(true);
    expect(result.businessStatus).toBe('CONTINUING');
  });

  it('휴업 사업자 응답 시 valid=false, SUSPENDED를 반환한다', async () => {
    const body: CheckBusinessNumberResponse = { valid: false, businessStatus: 'SUSPENDED' };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberRegisterApi.checkBusinessNumber({ businessNumber: '9876543210' });
    expect(result.valid).toBe(false);
    expect(result.businessStatus).toBe('SUSPENDED');
  });

  it('폐업 사업자 응답 시 valid=false, CLOSED를 반환한다', async () => {
    const body: CheckBusinessNumberResponse = { valid: false, businessStatus: 'CLOSED' };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberRegisterApi.checkBusinessNumber({ businessNumber: '1111111111' });
    expect(result.valid).toBe(false);
    expect(result.businessStatus).toBe('CLOSED');
  });

  it('미등록 응답 시 valid=false, NOT_REGISTERED를 반환한다', async () => {
    const body: CheckBusinessNumberResponse = { valid: false, businessStatus: 'NOT_REGISTERED' };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberRegisterApi.checkBusinessNumber({ businessNumber: '0000000000' });
    expect(result.valid).toBe(false);
    expect(result.businessStatus).toBe('NOT_REGISTERED');
  });

  it('503 응답 시 예외가 전파된다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          statusCode: 503,
          message: '사업자 검증 서비스를 이용할 수 없습니다.',
          code: 'COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE',
        }),
        { status: 503, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      memberRegisterApi.checkBusinessNumber({ businessNumber: '1234567890' }),
    ).rejects.toThrow();
  });
});
