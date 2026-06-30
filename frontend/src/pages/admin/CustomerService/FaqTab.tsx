import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Sparkles } from 'lucide-react';
import {
  csApi,
  FAQ_CATEGORY_LABEL,
  type FaqCategory,
  type FaqItem,
  type FaqListParams,
} from '../../../api/admin/csApi';

interface FaqFormState {
  faqId?: number;
  category: FaqCategory;
  question: string;
  answer: string;
}

interface FaqTabProps {
  onMutate: () => void;
}

export default function FaqTab({ onMutate }: FaqTabProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [faqTotalItems, setFaqTotalItems] = useState(0);
  const [faqPage, setFaqPage] = useState(1);
  const [faqTotalPages, setFaqTotalPages] = useState(1);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState('');
  const faqReqId = useRef(0);

  const [faqCatFilter, setFaqCatFilter] = useState('');
  const appliedFaqFilters = useRef<FaqListParams>({});

  const [faqModal, setFaqModal] = useState<'create' | 'edit' | null>(null);
  const [faqForm, setFaqForm] = useState<FaqFormState>({ category: 'ACCOUNT', question: '', answer: '' });
  const [faqFormLoading, setFaqFormLoading] = useState(false);
  const [faqFormError, setFaqFormError] = useState('');
  const [faqDeleteId, setFaqDeleteId] = useState<number | null>(null);
  const [aiFaqLoading, setAiFaqLoading] = useState(false);
  const aiFaqReqId = useRef(0);

  const fetchFaqs = useCallback(async (page = 1) => {
    const reqId = ++faqReqId.current;
    const f = appliedFaqFilters.current;
    setFaqLoading(true);
    setFaqError('');
    try {
      const res = await csApi.getFaqs({ ...f, page, size: 20 });
      if (reqId !== faqReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setFaqs(items);
      setFaqTotalItems(totalItems);
      setFaqTotalPages(totalPages);
      setFaqPage(page);
    } catch (err: unknown) {
      if (reqId !== faqReqId.current) return;
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (!status) setFaqError('네트워크 연결을 확인해주세요.');
        else setFaqError(err.response?.data?.message || `FAQ 목록을 불러오지 못했습니다. (${status})`);
      } else setFaqError(err instanceof Error ? err.message : 'FAQ 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === faqReqId.current) setFaqLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaqs(1); }, [fetchFaqs]);

  const applyFaqSearch = () => {
    appliedFaqFilters.current = { ...(faqCatFilter && { category: faqCatFilter as FaqCategory }) };
    fetchFaqs(1);
  };

  const openFaqCreate = () => {
    setFaqForm({ category: 'ACCOUNT', question: '', answer: '' });
    setFaqFormError('');
    setFaqModal('create');
  };

  const openFaqEdit = (f: FaqItem) => {
    setFaqForm({ faqId: f.faqId, category: f.category, question: f.question, answer: f.answer });
    setFaqFormError('');
    setFaqModal('edit');
  };

  const saveFaq = async () => {
    if (!faqForm.question.trim()) return;
    setFaqFormLoading(true);
    setFaqFormError('');
    try {
      const body = { category: faqForm.category, question: faqForm.question, answer: faqForm.answer };
      if (faqModal === 'create') {
        const res = await csApi.createFaq(body);
        if (!res.data.success) throw new Error(res.data.message);
      } else if (faqForm.faqId) {
        const res = await csApi.updateFaq(faqForm.faqId, body);
        if (!res.data.success) throw new Error(res.data.message);
      }
      setFaqModal(null);
      fetchFaqs(faqPage);
      onMutate();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 500) setFaqFormError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        else if (!status) setFaqFormError('네트워크 연결을 확인해주세요.');
        else setFaqFormError(err.response?.data?.message || '저장에 실패했습니다.');
      } else setFaqFormError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setFaqFormLoading(false);
    }
  };

  const confirmDeleteFaq = async () => {
    if (faqDeleteId === null) return;
    try {
      const res = await csApi.deleteFaq(faqDeleteId);
      if (!res.data.success) throw new Error(res.data.message);
      setFaqDeleteId(null);
      fetchFaqs(faqPage);
      onMutate();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        alert(status === 500 ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : err.response?.data?.message || '삭제에 실패했습니다.');
      } else alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const handleAiFaqDraft = async () => {
    if (!faqForm.question.trim()) return;
    const reqId = ++aiFaqReqId.current;
    setAiFaqLoading(true);
    try {
      const res = await csApi.generateFaqDraft({ question: faqForm.question });
      if (reqId !== aiFaqReqId.current) return;
      const faqDraft = res.data.data?.draft;
      if (faqDraft) setFaqForm((p) => ({ ...p, answer: faqDraft }));
    } catch {
    } finally {
      if (reqId === aiFaqReqId.current) setAiFaqLoading(false);
    }
  };

  return (
    <>
      <section className="admin-card memberFilter" style={{ marginBottom: 16 }}>
        <select value={faqCatFilter} onChange={(e) => setFaqCatFilter(e.target.value)}>
          <option value="">카테고리 전체</option>
          {Object.entries(FAQ_CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <button className="memberFilterBtn" onClick={applyFaqSearch}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>FAQ <span className="memberTotalCount">전체 {faqTotalItems}건</span></h3>
          <button onClick={openFaqCreate}>+ FAQ 등록</button>
        </div>
        {faqError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{faqError}</p>}
        <div className="tableScroll">
          <table className="memberTable">
            <thead><tr><th>카테고리</th><th>질문</th><th>등록일</th><th>관리</th></tr></thead>
            <tbody>
              {faqLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
              ) : faqs.map((f) => (
                <tr key={f.faqId}>
                  <td><span className="statusBadge normal csNoticeCat">{FAQ_CATEGORY_LABEL[f.category]}</span></td>
                  <td>{f.question}</td>
                  <td>{new Date(f.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="tableBtn" onClick={() => openFaqEdit(f)}>수정</button>
                      <button className="tableBtn tableBtn--danger" onClick={() => setFaqDeleteId(f.faqId)}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="memberTableFooter">
          <span className="memberTableCount">
            {faqTotalItems === 0 ? '총 0건' : `표시 중: ${(faqPage - 1) * 20 + 1} - ${Math.min(faqPage * 20, faqTotalItems)} / 총 ${faqTotalItems}건`}
          </span>
          <div className="pagination">
            <button disabled={faqLoading || faqPage <= 1} onClick={() => fetchFaqs(faqPage - 1)}>{'<'}</button>
            {Array.from({ length: Math.min(faqTotalPages, 5) }, (_, i) => {
              const p = Math.max(1, faqPage - 2) + i;
              if (p > faqTotalPages) return null;
              return <button key={p} className={p === faqPage ? 'activePage' : ''} disabled={faqLoading} onClick={() => fetchFaqs(p)}>{p}</button>;
            })}
            <button disabled={faqLoading || faqPage >= faqTotalPages} onClick={() => fetchFaqs(faqPage + 1)}>{'>'}</button>
          </div>
        </div>
      </section>

      {faqModal && (
        <div className="modalOverlay" onClick={() => setFaqModal(null)}>
          <div className="memberModal modal--scrollable" style={{ width: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader" style={{ flexShrink: 0 }}>
              <div><h3>{faqModal === 'create' ? 'FAQ 등록' : 'FAQ 수정'}</h3></div>
              <button onClick={() => setFaqModal(null)}>닫기</button>
            </div>
            <div className="modalBody">
              <div className="csFormRows">
                <div className="csFormRow">
                  <label>카테고리</label>
                  <select className="csFormSelect" value={faqForm.category}
                    onChange={(e) => setFaqForm((p) => ({ ...p, category: e.target.value as FaqCategory }))}>
                    {Object.entries(FAQ_CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div className="csFormRow">
                  <label>질문</label>
                  <input className="csFormInput" type="text" placeholder="자주 묻는 질문을 입력하세요"
                    value={faqForm.question} onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))} />
                </div>
                <div className="csFormRow">
                  <div className="csFormLabelRow">
                    <label>답변</label>
                    <button className="csAiBtn csAiBtn--inline" onClick={handleAiFaqDraft}
                      disabled={aiFaqLoading || !faqForm.question.trim()}>
                      <Sparkles size={13} />{aiFaqLoading ? 'AI 생성 중...' : 'AI 답변 초안'}
                    </button>
                  </div>
                  <textarea className="csFormTextarea csFormTextarea--tall" placeholder="답변 내용을 입력하세요"
                    value={faqForm.answer} onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))} />
                </div>
                {faqFormError && <p style={{ fontSize: 13, color: '#9a4444' }}>{faqFormError}</p>}
              </div>
            </div>
            <div className="modalAction" style={{ flexShrink: 0 }}>
              <button onClick={saveFaq} disabled={faqFormLoading || !faqForm.question.trim()}>
                {faqFormLoading ? '저장 중...' : faqModal === 'create' ? '등록' : '저장'}
              </button>
              <button onClick={() => setFaqModal(null)} disabled={faqFormLoading}>취소</button>
            </div>
          </div>
        </div>
      )}

      {faqDeleteId !== null && (
        <div className="modalOverlay" onClick={() => setFaqDeleteId(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modalHeader">
              <div><h3>FAQ 삭제</h3></div>
              <button onClick={() => setFaqDeleteId(null)}>닫기</button>
            </div>
            <p style={{ padding: '16px 24px', fontSize: 14, color: '#31475f' }}>해당 FAQ를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</p>
            <div className="modalAction">
              <button style={{ background: '#9a6767', color: 'white', borderColor: '#9a6767' }} onClick={confirmDeleteFaq}>삭제</button>
              <button onClick={() => setFaqDeleteId(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
