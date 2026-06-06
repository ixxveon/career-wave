import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bot, CreditCard, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  dashboardApi,
  unwrapDashboardSummaryResponse,
} from '../../api/dashboardApi';
import '../../styles/admin.css';

const DASHBOARD_SUMMARY_QUERY_KEY = ['admin', 'dashboard', 'summary'] as const;

const KPI_PRESENTATION = {
  TODAY_NEW_MEMBERS: { Icon: Users, theme: 'kpi-blue' },
  REALTIME_ACTIVE_USERS: { Icon: Activity, theme: 'kpi-green' },
  AI_INTERVIEW_SESSIONS: { Icon: Bot, theme: 'kpi-purple' },
  TODAY_REVENUE: { Icon: CreditCard, theme: 'kpi-yellow' },
} as const;

const ALERT_PRESENTATION = {
  URGENT: { icon: '!', cls: 'danger' },
  WARNING: { icon: '!!', cls: 'warning' },
  NORMAL: { icon: 'i', cls: 'normal' },
} as const;

const WEEKLY_CHART_HEIGHT_PX = 168;
const PAYMENT_RATIO_COLORS = ['#27577f', '#8daeca', '#d6e3ee'] as const;
const PAYMENT_RATIO_CLASSES = ['c1', 'c2', 'c3'] as const;

const SERVICE_CARD_PRESENTATION = {
  MEMBER: { icon: 'USER', cls: 'blue' },
  REPORT: { icon: 'REP', cls: 'red' },
  CS: { icon: 'CS', cls: 'orange' },
  PAYMENT: { icon: 'PAY', cls: 'orange' },
  STATISTICS: { icon: 'STT', cls: 'green' },
  AI_METRICS: { icon: 'AI', cls: 'purple' },
} as const;

const SYSTEM_STATUS_PRESENTATION = {
  NORMAL: { dotClass: 'normal' },
  WARNING: { dotClass: 'warning' },
  CRITICAL: { dotClass: 'danger' },
} as const;

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    data: dashboardSummary,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboardSummary,
  } = useQuery({
    queryKey: DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return unwrapDashboardSummaryResponse(response.data);
    },
  });

  const isDashboardInitialLoading = isDashboardLoading && !dashboardSummary;
  const dashboardErrorMessage =
    dashboardError instanceof Error
      ? dashboardError.message
      : '대시보드 요약 조회에 실패했습니다.';
  const isDashboardCompletelyEmpty =
    !isDashboardInitialLoading &&
    !isDashboardError &&
    !!dashboardSummary &&
    dashboardSummary.kpis.length === 0 &&
    dashboardSummary.alerts.length === 0 &&
    dashboardSummary.weeklySignups.length === 0 &&
    dashboardSummary.paymentRatio.length === 0 &&
    dashboardSummary.serviceCards.length === 0 &&
    dashboardSummary.systemStatus.length === 0 &&
    dashboardSummary.recentActivities.length === 0;

  const { kpis, hasKpiSectionError } = useMemo(() => {
    try {
      const items = (dashboardSummary?.kpis ?? []).map((item) => {
        const presentation =
          KPI_PRESENTATION[item.key as keyof typeof KPI_PRESENTATION] ?? KPI_PRESENTATION.TODAY_NEW_MEMBERS;

        return {
          ...item,
          value: item.unit ? `${item.value.toLocaleString()}${item.unit}` : item.value.toLocaleString(),
          desc: item.deltaText,
          ...presentation,
        };
      });

      return { kpis: items, hasKpiSectionError: false };
    } catch {
      return { kpis: [], hasKpiSectionError: !!dashboardSummary };
    }
  }, [dashboardSummary]);

  const { alerts, hasAlertSectionError } = useMemo(() => {
    try {
      const items = (dashboardSummary?.alerts ?? []).map((item) => {
        const presentation =
          ALERT_PRESENTATION[item.level as keyof typeof ALERT_PRESENTATION] ?? ALERT_PRESENTATION.NORMAL;

        return {
          ...item,
          icon: presentation.icon,
          cls: presentation.cls,
          text: item.message,
          button: '상세 보기',
          path: item.targetPath,
        };
      });

      return { alerts: items, hasAlertSectionError: false };
    } catch {
      return { alerts: [], hasAlertSectionError: !!dashboardSummary };
    }
  }, [dashboardSummary]);

  const weeklySignups = useMemo(
    () => dashboardSummary?.weeklySignups ?? [],
    [dashboardSummary]
  );
  const hasWeeklySignupSectionError = false;

  const weeklySignupMax = useMemo(
    () => weeklySignups.reduce((max, item) => Math.max(max, item.count), 0),
    [weeklySignups]
  );

  const weeklySignupTicks = useMemo(() => {
    if (weeklySignupMax <= 0) {
      return [0];
    }

    return [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(weeklySignupMax * ratio));
  }, [weeklySignupMax]);

  const { paymentRatio, hasPaymentRatioSectionError } = useMemo(() => {
    try {
      const items = (dashboardSummary?.paymentRatio ?? []).map((item, index) => ({
        ...item,
        colorClass: PAYMENT_RATIO_CLASSES[index] ?? PAYMENT_RATIO_CLASSES[PAYMENT_RATIO_CLASSES.length - 1],
      }));

      return { paymentRatio: items, hasPaymentRatioSectionError: false };
    } catch {
      return { paymentRatio: [], hasPaymentRatioSectionError: !!dashboardSummary };
    }
  }, [dashboardSummary]);

  const paymentRatioStops = useMemo(() => {
    let offset = 0;

    return paymentRatio
      .map((item, index) => {
        const start = offset;
        const end = offset + item.ratio;
        const color = PAYMENT_RATIO_COLORS[index] ?? PAYMENT_RATIO_COLORS[PAYMENT_RATIO_COLORS.length - 1];
        offset = end;

        return `${color} ${start}% ${end}%`;
      })
      .join(', ');
  }, [paymentRatio]);

  const { adminCards, hasAdminCardSectionError } = useMemo(() => {
    try {
      const items = (dashboardSummary?.serviceCards ?? []).map((item) => {
        const presentation =
          SERVICE_CARD_PRESENTATION[item.key as keyof typeof SERVICE_CARD_PRESENTATION]
          ?? SERVICE_CARD_PRESENTATION.MEMBER;

        return {
          ...item,
          icon: presentation.icon,
          cls: presentation.cls,
          value: item.summaryText,
          path: item.targetPath,
        };
      });

      return { adminCards: items, hasAdminCardSectionError: false };
    } catch {
      return { adminCards: [], hasAdminCardSectionError: !!dashboardSummary };
    }
  }, [dashboardSummary]);

  const { systemStatus, hasSystemStatusSectionError } = useMemo(() => {
    try {
      const items = (dashboardSummary?.systemStatus ?? []).map((item) => {
        const presentation =
          SYSTEM_STATUS_PRESENTATION[item.status as keyof typeof SYSTEM_STATUS_PRESENTATION]
          ?? SYSTEM_STATUS_PRESENTATION.NORMAL;

        return {
          ...item,
          dotClass: presentation.dotClass,
        };
      });

      return { systemStatus: items, hasSystemStatusSectionError: false };
    } catch {
      return { systemStatus: [], hasSystemStatusSectionError: !!dashboardSummary };
    }
  }, [dashboardSummary]);

  const recentActivities = useMemo(
    () => dashboardSummary?.recentActivities ?? [],
    [dashboardSummary]
  );
  const hasRecentActivitySectionError = false;

  return (
    <>
      <header className="admin-header">
        <div>
          <h2>종합 대시보드</h2>
          <p>실시간 운영 현황과 주요 처리 항목을 확인합니다.</p>
        </div>

        <div className="adminProfile">
          <span className="serviceBadge">서비스 정상</span>

          <div className="avatar">SA</div>

          <div className="adminText">
            <strong>super_admin</strong>
            <span>전체 권한 활성화</span>
            <small>최근 로그인 09:12</small>
          </div>

          <button className="admin-logoutButton" onClick={() => navigate('/admin/login')}>
            로그아웃
          </button>
        </div>
      </header>

      {isDashboardError ? (
        <section className="dashboardEmptyPage">
          <div className="dashboardEmptyPage__card dashboardEmptyPage__card--error">
            <h3>대시보드 데이터를 불러오지 못했습니다.</h3>
            <p>{dashboardErrorMessage}</p>
            <button className="dashboardRetryButton" onClick={() => refetchDashboardSummary()}>
              다시 시도
            </button>
          </div>
        </section>
      ) : isDashboardCompletelyEmpty ? (
        <section className="dashboardEmptyPage">
          <div className="dashboardEmptyPage__card">
            <h3>표시할 대시보드 데이터가 없습니다.</h3>
            <p>요약, 알림, 차트, 관리자 활동 데이터가 아직 집계되지 않았습니다.</p>
          </div>
        </section>
      ) : (
        <>
          <section className="kpiGrid">
            {isDashboardInitialLoading ? (
              Array.from({ length: 4 }, (_, index) => (
                <article className="kpiCard kpi-blue dashboardLoadingCard" key={`kpi-loading-${index}`}>
                  <div className="kpiContent">
                    <p className="dashboardLoadingPulse">데이터를 불러오는 중입니다.</p>
                    <h3>-</h3>
                    <span>잠시만 기다려 주세요.</span>
                  </div>
                </article>
              ))
            ) : hasKpiSectionError ? (
              <div className="dashboardStateBox dashboardStateBox--error">
                KPI 데이터를 표시하지 못했습니다.
              </div>
            ) : (
              kpis.map((item) => (
                <article className={`kpiCard ${item.theme}`} key={item.title}>
                  <div className="kpiContent">
                    <p>{item.title}</p>
                    <h3>{item.value}</h3>
                    <span>{item.desc}</span>
                  </div>
                  <div className={`kpiIcon ${item.theme}`}>
                    <item.Icon size={26} strokeWidth={2.3} />
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="layoutGrid">
            <div className="leftColumn">
              <section className="admin-card alertPanel">
                <div className="sectionHead">
                  <h3>오늘 처리할 주요 알림</h3>
                  <button>전체 보기</button>
                </div>

                <div className="alertList">
                  {isDashboardInitialLoading ? (
                    <div className="dashboardStateBox">주요 알림을 불러오는 중입니다.</div>
                  ) : hasAlertSectionError ? (
                    <div className="dashboardStateBox dashboardStateBox--error">
                      주요 알림 데이터를 표시하지 못했습니다.
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="dashboardStateBox">현재 처리할 주요 알림이 없습니다.</div>
                  ) : (
                    alerts.map((item) => (
                      <div className={`alertRow ${item.cls}`} key={`${item.domain}-${item.id}`}>
                        <span className="alertIcon">{item.icon}</span>
                        <span className="alertLevel">{item.level}</span>
                        <strong>{item.domain}</strong>
                        <p>{item.text}</p>
                        <button onClick={() => navigate(item.path)}>{item.button}</button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="chartGrid">
                <article className="admin-card chartCard">
                  <h3>주간 가입자 추이</h3>
                  {isDashboardInitialLoading ? (
                    <div className="dashboardStateBox dashboardStateBox--chart">
                      주간 가입자 차트를 불러오는 중입니다.
                    </div>
                  ) : hasWeeklySignupSectionError ? (
                    <div className="dashboardStateBox dashboardStateBox--chart dashboardStateBox--error">
                      주간 가입자 차트를 표시하지 못했습니다.
                    </div>
                  ) : weeklySignups.length === 0 ? (
                    <div className="dashboardStateBox dashboardStateBox--chart">
                      표시할 주간 가입자 데이터가 없습니다.
                    </div>
                  ) : (
                    <div className="chartArea">
                      <div className="yAxis">
                        {weeklySignupTicks.map((tick, index) => (
                          <span key={`${tick}-${index}`}>{tick}</span>
                        ))}
                      </div>
                      <div className="bars">
                        {weeklySignups.map((item) => (
                          <div className="barItem" key={item.label}>
                            <div
                              style={{
                                height: weeklySignupMax > 0
                                  ? `${(item.count / weeklySignupMax) * WEEKLY_CHART_HEIGHT_PX}px`
                                  : '0px',
                              }}
                            />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>

                <article className="admin-card donutCard">
                  <h3>결제 비중</h3>
                  {isDashboardInitialLoading ? (
                    <div className="dashboardStateBox dashboardStateBox--chart">
                      결제 비중을 불러오는 중입니다.
                    </div>
                  ) : hasPaymentRatioSectionError ? (
                    <div className="dashboardStateBox dashboardStateBox--chart dashboardStateBox--error">
                      결제 비중 데이터를 표시하지 못했습니다.
                    </div>
                  ) : paymentRatio.length === 0 ? (
                    <div className="dashboardStateBox dashboardStateBox--chart">
                      표시할 결제 비중 데이터가 없습니다.
                    </div>
                  ) : (
                    <div className="donutContent">
                      <div
                        className="donut"
                        style={{
                          background: paymentRatioStops ? `conic-gradient(${paymentRatioStops})` : undefined,
                        }}
                      />
                      <ul>
                        {paymentRatio.map((item) => (
                          <li key={item.method}>
                            <i className={item.colorClass} />
                            {item.label} <b>{item.ratio}%</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </section>

              <section className="adminCardGrid adminCardGrid--dashboard">
                {isDashboardInitialLoading ? (
                  Array.from({ length: 3 }, (_, index) => (
                    <article className="adminCard dashboardLoadingCard" key={`card-loading-${index}`}>
                      <div className="adminTop">
                        <div className="adminIcon blue">...</div>
                        <h3>데이터 준비 중</h3>
                      </div>
                      <p>관리자 기능 카드를 불러오고 있습니다.</p>
                      <div className="adminBottom">
                        <strong>잠시만 기다려 주세요.</strong>
                      </div>
                    </article>
                  ))
                ) : hasAdminCardSectionError ? (
                  <div className="dashboardStateBox dashboardStateBox--inline dashboardStateBox--error">
                    관리자 기능 카드를 표시하지 못했습니다.
                  </div>
                ) : (
                  adminCards.map((card) => (
                    <article className="adminCard" key={card.title}>
                      <div className="adminTop">
                        <div className={`adminIcon ${card.cls}`}>{card.icon}</div>
                        <h3>{card.title}</h3>
                      </div>
                      <p>{card.desc}</p>
                      <div className="adminBottom">
                        <strong>{card.value}</strong>
                        <button onClick={() => navigate(card.path)}>상세 보기</button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </div>

            <aside className="rightColumn">
              <section className="admin-card statusCard">
                <h3>시스템 상태</h3>
                {isDashboardInitialLoading ? (
                  <div className="dashboardStateBox dashboardStateBox--inline">
                    시스템 상태를 불러오는 중입니다.
                  </div>
                ) : hasSystemStatusSectionError ? (
                  <div className="dashboardStateBox dashboardStateBox--inline dashboardStateBox--error">
                    시스템 상태를 표시하지 못했습니다.
                  </div>
                ) : (
                  systemStatus.map((item) => (
                    <div className="statusRow" key={item.key}>
                      <span className={item.dotClass} />
                      {item.label} <b>{item.valueText}</b>
                    </div>
                  ))
                )}
              </section>

              <section className="admin-card logCard">
                <div className="sectionHead">
                  <h3>최근 관리자 활동</h3>
                  <button onClick={() => navigate('/admin/log')}>전체 보기</button>
                </div>
                {isDashboardInitialLoading ? (
                  <div className="dashboardStateBox dashboardStateBox--inline">
                    최근 관리자 활동을 불러오는 중입니다.
                  </div>
                ) : hasRecentActivitySectionError ? (
                  <div className="dashboardStateBox dashboardStateBox--inline dashboardStateBox--error">
                    최근 관리자 활동을 표시하지 못했습니다.
                  </div>
                ) : (
                  recentActivities.map((activity) => (
                    <div
                      className="logRow"
                      key={activity.id}
                      onClick={() => navigate(activity.targetPath)}
                    >
                      <span>{activity.occurredAt}</span>
                      <strong>{activity.adminId}</strong>
                      <p>{activity.message}</p>
                    </div>
                  ))
                )}
              </section>
            </aside>
          </section>
        </>
      )}
    </>
  );
}
