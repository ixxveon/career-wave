import type { LoginTab } from '../../utils/member/loginSchema';

type LoginTypeTabsProps = {
  value: LoginTab;
  onChange: (nextValue: LoginTab) => void;
};

export function LoginTypeTabs({ value, onChange }: LoginTypeTabsProps) {
  return (
    <div className="cw-register-tabs cw-register-tabs--auth" role="tablist" aria-label="로그인 유형">
      <button
        aria-selected={value === 'personal'}
        className={value === 'personal' ? 'is-active' : ''}
        onClick={() => onChange('personal')}
        role="tab"
        type="button"
      >
        개인 로그인
      </button>
      <button
        aria-selected={value === 'company'}
        className={value === 'company' ? 'is-active' : ''}
        onClick={() => onChange('company')}
        role="tab"
        type="button"
      >
        기업 로그인
      </button>
    </div>
  );
}
