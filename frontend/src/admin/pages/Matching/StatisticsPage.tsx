import { TrendingUp, DollarSign, Users, UserPlus } from 'lucide-react';
import '../../styles/admin.css';
import '../../styles/Statistics.css';

const kpis = [
  { label: '이번 달 매출',      value: '₩38,500,000',   sub: '전월 대비 +12.6%', color: 'kpi-green',  Icon: TrendingUp },
  { label: '누적 총 매출',      value: '₩186,500,000',  sub: '서비스 오픈 이후',  color: 'kpi-blue',   Icon: DollarSign },
  { label: '총 가입자 수',      value: '12,847명',        sub: '서비스 오픈 이후',  color: 'kpi-purple', Icon: Users      },
  { label: '이번 달 신규 가입', value: '314명',            sub: '전월 대비 +2.3%',  color: 'kpi-yellow', Icon: UserPlus   },
];

const monthlyRevenue = [
  { month: '12월', total: 24800000 },
  { month: '1월',  total: 27500000 },
  { month: '2월',  total: 29100000 },
  { month: '3월',  total: 32400000 },
  { month: '4월',  total: 34200000 },
  { month: '5월',  total: 38500000 },
];

const subscriptionBreakdown = [
  { abbr: '월', label: '프리미엄 월정액', amount: 26900000, growth: 15.9, up: true  },
  { abbr: '연', label: '프리미엄 연정액', amount: 11600000, growth:  5.5, up: true  },
  { abbr: '전', label: '신규 가입 전환',  amount:  3480000, growth: 22.1, up: true  },
  { abbr: '갱', label: '갱신 결제',       amount: 23420000, growth: 11.3, up: true  },
  { abbr: '환', label: '환불 차감',       amount:   580000, growth: -8.2, up: false },
];

const monthlyGrowth = [
  { month: '12월', individual: 180, company: 32 },
  { month: '1월',  individual: 210, company: 38 },
  { month: '2월',  individual: 195, company: 41 },
  { month: '3월',  individual: 240, company: 45 },
  { month: '4월',  individual: 258, company: 49 },
  { month: '5월',  individual: 262, company: 52 },
];

const recentActivity = [
  { initials: 'KM', name: '김민지', status: 'ACTIVE',  plan: '프리미엄 월정액', time: '5분 전'   },
  { initials: 'LJ', name: '이준호', status: 'PENDING', plan: '프리미엄 월정액', time: '23분 전'  },
  { initials: 'PS', name: '박서연', status: 'ACTIVE',  plan: '프리미엄 연정액', time: '1시간 전' },
  { initials: 'CD', name: '최도윤', status: 'ACTIVE',  plan: '프리미엄 월정액', time: '2시간 전' },
  { initials: 'KH', name: '강하늘', status: 'PENDING', plan: '신규 가입',       time: '3시간 전' },
];

function buildSvgPath(values: number[], vbW = 1000, vbH = 220, pad = 28) {
  const chartH = vbH - pad * 2;
  const maxVal = Math.max(...values) * 1.1;
  const pts: [number, number][] = values.map((v, i) => [
    Math.round((i / (values.length - 1)) * vbW),
    Math.round(pad + chartH - (v / maxVal) * chartH),
  ]);

  let line = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = Math.round((x0 + x1) / 2);
    line += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }

  const area = `${line} L${pts[pts.length - 1][0]},${vbH} L0,${vbH} Z`;
  return { line, area, pts };
}

const MAX_TOTAL = Math.max(...monthlyGrowth.map((m) => m.individual + m.company));
const CHART_H   = 140;

export default function StatisticsPage() {
  const { line, area, pts } = buildSvgPath(monthlyRevenue.map((m) => m.total));
  const peakIdx = pts.reduce((max, p, i) => (p[1] < pts[max][1] ? i : max), 0);

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

        {/* Row 1 ── 월별 매출 추이 + 구독 유형별 매출 실적 */}
        <div className="statsMainGrid">

          <section className="admin-card statsCard">
            <div className="statsCardHead">
              <div>
                <span className="statsEyebrow">월별 구독 매출 실적</span>
                <h3>월별 매출 추이</h3>
              </div>
              <span className="statsTrendBadge up">▲ +12.6%</span>
            </div>
            <div className="statsLineWrap">
              <div className="statsLineChartBox">
                <svg viewBox="0 0 1000 220" preserveAspectRatio="none" className="statsLineSvg">
                  <defs>
                    <linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#24496f" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#24496f" stopOpacity="0"    />
                    </linearGradient>
                  </defs>
                  <path d={area} fill="url(#statGrad)" />
                  <path d={line} fill="none" stroke="#24496f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy}
                      r={i === peakIdx ? 6.5 : 4.5}
                      fill="#24496f" stroke="white" strokeWidth="2.5"
                    />
                  ))}
                  {/* Peak 말풍선 */}
                  <rect x={pts[peakIdx][0] - 62} y={pts[peakIdx][1] - 36} width={124} height={24} rx="7" fill="#24496f" />
                  <text x={pts[peakIdx][0]} y={pts[peakIdx][1] - 19}
                    textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="inherit">
                    Peak: ₩38,500,000
                  </text>
                </svg>
                <div className="statsLineLabels">
                  {monthlyRevenue.map((m) => <span key={m.month}>{m.month}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section className="admin-card statsCard">
            <div className="statsCardHead">
              <div>
                <span className="statsEyebrow">이번 달 구독 유형별 성과</span>
                <h3>구독 유형별 매출 실적</h3>
              </div>
            </div>
            <div className="statsChannelList">
              <div className="statsChannelTableHead">
                <span>구독 유형</span>
                <span className="colAmt">매출액</span>
                <span className="colDelta">증감</span>
              </div>
              {subscriptionBreakdown.map((item) => (
                <div className="statsChannelRow" key={item.label}>
                  <div className="statsChannelIcon">{item.abbr}</div>
                  <span className="statsChannelName">{item.label}</span>
                  <span className="statsChannelAmt">
                    {item.up ? '' : '-'}₩{item.amount.toLocaleString()}
                  </span>
                  <span className={`statsGrowthBadge ${item.up ? 'up' : 'down'}`}>
                    {item.up ? '+' : ''}{item.growth}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Row 2 ── 신규 구독자 추이 + 최근 가입 피드 */}
        <div className="statsMainGrid">

          <section className="admin-card statsCard">
            <div className="statsCardHead">
              <div>
                <span className="statsEyebrow">개인 vs 기업 구독자 비교</span>
                <h3>신규 구독자 추이</h3>
              </div>
              <div className="statsLegend">
                <span className="navy">기업</span>
                <span className="teal">개인</span>
              </div>
            </div>
            <div className="statsStackedWrap">
              <div className="statsStackedChart">
                {monthlyGrowth.map((m) => {
                  const total  = m.individual + m.company;
                  const totalH = Math.round((total / MAX_TOTAL) * CHART_H);
                  const compH  = Math.round((m.company / MAX_TOTAL) * CHART_H);
                  const indivH = totalH - compH;
                  return (
                    <div className="statsStackedCol" key={m.month}>
                      <div className="statsStackedBars">
                        <div className="statsBarIndiv" style={{ height: indivH }} />
                        <div className="statsBarComp"  style={{ height: compH  }} />
                      </div>
                      <span>{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="admin-card statsCard">
            <div className="statsCardHead">
              <div>
                <span className="statsEyebrow">최근 구독 현황</span>
                <h3>최근 가입 피드</h3>
              </div>
              <button className="statsViewAllBtn">전체보기</button>
            </div>
            <div className="statsFeed">
              {recentActivity.map((item) => (
                <div className="statsFeedItem" key={item.name}>
                  <div className="statsAvatar">{item.initials}</div>
                  <div className="statsFeedInfo">
                    <strong>{item.name}</strong>
                    <div>
                      <span className={`statsStatusPill ${item.status.toLowerCase()}`}>{item.status}</span>
                      <span>{item.plan}</span>
                    </div>
                  </div>
                  <span className="statsFeedTime">{item.time}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </section>
  );
}
