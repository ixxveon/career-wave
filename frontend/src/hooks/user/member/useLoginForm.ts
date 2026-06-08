import { useNavigate, useSearchParams } from 'react-router-dom';
import { type FormEvent, useMemo, useState } from 'react';
import type { LoginRouteDecision } from '../../../types/user/member';
import { authSession } from '../../../utils/user/member/authSession';
import { getSafeLoginMessage, type MemberApiError } from '../../../utils/user/member/errorMapping';
import {
  hasLoginFormErrors,
  toLoginRequest,
  validateLoginForm,
  type LoginFormErrors,
  type LoginTab,
} from '../../../utils/user/member/loginSchema';
import { getLoginRouteDecision, isNextPathCompatible, useLogin } from './useLogin';

type CredentialKey = 'loginId' | 'password';

type Credentials = {
  loginId: string;
  password: string;
};

type BlockMessage = {
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
};

const BLOCK_MESSAGE_BY_REASON: Record<
  Extract<LoginRouteDecision, { type: 'BLOCK' }>['reason'],
  BlockMessage
> = {
  COMPANY_PENDING: {
    title: '기업회원 승인 검토 중입니다.',
    description: '제출하신 기업정보와 재직증명서를 확인하고 있습니다. 승인 완료 후 기업 서비스를 이용할 수 있습니다.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
  COMPANY_REJECTED: {
    title: '기업회원 가입 승인이 반려되었습니다.',
    description: '상세한 반려 사유와 재신청 가능 여부는 고객센터를 통해 확인해주세요.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
  COMPANY_NEEDS_REVISION: {
    title: '기업회원 정보 보완이 필요합니다.',
    description: '기업정보 또는 제출 서류 보완 후 다시 검토를 요청해주세요.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
  RESTRICTED: {
    title: '현재 계정으로 서비스를 이용할 수 없습니다.',
    description: '계정 보안 또는 이용 제한 상태입니다. 상세 내부 사유는 노출되지 않으며 복구 가능 여부는 고객센터에서 확인해주세요.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
};

export function useLoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginMutation = useLogin();
  const [loginType, setLoginType] = useState<LoginTab>('personal');
  const [credentials, setCredentials] = useState<Credentials>({
    loginId: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [blockedDecision, setBlockedDecision] = useState<Extract<LoginRouteDecision, { type: 'BLOCK' }> | null>(null);

  const isSubmitting = loginMutation.isPending;
  const blockedMessage = useMemo(
    () => (blockedDecision ? BLOCK_MESSAGE_BY_REASON[blockedDecision.reason] : null),
    [blockedDecision],
  );

  const updateCredential = (key: CredentialKey, value: string) => {
    setCredentials((current) => ({
      ...current,
      [key]: value,
    }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    setBlockedDecision(null);
  };

  const updateLoginType = (type: LoginTab) => {
    setLoginType(type);
    setFieldErrors({});
    setBlockedDecision(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateLoginForm(credentials);
    setFieldErrors(nextErrors);
    setBlockedDecision(null);

    if (hasLoginFormErrors(nextErrors)) return;

    try {
      const response = await loginMutation.mutateAsync(toLoginRequest(credentials, loginType));
      const decision = getLoginRouteDecision(response);

      if (decision.type === 'BLOCK') {
        authSession.clear();
        setBlockedDecision(decision);
        return;
      }

      authSession.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      authSession.setMember(response.member);

      // ?next= 파라미터가 있고, 안전한 내부 경로이며, 회원 유형과 호환될 때만 해당 경로로 이동
      // startsWith('/') && !startsWith('//') — //evil.com 같은 프로토콜 상대 URL 차단
      const nextPath = searchParams.get('next');
      const safePath = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null;
      const compatiblePath = safePath && isNextPathCompatible(safePath, response.member.memberType) ? safePath : null;
      navigate(compatiblePath ?? decision.path, { replace: true });
    } catch (error) {
      setFieldErrors({
        form: getSafeLoginMessage(error as MemberApiError),
      });
    }
  };

  return {
    blockedDecision,
    blockedMessage,
    credentials,
    fieldErrors,
    isSubmitting,
    loginType,
    handleSubmit,
    updateCredential,
    updateLoginType,
  };
}
