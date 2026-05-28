import { useState } from 'react';
import '../../styles/admin.css';
import '../../styles/CustomerService.css';

// ── Types ────────────────────────────────────────────────────

type NoticeCategory = '공지' | '업데이트' | '이벤트' | '점검';
interface Notice {
  id: number;
  title: string;
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

type TicketStatus = '접수 중' | '답변 중' | '완료';
interface Ticket {
  id: string;
  memberName: string;
  title: string;
  content: string;
  createdAt: string;
  status: TicketStatus;
}

type Tab = 'notice' | 'faq' | 'ticket';

// ── Dummy Data ───────────────────────────────────────────────

const initNotices: Notice[] = [
  { id: 1, title: 'Career Wave 서비스 오픈 안내',      category: '공지',    createdAt: '2026.05.20', visible: true },
  { id: 2, title: '5월 22일 새벽 서버 점검 안내',      category: '점검',    createdAt: '2026.05.21', visible: true },
  { id: 3, title: '이력서 AI 첨삭 기능 업데이트',      category: '업데이트', createdAt: '2026.05.22', visible: true },
  { id: 4, title: '신규 회원 가입 이벤트 안내',        category: '이벤트',  createdAt: '2026.05.22', visible: false },
];

const initFaqs: Faq[] = [
  { id: 1, category: '결제',   question: '구독을 중간에 해지하면 환불이 되나요?',     answer: '해지 시 잔여 일수 기준으로 일할 계산하여 환불 처리됩니다.',                        createdAt: '2026.05.10' },
  { id: 2, category: '계정',   question: '비밀번호를 잊어버렸어요.',                   answer: '로그인 화면에서 "비밀번호 찾기"를 이용하시면 이메일로 재설정 링크를 전송합니다.',  createdAt: '2026.05.10' },
  { id: 3, category: '서비스', question: 'AI 모의면접은 몇 번이나 이용할 수 있나요?', answer: '무료 회원은 월 3회, 프리미엄 회원은 무제한 이용 가능합니다.',                       createdAt: '2026.05.11' },
  { id: 4, category: '기타',   question: '기업 회원과 개인 회원의 차이가 무엇인가요?', answer: '기업 회원은 채용공고 등록 및 지원자 관리 기능을 추가로 이용할 수 있습니다.',      createdAt: '2026.05.12' },
];

const initTickets: Ticket[] = [
  { id: 'T-501', memberName: '김민지', title: '결제 오류가 계속 발생합니다',     content: '카드 결제 시도 시 "처리 실패" 오류가 반복됩니다.',             createdAt: '2026.05.22', status: '접수 중' },
  { id: 'T-502', memberName: '이준호', title: 'AI 면접 영상이 저장이 안 돼요',   content: '면접 종료 후 영상 저장 버튼을 눌러도 반응이 없습니다.',        createdAt: '2026.05.21', status: '답변 중' },
  { id: 'T-503', memberName: '박서연', title: '탈퇴 후 재가입 가능 시점 문의',   content: '탈퇴 후 같은 이메일로 재가입은 얼마나 지나야 가능한가요?',     createdAt: '2026.05.20', status: '완료' },
  { id: 'T-504', memberName: '최도윤', title: '구독 환불 요청',                  content: '이번 달 구독비 환불 요청드립니다.',                             createdAt: '2026.05.22', status: '접수 중' },
];

const NOTICE_CATS: NoticeCategory[] = ['공지', '업데이트', '이벤트', '점검'];
const FAQ_CATS:    FaqCategory[]    = ['계정', '결제', '서비스', '기타'];

const TICKET_NEXT: Record<TicketStatus, TicketStatus | null> = {
  '접수 중': '답변 중',
  '답변 중': '완료',
  '완료':    null,
};

const ticketCls: Record<TicketStatus, string> = {
  '접수 중': 'pending',
  '답변 중': 'answering',
  '완료':    'normal',
};

const TAB_LABEL: Record<Tab, string> = {
  notice: '공지사항',
  faq:    'FAQ',
  ticket: '1:1 문의',
};

// ── Component ────────────────────────────────────────────────

export default function CustomerServicePage() {
  const [tab, setTab] = useState<Tab>('notice');

  // Notice
  const [notices, setNotices]       = useState(initNotices);
  const [noticeModal, setNoticeModal] = useState<'create' | 'edit' | null>(null);
  const [noticeForm, setNoticeForm] = useState<Partial<Notice>>({});

  // FAQ
  const [faqs, setFaqs]       = useState(initFaqs);
  const [faqModal, setFaqModal] = useState<'create' | 'edit' | null>(null);
  const [faqForm, setFaqForm] = useState<Partial<Faq>>({});

  // Ticket
  const [tickets, setTickets]             = useState(initTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // ── Notice handlers ──────────────────────────────────────
  const openNoticeCreate = () => {
    setNoticeForm({ category: '공지', visible: true });
    setNoticeModal('create');
  };
  const openNoticeEdit = (n: Notice) => { setNoticeForm(n); setNoticeModal('edit'); };
  const saveNotice = () => {
    if (!noticeForm.title?.trim()) return;
    if (noticeModal === 'create') {
      setNotices((p) => [...p, { id: Date.now(), title: noticeForm.title!, category: noticeForm.category ?? '공지', createdAt: '2026.05.22', visible: noticeForm.visible ?? true }]);
    } else {
      setNotices((p) => p.map((n) => n.id === noticeForm.id ? { ...n, ...noticeForm } as Notice : n));
    }
    setNoticeModal(null);
  };
  const deleteNotice = (id: number) => setNotices((p) => p.filter((n) => n.id !== id));

  // ── FAQ handlers ─────────────────────────────────────────
  const openFaqCreate = () => { setFaqForm({ category: '계정' }); setFaqModal('create'); };
  const openFaqEdit   = (f: Faq) => { setFaqForm(f); setFaqModal('edit'); };
  const saveFaq = () => {
    if (!faqForm.question?.trim()) return;
    if (faqModal === 'create') {
      setFaqs((p) => [...p, { id: Date.now(), category: faqForm.category ?? '계정', question: faqForm.question!, answer: faqForm.answer ?? '', createdAt: '2026.05.22' }]);
    } else {
      setFaqs((p) => p.map((f) => f.id === faqForm.id ? { ...f, ...faqForm } as Faq : f));
    }
    setFaqModal(null);
  };
  const deleteFaq = (id: number) => setFaqs((p) => p.filter((f) => f.id !== id));

  // ── Ticket handlers ──────────────────────────────────────
  const advanceTicket = (ticket: Ticket) => {
    const next = TICKET_NEXT[ticket.status];
    if (!next) return;
    setTickets((p) => p.map((t) => t.id === ticket.id ? { ...t, status: next } : t));
    if (selectedTicket?.id === ticket.id) setSelectedTicket({ ...ticket, status: next });
  };

  const pendingCount  = tickets.filter((t) => t.status === '접수 중').length;
  const answeringCount = tickets.filter((t) => t.status === '답변 중').length;

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>고객센터</h2>
          <p>1:1 문의 및 공지·FAQ를 관리합니다.</p>
        </div>
      </header>

      {/* KPI */}
      <section className="memberSummaryGrid" style={{ marginBottom: 18 }}>
        <article className="memberSummaryCard">
          <p>공지사항</p><h3>{notices.length}</h3><span>등록된 공지</span>
        </article>
        <article className="memberSummaryCard">
          <p>FAQ</p><h3>{faqs.length}</h3><span>등록된 항목</span>
        </article>
        <article className="memberSummaryCard">
          <p>미답변 문의</p><h3>{pendingCount}</h3><span>즉시 처리 필요</span>
        </article>
        <article className="memberSummaryCard">
          <p>답변 진행 중</p><h3>{answeringCount}</h3><span>처리 중</span>
        </article>
      </section>

      {/* Tab Bar */}
      <div className="admin-card" style={{ padding: '0 22px', marginBottom: 18 }}>
        <div className="csTabBar">
          {(['notice', 'faq', 'ticket'] as Tab[]).map((t) => (
            <button key={t} className={`csTab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── 공지사항 탭 ─────────────────────────────────── */}
      {tab === 'notice' && (
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>공지사항</h3>
            <button onClick={openNoticeCreate}>+ 공지 등록</button>
          </div>
          <table className="memberTable">
            <thead>
              <tr>
                <th>번호</th><th>제목</th><th>카테고리</th><th>등록일</th><th>노출</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((n) => (
                <tr key={n.id}>
                  <td>{n.id}</td>
                  <td>{n.title}</td>
                  <td>
                    <span className="statusBadge normal" style={{ minWidth: 'auto', padding: '0 10px' }}>{n.category}</span>
                  </td>
                  <td>{n.createdAt}</td>
                  <td>
                    <span className={`statusBadge ${n.visible ? 'normal' : 'dismissed'}`}>{n.visible ? '노출' : '숨김'}</span>
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
        </section>
      )}

      {/* ── FAQ 탭 ──────────────────────────────────────── */}
      {tab === 'faq' && (
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>FAQ</h3>
            <button onClick={openFaqCreate}>+ FAQ 등록</button>
          </div>
          <table className="memberTable">
            <thead>
              <tr>
                <th>카테고리</th><th>질문</th><th>등록일</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((f) => (
                <tr key={f.id}>
                  <td>
                    <span className="statusBadge normal" style={{ minWidth: 'auto', padding: '0 10px' }}>{f.category}</span>
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
        </section>
      )}

      {/* ── 1:1 문의 탭 ─────────────────────────────────── */}
      {tab === 'ticket' && (
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>1:1 문의</h3>
          </div>
          <table className="memberTable">
            <thead>
              <tr>
                <th>문의 ID</th><th>회원명</th><th>제목</th><th>접수일</th><th>상태</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.memberName}</td>
                  <td>{t.title}</td>
                  <td>{t.createdAt}</td>
                  <td>
                    <span className={`statusBadge ${ticketCls[t.status]}`}>{t.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="tableBtn" onClick={() => setSelectedTicket(t)}>상세보기</button>
                      {TICKET_NEXT[t.status] && (
                        <button className="tableBtn" onClick={() => advanceTicket(t)}>
                          {TICKET_NEXT[t.status]}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── 공지사항 모달 ────────────────────────────────── */}
      {noticeModal && (
        <div className="modalOverlay" onClick={() => setNoticeModal(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h3>{noticeModal === 'create' ? '공지사항 등록' : '공지사항 수정'}</h3>
              </div>
              <button onClick={() => setNoticeModal(null)}>닫기</button>
            </div>
            <div className="csFormRows">
              <div className="csFormRow">
                <label>카테고리</label>
                <select
                  className="csFormSelect"
                  value={noticeForm.category}
                  onChange={(e) => setNoticeForm((p) => ({ ...p, category: e.target.value as NoticeCategory }))}
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
                <label>노출 여부</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#23384f' }}>
                  <input
                    type="checkbox"
                    checked={noticeForm.visible ?? true}
                    onChange={(e) => setNoticeForm((p) => ({ ...p, visible: e.target.checked }))}
                  />
                  사용자에게 노출
                </label>
              </div>
            </div>
            <div className="modalAction">
              <button onClick={saveNotice}>{noticeModal === 'create' ? '등록' : '저장'}</button>
              <button onClick={() => setNoticeModal(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ 모달 ─────────────────────────────────────── */}
      {faqModal && (
        <div className="modalOverlay" onClick={() => setFaqModal(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modalHeader">
              <div>
                <h3>{faqModal === 'create' ? 'FAQ 등록' : 'FAQ 수정'}</h3>
              </div>
              <button onClick={() => setFaqModal(null)}>닫기</button>
            </div>
            <div className="csFormRows">
              <div className="csFormRow">
                <label>카테고리</label>
                <select
                  className="csFormSelect"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm((p) => ({ ...p, category: e.target.value as FaqCategory }))}
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
                <label>답변</label>
                <textarea
                  className="csFormTextarea"
                  placeholder="답변 내용을 입력하세요"
                  value={faqForm.answer ?? ''}
                  onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))}
                />
              </div>
            </div>
            <div className="modalAction">
              <button onClick={saveFaq}>{faqModal === 'create' ? '등록' : '저장'}</button>
              <button onClick={() => setFaqModal(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 티켓 상세 모달 ───────────────────────────────── */}
      {selectedTicket && (
        <div className="modalOverlay" onClick={() => setSelectedTicket(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modalHeader">
              <div>
                <h3>{selectedTicket.title}</h3>
                <p>{selectedTicket.id} · {selectedTicket.memberName} · {selectedTicket.createdAt}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div><span>현재 상태</span><strong>{selectedTicket.status}</strong></div>
              <div><span>회원명</span><strong>{selectedTicket.memberName}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span>문의 내용</span>
                <strong style={{ display: 'block', marginTop: 8, lineHeight: 1.7, wordBreak: 'break-all' }}>
                  {selectedTicket.content}
                </strong>
              </div>
            </div>
            <div className="modalAction">
              {TICKET_NEXT[selectedTicket.status] && (
                <button onClick={() => advanceTicket(selectedTicket)}>
                  {TICKET_NEXT[selectedTicket.status]}(으)로 변경
                </button>
              )}
              <button onClick={() => setSelectedTicket(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
