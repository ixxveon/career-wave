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

// ── 꺾은선 차트 상수 ────────────────────────────────────────────
// Y축 max를 4500만으로 고정해 gridline이 레이블과 정확히 일치
const LINE_MAX_VAL = 45_000_000;
const LINE_VBH     = 220;
const LINE_PAD     = 28;
const LINE_VBW     = 1000;
const LINE_PAD_X   = 30;   // SVG 좌우 여백 — 경계 점 잘림 방지
const LINE_CHART_H_SVG = LINE_VBH - LINE_PAD * 2; // 164

// Y축 레이블 (위→아래 = 높은값→낮은값)
const lineYLabels = ['₩4,500만', '₩3,000만', '₩1,500만', '₩0'];
// 위 레이블에 대응하는 SVG 내부 Y 좌표 (gridline 위치)
const lineGridSvgY = [45_000_000, 30_000_000, 15_000_000, 0].map(
  (v) => Math.round(LINE_PAD + LINE_CHART_H_SVG * (1 - v / LINE_MAX_VAL))
); // ≈ [28, 83, 137, 192]

// ── 누적 막대 차트 상수 ─────────────────────────────────────────
const BAR_MAX      = 320;  // Y축 최대값 (320명)
const BAR_CHART_H  = 140;  // 막대 최대 픽셀 높이

// Y축 레이블 (위→아래): 320, 240, 160, 80, 0 — 35px 간격으로 정렬
const barYLabels = ['320명', '240명', '160명', '80명', '0'];

function buildSvgPath(values: number[]) {
  const xRange = LINE_VBW - 2 * LINE_PAD_X;
  const pts: [number, number][] = values.map((v, i) => [
    Math.round(LINE_PAD_X + (i / (values.length - 1)) * xRange),
    Math.round(LINE_PAD + LINE_CHART_H_SVG * (1 - v / LINE_MAX_VAL)),
  ]);

  let line = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = Math.round((x0 + x1) / 2);
    line += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }

  // area path: extend to viewBox bottom-left corner (x=0) for full fill
  const area = `${line} L${pts[pts.length - 1][0]},${LINE_VBH} L${pts[0][0]},${LINE_VBH} Z`;
  return { line, area, pts };
}

const TOOLTIP_W = 124;

export default function StatisticsPage() {
  const { line, area, pts } = buildSvgPath(monthlyRevenue.map((m) => m.total));
  const peakIdx = pts.reduce((max, p, i) => (p[1] < pts[max][1] ? i : max), 0);
  // viewBox 경계 초과 방지: 오른쪽 끝 데이터(5월)면 왼쪽으로 밀기
  const tooltipX = Math.min(pts[peakIdx][0] - TOOLTIP_W / 2, LINE_VBW - TOOLTIP_W - 6);

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
              {/* Y축 + 차트 영역 */}
              <div className="statsChartWithAxis">
                {/* Y축 레이블 */}
                <div className="statsLineYAxis">
                  {lineYLabels.map((lbl) => <span key={lbl}>{lbl}</span>)}
                </div>

                {/* 차트 박스 */}
                <div className="statsLineChartBox">
                  <svg
                    viewBox={`0 0 ${LINE_VBW} ${LINE_VBH}`}
                    preserveAspectRatio="none"
                    className="statsLineSvg"
                  >
                    <defs>
                      <linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#24496f" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#24496f" stopOpacity="0"    />
                      </linearGradient>
                    </defs>

                    {/* 수평 gridlines — SVG 좌표 내에서 정확히 레이블 값과 일치 */}
                    {lineGridSvgY.map((y, i) => (
                      <line
                        key={y}
                        x1="0" y1={y} x2={LINE_VBW} y2={y}
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

                    {/* Peak 말풍선 — tooltipX로 우측 잘림 방지 */}
                    <rect x={tooltipX} y={pts[peakIdx][1] - 36} width={TOOLTIP_W} height={24} rx="7" fill="#24496f" />
                    <text x={tooltipX + TOOLTIP_W / 2} y={pts[peakIdx][1] - 19}
                      textAnchor="middle" fill="white" fontSize="12" fontWeight="700" fontFamily="inherit">
                      Peak: ₩38,500,000
                    </text>
                  </svg>

                  <div className="statsLineLabels">
                    {monthlyRevenue.map((m) => <span key={m.month}>{m.month}</span>)}
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
              {/* Y축 + 차트 영역 */}
              <div className="statsChartWithAxis">
                {/* Y축 레이블: padding 30px top / 10px bottom 로 막대 영역과 정렬 */}
                <div className="statsBarYAxis">
                  {barYLabels.map((lbl) => <span key={lbl}>{lbl}</span>)}
                </div>

                {/* 막대 차트 */}
                <div className="statsStackedChart">
                  {monthlyGrowth.map((m) => {
                    const total  = m.individual + m.company;
                    const totalH = Math.round((total / BAR_MAX) * BAR_CHART_H);
                    const compH  = Math.round((m.company / BAR_MAX) * BAR_CHART_H);
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
