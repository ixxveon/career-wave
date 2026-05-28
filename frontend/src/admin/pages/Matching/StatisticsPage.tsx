import { TrendingUp, DollarSign, Users, UserPlus, CreditCard, RefreshCw, Minus } from 'lucide-react';
import '../../styles/admin.css';
import '../../styles/Statistics.css';

const kpis = [
  { label: '이번 달 매출',      value: '₩38.5M',  sub: '전월 대비 +12.6%', color: 'kpi-green',  Icon: TrendingUp },
  { label: '누적 총 매출',      value: '₩186.5M', sub: '서비스 오픈 이후',  color: 'kpi-blue',   Icon: DollarSign },
  { label: '총 가입자 수',      value: '12,847명', sub: '서비스 오픈 이후',  color: 'kpi-purple', Icon: Users      },
  { label: '이번 달 신규 가입', value: '314명',    sub: '전월 대비 +2.3%',  color: 'kpi-yellow', Icon: UserPlus   },
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
  { Icon: CreditCard, label: '프리미엄 월정액', amount: 26900000, growth: 15.9, up: true  },
  { Icon: UserPlus,   label: '신규 가입 전환',  amount:  3480000, growth: 22.1, up: true  },
  { Icon: RefreshCw,  label: '갱신 결제',       amount: 23420000, growth: 11.3, up: true  },
  { Icon: Minus,      label: '환불 차감',       amount:   580000, growth: -8.2, up: false },
];

// 신규 + 탈퇴 구독자 월별 데이터
const monthlySubscribers = [
  { month: '12월', newSubs: 212, churned: 45 },
  { month: '1월',  newSubs: 248, churned: 38 },
  { month: '2월',  newSubs: 236, churned: 52 },
  { month: '3월',  newSubs: 285, churned: 41 },
  { month: '4월',  newSubs: 307, churned: 48 },
  { month: '5월',  newSubs: 314, churned: 55 },
];

const recentActivity = [
  { initials: 'KM', name: '김민지', status: 'ACTIVE',  plan: '프리미엄 월정액', time: '5분 전'   },
  { initials: 'LJ', name: '이준호', status: 'PENDING', plan: '프리미엄 월정액', time: '23분 전'  },
  { initials: 'PS', name: '박서연', status: 'ACTIVE',  plan: '신규 가입',       time: '1시간 전' },
  { initials: 'CD', name: '최도윤', status: 'ACTIVE',  plan: '프리미엄 월정액', time: '2시간 전' },
  { initials: 'KH', name: '강하늘', status: 'PENDING', plan: '신규 가입',       time: '3시간 전' },
];

// ── 꺾은선 차트 공통 상수 ──────────────────────────────────────
const LINE_MAX_VAL = 45_000_000;
const LINE_VBH     = 220;
const LINE_PAD     = 28;
const LINE_VBW     = 1000;
const LINE_PAD_X   = 30;
const LINE_CHART_H_SVG = LINE_VBH - LINE_PAD * 2; // 164

// 매출 Y축 레이블 (4항목, padding 24px top/bottom → 위치 자동 정렬)
const lineYLabels  = ['₩4,500만', '₩3,000만', '₩1,500만', '₩0'];
const lineGridSvgY = [45_000_000, 30_000_000, 15_000_000, 0].map(
  v => Math.round(LINE_PAD + LINE_CHART_H_SVG * (1 - v / LINE_MAX_VAL))
); // [28, 83, 137, 192]

// 구독자 Y축 레이블 (5항목, 동일 padding → 동일 CSS 재사용)
const SUB_MAX_VAL  = 400;
const subYLabels   = ['400명', '300명', '200명', '100명', '0'];
const subGridSvgY  = [400, 300, 200, 100, 0].map(
  v => Math.round(LINE_PAD + LINE_CHART_H_SVG * (1 - v / SUB_MAX_VAL))
); // [28, 69, 110, 151, 192]

// M 단위 축약 포맷
function toM(n: number): string {
  const sign = n < 0 ? '-' : '';
  const m    = Math.abs(n) / 1_000_000;
  const val  = Math.round(m * 10) / 10;
  const str  = val % 1 === 0 ? String(val) : val.toFixed(1);
  return `${sign}₩${str}M`;
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
  const { line, area, pts } = buildSvgPath(monthlyRevenue.map(m => m.total));
  const peakIdx  = pts.reduce((max, p, i) => (p[1] < pts[max][1] ? i : max), 0);
  const tooltipX = Math.min(pts[peakIdx][0] - TOOLTIP_W / 2, LINE_VBW - TOOLTIP_W - 6);

  const subNewPath   = buildSvgPath(monthlySubscribers.map(m => m.newSubs),  SUB_MAX_VAL);
  const subChurnPath = buildSvgPath(monthlySubscribers.map(m => m.churned), SUB_MAX_VAL);

  const subLast = monthlySubscribers[monthlySubscribers.length - 1];

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
              <div className="statsChartWithAxis">
                <div className="statsLineYAxis">
                  {lineYLabels.map(lbl => <span key={lbl}>{lbl}</span>)}
                </div>
                <div className="statsLineChartBox">
                  <svg viewBox={`0 0 ${LINE_VBW} ${LINE_VBH}`} preserveAspectRatio="none" className="statsLineSvg">
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
                    <rect x={tooltipX} y={pts[peakIdx][1] - 36} width={TOOLTIP_W} height={24} rx="7" fill="#24496f" />
                    <text x={tooltipX + TOOLTIP_W / 2} y={pts[peakIdx][1] - 19}
                      textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="inherit">
                      Peak: {toM(Math.max(...monthlyRevenue.map(m => m.total)))}
                    </text>
                  </svg>
                  <div className="statsLineLabels">
                    {monthlyRevenue.map(m => <span key={m.month}>{m.month}</span>)}
                  </div>
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
              {subscriptionBreakdown.map(item => (
                <div className="statsChannelRow" key={item.label}>
                  <div className="statsChannelIcon">
                    <item.Icon size={14} />
                  </div>
                  <span className="statsChannelName">{item.label}</span>
                  <span className="statsChannelAmt">
                    {toM(item.up ? item.amount : -item.amount)}
                  </span>
                  <span className={`statsGrowthBadge ${item.up ? 'up' : 'down'}`}>
                    {item.up ? '+' : ''}{item.growth}%
                  </span>
                </div>
              ))}
            </div>
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
            <div className="statsLineWrap">
              <div className="statsChartWithAxis">
                {/* 5항목 Y축 — lineYAxis CSS 재사용 (동일 SVG 상수) */}
                <div className="statsLineYAxis">
                  {subYLabels.map(lbl => <span key={lbl}>{lbl}</span>)}
                </div>
                <div className="statsLineChartBox">
                  <svg viewBox={`0 0 ${LINE_VBW} ${LINE_VBH}`} preserveAspectRatio="none" className="statsLineSvg">
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

                    {/* 수평 gridlines */}
                    {subGridSvgY.map((y, i) => (
                      <line key={y} x1="0" y1={y} x2={LINE_VBW} y2={y}
                        stroke={i === subGridSvgY.length - 1 ? '#c8d8ea' : '#dde8f2'}
                        strokeWidth={i === subGridSvgY.length - 1 ? '1.5' : '1'}
                        strokeDasharray={i === subGridSvgY.length - 1 ? '0' : '8 6'}
                      />
                    ))}

                    {/* 신규 구독자 */}
                    <path d={subNewPath.area} fill="url(#subNewGrad)" />
                    <path d={subNewPath.line} fill="none" stroke="#3d8e6a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {subNewPath.pts.map(([cx, cy], i) => (
                      <circle key={`new-${i}`} cx={cx} cy={cy} r={4.5} fill="#3d8e6a" stroke="white" strokeWidth="2.5" />
                    ))}

                    {/* 탈퇴 구독자 */}
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
              {recentActivity.map(item => (
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
