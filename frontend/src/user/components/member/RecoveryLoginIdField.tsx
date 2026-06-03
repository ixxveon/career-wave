import { UserRound } from 'lucide-react';

interface RecoveryLoginIdFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function RecoveryLoginIdField({ value, error, onChange }: RecoveryLoginIdFieldProps) {
  return (
    <label>
      아이디
      <span>
        <UserRound size={18} />
        <input
          aria-invalid={Boolean(error)}
          type="text"
          placeholder="아이디를 입력하세요"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      {error && <p className="cw-register-error">{error}</p>}
    </label>
  );
}

export default RecoveryLoginIdField;
