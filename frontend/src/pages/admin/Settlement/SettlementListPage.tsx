import { useState, useRef } from 'react';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/UserManagement.css';
import SettlementTab from './SettlementTab';

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

export default function SettlementListPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  return (
    <section>
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: t.type === 'success' ? '#2e7d5e' : '#9a4444', color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>{t.msg}</div>
        ))}
      </div>

      <header className="admin-header">
        <div>
          <h2>정산 관리</h2>
          <p>정산 리포트 조회, 생성, 확정을 관리합니다.</p>
        </div>
      </header>

      <SettlementTab showToast={showToast} />
    </section>
  );
}
