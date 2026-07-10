import { LockKeyhole, Network, ShieldCheck, UserCheck } from 'lucide-react';

interface AdminManagementSummarySectionProps {
  isAllAdminManagementQueryError: boolean;
  globalErrorTitle: string;
  globalErrorDescription: string;
  retryAdminManagementQueries: () => void;
  isSummaryLoading: boolean;
  isSummaryError: boolean;
  summaryStatusText: string;
  totalAdmins: number;
  activeAdminCount: number;
  activeAclCount: number;
  lockedAdminCount: number;
}

export default function AdminManagementSummarySection(props: AdminManagementSummarySectionProps) {
  const { isAllAdminManagementQueryError, globalErrorTitle, globalErrorDescription, retryAdminManagementQueries, isSummaryLoading, isSummaryError, summaryStatusText, totalAdmins, activeAdminCount, activeAclCount, lockedAdminCount } = props;

  const kpiItems = [
    { label: '전체 관리자', value: totalAdmins, desc: '등록된 관리자 계정', tone: 'kpi-blue', Icon: ShieldCheck },
    { label: '활성 관리자', value: activeAdminCount, desc: '즉시 접근 가능', tone: 'kpi-green', Icon: UserCheck },
    { label: '활성 ACL', value: activeAclCount, desc: '접근 허용 정책', tone: 'kpi-purple', Icon: Network },
    { label: '잠금 계정', value: lockedAdminCount, desc: '보안 확인 필요', tone: 'kpi-yellow', Icon: LockKeyhole },
  ];

  return (
    <>
      {isAllAdminManagementQueryError ? (
        <section className="amGlobalErrorState">
          <div>
            <strong>{globalErrorTitle}</strong>
            <span>{globalErrorDescription}</span>
          </div>
          <button className="amHeaderButton" type="button" onClick={retryAdminManagementQueries}>다시 시도</button>
        </section>
      ) : null}

      <section className="memberSummaryGrid">
        {kpiItems.map((item) => (
          <article className={`admin-card amKpiCard ${item.tone}`} key={item.label}>
            <div className="amKpiContent">
              <p>{item.label}</p>
              <h3>{isSummaryLoading || isSummaryError ? '-' : item.value.toLocaleString()}</h3>
              <span>{summaryStatusText || item.desc}</span>
            </div>
            <div className={`amKpiIcon ${item.tone}`}>
              <item.Icon size={26} />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
