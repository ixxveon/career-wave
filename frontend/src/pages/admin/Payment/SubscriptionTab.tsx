import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Users, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import {
  paymentApi,
  SUB_STATUS,
  SUB_STATUS_LABEL,
  type Subscription,
  type SubStatus,
  type SubscriptionListParams,
  type SubscriptionCounts,
} from '../../../api/admin/paymentApi';

const SUB_STATUS_CLS: Record<string, string> = {
  ACTIVE: 'normal', RENEWAL_SCHEDULED: 'answering', CANCEL_SCHEDULED: 'pending',
  AT_RISK: 'blinded', EXPIRED: 'dismissed', PAYMENT_FAILED: 'blinded',
  REFUND_PENDING: 'pending', REFUNDED: 'dismissed',
};

interface SubscriptionTabProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function SubscriptionTab({ showToast }: SubscriptionTabProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subTotalItems, setSubTotalItems] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');
  const subReqId = useRef(0);

  const [subStatusFilter, setSubStatusFilter] = useState('');
  const appliedSubFilters = useRef<SubscriptionListParams>({});

  const [subCounts, setSubCounts] = useState<SubscriptionCounts | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    paymentApi.getSubscriptionCounts().then(res => {
      if (res.data.success) setSubCounts(res.data.data);
    }).catch(() => {});
  }, []);

  const fetchSubscriptions = useCallback(async (page = 1) => {
    const reqId = ++subReqId.current;
    const f = appliedSubFilters.current;
    setSubLoading(true);
    setSubError('');
    try {
      const res = await paymentApi.getSubscriptions({ ...f, page, size: 20 });
      if (reqId !== subReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setSubscriptions(items);
      setSubTotalItems(totalItems);
      setSubTotalPages(totalPages);
      setSubPage(page);
    } catch (err: unknown) {
      if (reqId !== subReqId.current) return;
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (!axios.isAxiosError(err) && err instanceof Error && err.message) setSubError(err.message);
      else if (!status) setSubError('네트워크 연결을 확인해주세요.');
      else setSubError((axios.isAxiosError(err) && err.response?.data?.message) || `구독 목록을 불러오지 못했습니다. (${status})`);
    } finally {
      if (reqId === subReqId.current) setSubLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscriptions(1); }, [fetchSubscriptions]);

  const applySubSearch = () => {
    appliedSubFilters.current = { ...(subStatusFilter && { status: subStatusFilter as SubStatus }) };
    fetchSubscriptions(1);
  };

  const escapeCsvCell = (value: string | number) => {
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const f = appliedSubFilters.current;
      const all: Subscription[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await paymentApi.getSubscriptions({ ...f, page, size: 100 });
        if (!res.data.success) throw new Error(res.data.message);
        all.push(...res.data.data.items);
        totalPages = res.data.data.totalPages;
        page += 1;
      } while (page <= totalPages);

      const header = ['구독 ID', '회원명', '구독 플랜', '시작일', '다음 갱신일', '상태'];
      const rows = all.map((s) => [
        s.subscriptionId,
        s.memberName,
        s.planName,
        new Date(s.startedAt).toLocaleDateString('ko-KR'),
        new Date(s.currentPeriodEnd).toLocaleDateString('ko-KR'),
        SUB_STATUS_LABEL[s.subscriptionStatus],
      ]);
      const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `구독현황_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`구독 현황 ${all.length}건을 내보냈습니다.`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) showToast(err.response.data.message, 'error');
      else showToast('내보내기에 실패했습니다.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const renderPagination = (page: number, totalPages: number, loading: boolean, onPage: (p: number) => void) => (
    <div className="pagination">
      <button disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const start = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4));
        const p = start + i;
        if (p > totalPages) return null;
        return <button key={p} className={p === page ? 'activePage' : ''} disabled={loading} onClick={() => onPage(p)}>{p}</button>;
      })}
      <button disabled={loading || page >= totalPages} onClick={() => onPage(page + 1)}>{'>'}</button>
    </div>
  );

  return (
    <div className="memberPage">
      <div className="kpiGrid">
        <div className="kpiCard kpi-green">
          <div className="kpiContent"><p>활성 구독</p><h3>{subCounts != null ? subCounts.active : '—'}</h3><span>정상 이용 중</span></div>
          <div className="kpiIcon kpi-green"><Users size={24} /></div>
        </div>
        <div className="kpiCard kpi-blue">
          <div className="kpiContent"><p>갱신 예정 (D-7)</p><h3>{subCounts != null ? subCounts.renewalScheduled : '—'}</h3><span>자동 갱신 대기</span></div>
          <div className="kpiIcon kpi-blue"><RefreshCw size={24} /></div>
        </div>
        <div className="kpiCard kpi-yellow">
          <div className="kpiContent"><p>취소 예정</p><h3>{subCounts != null ? subCounts.cancelScheduled : '—'}</h3><span>기간 만료 후 종료</span></div>
          <div className="kpiIcon kpi-yellow"><Clock size={24} /></div>
        </div>
        <div className="kpiCard kpi-purple">
          <div className="kpiContent"><p>이탈 위험</p><h3>{subCounts != null ? subCounts.atRisk : '—'}</h3><span>자동 갱신 결제 실패</span></div>
          <div className="kpiIcon kpi-purple"><AlertTriangle size={24} /></div>
        </div>
      </div>

      <section className="admin-card memberFilter">
        <select value={subStatusFilter} onChange={(e) => setSubStatusFilter(e.target.value)}>
          <option value="">상태 전체</option>
          {(Object.entries(SUB_STATUS) as [SubStatus, SubStatus][]).map(([, v]) => (
            <option key={v} value={v}>{SUB_STATUS_LABEL[v]}</option>
          ))}
        </select>
        <button className="memberFilterBtn" onClick={applySubSearch}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>구독 현황 <span className="payTotalCount">{subTotalItems}건</span></h3>
          <button onClick={handleExport} disabled={exporting}>{exporting ? '내보내는 중...' : '내보내기'}</button>
        </div>
        {subError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{subError}</p>}
        <div className="tableScroll">
          <table className="memberTable">
            <thead>
              <tr><th>구독 ID</th><th>회원명</th><th>구독 플랜</th><th>시작일</th><th>다음 갱신일</th><th>상태</th></tr>
            </thead>
            <tbody>
              {subLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
              ) : subscriptions.map((s) => (
                <tr key={s.subscriptionId}>
                  <td
                    style={{ fontSize: 13, color: '#7a8da4', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' }}
                    title={`클릭하여 복사: ${s.subscriptionId}`}
                    onClick={() => { navigator.clipboard.writeText(s.subscriptionId).then(() => showToast('구독 ID가 복사되었습니다.')).catch(() => showToast('복사에 실패했습니다.', 'error')); }}
                  >
                    {s.subscriptionId.slice(0, 8)}…
                  </td>
                  <td>{s.memberName}</td>
                  <td>{s.planName}</td>
                  <td>{new Date(s.startedAt).toLocaleDateString('ko-KR')}</td>
                  <td>{new Date(s.currentPeriodEnd).toLocaleDateString('ko-KR')}</td>
                  <td><span className={`statusBadge ${SUB_STATUS_CLS[s.subscriptionStatus]}`}>{SUB_STATUS_LABEL[s.subscriptionStatus]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="memberTableFooter">
          <span className="memberTableCount">
            {subTotalItems === 0 ? '총 0건' : `표시 중: ${(subPage - 1) * 20 + 1} - ${Math.min(subPage * 20, subTotalItems)} / 총 ${subTotalItems}건`}
          </span>
          {renderPagination(subPage, subTotalPages, subLoading, fetchSubscriptions)}
        </div>
      </section>
    </div>
  );
}
