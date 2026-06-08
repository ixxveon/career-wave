import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface RecoveryPasswordActionAreaProps {
  formMessage: string;
  successMessage: string;
  hasResetToken: boolean;
  issuePasswordTokenPending: boolean;
  resetPasswordPending: boolean;
  onSubmit: () => void;
}

function RecoveryPasswordActionArea({
  formMessage,
  successMessage,
  hasResetToken,
  issuePasswordTokenPending,
  resetPasswordPending,
  onSubmit,
}: RecoveryPasswordActionAreaProps) {
  return (
    <>
      {formMessage && (
        <p className="cw-auth-message cw-auth-message--error" role="alert">
          <AlertCircle size={16} />
          {formMessage}
        </p>
      )}
      {successMessage && (
        <p className="cw-auth-feedback" role="status" aria-live="polite">
          <CheckCircle2 size={15} />
          {successMessage}
        </p>
      )}

      <button
        className="cw-auth-main-button"
        disabled={issuePasswordTokenPending || resetPasswordPending}
        type="button"
        onClick={onSubmit}
      >
        {hasResetToken
          ? resetPasswordPending
            ? '저장 중'
            : '새 비밀번호 저장'
          : issuePasswordTokenPending
            ? '확인 중'
            : '비밀번호 재설정 진행'}
      </button>
    </>
  );
}

export default RecoveryPasswordActionArea;
