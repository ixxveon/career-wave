import type { AiHeavyUser } from '../../../api/admin/aiMetricsApi';
import { formatDateTime, getApiStateMessage, getMaskedHeavyUserLabel, getRiskTone } from './aiMetricsPageUtils';

export default function AiMetricsHeavyUsersSection(props: {
  heavyUsers: AiHeavyUser[];
  heavyUsersLoading: boolean;
  heavyUsersIsError: boolean;
  heavyUsersError: Error | null;
  heavyUsersEmpty: boolean;
}) {
  const { heavyUsers, heavyUsersLoading, heavyUsersIsError, heavyUsersError, heavyUsersEmpty } = props;

  return (
    <section className="admin-card aiOpsHeavyCard">
      <div className="aiOpsPanelHead compact">
        <div>
          <span className="aiOpsEyebrow">이상치 트래커(토큰 사용량)</span>
          <h3>헤비 유저 토큰 트래커</h3>
        </div>
      </div>

      <div className="aiOpsTableWrap compact">
        <table className="aiOpsTable">
          <thead>
            <tr>
              <th>사용자</th>
              <th>도메인</th>
              <th>누적 토큰</th>
              <th>요청 수</th>
              <th>위험도</th>
              <th>최근 사용</th>
            </tr>
          </thead>
          <tbody>
            {(heavyUsersLoading || heavyUsersIsError || heavyUsersEmpty) && (
              <tr className="placeholder">
                <td colSpan={6}>
                  {heavyUsersIsError
                    ? getApiStateMessage(heavyUsersError, '헤비 유저 데이터를 불러오지 못했습니다.')
                    : heavyUsersEmpty
                      ? '표시할 헤비 유저 데이터가 없습니다.'
                      : '헤비 유저 데이터를 불러오는 중입니다.'}
                </td>
              </tr>
            )}
            {heavyUsers.map((user) => (
              <tr key={`${user.userId}-${user.domain}`}>
                <td>{getMaskedHeavyUserLabel(user)}</td>
                <td>{user.domainLabel}</td>
                <td>{user.tokenUsage.toLocaleString()}</td>
                <td>{user.requestCount.toLocaleString()}</td>
                <td><span className={`aiOpsBadge ${getRiskTone(user.riskLevel)}`}>{user.riskLevel}</span></td>
                <td>{formatDateTime(user.lastUsedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
