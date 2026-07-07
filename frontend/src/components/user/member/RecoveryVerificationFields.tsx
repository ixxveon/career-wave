import type { InputHTMLAttributes, ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { VerificationState } from '../../../utils/user/member/recoveryView';
import { formatRemaining } from '../../../utils/user/member/recoveryView';
import { applyInputFill, clearInputFill } from '../../../utils/user/member/inputFill';

interface RecoveryContactFieldProps {
  label: string;
  icon: ReactNode;
  value: string;
  placeholder: string;
  error?: string;
  verification: VerificationState;
  feedbackText: string;
  sendPending: boolean;
  resendIn: number;
  buttonClassName?: string;
  inputType?: InputHTMLAttributes<HTMLInputElement>['type'];
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  onChange: (value: string) => void;
  onSend: () => void;
  onReset: () => void;
}

interface RecoveryCodeFieldProps {
  label: string;
  code: string;
  error?: string;
  verification: VerificationState;
  expiresIn: number;
  confirmPending: boolean;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
}

export function RecoveryContactField({
  label,
  icon,
  value,
  placeholder,
  error,
  verification,
  feedbackText,
  sendPending,
  resendIn,
  buttonClassName = 'cw-auth-sub-button',
  inputType = 'text',
  inputMode,
  onChange,
  onSend,
  onReset,
}: RecoveryContactFieldProps) {
  // 인증번호 전송 후에는 대상(이메일/휴대폰)을 잠가 실제 인증 대상과 제출 값의 불일치를 방지한다.
  const locked = Boolean(verification.verificationId);
  return (
    <label>
      {label}
      <div className={locked ? 'cw-auth-inline cw-auth-inline--triple' : 'cw-auth-inline'}>
        <span>
          {icon}
          <input
            aria-invalid={Boolean(error)}
            type={inputType}
            inputMode={inputMode}
            placeholder={placeholder}
            value={value}
            readOnly={locked}
            onChange={(event) => { onChange(event.target.value); applyInputFill(event.target); }}
            onBlur={(event) => clearInputFill(event.target)}
          />
        </span>
        <button
          className={buttonClassName}
          disabled={sendPending || Boolean(verification.verificationToken) || resendIn > 0}
          type="button"
          onClick={onSend}
        >
          {sendPending ? '전송 중' : (!verification.verificationToken && resendIn > 0) ? `${formatRemaining(resendIn)}` : '인증번호 전송'}
        </button>
        {locked && (
          <button
            className="cw-auth-button-secondary cw-auth-button-secondary--change"
            type="button"
            onClick={onReset}
          >
            변경
          </button>
        )}
      </div>
      {error && <p className="cw-register-error">{error}</p>}
      {verification.verificationId && !error && (
        <span className="cw-auth-feedback">
          <CheckCircle2 size={15} />
          {feedbackText}
          {verification.remainingAttempts > 0 && ` 남은 시도 ${verification.remainingAttempts}회`}
        </span>
      )}
    </label>
  );
}

export function RecoveryCodeField({
  label,
  code,
  error,
  verification,
  expiresIn,
  confirmPending,
  onCodeChange,
  onConfirm,
}: RecoveryCodeFieldProps) {
  // 인증번호 입력 필드는 전송 후(verificationId 존재)에만 노출한다. (issue #1036)
  if (!verification.verificationId) return null;

  const verified = Boolean(verification.verificationToken);
  return (
    <label>
      {label}
      <div className="cw-auth-inline">
        <span>
          <CheckCircle2 size={18} />
          <input
            aria-invalid={Boolean(error)}
            inputMode="numeric"
            type="text"
            placeholder="인증번호 6자리 입력"
            value={code}
            readOnly={verified}
            onChange={(event) => { onCodeChange(event.target.value); applyInputFill(event.target); }}
            onBlur={(event) => clearInputFill(event.target)}
          />
        </span>
        <button
          className="cw-auth-button-secondary cw-auth-button-secondary--confirm"
          disabled={confirmPending || verified}
          type="button"
          onClick={onConfirm}
        >
          {confirmPending ? '확인 중' : '인증 확인'}
        </button>
      </div>
      {error && <p className="cw-register-error">{error}</p>}
      {verification.verificationToken && !error && (
        <span className="cw-auth-feedback">
          <CheckCircle2 size={15} />
          인증이 완료되었습니다.
        </span>
      )}
      {!verification.verificationToken && verification.expiresAt && expiresIn > 0 && (
        <span className="cw-auth-feedback">
          <CheckCircle2 size={15} />
          인증번호 유효시간 {formatRemaining(expiresIn)}
        </span>
      )}
    </label>
  );
}
