import { useId } from 'react';
import { UserRound } from 'lucide-react';
import { applyInputFill, clearInputFill } from '../../../utils/user/member/inputFill';

interface RecoveryLoginIdFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function RecoveryLoginIdField({ value, error, onChange }: RecoveryLoginIdFieldProps) {
  const errorId = useId();

  return (
    <label>
      아이디
      <span>
        <UserRound size={18} />
        <input
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          type="text"
          placeholder="아이디를 입력하세요"
          value={value}
          onChange={(event) => { onChange(event.target.value); applyInputFill(event.target); }}
          onBlur={(event) => clearInputFill(event.target)}
        />
      </span>
      {error && (
        <p className="cw-register-error" id={errorId}>
          {error}
        </p>
      )}
    </label>
  );
}

export default RecoveryLoginIdField;
