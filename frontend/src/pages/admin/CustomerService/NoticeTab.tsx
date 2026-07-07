import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Sparkles, X } from 'lucide-react';
import {
  csApi,
  NOTICE_CATEGORY_LABEL,
  type NoticeCategory,
  type NoticeItem,
  type NoticeListParams,
} from '../../../api/admin/csApi';

const NOTICE_TITLE_MAX_LENGTH = 200;

interface NoticeFormState {
  noticeId?: number;
  category: NoticeCategory;
  title: string;
  content: string;
  isVisible: boolean;
}

interface NoticeTabProps {
  onMutate: () => void;
}

export default function NoticeTab({ onMutate }: NoticeTabProps) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticeTotalItems, setNoticeTotalItems] = useState(0);
  const [noticePage, setNoticePage] = useState(1);
  const [noticeTotalPages, setNoticeTotalPages] = useState(1);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState('');
  const noticeReqId = useRef(0);
  const noticeDetailReqId = useRef(0);

  const [noticeCatFilter, setNoticeCatFilter] = useState('');
  const [noticeVisibleFilter, setNoticeVisibleFilter] = useState('');
  const appliedNoticeFilters = useRef<NoticeListParams>({});

  const [noticeModal, setNoticeModal] = useState<'create' | 'edit' | null>(null);
  const [noticeForm, setNoticeForm] = useState<NoticeFormState>({ category: 'NOTICE', title: '', content: '', isVisible: true });
  const [noticeFormLoading, setNoticeFormLoading] = useState(false);
  const [noticeDetailLoading, setNoticeDetailLoading] = useState(false);
  const [noticeFormError, setNoticeFormError] = useState('');
  const [aiNoticeLoading, setAiNoticeLoading] = useState(false);
  const aiNoticeReqId = useRef(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchNotices = useCallback(async (page = 1) => {
    const reqId = ++noticeReqId.current;
    const f = appliedNoticeFilters.current;
    setNoticeLoading(true);
    setNoticeError('');
    try {
      const res = await csApi.getNotices({ ...f, page, size: 20 });
      if (reqId !== noticeReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setNotices(items);
      setNoticeTotalItems(totalItems);
      setNoticeTotalPages(totalPages);
      setNoticePage(page);
    } catch (err: unknown) {
      if (reqId !== noticeReqId.current) return;
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (!status) setNoticeError('네트워크 연결을 확인해주세요.');
        else setNoticeError(err.response?.data?.message || `공지사항 목록을 불러오지 못했습니다. (${status})`);
      } else setNoticeError(err instanceof Error ? err.message : '공지사항 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === noticeReqId.current) setNoticeLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotices(1); }, [fetchNotices]);

  const applyNoticeSearch = () => {
    appliedNoticeFilters.current = {
      ...(noticeCatFilter && { category: noticeCatFilter as NoticeCategory }),
      ...(noticeVisibleFilter !== '' && { visible: noticeVisibleFilter === 'true' }),
    };
    fetchNotices(1);
  };

  const closeNoticeModal = () => {
    ++noticeDetailReqId.current; ++aiNoticeReqId.current;
    setAiNoticeLoading(false); setNoticeDetailLoading(false);
    setNoticeModal(null);
  };

  const openNoticeCreate = () => {
    ++noticeDetailReqId.current; ++aiNoticeReqId.current;
    setAiNoticeLoading(false);
    setNoticeForm({ category: 'NOTICE', title: '', content: '', isVisible: true });
    setNoticeFormError(''); setNoticeModal('create');
  };

  const openNoticeEdit = async (item: NoticeItem) => {
    const reqId = ++noticeDetailReqId.current;
    ++aiNoticeReqId.current; setAiNoticeLoading(false);
    setNoticeFormError('');
    setNoticeDetailLoading(true);
    setNoticeModal('edit');
    setNoticeForm({ noticeId: item.noticeId, category: item.category, title: item.title, content: '', isVisible: item.isVisible });
    try {
      const res = await csApi.getNoticeDetail(item.noticeId);
      if (reqId !== noticeDetailReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const d = res.data.data;
      setNoticeForm({ noticeId: d.noticeId, category: d.category, title: d.title, content: d.content, isVisible: d.isVisible });
    } catch (err: unknown) {
      if (reqId !== noticeDetailReqId.current) return;
      setNoticeFormError(axios.isAxiosError(err) ? err.response?.data?.message || '공지 내용을 불러오지 못했습니다.' : err instanceof Error ? err.message : '공지 내용을 불러오지 못했습니다.');
    } finally {
      if (reqId === noticeDetailReqId.current) setNoticeDetailLoading(false);
    }
  };

  const saveNotice = async () => {
    if (!noticeForm.title.trim()) return;
    if (noticeModal === 'edit' && (!noticeForm.noticeId || noticeFormError)) return;
    setNoticeFormLoading(true);
    setNoticeFormError('');
    try {
      const body = { category: noticeForm.category, title: noticeForm.title, content: noticeForm.content, isVisible: noticeForm.isVisible };
      if (noticeModal === 'create') {
        const res = await csApi.createNotice(body);
        if (!res.data.success) throw new Error(res.data.message);
      } else if (noticeForm.noticeId) {
        const res = await csApi.updateNotice(noticeForm.noticeId, body);
        if (!res.data.success) throw new Error(res.data.message);
      }
      closeNoticeModal();
      fetchNotices(noticePage);
      onMutate();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 500) setNoticeFormError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        else if (!status) setNoticeFormError('네트워크 연결을 확인해주세요.');
        else setNoticeFormError(err.response?.data?.message || '저장에 실패했습니다.');
      } else setNoticeFormError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setNoticeFormLoading(false);
    }
  };

  const confirmDeleteNotice = async () => {
    if (deleteConfirmId === null) return;
    try {
      const res = await csApi.deleteNotice(deleteConfirmId);
      if (!res.data.success) throw new Error(res.data.message);
      setDeleteConfirmId(null);
      fetchNotices(noticePage);
      onMutate();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        alert(status === 500 ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : err.response?.data?.message || '삭제에 실패했습니다.');
      } else alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const handleAiNoticeDraft = async () => {
    if (!noticeForm.title.trim()) return;
    const reqId = ++aiNoticeReqId.current;
    setAiNoticeLoading(true);
    try {
      const res = await csApi.generateNoticeDraft({ category: noticeForm.category, title: noticeForm.title });
      if (reqId !== aiNoticeReqId.current) return;
      const noticeDraft = res.data.data?.draft;
      if (noticeDraft) setNoticeForm((p) => ({ ...p, content: noticeDraft }));
    } catch {
    } finally {
      if (reqId === aiNoticeReqId.current) setAiNoticeLoading(false);
    }
  };

  return (
    <>
      <section className="admin-card memberFilter" style={{ marginBottom: 16 }}>
        <select value={noticeCatFilter} onChange={(e) => setNoticeCatFilter(e.target.value)}>
          <option value="">카테고리 전체</option>
          {Object.entries(NOTICE_CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <select value={noticeVisibleFilter} onChange={(e) => setNoticeVisibleFilter(e.target.value)}>
          <option value="">노출 전체</option><option value="true">노출</option><option value="false">숨김</option>
        </select>
        <button className="memberFilterBtn" onClick={applyNoticeSearch}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>공지사항 <span className="memberTotalCount">전체 {noticeTotalItems}건</span></h3>
          <button onClick={openNoticeCreate}>+ 공지 등록</button>
        </div>
        {noticeError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{noticeError}</p>}
        <table className="memberTable csNoticeTable">
          <thead><tr><th>번호</th><th>카테고리</th><th>제목</th><th>등록일</th><th>노출</th><th>관리</th></tr></thead>
          <tbody>
            {noticeLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
            ) : notices.map((n, idx) => (
              <tr key={n.noticeId}>
                <td style={{ color: '#7a8da4', fontSize: 13 }}>{(noticePage - 1) * 20 + idx + 1}</td>
                <td><span className="statusBadge normal csNoticeCat">{NOTICE_CATEGORY_LABEL[n.category]}</span></td>
                <td>{n.title}</td>
                <td>{new Date(n.createdAt).toLocaleDateString('ko-KR')}</td>
                <td><span className={`statusBadge ${n.isVisible ? 'normal' : 'dismissed'}`}>{n.isVisible ? '노출' : '숨김'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="tableBtn" onClick={() => openNoticeEdit(n)}>수정</button>
                    <button className="tableBtn tableBtn--danger" onClick={() => setDeleteConfirmId(n.noticeId)}>삭제</button>
                  </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="memberTableFooter">
          <span className="memberTableCount">
            {noticeTotalItems === 0 ? '총 0건' : `표시 중: ${(noticePage - 1) * 20 + 1} - ${Math.min(noticePage * 20, noticeTotalItems)} / 총 ${noticeTotalItems}건`}
          </span>
          <div className="pagination">
            <button disabled={noticeLoading || noticePage <= 1} onClick={() => fetchNotices(noticePage - 1)}>{'<'}</button>
            {Array.from({ length: Math.min(noticeTotalPages, 5) }, (_, i) => {
              const p = Math.max(1, noticePage - 2) + i;
              if (p > noticeTotalPages) return null;
              return <button key={p} className={p === noticePage ? 'activePage' : ''} disabled={noticeLoading} onClick={() => fetchNotices(p)}>{p}</button>;
            })}
            <button disabled={noticeLoading || noticePage >= noticeTotalPages} onClick={() => fetchNotices(noticePage + 1)}>{'>'}</button>
          </div>
        </div>
      </section>

      {noticeModal && (
        <div className="modalOverlay">
          <div className="memberModal modal--scrollable" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader" style={{ flexShrink: 0 }}>
              <div><h3>{noticeModal === 'create' ? '공지사항 등록' : '공지사항 수정'}</h3></div>
              <button className="modalCloseBtn" aria-label="닫기" onClick={() => closeNoticeModal()}><X size={18} /></button>
            </div>
            <div className="modalBody">
              <div className="csFormRows">
                <div className="csFormRow">
                  <label>카테고리</label>
                  <select className="csFormSelect" value={noticeForm.category}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, category: e.target.value as NoticeCategory }))}>
                    {Object.entries(NOTICE_CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select></div>
                <div className="csFormRow">
                  <label>제목</label>
                  <input className="csFormInput" type="text" placeholder="공지 제목을 입력하세요" maxLength={NOTICE_TITLE_MAX_LENGTH}
                    value={noticeForm.title} onChange={(e) => setNoticeForm((p) => ({ ...p, title: e.target.value }))} />
                  <span className="csFormCharCount">{noticeForm.title.length}/{NOTICE_TITLE_MAX_LENGTH}</span>
                </div>
                <div className="csFormRow">
                  <label>내용</label>
                  <textarea className="csFormTextarea csFormTextarea--tall" placeholder="공지 내용을 입력하세요"
                    value={noticeForm.content} onChange={(e) => setNoticeForm((p) => ({ ...p, content: e.target.value }))} /></div>
                <div className="csAiSection">
                  <div className="csAiLabel"><Sparkles size={13} />AI 작성 보조</div>
                  <p className="csAiDesc">카테고리와 제목을 입력하면 AI가 공지 내용 초안을 생성합니다.</p>
                  <button className="csAiBtn" onClick={handleAiNoticeDraft} disabled={aiNoticeLoading || !noticeForm.title.trim()}>
                    <Sparkles size={14} />{aiNoticeLoading ? 'AI 생성 중...' : '초안 생성'}
                  </button></div>
                <div className="csFormRow">
                  <label>노출 여부</label>
                  <label className="csCheckLabel">
                    <input type="checkbox" checked={noticeForm.isVisible}
                      onChange={(e) => setNoticeForm((p) => ({ ...p, isVisible: e.target.checked }))} />
                    사용자에게 노출
                  </label></div>
                {noticeFormError && <p style={{ fontSize: 13, color: '#9a4444' }}>{noticeFormError}</p>}
              </div>
            </div>
            <div className="modalAction" style={{ flexShrink: 0 }}>
              <button onClick={() => closeNoticeModal()} disabled={noticeFormLoading}>취소</button>
              <button onClick={saveNotice} disabled={noticeFormLoading || noticeDetailLoading || !noticeForm.title.trim() || (noticeModal === 'edit' && (!noticeForm.noticeId || !!noticeFormError))}>
                {noticeFormLoading ? '저장 중...' : noticeModal === 'create' ? '등록' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="modalOverlay">
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modalHeader">
              <div><h3>공지사항 삭제</h3></div>
              <button className="modalCloseBtn" aria-label="닫기" onClick={() => setDeleteConfirmId(null)}><X size={18} /></button>
            </div>
            <p style={{ padding: '16px 24px', fontSize: 14, color: '#31475f' }}>해당 공지사항을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</p>
            <div className="modalAction">
              <button onClick={() => setDeleteConfirmId(null)}>취소</button>
              <button style={{ background: '#9a6767', color: 'white', borderColor: '#9a6767' }} onClick={confirmDeleteNotice}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
