import { useState, useEffect, useCallback } from 'react';
import { memberApi } from '../../../api/admin/memberApi';
import MemberTab from './MemberTab';
import CompanyTab from './CompanyTab';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/UserManagement.css';

type TabKey = 'user' | 'company';

export default function UserManagementPage() {
  const [tab, setTab] = useState<TabKey>('user');
  const [hrPendingCount, setHrPendingCount] = useState(0);

  const fetchHrPendingCount = useCallback(async () => {
    try {
      const res = await memberApi.getHrManagers({ page: 1, size: 1 });
      if (res.data.success) setHrPendingCount(res.data.data.pendingCount);
    } catch {}
  }, []);

  useEffect(() => { fetchHrPendingCount(); }, [fetchHrPendingCount]);

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>회원관리</h2>
          <p>플랫폼 사용자 현황을 관리하고 분석합니다.</p>
        </div>
      </header>

      <div className="admin-card" style={{ padding: '0 22px', marginBottom: 18 }}>
        <div className="csTabBar">
          <button className={`csTab${tab === 'user' ? ' active' : ''}`} onClick={() => setTab('user')}>
            전체 회원
          </button>
          <button className={`csTab${tab === 'company' ? ' active' : ''}`} onClick={() => setTab('company')}>
            기업 회원
            {hrPendingCount > 0 && <span className="tabBadge">{hrPendingCount}</span>}
          </button>
        </div>
      </div>

      {tab === 'user' && <MemberTab />}
      {tab === 'company' && <CompanyTab onPendingCountChange={setHrPendingCount} />}
    </section>
  );
}
