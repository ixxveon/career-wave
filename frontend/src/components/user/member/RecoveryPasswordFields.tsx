import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { formatRemaining } from '../../../utils/user/member/recoveryView';
import { applyInputFill, clearInputFill } from '../../../utils/user/member/inputFill';

interface RecoveryPasswordFieldsProps {
  password: string;
  passwordConfirm: string;
  passwordError?: string;
  passwordConfirmError?: string;
  resetExpiresAt: string;
  resetExpiresIn: number;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
}

function RecoveryPasswordFields({
  password,
  passwordConfirm,
  passwordError,
  passwordConfirmError,
  resetExpiresAt,
  resetExpiresIn,
  onPasswordChange,
  onPasswordConfirmChange,
}: RecoveryPasswordFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  return (
    <>
      <label>
        새 비밀번호
        <span className="cw-auth-span--with-toggle">
          <LockKeyhole size={18} />
          <input
            aria-invalid={Boolean(passwordError)}
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호(8~64자의 영문, 숫자, 특수문자 포함)"
            value={password}
            onChange={(event) => { onPasswordChange(event.target.value); applyInputFill(event.target); }}
            onBlur={(event) => clearInputFill(event.target)}
          />
          <button
            className="cw-auth-password-toggle"
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </span>
        {passwordError && <p className="cw-register-error">{passwordError}</p>}
      </label>
      <label>
        새 비밀번호 확인
        <span className="cw-auth-span--with-toggle">
          <LockKeyhole size={18} />
          <input
            aria-invalid={Boolean(passwordConfirmError)}
            type={showPasswordConfirm ? 'text' : 'password'}
            placeholder="비밀번호 재입력"
            value={passwordConfirm}
            onChange={(event) => { onPasswordConfirmChange(event.target.value); applyInputFill(event.target); }}
            onBlur={(event) => clearInputFill(event.target)}
          />
          <button
            className="cw-auth-password-toggle"
            type="button"
            tabIndex={-1}
            onClick={() => setShowPasswordConfirm((prev) => !prev)}
          >
            {showPasswordConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </span>
        {passwordConfirmError && <p className="cw-register-error">{passwordConfirmError}</p>}
        {resetExpiresAt && resetExpiresIn > 0 && (
          <span className="cw-auth-feedback">
            <CheckCircle2 size={15} />
            재설정 가능 시간 {formatRemaining(resetExpiresIn)}
          </span>
        )}
      </label>
    </>
  );
}

export default RecoveryPasswordFields;
