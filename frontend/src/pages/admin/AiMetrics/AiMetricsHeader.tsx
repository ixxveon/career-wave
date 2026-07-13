interface AiMetricsHeaderProps {
  summaryIsError: boolean;
  summaryStatusLabel: string;
  summaryLastSyncedLabel: string;
  summaryLoading: boolean;
  averageLatencyLabel: string;
  estimatedCostLabel: string;
  totalTokensLabel: string;
}

export default function AiMetricsHeader(props: AiMetricsHeaderProps) {
  const { summaryIsError, summaryStatusLabel, summaryLastSyncedLabel, summaryLoading, averageLatencyLabel, estimatedCostLabel, totalTokensLabel } = props;

  return (
    <header className="admin-header">
      <div>
        <h2>AI 메트릭스</h2>
        <p>AI 사용량과 리소스 상태를 한 화면에서 모니터링합니다.</p>
      </div>

      <div className="aiOpsHeaderStatus">
        <div className="aiOpsLiveState">
          <span className="aiOpsPulse" />
          <div>
            <strong>{summaryIsError ? '요약 연결 실패' : 'LIVE 모니터링'}</strong>
            <small>{summaryLastSyncedLabel}</small>
          </div>
        </div>
        <div className="aiOpsHeaderMeta">
          <span>{summaryStatusLabel}</span>
          <span>평균 응답 {summaryLoading ? '조회 중' : averageLatencyLabel}</span>
          <span>누적 비용 {summaryLoading ? '조회 중' : estimatedCostLabel}</span>
          <span>전체 토큰 {totalTokensLabel}</span>
        </div>
      </div>
    </header>
  );
}
