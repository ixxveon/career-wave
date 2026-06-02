import type { InputHTMLAttributes, ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { VerificationState } from '../../utils/member/recoveryView';
import { formatRemaining } from '../../utils/member/recoveryView';

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
}

interface RecoveryCodeFieldProps {
  label: string;
  code: string;
  error?: string;
  verification: VerificationState;
  expiresIn: number;
  resendIn: number;
  confirmPending: boolean;
  sendPending: boolean;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
  onResend: () => void;
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
}: RecoveryContactFieldProps) {
  return (
    <label>
      {label}
      <div className="cw-auth-inline">
        <span>
          {icon}
          <input
            aria-invalid={Boolean(error)}
            type={inputType}
            inputMode={inputMode}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </span>
        <button
          className={buttonClassName}
          disabled={sendPending || resendIn > 0}
          type="button"
          onClick={onSend}
        >
          {sendPending ? '전송 중' : resendIn > 0 ? `${formatRemaining(resendIn)}` : '인증번호 전송'}
        </button>
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
  resendIn,
  confirmPending,
  sendPending,
  onCodeChange,
  onConfirm,
  onResend,
}: RecoveryCodeFieldProps) {
  return (
    <label>
      {label}
      <div className="cw-auth-inline cw-auth-inline--triple">
        <span>
          <CheckCircle2 size={18} />
          <input
            aria-invalid={Boolean(error)}
            inputMode="numeric"
            type="text"
            placeholder="인증번호 6자리 입력"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
          />
        </span>
        <button
          className="cw-auth-button-secondary cw-auth-button-secondary--confirm"
          disabled={confirmPending}
          type="button"
          onClick={onConfirm}
        >
          {confirmPending ? '확인 중' : '인증 확인'}
        </button>
        <button
          className="cw-auth-button-secondary cw-auth-button-secondary--resend"
          disabled={sendPending || resendIn > 0}
          type="button"
          onClick={onResend}
        >
          {sendPending ? '전송 중' : resendIn > 0 ? `${formatRemaining(resendIn)}` : '재전송'}
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
