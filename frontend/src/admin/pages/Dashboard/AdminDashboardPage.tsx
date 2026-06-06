import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bot, CreditCard, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  dashboardApi,
  getDashboardSummaryErrorMessage,
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
  const { data: dashboardSummary } = useQuery({
    queryKey: DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: async () => {
      const response = await dashboardApi.getSummary();

      if (!response.data.success) {
        throw new Error(getDashboardSummaryErrorMessage(response.data.message));
      }

      return unwrapDashboardSummaryResponse(response.data);
    },
  });
  const kpis = useMemo(
    () =>
      (dashboardSummary?.kpis ?? []).map((item) => {
        const presentation =
          KPI_PRESENTATION[item.key as keyof typeof KPI_PRESENTATION] ?? KPI_PRESENTATION.TODAY_NEW_MEMBERS;

        return {
          ...item,
          value: item.unit ? `${item.value.toLocaleString()}${item.unit}` : item.value.toLocaleString(),
          desc: item.deltaText,
          ...presentation,
        };
      }),
    [dashboardSummary]
  );
  const alerts = useMemo(
    () =>
      (dashboardSummary?.alerts ?? []).map((item) => {
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
      }),
    [dashboardSummary]
  );
  const weeklySignups = dashboardSummary?.weeklySignups ?? [];
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
  const paymentRatio = useMemo(
    () =>
      (dashboardSummary?.paymentRatio ?? []).map((item, index) => ({
        ...item,
        colorClass: PAYMENT_RATIO_CLASSES[index] ?? PAYMENT_RATIO_CLASSES[PAYMENT_RATIO_CLASSES.length - 1],
      })),
    [dashboardSummary]
  );
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
  const adminCards = useMemo(
    () =>
      (dashboardSummary?.serviceCards ?? []).map((item) => {
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
      }),
    [dashboardSummary]
  );
  const systemStatus = useMemo(
    () =>
      (dashboardSummary?.systemStatus ?? []).map((item) => {
        const presentation =
          SYSTEM_STATUS_PRESENTATION[item.status as keyof typeof SYSTEM_STATUS_PRESENTATION]
          ?? SYSTEM_STATUS_PRESENTATION.NORMAL;

        return {
          ...item,
          dotClass: presentation.dotClass,
        };
      }),
    [dashboardSummary]
  );
  const recentActivities = dashboardSummary?.recentActivities ?? [];

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

      <section className="kpiGrid">
        {kpis.map((item) => (
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
        ))}
      </section>

      <section className="layoutGrid">
        <div className="leftColumn">
          <section className="admin-card alertPanel">
            <div className="sectionHead">
              <h3>오늘 처리할 주요 알림</h3>
              <button>전체 보기</button>
            </div>

            <div className="alertList">
              {alerts.map((item) => (
                <div className={`alertRow ${item.cls}`} key={item.text}>
                  <span className="alertIcon">{item.icon}</span>
                  <span className="alertLevel">{item.level}</span>
                  <strong>{item.type}</strong>
                  <p>{item.text}</p>
                  <button onClick={() => navigate(item.path)}>{item.button}</button>
                </div>
              ))}
            </div>
          </section>

          <section className="chartGrid">
            <article className="admin-card chartCard">
              <h3>주간 가입자 추이</h3>
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
            </article>

            <article className="admin-card donutCard">
              <h3>결제 비중</h3>
              <div className="donutContent">
                <div
                  className="donut"
                  style={{
                    background: paymentRatioStops
                      ? `conic-gradient(${paymentRatioStops})`
                      : undefined,
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
            </article>
          </section>

          <section className="adminCardGrid adminCardGrid--dashboard">
            {adminCards.map((card) => (
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
            ))}
          </section>
        </div>

        <aside className="rightColumn">
          <section className="admin-card statusCard">
            <h3>시스템 상태</h3>
            {systemStatus.map((item) => (
              <div className="statusRow" key={item.key}>
                <span className={item.dotClass} />
                {item.label} <b>{item.valueText}</b>
              </div>
            ))}
          </section>

          <section className="admin-card logCard">
            <div className="sectionHead">
              <h3>최근 관리자 활동</h3>
              <button onClick={() => navigate('/admin/log')}>전체 보기</button>
            </div>
            {recentActivities.map((activity) => (
              <div
                className="logRow"
                key={activity.id}
                onClick={() => navigate(activity.targetPath)}
              >
                <span>{activity.occurredAt}</span>
                <strong>{activity.adminId}</strong>
                <p>{activity.message}</p>
              </div>
            ))}
          </section>
        </aside>
      </section>
    </>
  );
}
