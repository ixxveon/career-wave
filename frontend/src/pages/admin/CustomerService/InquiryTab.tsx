import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles } from 'lucide-react';
import {
  csApi,
  INQUIRY_CATEGORY, INQUIRY_CATEGORY_LABEL,
  INQUIRY_STATUS, INQUIRY_STATUS_LABEL,
  type InquiryCategory, type InquiryStatus,
  type InquiryItem, type InquiryDetail, type InquiryListParams,
} from '../../../api/admin/csApi';
import { ADMIN_ROUTE_PATHS } from '../../../constants/admin/adminRouteConstants';

const INQ_STATUS_CLS: Record<InquiryStatus, string> = {
  [INQUIRY_STATUS.PENDING]:     'pending',
  [INQUIRY_STATUS.IN_PROGRESS]: 'answering',
  [INQUIRY_STATUS.COMPLETED]:   'normal',
};

const INQ_CAT_CLS: Record<InquiryCategory, string> = {
  [INQUIRY_CATEGORY.REFUND]:        'csInqCat--refund',
  [INQUIRY_CATEGORY.PAYMENT_ERROR]: 'csInqCat--error',
  [INQUIRY_CATEGORY.SERVICE]:       'csInqCat--service',
  [INQUIRY_CATEGORY.ACCOUNT]:       'csInqCat--account',
  [INQUIRY_CATEGORY.ETC]:           'csInqCat--etc',
};

interface InquiryTabProps {
  onMutate: () => void;
}

export default function InquiryTab({ onMutate }: InquiryTabProps) {
  const navigate = useNavigate();

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [inqTotalItems, setInqTotalItems] = useState(0);
  const [inqPage, setInqPage] = useState(1);
  const [inqTotalPages, setInqTotalPages] = useState(1);
  const [inqLoading, setInqLoading] = useState(false);
  const [inqError, setInqError] = useState('');
  const inqReqId = useRef(0);

  const [inqCatFilter, setInqCatFilter] = useState('');
  const [inqStatusFilter, setInqStatusFilter] = useState('');
  const appliedInqFilters = useRef<InquiryListParams>({});

  const [selectedInquiry, setSelectedInquiry] = useState<InquiryDetail | null>(null);
  const [inquiryReply, setInquiryReply] = useState('');
  const [inqActionLoading, setInqActionLoading] = useState(false);
  const [inqActionError, setInqActionError] = useState('');
  const [aiInqLoading, setAiInqLoading] = useState(false);
  const aiInqReqId = useRef(0);

  const fetchInquiries = useCallback(async (page = 1) => {
    const reqId = ++inqReqId.current;
    const f = appliedInqFilters.current;
    setInqLoading(true);
    setInqError('');
    try {
      const res = await csApi.getInquiries({ ...f, page, size: 20 });
      if (reqId !== inqReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setInquiries(items);
      setInqTotalItems(totalItems);
      setInqTotalPages(totalPages);
      setInqPage(page);
    } catch (err: unknown) {
      if (reqId !== inqReqId.current) return;
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (!status) setInqError('네트워크 연결을 확인해주세요.');
        else setInqError(err.response?.data?.message || `문의 목록을 불러오지 못했습니다. (${status})`);
      } else setInqError(err instanceof Error ? err.message : '문의 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === inqReqId.current) setInqLoading(false);
    }
  }, []);

  useEffect(() => { fetchInquiries(1); }, [fetchInquiries]);

  const applyInqSearch = () => {
    appliedInqFilters.current = {
      ...(inqCatFilter && { category: inqCatFilter as InquiryCategory }),
      ...(inqStatusFilter && { status: inqStatusFilter as InquiryStatus }),
    };
    fetchInquiries(1);
  };

  const openInquiry = async (item: InquiryItem) => {
    setInqActionError('');
    setInquiryReply('');
    try {
      const res = await csApi.getInquiryDetail(item.inquiryId);
      if (!res.data.success) throw new Error(res.data.message);
      setSelectedInquiry(res.data.data);
      setInquiryReply(res.data.data.reply ?? '');
    } catch {
      setSelectedInquiry({ ...item, memberEmail: '', content: '', reply: null, repliedAt: null, completedAt: null });
    }
  };

  const saveInquiryReply = async () => {
    if (!selectedInquiry) return;
    setInqActionLoading(true);
    setInqActionError('');
    try {
      const res = await csApi.saveReply(selectedInquiry.inquiryId, { reply: inquiryReply });
      if (!res.data.success) throw new Error(res.data.message);
      setInquiries((p) => p.map((i) => i.inquiryId === selectedInquiry.inquiryId ? { ...i, inquiryStatus: res.data.data.inquiryStatus } : i));
      setSelectedInquiry((p) => p ? { ...p, inquiryStatus: res.data.data.inquiryStatus, reply: inquiryReply } : p);
      onMutate();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) setInqActionError('이미 완료된 문의입니다.');
        else setInqActionError(err.response?.data?.message || '답변 저장에 실패했습니다.');
      } else setInqActionError(err instanceof Error ? err.message : '답변 저장에 실패했습니다.');
    } finally {
      setInqActionLoading(false);
    }
  };

  const completeInquiry = async () => {
    if (!selectedInquiry || !inquiryReply.trim()) return;
    setInqActionLoading(true);
    setInqActionError('');
    try {
      const res = await csApi.completeInquiry(selectedInquiry.inquiryId);
      if (!res.data.success) throw new Error(res.data.message);
      setInquiries((p) => p.map((i) => i.inquiryId === selectedInquiry.inquiryId ? { ...i, inquiryStatus: res.data.data.inquiryStatus } : i));
      setSelectedInquiry(null);
      onMutate();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) setInqActionError('이미 완료된 문의입니다.');
        else if (status === 400) setInqActionError('답변 저장 후 처리 완료할 수 있습니다.');
        else setInqActionError(err.response?.data?.message || '처리 완료에 실패했습니다.');
      } else setInqActionError(err instanceof Error ? err.message : '처리 완료에 실패했습니다.');
    } finally {
      setInqActionLoading(false);
    }
  };

  const handleAiInquiryDraft = async () => {
    if (!selectedInquiry || selectedInquiry.inquiryStatus === INQUIRY_STATUS.COMPLETED) return;
    const reqId = ++aiInqReqId.current;
    setAiInqLoading(true);
    try {
      const res = await csApi.generateInquiryDraft({
        category: selectedInquiry.category,
        title: selectedInquiry.title,
        content: selectedInquiry.content,
      });
      if (reqId !== aiInqReqId.current) return;
      const inqDraft = res.data.data?.draft;
      if (inqDraft) setInquiryReply(inqDraft);
    } catch {
    } finally {
      if (reqId === aiInqReqId.current) setAiInqLoading(false);
    }
  };

  return (
    <div className="memberPage">
      <section className="admin-card memberFilter">
        <select value={inqCatFilter} onChange={(e) => setInqCatFilter(e.target.value)}>
          <option value="">카테고리 전체</option>
          {Object.entries(INQUIRY_CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <select value={inqStatusFilter} onChange={(e) => setInqStatusFilter(e.target.value)}>
          <option value="">상태 전체</option>
          {Object.entries(INQUIRY_STATUS_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <button className="memberFilterBtn" onClick={applyInqSearch}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>1:1 문의 <span className="payTotalCount">{inqTotalItems}건</span></h3>
        </div>
        {inqError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{inqError}</p>}
        <div className="tableScroll">
          <table className="memberTable">
            <thead><tr><th>문의 ID</th><th>회원명</th><th>카테고리</th><th>제목</th><th>접수일</th><th>상태</th><th>관리</th></tr></thead>
            <tbody>
              {inqLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
              ) : inquiries.map((inq) => (
                <tr key={inq.inquiryId}>
                  <td style={{ color: '#7a8da4', fontSize: 13 }}>#{inq.inquiryId}</td>
                  <td>{inq.memberName}</td>
                  <td><span className={`csInqCatBadge ${INQ_CAT_CLS[inq.category]}`}>{INQUIRY_CATEGORY_LABEL[inq.category]}</span></td>
                  <td>{inq.title}</td>
                  <td>{new Date(inq.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td><span className={`statusBadge ${INQ_STATUS_CLS[inq.inquiryStatus]}`}>{INQUIRY_STATUS_LABEL[inq.inquiryStatus]}</span></td>
                  <td>
                    <button className={`tableBtn${inq.inquiryStatus === 'PENDING' ? ' tableBtn--refund' : ''}`} onClick={() => openInquiry(inq)}>
                      {inq.inquiryStatus === 'PENDING' ? '답변하기' : '상세보기'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="memberTableFooter">
          <span className="memberTableCount">
            {inqTotalItems === 0 ? '총 0건' : `표시 중: ${(inqPage - 1) * 20 + 1} - ${Math.min(inqPage * 20, inqTotalItems)} / 총 ${inqTotalItems}건`}
          </span>
          <div className="pagination">
            <button disabled={inqLoading || inqPage <= 1} onClick={() => fetchInquiries(inqPage - 1)}>{'<'}</button>
            {Array.from({ length: Math.min(inqTotalPages, 5) }, (_, i) => {
              const p = Math.max(1, inqPage - 2) + i;
              if (p > inqTotalPages) return null;
              return <button key={p} className={p === inqPage ? 'activePage' : ''} disabled={inqLoading} onClick={() => fetchInquiries(p)}>{p}</button>;
            })}
            <button disabled={inqLoading || inqPage >= inqTotalPages} onClick={() => fetchInquiries(inqPage + 1)}>{'>'}</button>
          </div>
        </div>
      </section>

      {selectedInquiry && (
        <div className="modalOverlay" onClick={() => setSelectedInquiry(null)}>
          <div className="memberModal modal--scrollable" style={{ width: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader" style={{ flexShrink: 0, padding: '20px 24px 16px' }}>
              <div>
                <h3>{selectedInquiry.title}</h3>
                <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>
                  #{selectedInquiry.inquiryId} · {selectedInquiry.memberName}{selectedInquiry.memberEmail ? ` (${selectedInquiry.memberEmail})` : ''} · {new Date(selectedInquiry.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <button onClick={() => setSelectedInquiry(null)}>닫기</button>
            </div>
            <div className="modalBody">
              <div className="modalInfoGrid">
                <div>
                  <span>카테고리</span>
                  <span className={`csInqCatBadge ${INQ_CAT_CLS[selectedInquiry.category]}`}>{INQUIRY_CATEGORY_LABEL[selectedInquiry.category]}</span>
                </div>
                <div>
                  <span>현재 상태</span>
                  <span className={`statusBadge ${INQ_STATUS_CLS[selectedInquiry.inquiryStatus]}`}>{INQUIRY_STATUS_LABEL[selectedInquiry.inquiryStatus]}</span>
                </div>
              </div>
              <div className="csInqContent">
                <p className="csInqContentLabel">문의 내용</p>
                <p className="csInqContentBody">{selectedInquiry.content}</p>
              </div>
              <div className="csReplySection">
                <div className="csFormLabelRow">
                  <label className="csReplyLabel">답변 작성</label>
                  <button className="csAiBtn csAiBtn--inline" onClick={handleAiInquiryDraft} disabled={aiInqLoading}>
                    <Sparkles size={13} />{aiInqLoading ? 'AI 생성 중...' : 'AI 답변 초안'}
                  </button>
                </div>
                <textarea className="csFormTextarea csFormTextarea--reply" placeholder="답변 내용을 입력하세요"
                  value={inquiryReply} onChange={(e) => setInquiryReply(e.target.value)}
                  disabled={selectedInquiry.inquiryStatus === 'COMPLETED'} />
              </div>
            </div>
            <div className="modalAction" style={{ flexShrink: 0, padding: '16px 24px 20px' }}>
              {inqActionError && <p style={{ fontSize: 13, color: '#9a4444', flex: '1 1 100%', marginBottom: 8 }}>{inqActionError}</p>}
              {selectedInquiry.inquiryStatus !== 'COMPLETED' && (
                <>
                  <button onClick={saveInquiryReply} disabled={inqActionLoading || !inquiryReply.trim()}>
                    {inqActionLoading ? '저장 중...' : '답변 저장'}
                  </button>
                  {selectedInquiry.inquiryStatus === 'IN_PROGRESS' && (
                    <button onClick={completeInquiry} disabled={inqActionLoading || !inquiryReply.trim()}>처리 완료</button>
                  )}
                </>
              )}
              {(selectedInquiry.category === INQUIRY_CATEGORY.REFUND || selectedInquiry.category === INQUIRY_CATEGORY.PAYMENT_ERROR) && selectedInquiry.memberEmail && (
                <button
                  onClick={() => navigate(`${ADMIN_ROUTE_PATHS.payments}?tab=payments&keyword=${encodeURIComponent(selectedInquiry.memberEmail)}`)}
                  style={{ background: '#2e5eaa', color: '#fff', borderColor: '#2e5eaa' }}
                >
                  결제 내역 확인
                </button>
              )}
              <button onClick={() => setSelectedInquiry(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
