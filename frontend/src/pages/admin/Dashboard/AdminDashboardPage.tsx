import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bot, CreditCard, Users, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminSession } from '../../../api/admin/adminAuthApi';
import {
  DASHBOARD_KPI_KEY,
  type DashboardKpiKey,
  dashboardApi,
  getDashboardSummaryErrorMessage,
  unwrapDashboardSummaryResponse,
} from '../../../api/admin/dashboardApi';
import {
  ADMIN_ROUTE_PATHS,
  hasAdminRouteAccess,
  isAdminNavigationPath,
} from '../../../constants/admin/adminRouteConstants';
import { ADMIN_DETAIL_ROLE, type AdminDetailRole } from '../../../constants/admin/adminRoleConstants';
import '../../../styles/admin/admin.css';

const DASHBOARD_SUMMARY_QUERY_KEY = ['admin', 'dashboard', 'summary'] as const;

const KPI_PRESENTATION = {
  [DASHBOARD_KPI_KEY.TODAY_NEW_ADMINS]: { Icon: Users, theme: 'kpi-blue' },
  [DASHBOARD_KPI_KEY.REALTIME_ACTIVE_ADMINS]: { Icon: Activity, theme: 'kpi-green' },
  [DASHBOARD_KPI_KEY.AI_INTERVIEW_SESSIONS]: { Icon: Bot, theme: 'kpi-purple' },
  [DASHBOARD_KPI_KEY.TODAY_REVENUE]: { Icon: CreditCard, theme: 'kpi-yellow' },
} as const satisfies Record<DashboardKpiKey, { Icon: LucideIcon; theme: string }>;

type KpiPresentation = (typeof KPI_PRESENTATION)[DashboardKpiKey];

const ALERT_PRESENTATION = {
  URGENT: { icon: '!', cls: 'danger' },
  WARNING: { icon: '!!', cls: 'warning' },
  NORMAL: { icon: 'i', cls: 'normal' },
} as const;

const PAYMENT_RATIO_CLASSES = ['c1', 'c2', 'c3'] as const;

const SERVICE_CARD_PRESENTATION = {
  ADMIN: { icon: 'ADM', cls: 'blue' },
  MEMBER: { icon: 'USER', cls: 'blue' },
  REPORT: { icon: 'REP', cls: 'red' },
  CS: { icon: 'CS', cls: 'orange' },
  PAYMENT: { icon: 'PAY', cls: 'orange' },
  STATISTICS: { icon: 'STT', cls: 'green' },
  AI_METRICS: { icon: 'AI', cls: 'purple' },
  SCRAPING: { icon: 'BOT', cls: 'green' },
  AUDIT_LOG: { icon: 'LOG', cls: 'red' },
} as const;

const SYSTEM_STATUS_PRESENTATION = {
  NORMAL: { dotClass: 'normal' },
  WARNING: { dotClass: 'warning' },
  CRITICAL: { dotClass: 'danger' },
} as const;

const DASHBOARD_ACCESS_KEY = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  REPORT: 'REPORT',
  CS: 'CS',
  PAYMENT: 'PAYMENT',
  STATISTICS: 'STATISTICS',
  AI_METRICS: 'AI_METRICS',
  SCRAPING: 'SCRAPING',
  AUDIT_LOG: 'AUDIT_LOG',
} as const;

type DashboardAccessKey = (typeof DASHBOARD_ACCESS_KEY)[keyof typeof DASHBOARD_ACCESS_KEY];

const DASHBOARD_DOMAIN_ALLOWED_ROLES = {
  ADMIN: [ADMIN_DETAIL_ROLE.MASTER],
  MEMBER: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  REPORT: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  CS: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  PAYMENT: [ADMIN_DETAIL_ROLE.MASTER],
  STATISTICS: [ADMIN_DETAIL_ROLE.MASTER],
  AI_METRICS: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
  SCRAPING: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
  AUDIT_LOG: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
} satisfies Record<DashboardAccessKey, AdminDetailRole[]>;

const DASHBOARD_CARD_ALLOWED_ROLES = {
  ADMIN: [ADMIN_DETAIL_ROLE.MASTER],
  MEMBER: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  REPORT: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  CS: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  PAYMENT: [ADMIN_DETAIL_ROLE.MASTER],
  STATISTICS: [ADMIN_DETAIL_ROLE.MASTER],
  AI_METRICS: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
  SCRAPING: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
  AUDIT_LOG: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
} satisfies Partial<Record<DashboardAccessKey, AdminDetailRole[]>>;

function hasDashboardRoleAccess(
  currentAdminRole: AdminDetailRole | null,
  allowedRoles: AdminDetailRole[] | undefined
) {
  if (!currentAdminRole) return false;
  if (!allowedRoles) return false;
  if (allowedRoles.length === 0) return true;
  return allowedRoles.includes(currentAdminRole);
}

function hasAccessibleAdminTarget(currentAdminRole: AdminDetailRole | null, targetPath: string) {
  return isAdminNavigationPath(targetPath) && hasAdminRouteAccess(currentAdminRole, targetPath);
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const currentAdminRole = adminSession.getRole();
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

      if (!response.data.success) {
        throw new Error(getDashboardSummaryErrorMessage(response.data.message));
      }

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
      const items = (dashboardSummary?.kpis ?? []).flatMap((item) => {
        const presentation = (KPI_PRESENTATION as Partial<Record<string, KpiPresentation>>)[item.key];

        if (!presentation) return [];

        return [{
          ...item,
          value: item.unit ? `${item.value.toLocaleString()}${item.unit}` : item.value.toLocaleString(),
          desc: item.deltaText,
          ...presentation,
        }];
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
        const hasRoleAccess = hasDashboardRoleAccess(
          currentAdminRole,
          DASHBOARD_DOMAIN_ALLOWED_ROLES[item.domain as DashboardAccessKey]
        ) && hasAccessibleAdminTarget(currentAdminRole, item.targetPath);

        return {
          ...item,
          icon: presentation.icon,
          cls: presentation.cls,
          text: item.message,
          button: '상세 보기',
          path: item.targetPath,
          hasValidTargetPath: isAdminNavigationPath(item.targetPath),
          hasRoleAccess,
        };
      }).filter((item) => item.hasRoleAccess);

      return { alerts: items, hasAlertSectionError: false };
    } catch {
      return { alerts: [], hasAlertSectionError: !!dashboardSummary };
    }
  }, [currentAdminRole, dashboardSummary]);

  const { weeklySignups, hasWeeklySignupSectionError } = useMemo(() => {
    try {
      return {
        weeklySignups: dashboardSummary?.weeklySignups ?? [],
        hasWeeklySignupSectionError: false,
      };
    } catch {
      return {
        weeklySignups: [],
        hasWeeklySignupSectionError: !!dashboardSummary,
      };
    }
  }, [dashboardSummary]);

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
        offset = end;

        return `var(--donut-${index + 1}) ${start}% ${end}%`;
      })
      .join(', ');
  }, [paymentRatio]);

  const { adminCards, hasAdminCardSectionError } = useMemo(() => {
    try {
      const items = (dashboardSummary?.serviceCards ?? []).map((item) => {
        const presentation =
          SERVICE_CARD_PRESENTATION[item.key as keyof typeof SERVICE_CARD_PRESENTATION]
          ?? SERVICE_CARD_PRESENTATION.MEMBER;
        const hasRoleAccess = hasDashboardRoleAccess(
          currentAdminRole,
          DASHBOARD_CARD_ALLOWED_ROLES[item.key as DashboardAccessKey]
        ) && hasAccessibleAdminTarget(currentAdminRole, item.targetPath);

        return {
          ...item,
          icon: presentation.icon,
          cls: presentation.cls,
          value: item.summaryText,
          path: item.targetPath,
          hasValidTargetPath: isAdminNavigationPath(item.targetPath),
          hasRoleAccess,
        };
      }).filter((item) => item.hasRoleAccess);

      return { adminCards: items, hasAdminCardSectionError: false };
    } catch {
      return { adminCards: [], hasAdminCardSectionError: !!dashboardSummary };
    }
  }, [currentAdminRole, dashboardSummary]);

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

  const { recentActivities, hasRecentActivitySectionError } = useMemo(() => {
    try {
      const items = (dashboardSummary?.recentActivities ?? []).map((item) => ({
        ...item,
        hasAccessibleTarget: hasAccessibleAdminTarget(currentAdminRole, item.targetPath),
      }));

      return {
        recentActivities: items,
        hasRecentActivitySectionError: false,
      };
    } catch {
      return {
        recentActivities: [],
        hasRecentActivitySectionError: !!dashboardSummary,
      };
    }
  }, [currentAdminRole, dashboardSummary]);

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
              <div className="dashboardStateBox dashboardStateBox--error">KPI 데이터를 표시하지 못했습니다.</div>
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
                  <button disabled>전체 보기</button>
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
                        <button
                          type="button"
                          disabled={!item.hasValidTargetPath}
                          onClick={() => {
                            if (!item.hasValidTargetPath) return;
                            navigate(item.path);
                          }}
                        >
                          {item.button}
                        </button>
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
                                height: weeklySignupMax > 0 ? `${(item.count / weeklySignupMax) * 168}px` : '0px',
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
                    <article className="adminCard" key={card.key}>
                      <div className="adminTop">
                        <div className={`adminIcon ${card.cls}`}>{card.icon}</div>
                        <h3>{card.title}</h3>
                      </div>
                      <p>{card.description}</p>
                      <div className="adminBottom">
                        <strong>{card.value}</strong>
                        <button
                          type="button"
                          disabled={!card.hasValidTargetPath}
                          onClick={() => {
                            if (!card.hasValidTargetPath) return;
                            navigate(card.path);
                          }}
                        >
                          상세 보기
                        </button>
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
                  <button
                    disabled={!hasAccessibleAdminTarget(currentAdminRole, ADMIN_ROUTE_PATHS.log)}
                    onClick={() => {
                      if (!hasAccessibleAdminTarget(currentAdminRole, ADMIN_ROUTE_PATHS.log)) return;
                      navigate(ADMIN_ROUTE_PATHS.log);
                    }}
                  >
                    전체 보기
                  </button>
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
                      style={{ cursor: activity.hasAccessibleTarget ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (!activity.hasAccessibleTarget) return;
                        navigate(activity.targetPath);
                      }}
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
