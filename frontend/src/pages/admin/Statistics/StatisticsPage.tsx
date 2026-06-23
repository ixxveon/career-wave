import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Users, UserPlus, CreditCard, RefreshCw, Minus } from 'lucide-react';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/Statistics.css';
import { statsApi, REVENUE_TYPE, type RevenueType, type StatsSummary, type MonthlyRevenue, type RevenueBreakdownItem, type MonthlySubscribers, type RecentSubscriber } from '../../../api/admin/statsApi';
import type { ElementType } from 'react';

// 구독 유형별 아이콘 매핑
const BREAKDOWN_ICON_MAP: Record<RevenueType, ElementType> = {
  [REVENUE_TYPE.PREMIUM]: CreditCard,
  [REVENUE_TYPE.NEW_CONVERSION]: UserPlus,
  [REVENUE_TYPE.RENEWAL]: RefreshCw,
  [REVENUE_TYPE.REFUND_DEDUCTION]: Minus,
};

// ── 꺾은선 차트 공통 상수 ──────────────────────────────────────
const LINE_MAX_VAL = 45_000_000;
const LINE_VBH     = 220;
const LINE_PAD     = 28;
const LINE_VBW     = 1000;
const LINE_PAD_X   = 30;
const LINE_CHART_H_SVG = LINE_VBH - LINE_PAD * 2; // 164

// 매출 Y축 레이블 — 컴포넌트 내에서 axisMax 기준으로 동적 계산

// 구독자 Y축 레이블 (5항목, 동일 padding → 동일 CSS 재사용)
const SUB_MAX_VAL  = 400;
const subYLabels   = ['400명', '300명', '200명', '100명', '0'];
const subGridSvgY  = [400, 300, 200, 100, 0].map(
  v => Math.round(LINE_PAD + LINE_CHART_H_SVG * (1 - v / SUB_MAX_VAL))
); // [28, 69, 110, 151, 192]

// 금액 포맷 (구간별 단위 자동 전환)
// 10만 미만: ₩29,000 / 10만~1억: ₩29만 / 1억 이상: ₩1.2억
function toM(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs  = Math.abs(n);
  if (abs < 100_000) {
    return `${sign}₩${abs.toLocaleString()}`;
  }
  if (abs < 100_000_000) {
    const man = Math.round(abs / 10_000 * 10) / 10;
    const str = man % 1 === 0 ? String(man) : man.toFixed(1);
    return `${sign}₩${str}만`;
  }
  const uk  = Math.round(abs / 100_000_000 * 10) / 10;
  const str = uk % 1 === 0 ? String(uk) : uk.toFixed(1);
  return `${sign}₩${str}억`;
}

// SVG 꺾은선 path 생성 (maxVal 파라미터로 매출/구독자 공용 사용)
function buildSvgPath(values: number[], maxVal = LINE_MAX_VAL) {
  const xRange = LINE_VBW - 2 * LINE_PAD_X;
  const pts: [number, number][] = values.map((v, i) => [
    Math.round(LINE_PAD_X + (i / (values.length - 1)) * xRange),
    Math.round(LINE_PAD + LINE_CHART_H_SVG * (1 - v / maxVal)),
  ]);

  let line = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = Math.round((x0 + x1) / 2);
    line += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const area = `${line} L${pts[pts.length - 1][0]},${LINE_VBH} L${pts[0][0]},${LINE_VBH} Z`;
  return { line, area, pts };
}

const TOOLTIP_W = 104;


export default function StatisticsPage() {
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryIsError,
    error: summaryError,
  } = useQuery<StatsSummary, Error>({
    queryKey: ['admin', 'stats', 'summary'],
    queryFn: async () => {
      const res = await statsApi.getSummary();
      if (!res.data.success) throw new Error(res.data.message);
      return res.data.data;
    },
  });

  const {
    data: monthlyRevenueData,
    isLoading: revenueLoading,
    isError: revenueIsError,
    error: revenueError,
  } = useQuery<MonthlyRevenue[], Error>({
    queryKey: ['admin', 'stats', 'revenue', 'monthly'],
    queryFn: async () => {
      const res = await statsApi.getMonthlyRevenue();
      if (!res.data.success) throw new Error(res.data.message);
      return res.data.data;
    },
  });

  const {
    data: breakdownData,
    isLoading: breakdownLoading,
    isError: breakdownIsError,
    error: breakdownError,
  } = useQuery<RevenueBreakdownItem[], Error>({
    queryKey: ['admin', 'stats', 'revenue', 'breakdown'],
    queryFn: async () => {
      const res = await statsApi.getRevenueBreakdown();
      if (!res.data.success) throw new Error(res.data.message);
      return res.data.data;
    },
  });

  const {
    data: monthlySubscribersData,
    isLoading: subsLoading,
    isError: subsIsError,
    error: subsError,
  } = useQuery<MonthlySubscribers[], Error>({
    queryKey: ['admin', 'stats', 'subscribers', 'monthly'],
    queryFn: async () => {
      const res = await statsApi.getMonthlySubscribers();
      if (!res.data.success) throw new Error(res.data.message);
      return res.data.data;
    },
  });

  const {
    data: recentSubscribersData,
    isLoading: recentLoading,
    isError: recentIsError,
    error: recentError,
  } = useQuery<RecentSubscriber[], Error>({
    queryKey: ['admin', 'stats', 'subscribers', 'recent'],
    queryFn: async () => {
      const res = await statsApi.getRecentSubscribers();
      if (!res.data.success) throw new Error(res.data.message);
      return res.data.data;
    },
  });

  const monthlyRevenue     = monthlyRevenueData     ?? [];
  const breakdown          = breakdownData          ?? [];
  const monthlySubscribers = monthlySubscribersData ?? [];
  const recentSubscribers  = recentSubscribersData  ?? [];

  // KPI 카드 데이터 구성
  const kpis = summary
    ? [
        {
          label: '이번 달 매출',
          value: toM(summary.currentMonthRevenue),
          sub: `전월 대비 ${summary.currentMonthRevenueGrowth >= 0 ? '+' : ''}${summary.currentMonthRevenueGrowth}%`,
          color: 'kpi-green',
          Icon: TrendingUp,
        },
        {
          label: '누적 총 매출',
          value: toM(summary.totalRevenue),
          sub: '서비스 오픈 이후',
          color: 'kpi-blue',
          Icon: DollarSign,
        },
        {
          label: '총 가입자 수',
          value: `${summary.totalMembers.toLocaleString()}명`,
          sub: '서비스 오픈 이후',
          color: 'kpi-purple',
          Icon: Users,
        },
        {
          label: '이번 달 신규 가입',
          value: `${summary.currentMonthNewMembers.toLocaleString()}명`,
          sub: `전월 대비 ${summary.currentMonthNewMembersGrowth >= 0 ? '+' : ''}${summary.currentMonthNewMembersGrowth}%`,
          color: 'kpi-yellow',
          Icon: UserPlus,
        },
      ]
    : [];

  // 차트 — 데이터 없으면 빈 배열로 처리
  const revenueData   = monthlyRevenue.length > 0 ? monthlyRevenue : [];
  const revenueValues = revenueData.map(m => m.total);

  const maxRevenue = revenueValues.length > 0 ? Math.max(...revenueValues) : 0;
  const axisMax    = maxRevenue || LINE_MAX_VAL;

  // Y축 레이블/그리드를 axisMax 기준으로 동적 계산 (차트와 동일 스케일 보장)
  const lineGridValues = [axisMax, (axisMax * 2) / 3, axisMax / 3, 0];
  const lineYLabels    = lineGridValues.map(v => toM(Math.round(v)));
  const lineGridSvgY   = lineGridValues.map(
    v => Math.round(LINE_PAD + LINE_CHART_H_SVG * (1 - v / axisMax))
  );

  const { line, area, pts } = buildSvgPath(
    revenueValues.length > 1 ? revenueValues : [0, 0],
    axisMax
  );
  const peakIdx  = pts.reduce((max, p, i) => (p[1] < pts[max][1] ? i : max), 0);
  const tooltipX = Math.min(pts[peakIdx][0] - TOOLTIP_W / 2, LINE_VBW - TOOLTIP_W - 6);

  const subNewPath   = buildSvgPath(
    monthlySubscribers.length > 1 ? monthlySubscribers.map(m => m.newSubs) : [0, 0],
    SUB_MAX_VAL
  );
  const subChurnPath = buildSvgPath(
    monthlySubscribers.length > 1 ? monthlySubscribers.map(m => m.churned) : [0, 0],
    SUB_MAX_VAL
  );

  const subLast = monthlySubscribers[monthlySubscribers.length - 1] ?? { newSubs: 0, churned: 0 };

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
          {summaryLoading && <p className="stats-loading">KPI 데이터 로딩 중...</p>}
          {summaryIsError && <p className="statsErrorMsg">{summaryError?.message ?? 'KPI 데이터를 불러오지 못했습니다.'}</p>}
          {!summaryLoading && !summaryIsError && kpis.map(({ label, value, sub, color, Icon }) => (
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
              {summary && (
                <span className={`statsTrendBadge ${summary.currentMonthRevenueGrowth >= 0 ? 'up' : 'down'}`}>
                  {summary.currentMonthRevenueGrowth >= 0 ? '▲' : '▼'} {summary.currentMonthRevenueGrowth >= 0 ? '+' : ''}{summary.currentMonthRevenueGrowth}%
                </span>
              )}
            </div>
            {revenueLoading && <p className="stats-loading">매출 데이터 로딩 중...</p>}
            {revenueIsError && <p className="statsErrorMsg">{revenueError?.message ?? '월별 매출 데이터를 불러오지 못했습니다.'}</p>}
            {!revenueLoading && !revenueIsError && (
            <div className="statsLineWrap">
              <div className="statsChartWithAxis">
                <div className="statsLineYAxis">
                  {lineYLabels.map(lbl => <span key={lbl}>{lbl}</span>)}
                </div>
                <div className="statsLineChartBox">
                  <svg viewBox={`0 0 ${LINE_VBW} ${LINE_VBH}`} preserveAspectRatio="none" className="statsLineSvg"
                    role="img" aria-label="월별 매출 추이 차트">
                    <title>월별 매출 추이</title>
                    <defs>
                      <linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#24496f" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#24496f" stopOpacity="0"    />
                      </linearGradient>
                    </defs>
                    {lineGridSvgY.map((y, i) => (
                      <line key={y} x1="0" y1={y} x2={LINE_VBW} y2={y}
                        stroke={i === lineGridSvgY.length - 1 ? '#c8d8ea' : '#dde8f2'}
                        strokeWidth={i === lineGridSvgY.length - 1 ? '1.5' : '1'}
                        strokeDasharray={i === lineGridSvgY.length - 1 ? '0' : '8 6'}
                      />
                    ))}
                    <path d={area} fill="url(#statGrad)" />
                    <path d={line} fill="none" stroke="#24496f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy}
                        r={i === peakIdx ? 6.5 : 4.5}
                        fill="#24496f" stroke="white" strokeWidth="2.5"
                      />
                    ))}
                    {revenueValues.length > 0 && (
                      <>
                        <rect x={tooltipX} y={pts[peakIdx][1] - 36} width={TOOLTIP_W} height={24} rx="7" fill="#24496f" />
                        <text x={tooltipX + TOOLTIP_W / 2} y={pts[peakIdx][1] - 19}
                          textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="inherit">
                          Peak: {toM(Math.max(...revenueValues))}
                        </text>
                      </>
                    )}
                  </svg>
                  <div className="statsLineLabels">
                    {revenueData.map(m => <span key={m.month}>{m.month}</span>)}
                  </div>
                </div>
              </div>
            </div>
            )}
          </section>

          <section className="admin-card statsCard">
            <div className="statsCardHead">
              <div>
                <span className="statsEyebrow">이번 달 구독 유형별 성과</span>
                <h3>구독 유형별 매출 실적</h3>
              </div>
            </div>
            {breakdownLoading && <p className="stats-loading">구독 유형별 데이터 로딩 중...</p>}
            {breakdownIsError && <p className="statsErrorMsg">{breakdownError?.message ?? '구독 유형별 매출 데이터를 불러오지 못했습니다.'}</p>}
            {!breakdownLoading && !breakdownIsError && (
            <div className="statsChannelList">
              <div className="statsChannelTableHead">
                <span>구독 유형</span>
                <span className="colAmt">매출액</span>
                <span className="colDelta">증감</span>
              </div>
              {breakdown.map(item => {
                const up = item.growth >= 0;
                const Icon = BREAKDOWN_ICON_MAP[item.type] ?? CreditCard;
                return (
                  <div className="statsChannelRow" key={item.type}>
                    <div className="statsChannelIcon">
                      <Icon size={14} />
                    </div>
                    <span className="statsChannelName">{item.label}</span>
                    <span className="statsChannelAmt">
                      {toM(item.amount)}
                    </span>
                    <span className={`statsGrowthBadge ${up ? 'up' : 'down'}`}>
                      {up ? '+' : ''}{item.growth}%
                    </span>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        </div>

        {/* Row 2 ── 구독자 변동 추이 + 최근 가입 피드 */}
        <div className="statsMainGrid">

          <section className="admin-card statsCard">
            <div className="statsCardHead">
              <div>
                <span className="statsEyebrow">신규 vs 탈퇴 구독자 현황</span>
                <h3>구독자 변동 추이</h3>
              </div>
              <div className="statsLegend">
                <span className="teal">신규 <strong>{subLast.newSubs}명</strong></span>
                <span className="coral">탈퇴 <strong>{subLast.churned}명</strong></span>
              </div>
            </div>
            {subsLoading && <p className="stats-loading">구독자 데이터 로딩 중...</p>}
            {subsIsError && <p className="statsErrorMsg">{subsError?.message ?? '구독자 변동 데이터를 불러오지 못했습니다.'}</p>}
            {!subsLoading && !subsIsError && (
            <div className="statsLineWrap">
              <div className="statsChartWithAxis">
                <div className="statsLineYAxis">
                  {subYLabels.map(lbl => <span key={lbl}>{lbl}</span>)}
                </div>
                <div className="statsLineChartBox">
                  <svg viewBox={`0 0 ${LINE_VBW} ${LINE_VBH}`} preserveAspectRatio="none" className="statsLineSvg"
                    role="img" aria-label="구독자 변동 추이 차트">
                    <title>구독자 변동 추이</title>
                    <defs>
                      <linearGradient id="subNewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#3d8e6a" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3d8e6a" stopOpacity="0"    />
                      </linearGradient>
                      <linearGradient id="subChurnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#c04c4c" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#c04c4c" stopOpacity="0"    />
                      </linearGradient>
                    </defs>
                    {subGridSvgY.map((y, i) => (
                      <line key={y} x1="0" y1={y} x2={LINE_VBW} y2={y}
                        stroke={i === subGridSvgY.length - 1 ? '#c8d8ea' : '#dde8f2'}
                        strokeWidth={i === subGridSvgY.length - 1 ? '1.5' : '1'}
                        strokeDasharray={i === subGridSvgY.length - 1 ? '0' : '8 6'}
                      />
                    ))}
                    <path d={subNewPath.area} fill="url(#subNewGrad)" />
                    <path d={subNewPath.line} fill="none" stroke="#3d8e6a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {subNewPath.pts.map(([cx, cy], i) => (
                      <circle key={`new-${i}`} cx={cx} cy={cy} r={4.5} fill="#3d8e6a" stroke="white" strokeWidth="2.5" />
                    ))}
                    <path d={subChurnPath.area} fill="url(#subChurnGrad)" />
                    <path d={subChurnPath.line} fill="none" stroke="#c04c4c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {subChurnPath.pts.map(([cx, cy], i) => (
                      <circle key={`churn-${i}`} cx={cx} cy={cy} r={4} fill="#c04c4c" stroke="white" strokeWidth="2" />
                    ))}
                  </svg>
                  <div className="statsLineLabels">
                    {monthlySubscribers.map(m => <span key={m.month}>{m.month}</span>)}
                  </div>
                </div>
              </div>
            </div>
            )}
          </section>

          <section className="admin-card statsCard">
            <div className="statsCardHead">
              <div>
                <span className="statsEyebrow">최근 구독 현황</span>
                <h3>최근 가입 피드</h3>
              </div>
              <button className="statsViewAllBtn">전체보기</button>
            </div>
            {recentLoading && <p className="stats-loading">피드 데이터 로딩 중...</p>}
            {recentIsError && <p className="statsErrorMsg">{recentError?.message ?? '최근 가입 피드를 불러오지 못했습니다.'}</p>}
            {!recentLoading && !recentIsError && (
            <div className="statsFeed">
              {recentSubscribers.map(item => (
                <div className="statsFeedItem" key={item.memberId}>
                  <div className="statsAvatar">{item.initials}</div>
                  <div className="statsFeedInfo">
                    <strong>{item.memberName}</strong>
                    <div>
                      <span className={`statsStatusPill ${item.subStatus.toLowerCase()}`}>{item.subStatus}</span>
                      <span>{item.plan}</span>
                    </div>
                  </div>
                  <span className="statsFeedTime">{item.timeAgo}</span>
                </div>
              ))}
            </div>
            )}
          </section>
        </div>

      </div>
    </section>
  );
}
