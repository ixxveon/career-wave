import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { formatRemaining } from '../../../utils/user/member/recoveryView';

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
  return (
    <>
      <label>
        새 비밀번호
        <span>
          <LockKeyhole size={18} />
          <input
            aria-invalid={Boolean(passwordError)}
            type="password"
            placeholder="비밀번호(8~64자의 영문, 숫자, 특수문자 포함)"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </span>
        {passwordError && <p className="cw-register-error">{passwordError}</p>}
      </label>
      <label>
        새 비밀번호 확인
        <span>
          <LockKeyhole size={18} />
          <input
            aria-invalid={Boolean(passwordConfirmError)}
            type="password"
            placeholder="비밀번호 재입력"
            value={passwordConfirm}
            onChange={(event) => onPasswordConfirmChange(event.target.value)}
          />
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
