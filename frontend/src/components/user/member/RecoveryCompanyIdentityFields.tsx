import { Building2, UserRound } from 'lucide-react';
import { applyInputFill, clearInputFill } from '../../../utils/user/member/inputFill';

interface RecoveryCompanyIdentityFieldsProps {
  loginId?: string;
  loginIdError?: string;
  managerName: string;
  managerNameError?: string;
  businessNumber: string;
  businessNumberError?: string;
  onLoginIdChange?: (value: string) => void;
  onManagerNameChange: (value: string) => void;
  onBusinessNumberChange: (value: string) => void;
}

function RecoveryCompanyIdentityFields({
  loginId,
  loginIdError,
  managerName,
  managerNameError,
  businessNumber,
  businessNumberError,
  onLoginIdChange,
  onManagerNameChange,
  onBusinessNumberChange,
}: RecoveryCompanyIdentityFieldsProps) {
  return (
    <>
      {onLoginIdChange && (
        <label>
          아이디
          <span>
            <UserRound size={18} />
            <input
              aria-invalid={Boolean(loginIdError)}
              type="text"
              placeholder="아이디를 입력하세요"
              value={loginId ?? ''}
              onChange={(event) => { onLoginIdChange(event.target.value); applyInputFill(event.target); }}
              onBlur={(event) => clearInputFill(event.target)}
            />
          </span>
          {loginIdError && <p className="cw-register-error">{loginIdError}</p>}
        </label>
      )}
      <label>
        담당자명
        <span>
          <UserRound size={18} />
          <input
            aria-invalid={Boolean(managerNameError)}
            type="text"
            placeholder="담당자명(실명)"
            value={managerName}
            onChange={(event) => { onManagerNameChange(event.target.value); applyInputFill(event.target); }}
            onBlur={(event) => clearInputFill(event.target)}
          />
        </span>
        {managerNameError && <p className="cw-register-error">{managerNameError}</p>}
      </label>
      <label>
        사업자등록번호
        <span>
          <Building2 size={18} />
          <input
            aria-invalid={Boolean(businessNumberError)}
            inputMode="numeric"
            type="text"
            placeholder="사업자등록번호('-' 없이 숫자만 입력)"
            value={businessNumber}
            onChange={(event) => { onBusinessNumberChange(event.target.value); applyInputFill(event.target); }}
            onBlur={(event) => clearInputFill(event.target)}
          />
        </span>
        {businessNumberError && <p className="cw-register-error">{businessNumberError}</p>}
      </label>
    </>
  );
}

export default RecoveryCompanyIdentityFields;
