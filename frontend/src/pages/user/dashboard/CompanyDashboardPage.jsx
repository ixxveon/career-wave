import { Hammer } from 'lucide-react';

// QA #1140 — 기업 채용 대시보드는 준비 중 화면으로 대체한다.
function CompanyDashboardPage() {
  return (
    <section
      style={{
        minHeight: 'calc(100vh - 220px)',
        display: 'grid',
        placeItems: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center', maxWidth: 480 }}>
        <span
          aria-hidden="true"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#eef2ff',
            color: '#4f46e5',
          }}
        >
          <Hammer size={32} />
        </span>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: 1.5, color: '#6b7280', fontWeight: 600 }}>
          COMPANY
        </p>
        <h1 style={{ margin: 0, fontSize: 28, color: '#111827' }}>준비중!</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#5f6f86' }}>
          기업 채용 대시보드는 현재 준비 중입니다.
          <br />
          더 나은 서비스로 곧 찾아뵙겠습니다.
        </p>
      </div>
    </section>
  );
}

export default CompanyDashboardPage;
