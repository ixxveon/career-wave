import { CalendarClock } from 'lucide-react';

type CancelSubscriptionModalProps = {
  productName: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function CancelSubscriptionModal({
  productName,
  isPending,
  onConfirm,
  onClose,
}: CancelSubscriptionModalProps) {
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
            type="button"
            className="cw-subscription-modal__ghost"
            onClick={onClose}
            disabled={isPending}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
