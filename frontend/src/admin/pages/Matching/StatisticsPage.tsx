import { TrendingUp, DollarSign, Users, UserPlus } from 'lucide-react';
import '../../styles/admin.css';
import '../../styles/Statistics.css';

const kpis = [
  { label: '이번 달 매출',      value: '₩ 38,500,000',  sub: '전월 대비 +12.6%', color: 'kpi-green',  Icon: TrendingUp },
  { label: '누적 총 매출',      value: '₩ 186,500,000', sub: '서비스 오픈 이후',  color: 'kpi-blue',   Icon: DollarSign },
  { label: '총 가입자 수',      value: '12,847명',       sub: '서비스 오픈 이후',  color: 'kpi-purple', Icon: Users      },
  { label: '이번 달 신규 가입', value: '314명',           sub: '전월 대비 +2.3%',  color: 'kpi-yellow', Icon: UserPlus   },
];

const monthlyRevenue = [
  { month: '12월', monthly: 16500000, annual:  8300000, total: 24800000, prev: null      },
  { month: '1월',  monthly: 18600000, annual:  8900000, total: 27500000, prev: 24800000  },
  { month: '2월',  monthly: 19400000, annual:  9700000, total: 29100000, prev: 27500000  },
  { month: '3월',  monthly: 21800000, annual: 10600000, total: 32400000, prev: 29100000  },
  { month: '4월',  monthly: 23200000, annual: 11000000, total: 34200000, prev: 32400000  },
  { month: '5월',  monthly: 26900000, annual: 11600000, total: 38500000, prev: 34200000  },
];

const monthlyGrowth = [
  { month: '12월', individual: 180, company: 32 },
  { month: '1월',  individual: 210, company: 38 },
  { month: '2월',  individual: 195, company: 41 },
  { month: '3월',  individual: 240, company: 45 },
  { month: '4월',  individual: 258, company: 49 },
  { month: '5월',  individual: 262, company: 52 },
];

const MAX_REV    = 38500000;
const MAX_GROWTH = 314;

export default function StatisticsPage() {
  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>서비스 통계 및 분석</h2>
          <p>매출 현황과 가입자 증가 추이를 확인합니다.</p>
        </div>
      </header>

      <div className="memberPage">

        {/* KPI */}
        <section className="memberSummaryGrid">
          {kpis.map(({ label, value, sub, color, Icon }) => (
            <article className={`memberSummaryCard ${color}`} key={label}>
              <div className="memberKpiContent">
                <p>{label}</p>
                <h3>{value}</h3>
                <span>{sub}</span>
              </div>
              <div className={`memberKpiIcon ${color}`}>
                <Icon size={22} />
              </div>
            </article>
          ))}
        </section>

        {/* ── 매출 통계 ── */}
        <div className="matchChartGrid">

          {/* 월별 매출 바 차트 */}
          <section className="admin-card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 700, color: '#1c3e63' }}>
              월별 매출 추이
            </h3>
            <div className="matchBarChart">
              {monthlyRevenue.map((m) => (
                <div className="matchBarItem" key={m.month}>
                  <span className="matchBarVal">
                    {Math.round(m.total / 10000).toLocaleString()}만
                  </span>
                  <div
                    className="matchBarFill revenue"
                    style={{ height: Math.round((m.total / MAX_REV) * 160) }}
                  />
                  <span className="matchBarLabel">{m.month}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 채널별 매출 구성 테이블 */}
          <section className="admin-card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#1c3e63' }}>
              채널별 매출 구성
            </h3>
            <table className="memberTable" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>월</th>
                  <th>월정액</th>
                  <th>연정액</th>
                  <th>합계</th>
                  <th>전월 대비</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue.map((m) => {
                  const change = m.prev != null
                    ? ((m.total - m.prev) / m.prev * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={m.month}>
                      <td>{m.month}</td>
                      <td>₩{Math.round(m.monthly / 10000).toLocaleString()}만</td>
                      <td>₩{Math.round(m.annual  / 10000).toLocaleString()}만</td>
                      <td><strong>₩{Math.round(m.total / 10000).toLocaleString()}만</strong></td>
                      <td>
                        {change != null ? (
                          <span style={{ color: '#2c7a4b', fontWeight: 600 }}>+{change}%</span>
                        ) : (
                          <span style={{ color: '#aab6c3' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        {/* ── 가입자 증가 추이 ── */}
        <div className="matchChartGrid">

          {/* 월별 신규 가입 바 차트 */}
          <section className="admin-card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#1c3e63' }}>
              월별 신규 가입자 추이
            </h3>
            <div className="matchTrendLegend">
              <span><i className="matchDot doc" />개인 회원</span>
              <span><i className="matchDot comp" />기업 회원</span>
            </div>
            <div className="matchTrend">
              {monthlyGrowth.map((m) => (
                <div className="matchTrendCol" key={m.month}>
                  <div className="matchTrendBars">
                    <div
                      className="matchTrendBar doc"
                      style={{ height: Math.round((m.individual / MAX_GROWTH) * 160) }}
                    >
                      <span>{m.individual}</span>
                    </div>
                    <div
                      className="matchTrendBar comp"
                      style={{ height: Math.round((m.company / MAX_GROWTH) * 160) }}
                    >
                      <span>{m.company}</span>
                    </div>
                  </div>
                  <p>{m.month}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 가입자 현황 테이블 */}
          <section className="admin-card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#1c3e63' }}>
              가입자 현황
            </h3>
            <table className="memberTable" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>월</th>
                  <th>개인 신규</th>
                  <th>기업 신규</th>
                  <th>월 합계</th>
                </tr>
              </thead>
              <tbody>
                {monthlyGrowth.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td>{m.individual.toLocaleString()}</td>
                    <td>{m.company.toLocaleString()}</td>
                    <td><strong>{(m.individual + m.company).toLocaleString()}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

      </div>
    </section>
  );
}
