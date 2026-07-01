import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, HelpCircle, MessageSquare, AlertCircle } from 'lucide-react';
import { csApi, type CsSummary } from '../../../api/admin/csApi';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/CustomerService.css';
import NoticeTab from './NoticeTab';
import FaqTab from './FaqTab';
import InquiryTab from './InquiryTab';

type CsTab = 'notice' | 'faq' | 'inquiry';

const TAB_LABEL: Record<CsTab, string> = {
  notice:  '공지사항',
  faq:     'FAQ',
  inquiry: '1:1 문의',
};

export default function CustomerServicePage() {
  const [tab, setTab] = useState<CsTab>('notice');
  const [summary, setSummary] = useState<CsSummary>({ noticeCount: 0, faqCount: 0, pendingCount: 0, inProgressCount: 0 });
  const summaryReqId = useRef(0);

  const fetchSummary = useCallback(async () => {
    const reqId = ++summaryReqId.current;
    try {
      const res = await csApi.getSummary();
      if (reqId !== summaryReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      setSummary(res.data.data);
    } catch (err) {
      console.error('fetchSummary failed:', err);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>고객센터</h2>
          <p>1:1 문의 및 공지·FAQ를 관리합니다.</p>
        </div>
      </header>

      <div className="kpiGrid">
        <div className="kpiCard kpi-blue csKpiStatic">
          <div className="kpiContent"><p>공지사항</p><h3>{summary.noticeCount}</h3><span>등록된 공지</span></div>
          <div className="kpiIcon kpi-blue"><Bell size={24} /></div>
        </div>
        <div className="kpiCard kpi-green csKpiStatic">
          <div className="kpiContent"><p>FAQ</p><h3>{summary.faqCount}</h3><span>등록된 항목</span></div>
          <div className="kpiIcon kpi-green"><HelpCircle size={24} /></div>
        </div>
        <div className="kpiCard kpi-yellow csKpiStatic">
          <div className="kpiContent"><p>미답변 문의</p><h3>{summary.pendingCount}</h3><span>즉시 처리 필요</span></div>
          <div className="kpiIcon kpi-yellow"><AlertCircle size={24} /></div>
        </div>
        <div className="kpiCard kpi-purple csKpiStatic">
          <div className="kpiContent"><p>답변 진행 중</p><h3>{summary.inProgressCount}</h3><span>처리 중</span></div>
          <div className="kpiIcon kpi-purple"><MessageSquare size={24} /></div>
        </div>
      </div>

      <div className="csTabBar" style={{ marginBottom: 24 }}>
        {(['notice', 'faq', 'inquiry'] as CsTab[]).map((t) => (
          <button key={t} className={`csTab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'notice' && <NoticeTab onMutate={fetchSummary} />}
      {tab === 'faq' && <FaqTab onMutate={fetchSummary} />}
      {tab === 'inquiry' && <InquiryTab onMutate={fetchSummary} />}
    </section>
  );
}
