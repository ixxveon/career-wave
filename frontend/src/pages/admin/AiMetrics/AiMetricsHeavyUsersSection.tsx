import type { AiHeavyUser } from '../../../api/admin/aiMetricsApi';
import { formatCost, getApiStateMessage, getMaskedHeavyUserLabel } from './aiMetricsPageUtils';

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
          <span className="aiOpsEyebrow">회원별 AI 사용량</span>
          <h3>누적 토큰 상위 사용자</h3>
        </div>
      </div>

      <div className="aiOpsTableWrap compact">
        <table className="aiOpsTable">
          <thead>
            <tr>
              <th>회원</th>
              <th>누적 토큰</th>
              <th>예상 비용</th>
              <th>요청 수</th>
            </tr>
          </thead>
          <tbody>
            {(heavyUsersLoading || heavyUsersIsError || heavyUsersEmpty) && (
              <tr className="placeholder">
                <td colSpan={4}>
                  {heavyUsersIsError
                    ? getApiStateMessage(heavyUsersError, '헤비 유저 데이터를 불러오지 못했습니다.')
                    : heavyUsersEmpty
                      ? '표시할 헤비 유저 데이터가 없습니다.'
                      : '헤비 유저 데이터를 불러오는 중입니다.'}
                </td>
              </tr>
            )}
            {heavyUsers.map((user) => (
              <tr key={user.userId}>
                <td>{getMaskedHeavyUserLabel(user)}</td>
                <td>{user.tokenUsage.toLocaleString()}</td>
                <td>{formatCost(user.estimatedCost)}</td>
                <td>{user.requestCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
