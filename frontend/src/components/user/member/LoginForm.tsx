import { Link } from 'react-router-dom';
import { AlertCircle, LockKeyhole, UserRound } from 'lucide-react';
import type { FormEventHandler } from 'react';
import type { LoginRouteDecision } from '../../../types/user/member';
import type { LoginFormErrors } from '../../../utils/user/member/loginSchema';

type Credentials = {
  loginId: string;
  password: string;
};

type CredentialKey = keyof Credentials;

type BlockMessage = {
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
};

type LoginFormProps = {
  credentials: Credentials;
  fieldErrors: LoginFormErrors;
  blockedDecision: Extract<LoginRouteDecision, { type: 'BLOCK' }> | null;
  blockedMessage: BlockMessage | null;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCredentialChange: (key: CredentialKey, value: string) => void;
};

export function LoginForm({
  credentials,
  fieldErrors,
  blockedDecision,
  blockedMessage,
  isSubmitting,
  onSubmit,
  onCredentialChange,
}: LoginFormProps) {
  return (
    <form className="cw-auth-form" onSubmit={onSubmit} noValidate>
      <label>
        아이디
        <span>
          <UserRound size={18} />
          <input
            aria-invalid={Boolean(fieldErrors.loginId)}
            aria-describedby={fieldErrors.loginId ? 'login-id-error' : undefined}
            autoComplete="username"
            name="loginId"
            type="text"
            placeholder="아이디를 입력하세요"
            value={credentials.loginId}
            onChange={(event) => onCredentialChange('loginId', event.target.value)}
          />
        </span>
        {fieldErrors.loginId && (
          <p className="cw-register-error" id="login-id-error">
            {fieldErrors.loginId}
          </p>
        )}
      </label>
      <label>
        비밀번호
        <span>
          <LockKeyhole size={18} />
          <input
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            autoComplete="current-password"
            name="password"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={credentials.password}
            onChange={(event) => onCredentialChange('password', event.target.value)}
          />
        </span>
        {fieldErrors.password && (
          <p className="cw-register-error" id="login-password-error">
            {fieldErrors.password}
          </p>
        )}
      </label>
      {fieldErrors.form && (
        <p className="cw-auth-message cw-auth-message--error" role="alert">
          <AlertCircle size={16} />
          {fieldErrors.form}
        </p>
      )}
      {blockedDecision && blockedMessage && (
        <div className="cw-auth-blocked" role="status" aria-live="polite">
          <div>
            <AlertCircle size={18} />
            <strong>{blockedMessage.title}</strong>
          </div>
          <p>{blockedMessage.description}</p>
          <Link to={blockedMessage.actionPath}>{blockedMessage.actionLabel}</Link>
        </div>
      )}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '로그인 중' : '로그인'}
      </button>
    </form>
  );
}
