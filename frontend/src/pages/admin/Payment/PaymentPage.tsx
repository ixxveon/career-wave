import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminSession } from '../../../api/admin/adminSession';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/Payment.css';
import PaymentHistoryTab from './PaymentHistoryTab';
import SubscriptionTab from './SubscriptionTab';
import SettlementTab from '../Settlement/SettlementTab';

type PayTab = '결제 내역' | '구독 현황' | '정산 리포트';

const TABS: PayTab[] = ['결제 내역', '구독 현황', '정산 리포트'];

const TAB_KEY_MAP: Record<string, PayTab> = {
  payments:      '결제 내역',
  subscriptions: '구독 현황',
  settlement:    '정산 리포트',
};

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

export default function PaymentPage() {
  const isMaster = adminSession.getRole() === 'MASTER';
  const [searchParams] = useSearchParams();
  const tabKey = searchParams.get('tab') ?? '';
  const initialTab: PayTab = TAB_KEY_MAP[tabKey] ?? '결제 내역';
  const [tab, setTab] = useState<PayTab>(initialTab);
  const urlKeyword = searchParams.get('keyword') ?? '';
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

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
          <h2>결제 · 정산</h2>
          <p>구독 결제 내역, 구독 현황, 정산 리포트를 관리합니다.</p>
        </div>
      </header>

      <div className="csTabBar" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} className={`csTab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === '결제 내역' && <PaymentHistoryTab key={urlKeyword} isMaster={isMaster} initialKeyword={urlKeyword} showToast={showToast} />}
      {tab === '구독 현황' && <SubscriptionTab showToast={showToast} />}
      {tab === '정산 리포트' && <SettlementTab showToast={showToast} />}
    </section>
  );
}
