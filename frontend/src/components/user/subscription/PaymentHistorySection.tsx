import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { type PaymentHistory, type PaymentHistoryPeriod } from '../../../types/user/subscription';
import { PAYMENT_HISTORY_PERIOD_OPTIONS } from '../../../utils/user/subscription/subscriptionContent';
import { PaymentHistoryList } from './PaymentHistoryList';

type PaymentHistorySectionProps = {
  periodFilter: PaymentHistoryPeriod;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  payments: PaymentHistory[];
  onPeriodChange: (period: PaymentHistoryPeriod) => void;
  onPageChange: (page: number | ((prev: number) => number)) => void;
};

export function PaymentHistorySection({
  periodFilter,
  page,
  totalPages,
  isLoading,
  isError,
  payments,
  onPeriodChange,
  onPageChange,
}: PaymentHistorySectionProps) {
  return (
    <section className="cw-subscription-section cw-billing-section">
      <div className="cw-subscription-section__head">
        <div>
          <h3>최근 결제 내역</h3>
          <p>기간별 결제 이력을 간단하게 확인할 수 있어요.</p>
        </div>
      </div>

      <div className="cw-billing-filters">
        <label>
          <span>기간 선택</span>
          <select
            value={periodFilter}
            onChange={(event) => {
              onPeriodChange(event.target.value as PaymentHistoryPeriod);
              onPageChange(1);
            }}
          >
            {PAYMENT_HISTORY_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="cw-billing-payment-empty">
          <div className="cw-billing-payment-empty__icon" aria-hidden="true">
            <Sparkles size={24} />
          </div>
          <strong>결제 내역을 불러오는 중이에요.</strong>
          <p>최근 결제 이력을 정리해서 보여드릴게요.</p>
        </div>
      ) : isError ? (
        <div className="cw-billing-payment-empty">
          <div className="cw-billing-payment-empty__icon" aria-hidden="true">
            <Sparkles size={24} />
          </div>
          <strong>결제 내역을 불러오지 못했어요.</strong>
          <p>잠시 후 다시 시도해주세요.</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="cw-billing-payment-empty">
          <div className="cw-billing-payment-empty__icon" aria-hidden="true">
            <Sparkles size={24} />
          </div>
          <strong>아직 최근 결제 내역이 없어요.</strong>
          <p>첫 구독 또는 무료 체험을 시작하면 최근 결제 내역이 이곳에 차곡차곡 쌓여요.</p>
        </div>
      ) : (
        <PaymentHistoryList payments={payments} />
      )}

      {totalPages > 1 && (
        <div className="cw-billing-pagination">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
            이전
          </button>
          <span>{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          >
            다음
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
