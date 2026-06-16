import { useEffect, useRef } from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';

type CancelSubscriptionModalProps = {
  productName: string;
  isPending: boolean;
  isSuccess: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function CancelSubscriptionModal({
  productName,
  isPending,
  isSuccess,
  onConfirm,
  onClose,
}: CancelSubscriptionModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isSuccess) confirmButtonRef.current?.focus();
  }, [isSuccess]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPending, onClose]);

  return (
    <div
      className="cw-subscription-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-cancel-title"
    >
      <div
        className="cw-subscription-modal__backdrop"
        onClick={() => !isPending && onClose()}
      />
      <div className="cw-subscription-modal__dialog">
        {isSuccess ? (
          <>
            <div className="cw-subscription-modal__icon cw-subscription-modal__icon--success">
              <CheckCircle2 size={20} />
            </div>
            <h3 id="subscription-cancel-title">해지 신청이 완료되었습니다.</h3>
            <p>
              다음 결제일부터 자동 결제가 중단됩니다.
              남은 이용 기간 동안은 {productName}을(를) 계속 사용할 수 있어요.
            </p>
            <div className="cw-subscription-modal__actions">
              <button
                ref={confirmButtonRef}
                type="button"
                className="cw-subscription-modal__danger"
                onClick={onClose}
              >
                확인
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cw-subscription-modal__icon">
              <CalendarClock size={20} />
            </div>
            <h3 id="subscription-cancel-title">구독을 해지하시겠어요?</h3>
            <p>
              {productName} 구독을 해지하면 다음 결제일부터 자동 결제가 중단됩니다.
              남은 이용 기간 동안은 계속 사용할 수 있어요.
            </p>
            <div className="cw-subscription-modal__actions">
              <button
                type="button"
                className="cw-subscription-modal__danger"
                onClick={onConfirm}
                disabled={isPending}
              >
                {isPending ? '처리 중...' : '해지하기'}
              </button>
              <button
                ref={cancelButtonRef}
                type="button"
                className="cw-subscription-modal__ghost"
                onClick={onClose}
                disabled={isPending}
              >
                취소
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
