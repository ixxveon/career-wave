import { RECOVERY_METHOD, type RecoveryMethod } from '../../utils/member/recoverySchema';

interface RecoveryMethodTabsProps {
  method: RecoveryMethod;
  onChange: (method: RecoveryMethod) => void;
}

function RecoveryMethodTabs({ method, onChange }: RecoveryMethodTabsProps) {
  return (
    <div className="cw-register-tabs cw-register-tabs--auth" role="tablist" aria-label="개인회원 인증 방식">
      <button
        className={method === RECOVERY_METHOD.EMAIL ? 'is-active' : ''}
        type="button"
        role="tab"
        aria-selected={method === RECOVERY_METHOD.EMAIL}
        onClick={() => onChange(RECOVERY_METHOD.EMAIL)}
      >
        이메일로 인증
      </button>
      <button
        className={method === RECOVERY_METHOD.PHONE ? 'is-active' : ''}
        type="button"
        role="tab"
        aria-selected={method === RECOVERY_METHOD.PHONE}
        onClick={() => onChange(RECOVERY_METHOD.PHONE)}
      >
        휴대폰 번호로 인증
      </button>
    </div>
  );
}

export default RecoveryMethodTabs;
