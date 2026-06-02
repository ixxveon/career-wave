import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, HelpCircle, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import {
  csApi,
  NOTICE_CATEGORY_LABEL,
  FAQ_CATEGORY_LABEL,
  INQUIRY_CATEGORY, INQUIRY_CATEGORY_LABEL,
  INQUIRY_STATUS, INQUIRY_STATUS_LABEL,
  type NoticeCategory, type FaqCategory, type InquiryCategory, type InquiryStatus,
  type CsSummary, type NoticeItem,
  type FaqItem, type FaqListParams,
  type InquiryItem, type InquiryDetail, type InquiryListParams,
  type NoticeListParams,
} from '../../api/csApi';
import '../../styles/admin.css';
import '../../styles/CustomerService.css';

// ── 로컬 전용 타입 ────────────────────────────────────────────

type CsTab = 'notice' | 'faq' | 'inquiry';

// ── CSS 클래스 맵 ─────────────────────────────────────────────

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

const TAB_LABEL: Record<CsTab, string> = {
  notice:  '공지사항',
  faq:     'FAQ',
  inquiry: '1:1 문의',
};

// ── 더미 데이터 (FAQ / 문의 — Phase 5-2 교체 예정) ───────────


// ── AI Mock 응답 생성 (v2에서 실제 API 전환 예정) ────────────

function genNoticeDraft(category: NoticeCategory, title: string): string {
  const base = title.trim() ? `"${title}" 관련 ` : '';
  const templates: Record<NoticeCategory, string> = {
    NOTICE:      `안녕하세요, Career Wave입니다.\n\n${base}공지사항을 안내드립니다.\n\n[본문 내용을 입력해 주세요]\n\n항상 더 나은 서비스를 제공하기 위해 노력하겠습니다.\n감사합니다.`,
    MAINTENANCE: `안녕하세요, Career Wave입니다.\n\n안정적인 서비스 제공을 위해 시스템 점검을 진행합니다.\n\n■ 점검 일시: 0000.00.00 00:00 ~ 00:00\n■ 점검 내용: 서버 안정화 및 성능 개선\n\n이용에 불편을 드려 죄송합니다.`,
    UPDATE:      `안녕하세요, Career Wave입니다.\n\n${base}업데이트 내용을 안내드립니다.\n\n■ 주요 변경 사항\n- [변경 내용 1]\n- [변경 내용 2]\n\n더 나은 서비스로 찾아뵙겠습니다. 감사합니다.`,
    EVENT:       `안녕하세요, Career Wave입니다.\n\n특별 이벤트를 진행합니다!\n\n■ 이벤트 기간: 0000.00.00 ~ 0000.00.00\n■ 이벤트 내용: ${base}[내용을 입력해 주세요]\n\n많은 참여 부탁드립니다. 감사합니다.`,
  };
  return templates[category];
}

function genFaqDraft(question: string): string {
  if (!question.trim()) return '';
  return `안녕하세요, Career Wave 고객센터입니다.\n\n문의하신 "${question}"에 대한 답변입니다.\n\n[답변 내용을 입력해 주세요]\n\n추가 문의사항이 있으시면 언제든지 1:1 문의를 이용해 주세요.\n감사합니다.`;
}

// ── 폼 상태 타입 ──────────────────────────────────────────────

interface NoticeFormState {
  noticeId?: number;
  category: NoticeCategory;
  title: string;
  content: string;
  isVisible: boolean;
}

interface FaqFormState {
  faqId?: number;
  category: FaqCategory;
  question: string;
  answer: string;
}

// ── Component ─────────────────────────────────────────────────

export default function CustomerServicePage() {
  const [tab, setTab] = useState<CsTab>('notice');

  // ── KPI 상태 ─────────────────────────────────────────────
  const [summary, setSummary] = useState<CsSummary>({ noticeCount: 0, faqCount: 0, pendingCount: 0, inProgressCount: 0 });
  const summaryReqId = useRef(0);

  // ── 공지사항 API 상태 ─────────────────────────────────────
  const [notices, setNotices]         = useState<NoticeItem[]>([]);
  const [noticeTotalItems, setNoticeTotalItems] = useState(0);
  const [noticePage, setNoticePage]   = useState(1);
  const [noticeTotalPages, setNoticeTotalPages] = useState(1);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState('');
  const noticeReqId = useRef(0);

  // 공지사항 필터 (입력 상태)
  const [noticeCatFilter, setNoticeCatFilter]         = useState('');
  const [noticeVisibleFilter, setNoticeVisibleFilter] = useState('');
  // 적용 필터 ref
  const appliedNoticeFilters = useRef<NoticeListParams>({});

  // 공지사항 모달
  const [noticeModal, setNoticeModal] = useState<'create' | 'edit' | null>(null);
  const [noticeForm, setNoticeForm]   = useState<NoticeFormState>({ category: 'NOTICE', title: '', content: '', isVisible: true });
  const [noticeFormLoading, setNoticeFormLoading] = useState(false);
  const [noticeFormError, setNoticeFormError]     = useState('');
  const [aiNoticeLoading, setAiNoticeLoading]     = useState(false);
  const [deleteConfirmId, setDeleteConfirmId]     = useState<number | null>(null);

  // ── FAQ API 상태 ──────────────────────────────────────────
  const [faqs, setFaqs]               = useState<FaqItem[]>([]);
  const [faqTotalItems, setFaqTotalItems] = useState(0);
  const [faqPage, setFaqPage]         = useState(1);
  const [faqTotalPages, setFaqTotalPages] = useState(1);
  const [faqLoading, setFaqLoading]   = useState(false);
  const [faqError, setFaqError]       = useState('');
  const faqReqId = useRef(0);

  const [faqCatFilter, setFaqCatFilter] = useState('');
  const appliedFaqFilters = useRef<FaqListParams>({});

  const [faqModal, setFaqModal]         = useState<'create' | 'edit' | null>(null);
  const [faqForm, setFaqForm]           = useState<FaqFormState>({ category: 'ACCOUNT', question: '', answer: '' });
  const [faqFormLoading, setFaqFormLoading] = useState(false);
  const [faqFormError, setFaqFormError]     = useState('');
  const [faqDeleteId, setFaqDeleteId]       = useState<number | null>(null);
  const [aiFaqLoading, setAiFaqLoading]     = useState(false);

  // ── 문의 API 상태 ─────────────────────────────────────────
  const [inquiries, setInquiries]         = useState<InquiryItem[]>([]);
  const [inqTotalItems, setInqTotalItems] = useState(0);
  const [inqPage, setInqPage]             = useState(1);
  const [inqTotalPages, setInqTotalPages] = useState(1);
  const [inqLoading, setInqLoading]       = useState(false);
  const [inqError, setInqError]           = useState('');
  const inqReqId = useRef(0);

  const [inqCatFilter, setInqCatFilter]       = useState('');
  const [inqStatusFilter, setInqStatusFilter] = useState('');
  const appliedInqFilters = useRef<InquiryListParams>({});

  const [selectedInquiry, setSelectedInquiry] = useState<InquiryDetail | null>(null);
  const [inquiryReply, setInquiryReply]       = useState('');
  const [inqActionLoading, setInqActionLoading] = useState(false);
  const [inqActionError, setInqActionError]     = useState('');
  const [aiInqLoading, setAiInqLoading]         = useState(false);

  // ── KPI 조회 ──────────────────────────────────────────────
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

  // ── 공지사항 목록 조회 ────────────────────────────────────
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
    } catch (err: any) {
      if (reqId !== noticeReqId.current) return;
      const status = err.response?.status;
      if (status === 500) {
        setNoticeError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else if (!status) {
        setNoticeError('네트워크 연결을 확인해주세요.');
      } else {
        setNoticeError('공지사항 목록을 불러오지 못했습니다.');
      }
    } finally {
      if (reqId === noticeReqId.current) setNoticeLoading(false);
    }
  }, []);

  const applyNoticeSearch = () => {
    appliedNoticeFilters.current = {
      ...(noticeCatFilter && { category: noticeCatFilter as NoticeCategory }),
      ...(noticeVisibleFilter !== '' && { visible: noticeVisibleFilter === 'true' }),
    };
    fetchNotices(1);
  };

  // ── FAQ 목록 조회 ─────────────────────────────────────────
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
    } catch (err: any) {
      if (reqId !== faqReqId.current) return;
      const status = err.response?.status;
      if (status === 500) setFaqError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      else if (!status) setFaqError('네트워크 연결을 확인해주세요.');
      else setFaqError('FAQ 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === faqReqId.current) setFaqLoading(false);
    }
  }, []);

  const applyFaqSearch = () => {
    appliedFaqFilters.current = { ...(faqCatFilter && { category: faqCatFilter as FaqCategory }) };
    fetchFaqs(1);
  };

  // ── 문의 목록 조회 ────────────────────────────────────────
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
    } catch (err: any) {
      if (reqId !== inqReqId.current) return;
      const status = err.response?.status;
      if (status === 500) setInqError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      else if (!status) setInqError('네트워크 연결을 확인해주세요.');
      else setInqError('문의 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === inqReqId.current) setInqLoading(false);
    }
  }, []);

  const applyInqSearch = () => {
    appliedInqFilters.current = {
      ...(inqCatFilter && { category: inqCatFilter as InquiryCategory }),
      ...(inqStatusFilter && { status: inqStatusFilter as InquiryStatus }),
    };
    fetchInquiries(1);
  };

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchNotices(1); }, [fetchNotices]);
  useEffect(() => { fetchFaqs(1); }, [fetchFaqs]);
  useEffect(() => { fetchInquiries(1); }, [fetchInquiries]);

  // ── 공지사항 등록 모달 열기 ───────────────────────────────
  const openNoticeCreate = () => {
    setNoticeForm({ category: 'NOTICE', title: '', content: '', isVisible: true });
    setNoticeFormError('');
    setNoticeModal('create');
  };

  // ── 공지사항 수정 모달 열기 ───────────────────────────────
  const openNoticeEdit = async (item: NoticeItem) => {
    setNoticeFormError('');
    setNoticeModal('edit');
    setNoticeForm({ noticeId: item.noticeId, category: item.category, title: item.title, content: '', isVisible: item.isVisible });
    try {
      const res = await csApi.getNoticeDetail(item.noticeId);
      if (!res.data.success) throw new Error(res.data.message);
      const d = res.data.data;
      setNoticeForm({ noticeId: d.noticeId, category: d.category, title: d.title, content: d.content, isVisible: d.isVisible });
    } catch (err: any) {
      setNoticeFormError(err.response?.data?.message || '공지 내용을 불러오지 못했습니다.');
    }
  };

  // ── 공지사항 저장 ─────────────────────────────────────────
  const saveNotice = async () => {
    if (!noticeForm.title.trim()) return;
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
      setNoticeModal(null);
      fetchNotices(noticePage);
      fetchSummary();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 500) setNoticeFormError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      else if (!status) setNoticeFormError('네트워크 연결을 확인해주세요.');
      else setNoticeFormError(err.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setNoticeFormLoading(false);
    }
  };

  // ── 공지사항 삭제 ─────────────────────────────────────────
  const confirmDeleteNotice = async () => {
    if (deleteConfirmId === null) return;
    try {
      const res = await csApi.deleteNotice(deleteConfirmId);
      if (!res.data.success) throw new Error(res.data.message);
      setDeleteConfirmId(null);
      fetchNotices(noticePage);
      fetchSummary();
    } catch (err: any) {
      const status = err.response?.status;
      alert(status === 500 ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const handleAiNoticeDraft = () => {
    setAiNoticeLoading(true);
    setTimeout(() => {
      setNoticeForm((p) => ({ ...p, content: genNoticeDraft(p.category, p.title) }));
      setAiNoticeLoading(false);
    }, 900);
  };

  // ── FAQ handlers ──────────────────────────────────────────
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
      fetchSummary();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 500) setFaqFormError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      else if (!status) setFaqFormError('네트워크 연결을 확인해주세요.');
      else setFaqFormError(err.response?.data?.message || '저장에 실패했습니다.');
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
      fetchSummary();
    } catch (err: any) {
      const status = err.response?.status;
      alert(status === 500 ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };
  const handleAiFaqDraft = () => {
    setAiFaqLoading(true);
    setTimeout(() => { setFaqForm((p) => ({ ...p, answer: genFaqDraft(p.question) })); setAiFaqLoading(false); }, 900);
  };

  // ── 문의 핸들러 ───────────────────────────────────────────
  const openInquiry = async (item: InquiryItem) => {
    setInqActionError('');
    setInquiryReply('');
    try {
      const res = await csApi.getInquiryDetail(item.inquiryId);
      if (!res.data.success) throw new Error(res.data.message);
      setSelectedInquiry(res.data.data);
      setInquiryReply(res.data.data.reply ?? '');
    } catch {
      // 상세 조회 실패 시 목록 데이터로 fallback
      setSelectedInquiry({ ...item, content: '', reply: null, repliedAt: null, completedAt: null });
    }
  };

  const saveInquiryReply = async () => {
    if (!selectedInquiry) return;
    setInqActionLoading(true);
    setInqActionError('');
    try {
      const res = await csApi.saveReply(selectedInquiry.inquiryId, { reply: inquiryReply });
      if (!res.data.success) throw new Error(res.data.message);
      // 서버 응답 기준으로 상태 갱신
      setInquiries((p) => p.map((i) => i.inquiryId === selectedInquiry.inquiryId ? { ...i, inquiryStatus: res.data.data.inquiryStatus } : i));
      setSelectedInquiry((p) => p ? { ...p, inquiryStatus: res.data.data.inquiryStatus, reply: inquiryReply } : p);
      fetchSummary();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) setInqActionError('이미 완료된 문의입니다.');
      else setInqActionError(err.response?.data?.message || '답변 저장에 실패했습니다.');
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
      fetchSummary();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) setInqActionError('이미 완료된 문의입니다.');
      else if (err.response?.status === 400) setInqActionError('답변 저장 후 처리 완료할 수 있습니다.');
      else setInqActionError(err.response?.data?.message || '처리 완료에 실패했습니다.');
    } finally {
      setInqActionLoading(false);
    }
  };

  const handleAiInquiryDraft = () => {
    if (!selectedInquiry) return;
    setAiInqLoading(true);
    setTimeout(() => {
      const draftBodies: Record<InquiryCategory, string> = {
        REFUND:        '환불 요청 접수해 주셔서 감사합니다.\n\n이용 내역 확인 후 영업일 기준 3~5일 이내에 처리 결과를 안내해 드리겠습니다.',
        PAYMENT_ERROR: '결제 오류로 불편을 드려 죄송합니다.\n\n카드 한도 및 유효기간을 확인해 주시고, 다른 브라우저에서도 시도해 주세요.',
        SERVICE:       '문의하신 내용을 기술팀에서 검토 중이며, 빠른 시일 내에 해결하여 안내드리겠습니다.',
        ACCOUNT:       '계정 관련 문의 감사합니다. 보안을 위해 본인 확인 절차가 필요할 수 있습니다.',
        ETC:           '내용을 확인하였으며 빠른 시일 내에 답변 드리겠습니다.',
      };
      setInquiryReply(`안녕하세요, ${selectedInquiry.memberName} 님.\nCareer Wave 고객센터입니다.\n\n${draftBodies[selectedInquiry.category]}\n\n추가 문의사항이 있으시면 언제든지 연락 주세요.\n감사합니다.`);
      setAiInqLoading(false);
    }, 900);
  };

  // ── 페이지네이션 ──────────────────────────────────────────
  const renderNoticePagination = () => (
    <div className="pagination">
      <button disabled={noticeLoading || noticePage <= 1} onClick={() => fetchNotices(noticePage - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(noticeTotalPages, 5) }, (_, i) => {
        const p = Math.max(1, noticePage - 2) + i;
        if (p > noticeTotalPages) return null;
        return <button key={p} className={p === noticePage ? 'activePage' : ''} disabled={noticeLoading} onClick={() => fetchNotices(p)}>{p}</button>;
      })}
      <button disabled={noticeLoading || noticePage >= noticeTotalPages} onClick={() => fetchNotices(noticePage + 1)}>{'>'}</button>
    </div>
  );

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>고객센터</h2>
          <p>1:1 문의 및 공지·FAQ를 관리합니다.</p>
        </div>
      </header>

      {/* KPI */}
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

      {/* Tab Bar */}
      <div className="csTabBar" style={{ marginBottom: 24 }}>
        {(['notice', 'faq', 'inquiry'] as CsTab[]).map((t) => (
          <button key={t} className={`csTab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {/* ── 공지사항 탭 ─────────────────────────────────── */}
      {tab === 'notice' && (
        <>
          {/* 필터 */}
          <section className="admin-card memberFilter" style={{ marginBottom: 16 }}>
            <select value={noticeCatFilter} onChange={(e) => setNoticeCatFilter(e.target.value)}>
              <option value="">카테고리 전체</option>
              {Object.entries(NOTICE_CATEGORY_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select value={noticeVisibleFilter} onChange={(e) => setNoticeVisibleFilter(e.target.value)}>
              <option value="">노출 전체</option>
              <option value="true">노출</option>
              <option value="false">숨김</option>
            </select>
            <button className="memberFilterBtn" onClick={applyNoticeSearch}>검색</button>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>공지사항 <span className="memberTotalCount">전체 {noticeTotalItems}건</span></h3>
              <button onClick={openNoticeCreate}>+ 공지 등록</button>
            </div>
            {noticeError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{noticeError}</p>}
            <div className="tableScroll">
              <table className="memberTable csNoticeTable">
                <thead>
                  <tr>
                    <th>번호</th><th>카테고리</th><th>제목</th><th>등록일</th><th>노출</th><th>관리</th>
                  </tr>
                </thead>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="memberTableFooter">
              <span className="memberTableCount">
                {noticeTotalItems === 0 ? '총 0건' : `표시 중: ${(noticePage - 1) * 20 + 1} - ${Math.min(noticePage * 20, noticeTotalItems)} / 총 ${noticeTotalItems}건`}
              </span>
              {renderNoticePagination()}
            </div>
          </section>
        </>
      )}

      {/* ── FAQ 탭 ──────────────────────────────────────── */}
      {tab === 'faq' && (
        <>
          <section className="admin-card memberFilter" style={{ marginBottom: 16 }}>
            <select value={faqCatFilter} onChange={(e) => setFaqCatFilter(e.target.value)}>
              <option value="">카테고리 전체</option>
              {Object.entries(FAQ_CATEGORY_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
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
                <thead>
                  <tr><th>카테고리</th><th>질문</th><th>등록일</th><th>관리</th></tr>
                </thead>
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
        </>
      )}

      {/* ── 1:1 문의 탭 ─────────────────────────────────── */}
      {tab === 'inquiry' && (
        <div className="memberPage">
          <section className="admin-card memberFilter">
            <select value={inqCatFilter} onChange={(e) => setInqCatFilter(e.target.value)}>
              <option value="">카테고리 전체</option>
              {Object.entries(INQUIRY_CATEGORY_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select value={inqStatusFilter} onChange={(e) => setInqStatusFilter(e.target.value)}>
              <option value="">상태 전체</option>
              {Object.entries(INQUIRY_STATUS_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
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
                <thead>
                  <tr><th>문의 ID</th><th>회원명</th><th>카테고리</th><th>제목</th><th>접수일</th><th>상태</th><th>관리</th></tr>
                </thead>
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
        </div>
      )}

      {/* ── 공지사항 모달 ────────────────────────────────── */}
      {noticeModal && (
        <div className="modalOverlay" onClick={() => setNoticeModal(null)}>
          <div className="memberModal modal--scrollable" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader" style={{ flexShrink: 0 }}>
              <div><h3>{noticeModal === 'create' ? '공지사항 등록' : '공지사항 수정'}</h3></div>
              <button onClick={() => setNoticeModal(null)}>닫기</button>
            </div>
            <div className="modalBody">
              <div className="csFormRows">
                <div className="csFormRow">
                  <label>카테고리</label>
                  <select className="csFormSelect" value={noticeForm.category}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, category: e.target.value as NoticeCategory }))}>
                    {Object.entries(NOTICE_CATEGORY_LABEL).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="csFormRow">
                  <label>제목</label>
                  <input className="csFormInput" type="text" placeholder="공지 제목을 입력하세요"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="csFormRow">
                  <label>내용</label>
                  <textarea className="csFormTextarea csFormTextarea--tall" placeholder="공지 내용을 입력하세요"
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, content: e.target.value }))} />
                </div>
                <div className="csAiSection">
                  <div className="csAiLabel"><Sparkles size={13} />AI 작성 보조</div>
                  <p className="csAiDesc">카테고리와 제목을 입력하면 AI가 공지 내용 초안을 생성합니다.</p>
                  <button className="csAiBtn" onClick={handleAiNoticeDraft} disabled={aiNoticeLoading || !noticeForm.title.trim()}>
                    <Sparkles size={14} />{aiNoticeLoading ? 'AI 생성 중...' : '초안 생성'}
                  </button>
                </div>
                <div className="csFormRow">
                  <label>노출 여부</label>
                  <label className="csCheckLabel">
                    <input type="checkbox" checked={noticeForm.isVisible}
                      onChange={(e) => setNoticeForm((p) => ({ ...p, isVisible: e.target.checked }))} />
                    사용자에게 노출
                  </label>
                </div>
                {noticeFormError && <p style={{ fontSize: 13, color: '#9a4444' }}>{noticeFormError}</p>}
              </div>
            </div>
            <div className="modalAction" style={{ flexShrink: 0 }}>
              <button onClick={saveNotice} disabled={noticeFormLoading || !noticeForm.title.trim()}>
                {noticeFormLoading ? '저장 중...' : noticeModal === 'create' ? '등록' : '저장'}
              </button>
              <button onClick={() => setNoticeModal(null)} disabled={noticeFormLoading}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 공지사항 삭제 확인 모달 ──────────────────────── */}
      {deleteConfirmId !== null && (
        <div className="modalOverlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modalHeader">
              <div><h3>공지사항 삭제</h3></div>
              <button onClick={() => setDeleteConfirmId(null)}>닫기</button>
            </div>
            <p style={{ padding: '16px 24px', fontSize: 14, color: '#31475f' }}>해당 공지사항을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</p>
            <div className="modalAction">
              <button style={{ background: '#9a6767', color: 'white', borderColor: '#9a6767' }} onClick={confirmDeleteNotice}>삭제</button>
              <button onClick={() => setDeleteConfirmId(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ 모달 ─────────────────────────────────────── */}
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
                    {Object.entries(FAQ_CATEGORY_LABEL).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="csFormRow">
                  <label>질문</label>
                  <input className="csFormInput" type="text" placeholder="자주 묻는 질문을 입력하세요"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))} />
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
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))} />
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

      {/* ── FAQ 삭제 확인 모달 ───────────────────────────── */}
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

      {/* ── 1:1 문의 상세 모달 ───────────────────────────── */}
      {selectedInquiry && (
        <div className="modalOverlay" onClick={() => setSelectedInquiry(null)}>
          <div className="memberModal modal--scrollable" style={{ width: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader" style={{ flexShrink: 0, padding: '20px 24px 16px' }}>
              <div>
                <h3>{selectedInquiry.title}</h3>
                <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>
                  #{selectedInquiry.inquiryId} · {selectedInquiry.memberName} · {new Date(selectedInquiry.createdAt).toLocaleDateString('ko-KR')}
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
              <button onClick={() => setSelectedInquiry(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
