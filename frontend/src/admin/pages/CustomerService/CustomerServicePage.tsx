import { useState } from 'react';
import { Bell, HelpCircle, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import '../../styles/admin.css';
import '../../styles/CustomerService.css';

// ── Types ────────────────────────────────────────────────────

type CsTab = 'notice' | 'faq' | 'inquiry';

type NoticeCategory = '공지' | '업데이트' | '이벤트' | '점검';
interface Notice {
  id: number;
  title: string;
  content: string;
  category: NoticeCategory;
  createdAt: string;
  visible: boolean;
}

type FaqCategory = '계정' | '결제' | '서비스' | '기타';
interface Faq {
  id: number;
  category: FaqCategory;
  question: string;
  answer: string;
  createdAt: string;
}

type InquiryStatus   = '접수 중' | '답변 중' | '완료';
type InquiryCategory = '환불' | '결제오류' | '서비스' | '계정' | '기타';

interface Inquiry {
  id: string;
  memberName: string;
  category: InquiryCategory;
  title: string;
  content: string;
  reply?: string;
  createdAt: string;
  status: InquiryStatus;
}

// ── Label / Class Maps ────────────────────────────────────────

const NOTICE_CATS: NoticeCategory[] = ['공지', '업데이트', '이벤트', '점검'];
const FAQ_CATS: FaqCategory[]       = ['계정', '결제', '서비스', '기타'];
const INQ_CATS: InquiryCategory[]   = ['환불', '결제오류', '서비스', '계정', '기타'];

const INQ_STATUS_CLS: Record<InquiryStatus, string> = {
  '접수 중': 'pending',
  '답변 중': 'answering',
  '완료':    'normal',
};

const INQ_CAT_CLS: Record<InquiryCategory, string> = {
  '환불':    'csInqCat--refund',
  '결제오류': 'csInqCat--error',
  '서비스':  'csInqCat--service',
  '계정':    'csInqCat--account',
  '기타':    'csInqCat--etc',
};

const TAB_LABEL: Record<CsTab, string> = {
  notice:  '공지사항',
  faq:     'FAQ',
  inquiry: '1:1 문의',
};

// ── Dummy Data ────────────────────────────────────────────────

const initNotices: Notice[] = [
  {
    id: 1,
    title: 'Career Wave 서비스 오픈 안내',
    content:
      'Career Wave 서비스가 정식 오픈되었습니다.\n프리미엄 구독을 통해 AI 이력서 분석과 AI 면접 서비스를 무제한으로 이용하세요.\n\n앞으로도 더 나은 서비스로 찾아뵙겠습니다. 감사합니다.',
    category: '공지',
    createdAt: '2026.05.20',
    visible: true,
  },
  {
    id: 2,
    title: '5월 22일 새벽 서버 점검 안내',
    content:
      '안정적인 서비스 제공을 위해 서버 점검을 진행합니다.\n\n■ 점검 일시: 2026.05.22 (금) 02:00 ~ 04:00\n■ 점검 내용: 서버 업그레이드 및 보안 패치\n\n점검 시간 동안 서비스 이용이 제한됩니다. 이용에 불편을 드려 죄송합니다.',
    category: '점검',
    createdAt: '2026.05.21',
    visible: true,
  },
  {
    id: 3,
    title: '이력서 AI 첨삭 기능 업데이트',
    content:
      '이력서 AI 첨삭 기능이 업데이트되었습니다.\n더욱 정교해진 AI 분석으로 맞춤형 피드백을 받아보세요.',
    category: '업데이트',
    createdAt: '2026.05.22',
    visible: true,
  },
  {
    id: 4,
    title: '신규 회원 가입 이벤트 안내',
    content:
      '신규 회원 가입 시 프리미엄 1개월 무료 체험 혜택을 드립니다.\n\n■ 기간: 2026.06.01 ~ 2026.06.30\n■ 대상: 이벤트 기간 중 신규 가입 회원 전원\n\n많은 참여 부탁드립니다.',
    category: '이벤트',
    createdAt: '2026.05.22',
    visible: false,
  },
];

const initFaqs: Faq[] = [
  {
    id: 1,
    category: '결제',
    question: '구독을 중간에 해지하면 환불이 되나요?',
    answer:
      '결제일 포함 7일 이내이며, 유료 AI 기능(이력서 분석, AI 면접)을 한 번도 이용하지 않으신 경우 전액 환불이 가능합니다.\n환불을 원하시면 1:1 문의에서 환불 요청을 남겨주시면 CS 담당자가 확인 후 처리해 드립니다.',
    createdAt: '2026.05.10',
  },
  {
    id: 2,
    category: '계정',
    question: '비밀번호를 잊어버렸어요.',
    answer:
      '로그인 화면에서 "비밀번호 찾기"를 이용하시면 이메일로 재설정 링크를 전송합니다.',
    createdAt: '2026.05.10',
  },
  {
    id: 3,
    category: '서비스',
    question: 'AI 모의면접은 몇 번이나 이용할 수 있나요?',
    answer:
      '무료 회원은 월 1회, 프리미엄 회원은 무제한으로 이용하실 수 있습니다.',
    createdAt: '2026.05.11',
  },
  {
    id: 4,
    category: '기타',
    question: '기업 회원과 개인 회원의 차이가 무엇인가요?',
    answer:
      '기업 회원은 채용공고 등록 및 지원자 관리 기능을 추가로 이용할 수 있습니다.',
    createdAt: '2026.05.12',
  },
];

const initInquiries: Inquiry[] = [
  {
    id: 'INQ-501',
    memberName: '김민지',
    category: '결제오류',
    title: '결제 오류가 계속 발생합니다',
    content:
      '카드 결제 시도 시 "처리 실패" 오류가 반복됩니다. 동일한 카드로 다른 사이트에서는 결제가 잘 됩니다.',
    createdAt: '2026.05.22',
    status: '접수 중',
  },
  {
    id: 'INQ-502',
    memberName: '이준호',
    category: '서비스',
    title: 'AI 면접 영상이 저장이 안 돼요',
    content:
      '면접 종료 후 영상 저장 버튼을 눌러도 반응이 없습니다. 크롬 브라우저를 사용 중입니다.',
    reply:
      '안녕하세요, 이준호 님.\nCareer Wave 고객센터입니다.\n\n불편을 드려 죄송합니다. 현재 해당 증상을 기술팀에서 확인 중이며 빠른 시일 내에 해결하겠습니다.',
    createdAt: '2026.05.21',
    status: '답변 중',
  },
  {
    id: 'INQ-503',
    memberName: '박서연',
    category: '계정',
    title: '탈퇴 후 재가입 가능 시점 문의',
    content: '탈퇴 후 같은 이메일로 재가입은 얼마나 지나야 가능한가요?',
    reply: '탈퇴 후 30일이 경과하면 동일 이메일로 재가입이 가능합니다.',
    createdAt: '2026.05.20',
    status: '완료',
  },
  {
    id: 'INQ-504',
    memberName: '최도윤',
    category: '환불',
    title: '구독 환불 요청드립니다',
    content:
      '이번 달 구독비 환불 요청드립니다. 결제한 지 3일밖에 안 됐고 AI 기능은 한 번도 사용하지 않았습니다.',
    createdAt: '2026.05.22',
    status: '접수 중',
  },
];

// ── AI Mock 응답 생성 ─────────────────────────────────────────

function genNoticeDraft(category: NoticeCategory, title: string): string {
  const base = title.trim() ? `"${title}" 관련 ` : '';
  const templates: Record<NoticeCategory, string> = {
    공지: `안녕하세요, Career Wave입니다.\n\n${base}공지사항을 안내드립니다.\n\n[본문 내용을 입력해 주세요]\n\n항상 더 나은 서비스를 제공하기 위해 노력하겠습니다.\n감사합니다.`,
    점검: `안녕하세요, Career Wave입니다.\n\n안정적인 서비스 제공을 위해 시스템 점검을 진행합니다.\n\n■ 점검 일시: 0000.00.00 (요일) 00:00 ~ 00:00\n■ 점검 내용: 서버 안정화 및 성능 개선\n\n점검 시간 동안 서비스 이용이 제한될 수 있습니다.\n이용에 불편을 드려 죄송합니다.`,
    업데이트: `안녕하세요, Career Wave입니다.\n\n${base}업데이트 내용을 안내드립니다.\n\n■ 주요 변경 사항\n- [변경 내용 1]\n- [변경 내용 2]\n\n더 나은 서비스로 찾아뵙겠습니다. 감사합니다.`,
    이벤트: `안녕하세요, Career Wave입니다.\n\n특별 이벤트를 진행합니다!\n\n■ 이벤트 기간: 0000.00.00 ~ 0000.00.00\n■ 이벤트 내용: ${base}[내용을 입력해 주세요]\n■ 대상: 이벤트 기간 중 참여 회원 전원\n\n많은 참여 부탁드립니다. 감사합니다.`,
  };
  return templates[category];
}

function genFaqDraft(question: string): string {
  if (!question.trim()) return '';
  return `안녕하세요, Career Wave 고객센터입니다.\n\n문의하신 "${question}"에 대한 답변입니다.\n\n[답변 내용을 입력해 주세요]\n\n추가 문의사항이 있으시면 언제든지 1:1 문의를 이용해 주세요.\n감사합니다.`;
}

function genInquiryDraft(inq: Inquiry): string {
  const header = `안녕하세요, ${inq.memberName} 님.\nCareer Wave 고객센터입니다.\n\n`;
  const footer = `\n\n추가 문의사항이 있으시면 언제든지 연락 주세요.\n감사합니다.`;
  const bodies: Record<InquiryCategory, string> = {
    환불:
      '환불 요청 접수해 주셔서 감사합니다.\n\n저희 환불 정책에 따라 결제일 포함 7일 이내이며 유료 AI 기능(이력서 분석, AI 면접)을 이용하지 않으신 경우 전액 환불이 가능합니다.\n이용 내역 확인 후 영업일 기준 3~5일 이내에 처리 결과를 안내해 드리겠습니다.',
    결제오류:
      '결제 오류로 불편을 드려 죄송합니다.\n\n다음 사항을 순서대로 확인해 주시기 바랍니다.\n1. 카드 한도 및 유효기간 확인\n2. 브라우저 캐시 삭제 후 재시도\n3. 다른 브라우저 또는 시크릿 모드에서 시도\n\n위 방법으로도 해결되지 않으면 다른 결제 수단을 이용해 주시거나 카드사 고객센터에 문의해 주세요.',
    서비스:
      '문의해 주신 내용 확인하였습니다.\n\n현재 해당 내용을 기술팀에서 검토 중이며, 빠른 시일 내에 해결하여 안내드리겠습니다.\n불편을 드려 죄송합니다.',
    계정:
      '계정 관련 문의 감사합니다.\n\n문의하신 내용을 확인하였습니다. 보안을 위해 일부 처리는 본인 확인 절차가 필요할 수 있습니다.\n안내에 따라 진행해 주시면 빠르게 처리해 드리겠습니다.',
    기타:
      '문의해 주셔서 감사합니다.\n\n내용을 확인하였으며 빠른 시일 내에 답변 드리겠습니다.',
  };
  return header + bodies[inq.category] + footer;
}

// ── Component ─────────────────────────────────────────────────

export default function CustomerServicePage() {
  const [tab, setTab] = useState<CsTab>('notice');

  // ── Notice state ─────────────────────────────────────────
  const [notices, setNotices]         = useState<Notice[]>(initNotices);
  const [noticeModal, setNoticeModal] = useState<'create' | 'edit' | null>(null);
  const [noticeForm, setNoticeForm]   = useState<Partial<Notice>>({});
  const [aiNoticeLoading, setAiNoticeLoading] = useState(false);

  // ── FAQ state ────────────────────────────────────────────
  const [faqs, setFaqs]         = useState<Faq[]>(initFaqs);
  const [faqModal, setFaqModal] = useState<'create' | 'edit' | null>(null);
  const [faqForm, setFaqForm]   = useState<Partial<Faq>>({});
  const [aiFaqLoading, setAiFaqLoading] = useState(false);

  // ── Inquiry state ────────────────────────────────────────
  const [inquiries, setInquiries]               = useState<Inquiry[]>(initInquiries);
  const [selectedInquiry, setSelectedInquiry]   = useState<Inquiry | null>(null);
  const [inquiryReply, setInquiryReply]         = useState('');
  const [inqCatFilter, setInqCatFilter]         = useState('');
  const [inqStatusFilter, setInqStatusFilter]   = useState('');
  const [aiInqLoading, setAiInqLoading]         = useState(false);

  // ── KPI ──────────────────────────────────────────────────
  const pendingCount   = inquiries.filter((i) => i.status === '접수 중').length;
  const answeringCount = inquiries.filter((i) => i.status === '답변 중').length;

  // ── Notice handlers ──────────────────────────────────────
  const openNoticeCreate = () => {
    setNoticeForm({ category: '공지', visible: true, title: '', content: '' });
    setNoticeModal('create');
  };
  const openNoticeEdit = (n: Notice) => { setNoticeForm({ ...n }); setNoticeModal('edit'); };
  const saveNotice = () => {
    if (!noticeForm.title?.trim()) return;
    if (noticeModal === 'create') {
      setNotices((p) => [
        ...p,
        {
          id: Date.now(),
          title: noticeForm.title!,
          content: noticeForm.content ?? '',
          category: noticeForm.category ?? '공지',
          createdAt: '2026.05.28',
          visible: noticeForm.visible ?? true,
        },
      ]);
    } else {
      setNotices((p) => p.map((n) => (n.id === noticeForm.id ? ({ ...n, ...noticeForm } as Notice) : n)));
    }
    setNoticeModal(null);
  };
  const deleteNotice = (id: number) => setNotices((p) => p.filter((n) => n.id !== id));

  const handleAiNoticeDraft = () => {
    setAiNoticeLoading(true);
    setTimeout(() => {
      setNoticeForm((p) => ({
        ...p,
        content: genNoticeDraft(p.category ?? '공지', p.title ?? ''),
      }));
      setAiNoticeLoading(false);
    }, 900);
  };

  // ── FAQ handlers ─────────────────────────────────────────
  const openFaqCreate = () => { setFaqForm({ category: '계정', question: '', answer: '' }); setFaqModal('create'); };
  const openFaqEdit   = (f: Faq) => { setFaqForm({ ...f }); setFaqModal('edit'); };
  const saveFaq = () => {
    if (!faqForm.question?.trim()) return;
    if (faqModal === 'create') {
      setFaqs((p) => [
        ...p,
        {
          id: Date.now(),
          category: faqForm.category ?? '계정',
          question: faqForm.question!,
          answer: faqForm.answer ?? '',
          createdAt: '2026.05.28',
        },
      ]);
    } else {
      setFaqs((p) => p.map((f) => (f.id === faqForm.id ? ({ ...f, ...faqForm } as Faq) : f)));
    }
    setFaqModal(null);
  };
  const deleteFaq = (id: number) => setFaqs((p) => p.filter((f) => f.id !== id));

  const handleAiFaqDraft = () => {
    setAiFaqLoading(true);
    setTimeout(() => {
      setFaqForm((p) => ({ ...p, answer: genFaqDraft(p.question ?? '') }));
      setAiFaqLoading(false);
    }, 900);
  };

  // ── Inquiry handlers ─────────────────────────────────────
  const openInquiry = (inq: Inquiry) => {
    setSelectedInquiry(inq);
    setInquiryReply(inq.reply ?? '');
    setAiInqLoading(false);
  };

  const saveInquiryReply = () => {
    if (!selectedInquiry) return;
    const hasReply = inquiryReply.trim().length > 0;
    const nextStatus: InquiryStatus =
      hasReply && selectedInquiry.status === '접수 중' ? '답변 중' : selectedInquiry.status;
    setInquiries((p) =>
      p.map((inq) =>
        inq.id === selectedInquiry.id
          ? { ...inq, reply: inquiryReply, status: nextStatus }
          : inq,
      ),
    );
    setSelectedInquiry(null);
  };

  const completeInquiry = () => {
    if (!selectedInquiry) return;
    setInquiries((p) =>
      p.map((inq) =>
        inq.id === selectedInquiry.id
          ? { ...inq, reply: inquiryReply, status: '완료' }
          : inq,
      ),
    );
    setSelectedInquiry(null);
  };

  const handleAiInquiryDraft = () => {
    if (!selectedInquiry) return;
    setAiInqLoading(true);
    setTimeout(() => {
      setInquiryReply(genInquiryDraft(selectedInquiry));
      setAiInqLoading(false);
    }, 900);
  };

  // ── Inquiry filtered ─────────────────────────────────────
  const filteredInquiries = inquiries.filter(
    (i) =>
      (!inqCatFilter    || i.category === inqCatFilter) &&
      (!inqStatusFilter || i.status   === inqStatusFilter),
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
          <div className="kpiContent">
            <p>공지사항</p>
            <h3>{notices.length}</h3>
            <span>등록된 공지</span>
          </div>
          <div className="kpiIcon kpi-blue"><Bell size={24} /></div>
        </div>
        <div className="kpiCard kpi-green csKpiStatic">
          <div className="kpiContent">
            <p>FAQ</p>
            <h3>{faqs.length}</h3>
            <span>등록된 항목</span>
          </div>
          <div className="kpiIcon kpi-green"><HelpCircle size={24} /></div>
        </div>
        <div className="kpiCard kpi-yellow csKpiStatic">
          <div className="kpiContent">
            <p>미답변 문의</p>
            <h3>{pendingCount}</h3>
            <span>즉시 처리 필요</span>
          </div>
          <div className="kpiIcon kpi-yellow"><AlertCircle size={24} /></div>
        </div>
        <div className="kpiCard kpi-purple csKpiStatic">
          <div className="kpiContent">
            <p>답변 진행 중</p>
            <h3>{answeringCount}</h3>
            <span>처리 중</span>
          </div>
          <div className="kpiIcon kpi-purple"><MessageSquare size={24} /></div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="csTabBar" style={{ marginBottom: 24 }}>
        {(['notice', 'faq', 'inquiry'] as CsTab[]).map((t) => (
          <button
            key={t}
            className={`csTab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {/* ── 공지사항 탭 ─────────────────────────────────── */}
      {tab === 'notice' && (
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>공지사항</h3>
            <button onClick={openNoticeCreate}>+ 공지 등록</button>
          </div>
          <div className="tableScroll">
            <table className="memberTable">
              <thead>
                <tr>
                  <th>번호</th>
                  <th>카테고리</th>
                  <th>제목</th>
                  <th>등록일</th>
                  <th>노출</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n) => (
                  <tr key={n.id}>
                    <td>{n.id}</td>
                    <td>
                      <span className="statusBadge normal csNoticeCat">{n.category}</span>
                    </td>
                    <td>{n.title}</td>
                    <td>{n.createdAt}</td>
                    <td>
                      <span className={`statusBadge ${n.visible ? 'normal' : 'dismissed'}`}>
                        {n.visible ? '노출' : '숨김'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="tableBtn" onClick={() => openNoticeEdit(n)}>수정</button>
                        <button className="tableBtn" onClick={() => deleteNotice(n.id)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── FAQ 탭 ──────────────────────────────────────── */}
      {tab === 'faq' && (
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>FAQ</h3>
            <button onClick={openFaqCreate}>+ FAQ 등록</button>
          </div>
          <div className="tableScroll">
            <table className="memberTable">
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th>질문</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span className="statusBadge normal csNoticeCat">{f.category}</span>
                    </td>
                    <td>{f.question}</td>
                    <td>{f.createdAt}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="tableBtn" onClick={() => openFaqEdit(f)}>수정</button>
                        <button className="tableBtn" onClick={() => deleteFaq(f.id)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── 1:1 문의 탭 ─────────────────────────────────── */}
      {tab === 'inquiry' && (
        <div className="memberPage">
          {/* 필터 */}
          <section className="admin-card memberFilter">
            <select value={inqCatFilter} onChange={(e) => setInqCatFilter(e.target.value)}>
              <option value="">카테고리 전체</option>
              {INQ_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={inqStatusFilter} onChange={(e) => setInqStatusFilter(e.target.value)}>
              <option value="">상태 전체</option>
              <option value="접수 중">접수 중</option>
              <option value="답변 중">답변 중</option>
              <option value="완료">완료</option>
            </select>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                1:1 문의
                <span className="payTotalCount">{filteredInquiries.length}건</span>
              </h3>
            </div>
            <div className="tableScroll">
              <table className="memberTable">
                <thead>
                  <tr>
                    <th>문의 ID</th>
                    <th>회원명</th>
                    <th>카테고리</th>
                    <th>제목</th>
                    <th>접수일</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((inq) => (
                    <tr key={inq.id}>
                      <td>{inq.id}</td>
                      <td>{inq.memberName}</td>
                      <td>
                        <span className={`csInqCatBadge ${INQ_CAT_CLS[inq.category]}`}>
                          {inq.category}
                        </span>
                      </td>
                      <td>{inq.title}</td>
                      <td>{inq.createdAt}</td>
                      <td>
                        <span className={`statusBadge ${INQ_STATUS_CLS[inq.status]}`}>
                          {inq.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`tableBtn${inq.status === '접수 중' ? ' tableBtn--refund' : ''}`}
                          onClick={() => openInquiry(inq)}
                        >
                          {inq.status === '접수 중' ? '답변하기' : '상세보기'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── 공지사항 모달 ────────────────────────────────── */}
      {noticeModal && (
        <div className="modalOverlay" onClick={() => setNoticeModal(null)}>
          <div
            className="memberModal modal--scrollable"
            style={{ width: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader" style={{ flexShrink: 0 }}>
              <div>
                <h3>{noticeModal === 'create' ? '공지사항 등록' : '공지사항 수정'}</h3>
              </div>
              <button onClick={() => setNoticeModal(null)}>닫기</button>
            </div>

            <div className="modalBody">
              <div className="csFormRows">
                <div className="csFormRow">
                  <label>카테고리</label>
                  <select
                    className="csFormSelect"
                    value={noticeForm.category}
                    onChange={(e) =>
                      setNoticeForm((p) => ({ ...p, category: e.target.value as NoticeCategory }))
                    }
                  >
                    {NOTICE_CATS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="csFormRow">
                  <label>제목</label>
                  <input
                    className="csFormInput"
                    type="text"
                    placeholder="공지 제목을 입력하세요"
                    value={noticeForm.title ?? ''}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="csFormRow">
                  <label>내용</label>
                  <textarea
                    className="csFormTextarea csFormTextarea--tall"
                    placeholder="공지 내용을 입력하세요"
                    value={noticeForm.content ?? ''}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, content: e.target.value }))}
                  />
                </div>

                {/* AI 작성 보조 */}
                <div className="csAiSection">
                  <div className="csAiLabel">
                    <Sparkles size={13} />
                    AI 작성 보조
                  </div>
                  <p className="csAiDesc">카테고리와 제목을 입력하면 AI가 공지 내용 초안을 생성합니다.</p>
                  <button
                    className="csAiBtn"
                    onClick={handleAiNoticeDraft}
                    disabled={aiNoticeLoading || !noticeForm.title?.trim()}
                  >
                    <Sparkles size={14} />
                    {aiNoticeLoading ? 'AI 생성 중...' : '초안 생성'}
                  </button>
                </div>

                <div className="csFormRow">
                  <label>노출 여부</label>
                  <label className="csCheckLabel">
                    <input
                      type="checkbox"
                      checked={noticeForm.visible ?? true}
                      onChange={(e) =>
                        setNoticeForm((p) => ({ ...p, visible: e.target.checked }))
                      }
                    />
                    사용자에게 노출
                  </label>
                </div>
              </div>
            </div>

            <div className="modalAction" style={{ flexShrink: 0 }}>
              <button onClick={saveNotice}>
                {noticeModal === 'create' ? '등록' : '저장'}
              </button>
              <button onClick={() => setNoticeModal(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ 모달 ─────────────────────────────────────── */}
      {faqModal && (
        <div className="modalOverlay" onClick={() => setFaqModal(null)}>
          <div
            className="memberModal modal--scrollable"
            style={{ width: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader" style={{ flexShrink: 0 }}>
              <div>
                <h3>{faqModal === 'create' ? 'FAQ 등록' : 'FAQ 수정'}</h3>
              </div>
              <button onClick={() => setFaqModal(null)}>닫기</button>
            </div>

            <div className="modalBody">
              <div className="csFormRows">
                <div className="csFormRow">
                  <label>카테고리</label>
                  <select
                    className="csFormSelect"
                    value={faqForm.category}
                    onChange={(e) =>
                      setFaqForm((p) => ({ ...p, category: e.target.value as FaqCategory }))
                    }
                  >
                    {FAQ_CATS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="csFormRow">
                  <label>질문</label>
                  <input
                    className="csFormInput"
                    type="text"
                    placeholder="자주 묻는 질문을 입력하세요"
                    value={faqForm.question ?? ''}
                    onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))}
                  />
                </div>

                <div className="csFormRow">
                  <div className="csFormLabelRow">
                    <label>답변</label>
                    <button
                      className="csAiBtn csAiBtn--inline"
                      onClick={handleAiFaqDraft}
                      disabled={aiFaqLoading || !faqForm.question?.trim()}
                    >
                      <Sparkles size={13} />
                      {aiFaqLoading ? 'AI 생성 중...' : 'AI 답변 초안'}
                    </button>
                  </div>
                  <textarea
                    className="csFormTextarea csFormTextarea--tall"
                    placeholder="답변 내용을 입력하세요"
                    value={faqForm.answer ?? ''}
                    onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="modalAction" style={{ flexShrink: 0 }}>
              <button onClick={saveFaq}>{faqModal === 'create' ? '등록' : '저장'}</button>
              <button onClick={() => setFaqModal(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1:1 문의 상세 모달 ───────────────────────────── */}
      {selectedInquiry && (
        <div className="modalOverlay" onClick={() => setSelectedInquiry(null)}>
          <div
            className="memberModal modal--scrollable"
            style={{ width: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="modalHeader" style={{ flexShrink: 0, padding: '20px 24px 16px' }}>
              <div>
                <h3>{selectedInquiry.title}</h3>
                <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>
                  {selectedInquiry.id} · {selectedInquiry.memberName} · {selectedInquiry.createdAt}
                </p>
              </div>
              <button onClick={() => setSelectedInquiry(null)}>닫기</button>
            </div>

            {/* 본문 */}
            <div className="modalBody">
              {/* 문의 정보 */}
              <div className="modalInfoGrid">
                <div>
                  <span>카테고리</span>
                  <span className={`csInqCatBadge ${INQ_CAT_CLS[selectedInquiry.category]}`}>
                    {selectedInquiry.category}
                  </span>
                </div>
                <div>
                  <span>현재 상태</span>
                  <span className={`statusBadge ${INQ_STATUS_CLS[selectedInquiry.status]}`}>
                    {selectedInquiry.status}
                  </span>
                </div>
              </div>

              {/* 문의 내용 */}
              <div className="csInqContent">
                <p className="csInqContentLabel">문의 내용</p>
                <p className="csInqContentBody">{selectedInquiry.content}</p>
              </div>

              {/* 답변 작성 */}
              <div className="csReplySection">
                <div className="csFormLabelRow">
                  <label className="csReplyLabel">답변 작성</label>
                  <button
                    className="csAiBtn csAiBtn--inline"
                    onClick={handleAiInquiryDraft}
                    disabled={aiInqLoading}
                  >
                    <Sparkles size={13} />
                    {aiInqLoading ? 'AI 생성 중...' : 'AI 답변 초안'}
                  </button>
                </div>
                <textarea
                  className="csFormTextarea csFormTextarea--reply"
                  placeholder="답변 내용을 입력하세요"
                  value={inquiryReply}
                  onChange={(e) => setInquiryReply(e.target.value)}
                />
              </div>
            </div>

            {/* 액션 */}
            <div className="modalAction" style={{ flexShrink: 0, padding: '16px 24px 20px' }}>
              {selectedInquiry.status !== '완료' && (
                <>
                  <button onClick={saveInquiryReply}>답변 저장</button>
                  {selectedInquiry.status === '답변 중' && (
                    <button onClick={completeInquiry}>처리 완료</button>
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
