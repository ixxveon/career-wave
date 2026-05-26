import { useState } from 'react';
import '../../styles/admin.css';

type PayTab = '결제 내역' | '구독 현황' | '크레딧 관리' | '정산 리포트';

// ── Tab 1: 결제 내역 ─────────────────────────────────────────
type PayStatus = '결제 완료' | '환불 요청' | '환불 완료' | '결제 실패';

interface Payment {
  id: string;
  orderId: string;
  memberName: string;
  product: string;
  paidAt: string;
  amount: number;
  status: PayStatus;
  totalDays: number;
}

const statusCls: Record<PayStatus, string> = {
  '결제 완료': 'normal',
  '환불 요청': 'pending',
  '환불 완료': 'dismissed',
  '결제 실패': 'blinded',
};

const initialPayments: Payment[] = [
  { id: 'PAY-3001', orderId: 'TOSS-20260501-A1B2C3', memberName: '김민지', product: '프리미엄 월정액',  paidAt: '2026.05.01', amount: 29000,  status: '결제 완료', totalDays: 30  },
  { id: 'PAY-3002', orderId: 'TOSS-20260425-D4E5F6', memberName: '이준호', product: '프리미엄 월정액',  paidAt: '2026.04.25', amount: 29000,  status: '환불 요청', totalDays: 30  },
  { id: 'PAY-3003', orderId: 'TOSS-20260510-G7H8I9', memberName: '최도윤', product: '기업 Standard',   paidAt: '2026.05.10', amount: 150000, status: '결제 완료', totalDays: 90  },
  { id: 'PAY-3004', orderId: 'TOSS-20260518-J1K2L3', memberName: '박서연', product: '프리미엄 월정액',  paidAt: '2026.05.18', amount: 29000,  status: '결제 실패', totalDays: 30  },
  { id: 'PAY-3005', orderId: 'TOSS-20260301-M4N5O6', memberName: '홍길동', product: '프리미엄 연정액',  paidAt: '2026.03.01', amount: 290000, status: '환불 완료', totalDays: 365 },
  { id: 'PAY-3006', orderId: 'TOSS-20260505-P7Q8R9', memberName: '이영희', product: '프리미엄 월정액',  paidAt: '2026.05.05', amount: 29000,  status: '결제 완료', totalDays: 30  },
  { id: 'PAY-3007', orderId: 'TOSS-20260412-S1T2U3', memberName: '(주)테크스타트', product: '기업 Premium', paidAt: '2026.04.12', amount: 350000, status: '결제 완료', totalDays: 30  },
  { id: 'PAY-3008', orderId: 'TOSS-20260501-V4W5X6', memberName: '네오소프트',    product: '기업 Standard', paidAt: '2026.05.01', amount: 150000, status: '결제 완료', totalDays: 30  },
];

const TODAY = new Date(2026, 4, 22);

function calcRefund(amount: number, paidAt: string, totalDays: number) {
  const [y, m, d] = paidAt.split('.').map(Number);
  const paid       = new Date(y, m - 1, d);
  const usedDays   = Math.max(0, Math.floor((TODAY.getTime() - paid.getTime()) / 86400000));
  const remainDays = Math.max(0, totalDays - usedDays);
  const refundAmt  = Math.floor(amount * (remainDays / totalDays));
  return { usedDays, remainDays, refundAmt };
}

// ── Tab 2: 구독 현황 ─────────────────────────────────────────
type SubStatus = '활성' | '갱신예정' | '취소예정' | '이탈위험';

interface Subscription {
  id: string;
  memberName: string;
  type: 'B2C' | 'B2B';
  plan: string;
  startDate: string;
  renewDate: string;
  status: SubStatus;
}

const subStatusCls: Record<SubStatus, string> = {
  '활성':   'normal',
  '갱신예정': 'answering',
  '취소예정': 'pending',
  '이탈위험': 'blinded',
};

const dummySubs: Subscription[] = [
  { id: 'SUB-001', memberName: '김민지',       type: 'B2C', plan: '프리미엄 월정액', startDate: '2026.05.01', renewDate: '2026.06.01', status: '활성'   },
  { id: 'SUB-002', memberName: '최도윤',       type: 'B2C', plan: '프리미엄 월정액', startDate: '2026.04.10', renewDate: '2026.05.29', status: '갱신예정' },
  { id: 'SUB-003', memberName: '이영희',       type: 'B2C', plan: '프리미엄 월정액', startDate: '2026.05.05', renewDate: '2026.06.05', status: '활성'   },
  { id: 'SUB-004', memberName: '정현우',       type: 'B2C', plan: '프리미엄 연정액', startDate: '2026.02.01', renewDate: '2027.02.01', status: '취소예정' },
  { id: 'SUB-005', memberName: '(주)테크스타트', type: 'B2B', plan: 'Premium 5석',   startDate: '2026.04.12', renewDate: '2026.05.29', status: '갱신예정' },
  { id: 'SUB-006', memberName: '네오소프트',    type: 'B2B', plan: 'Standard 3석',  startDate: '2026.05.01', renewDate: '2026.06.01', status: '활성'   },
  { id: 'SUB-007', memberName: '이노베이션랩',  type: 'B2B', plan: 'Premium 5석',   startDate: '2026.03.15', renewDate: '2026.05.30', status: '이탈위험' },
  { id: 'SUB-008', memberName: '디지털파트너스', type: 'B2B', plan: 'Standard 3석',  startDate: '2026.04.01', renewDate: '2026.07.01', status: '활성'   },
];

// ── Tab 3: 크레딧 관리 ───────────────────────────────────────
interface CreditCompany {
  id: string;
  name: string;
  balance: number;
  lastCharged: string;
  lastUsed: string;
}

interface CreditTx {
  id: string;
  companyName: string;
  type: '충전' | '차감';
  amount: number;
  reason: string;
  date: string;
}

const dummyCreditCompanies: CreditCompany[] = [
  { id: 'C-001', name: '(주)테크스타트', balance: 280, lastCharged: '2026.05.10', lastUsed: '2026.05.21' },
  { id: 'C-002', name: '네오소프트',     balance: 50,  lastCharged: '2026.05.01', lastUsed: '2026.05.18' },
  { id: 'C-003', name: '이노베이션랩',   balance: 0,   lastCharged: '2026.04.15', lastUsed: '2026.05.20' },
  { id: 'C-004', name: '디지털파트너스', balance: 120, lastCharged: '2026.05.05', lastUsed: '2026.05.15' },
];

const dummyCreditTxs: CreditTx[] = [
  { id: 'CTX-001', companyName: '(주)테크스타트', type: '충전', amount: 100, reason: '정기 충전',             date: '2026.05.10' },
  { id: 'CTX-002', companyName: '(주)테크스타트', type: '차감', amount: 1,   reason: '인재 프로필 열람',       date: '2026.05.21' },
  { id: 'CTX-003', companyName: '이노베이션랩',   type: '충전', amount: 50,  reason: '수동 지급 (고객센터 처리)', date: '2026.04.15' },
  { id: 'CTX-004', companyName: '이노베이션랩',   type: '차감', amount: 2,   reason: '면접 제안',              date: '2026.05.20' },
  { id: 'CTX-005', companyName: '네오소프트',     type: '충전', amount: 50,  reason: '정기 충전',             date: '2026.05.01' },
  { id: 'CTX-006', companyName: '디지털파트너스', type: '충전', amount: 100, reason: '정기 충전',             date: '2026.05.05' },
  { id: 'CTX-007', companyName: '디지털파트너스', type: '차감', amount: 1,   reason: '인재 프로필 열람',       date: '2026.05.15' },
];

// ── Tab 4: 정산 리포트 ───────────────────────────────────────
interface MonthlyReport {
  month: string;
  b2cRevenue: number;
  b2bRevenue: number;
  creditRevenue: number;
}

const dummyReports: MonthlyReport[] = [
  { month: '2026-02', b2cRevenue: 261000,  b2bRevenue: 500000,  creditRevenue: 100000 },
  { month: '2026-03', b2cRevenue: 319000,  b2bRevenue: 650000,  creditRevenue: 150000 },
  { month: '2026-04', b2cRevenue: 406000,  b2bRevenue: 800000,  creditRevenue: 200000 },
  { month: '2026-05', b2cRevenue: 348000,  b2bRevenue: 500000,  creditRevenue: 80000  },
];

function vatBreakdown(total: number) {
  const supply = Math.floor(total / 1.1);
  const vat    = total - supply;
  return { supply, vat };
}

// ── Main Component ───────────────────────────────────────────
export default function PaymentPage() {
  const [tab, setTab] = useState<PayTab>('결제 내역');

  // Tab 1 state
  const [payments, setPayments]         = useState<Payment[]>(initialPayments);
  const [selected, setSelected]         = useState<Payment | null>(null);
  const [keyword, setKeyword]           = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [productFilter, setProductFilter] = useState('전체');

  // Tab 2 state
  const [subTypeFilter, setSubTypeFilter]     = useState('전체');
  const [subStatusFilter, setSubStatusFilter] = useState('전체');

  // Tab 3 state
  const [creditTxs, setCreditTxs]     = useState<CreditTx[]>(dummyCreditTxs);
  const [creditCompanies, setCreditCompanies] = useState<CreditCompany[]>(dummyCreditCompanies);
  const [creditModal, setCreditModal] = useState<CreditCompany | null>(null);
  const [creditType, setCreditType]   = useState<'충전' | '차감'>('충전');
  const [creditAmt, setCreditAmt]     = useState('');
  const [creditReason, setCreditReason] = useState('');

  // Tab 4 state
  const [reportMonth, setReportMonth] = useState('2026-05');

  // ── Tab 1 derived ───────────────────────────────────────────
  const filteredPay = payments.filter(
    (p) =>
      (statusFilter  === '전체' || p.status  === statusFilter) &&
      (productFilter === '전체' || p.product.includes(productFilter)) &&
      (p.id.includes(keyword) || p.memberName.includes(keyword) || p.orderId.includes(keyword)),
  );
  const totalRevenue = payments.filter((p) => p.status === '결제 완료').reduce((s, p) => s + p.amount, 0);
  const paidCount    = payments.filter((p) => p.status === '결제 완료').length;
  const refundReqCnt = payments.filter((p) => p.status === '환불 요청').length;
  const failCount    = payments.filter((p) => p.status === '결제 실패').length;
  const refund       = selected ? calcRefund(selected.amount, selected.paidAt, selected.totalDays) : null;

  const processRefund = (id: string) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: '환불 완료' } : p)));
    setSelected(null);
  };

  // ── Tab 2 derived ───────────────────────────────────────────
  const filteredSubs = dummySubs.filter(
    (s) =>
      (subTypeFilter   === '전체' || s.type   === subTypeFilter) &&
      (subStatusFilter === '전체' || s.status === subStatusFilter),
  );
  const activeCount  = dummySubs.filter((s) => s.status === '활성').length;
  const renewCount   = dummySubs.filter((s) => s.status === '갱신예정').length;
  const cancelCount  = dummySubs.filter((s) => s.status === '취소예정').length;
  const atRiskCount  = dummySubs.filter((s) => s.status === '이탈위험').length;

  // ── Tab 3 credit action ─────────────────────────────────────
  const applyCredit = () => {
    const amt = parseInt(creditAmt, 10);
    if (!creditModal || isNaN(amt) || amt <= 0 || !creditReason.trim()) return;
    const newTx: CreditTx = {
      id: `CTX-${Date.now()}`,
      companyName: creditModal.name,
      type: creditType,
      amount: amt,
      reason: creditReason,
      date: '2026.05.22',
    };
    setCreditTxs((prev) => [newTx, ...prev]);
    setCreditCompanies((prev) =>
      prev.map((c) =>
        c.id === creditModal.id
          ? { ...c, balance: creditType === '충전' ? c.balance + amt : Math.max(0, c.balance - amt) }
          : c,
      ),
    );
    setCreditModal(null);
    setCreditAmt('');
    setCreditReason('');
  };

  // ── Tab 4 derived ──────────────────────────────────────────
  const reportData  = dummyReports.find((r) => r.month === reportMonth) ?? dummyReports[dummyReports.length - 1];
  const totalRev    = reportData.b2cRevenue + reportData.b2bRevenue + reportData.creditRevenue;
  const { supply, vat } = vatBreakdown(totalRev);

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>결제 · 정산</h2>
          <p>결제 내역, 구독 현황, 크레딧 관리, 정산 리포트를 관리합니다.</p>
        </div>
      </header>

      {/* 탭 바 */}
      <div className="csTabBar" style={{ marginBottom: 24 }}>
        {(['결제 내역', '구독 현황', '크레딧 관리', '정산 리포트'] as PayTab[]).map((t) => (
          <button
            key={t}
            className={`csTab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 1: 결제 내역 ────────────────────────────────── */}
      {tab === '결제 내역' && (
        <div className="memberPage">
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard">
              <p>이번달 총 매출</p><h3>₩{totalRevenue.toLocaleString()}</h3><span>결제 완료 기준</span>
            </article>
            <article className="memberSummaryCard">
              <p>결제 건수</p><h3>{paidCount}</h3><span>정상 처리</span>
            </article>
            <article className="memberSummaryCard">
              <p>환불 요청</p><h3>{refundReqCnt}</h3><span>처리 대기 중</span>
            </article>
            <article className="memberSummaryCard">
              <p>결제 실패</p><h3>{failCount}</h3><span>재시도 필요</span>
            </article>
          </section>

          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="결제 ID, 주문번호, 회원명 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
              <option value="전체">상품 전체</option>
              <option value="월정액">프리미엄 월정액</option>
              <option value="연정액">프리미엄 연정액</option>
              <option value="Standard">기업 Standard</option>
              <option value="Premium">기업 Premium</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="전체">상태 전체</option>
              <option>결제 완료</option>
              <option>환불 요청</option>
              <option>환불 완료</option>
              <option>결제 실패</option>
            </select>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>결제 내역</h3>
              <button>내역 내보내기</button>
            </div>
            <table className="memberTable">
              <thead>
                <tr>
                  <th>결제 ID</th>
                  <th>Toss 주문번호</th>
                  <th>회원명</th>
                  <th>상품명</th>
                  <th>결제일</th>
                  <th>금액</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredPay.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td style={{ fontSize: 12, color: '#7a8da4' }}>{p.orderId}</td>
                    <td>{p.memberName}</td>
                    <td>{p.product}</td>
                    <td>{p.paidAt}</td>
                    <td>₩{p.amount.toLocaleString()}</td>
                    <td><span className={`statusBadge ${statusCls[p.status]}`}>{p.status}</span></td>
                    <td>
                      <button className="tableBtn" onClick={() => setSelected(p)}>
                        {p.status === '환불 요청' ? '환불 처리' : '상세보기'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button>{'<'}</button>
              <button className="activePage">1</button>
              <button>2</button>
              <button>{'>'}</button>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 2: 구독 현황 ────────────────────────────────── */}
      {tab === '구독 현황' && (
        <div className="memberPage">
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard">
              <p>활성 구독</p><h3>{activeCount}</h3><span>정상 이용 중</span>
            </article>
            <article className="memberSummaryCard">
              <p>갱신 예정 (D-7)</p><h3>{renewCount}</h3><span>자동 갱신 대기</span>
            </article>
            <article className="memberSummaryCard">
              <p>취소 예정</p><h3>{cancelCount}</h3><span>기간 만료 후 종료</span>
            </article>
            <article className="memberSummaryCard">
              <p>이탈 위험</p><h3>{atRiskCount}</h3><span>크레딧 소진 기업</span>
            </article>
          </section>

          <section className="admin-card memberFilter">
            <select value={subTypeFilter} onChange={(e) => setSubTypeFilter(e.target.value)}>
              <option value="전체">유형 전체</option>
              <option value="B2C">B2C (개인)</option>
              <option value="B2B">B2B (기업)</option>
            </select>
            <select value={subStatusFilter} onChange={(e) => setSubStatusFilter(e.target.value)}>
              <option value="전체">상태 전체</option>
              <option>활성</option>
              <option>갱신예정</option>
              <option>취소예정</option>
              <option>이탈위험</option>
            </select>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>구독 현황</h3>
              <button>내보내기</button>
            </div>
            <table className="memberTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>회원/기업명</th>
                  <th>유형</th>
                  <th>구독 플랜</th>
                  <th>시작일</th>
                  <th>다음 갱신일</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.memberName}</td>
                    <td>
                      <span className={`statusBadge ${s.type === 'B2B' ? 'answering' : 'normal'}`}>
                        {s.type}
                      </span>
                    </td>
                    <td>{s.plan}</td>
                    <td>{s.startDate}</td>
                    <td>{s.renewDate}</td>
                    <td><span className={`statusBadge ${subStatusCls[s.status]}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ── Tab 3: 크레딧 관리 ──────────────────────────────── */}
      {tab === '크레딧 관리' && (
        <div className="memberPage">
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard">
              <p>총 발행 크레딧</p>
              <h3>{creditCompanies.reduce((s, c) => s + c.balance, 0).toLocaleString()}</h3>
              <span>전 기업 잔액 합계</span>
            </article>
            <article className="memberSummaryCard">
              <p>크레딧 소진 기업</p>
              <h3>{creditCompanies.filter((c) => c.balance === 0).length}</h3>
              <span>이탈 위험</span>
            </article>
            <article className="memberSummaryCard">
              <p>이번달 충전 건수</p>
              <h3>{creditTxs.filter((t) => t.type === '충전').length}</h3>
              <span>수동 포함</span>
            </article>
            <article className="memberSummaryCard">
              <p>이번달 차감 건수</p>
              <h3>{creditTxs.filter((t) => t.type === '차감').length}</h3>
              <span>열람·제안 합계</span>
            </article>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>기업별 크레딧 잔액</h3>
            </div>
            <table className="memberTable">
              <thead>
                <tr>
                  <th>기업 ID</th>
                  <th>기업명</th>
                  <th>잔여 크레딧</th>
                  <th>최근 충전일</th>
                  <th>최근 사용일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {creditCompanies.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>
                      <span className={c.balance === 0 ? 'creditMinus' : 'creditPlus'}>
                        {c.balance.toLocaleString()} CR
                      </span>
                    </td>
                    <td>{c.lastCharged}</td>
                    <td>{c.lastUsed}</td>
                    <td>
                      <button className="tableBtn" onClick={() => setCreditModal(c)}>
                        충전 / 차감
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="admin-card memberTableCard" style={{ marginTop: 0 }}>
            <div className="memberTableHeader">
              <h3>크레딧 거래 이력</h3>
            </div>
            <table className="memberTable">
              <thead>
                <tr>
                  <th>거래 ID</th>
                  <th>기업명</th>
                  <th>유형</th>
                  <th>크레딧</th>
                  <th>사유</th>
                  <th>처리일</th>
                </tr>
              </thead>
              <tbody>
                {creditTxs.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.companyName}</td>
                    <td>
                      <span className={`statusBadge ${t.type === '충전' ? 'normal' : 'pending'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td>
                      <span className={t.type === '충전' ? 'creditPlus' : 'creditMinus'}>
                        {t.type === '충전' ? '+' : '-'}{t.amount} CR
                      </span>
                    </td>
                    <td>{t.reason}</td>
                    <td>{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ── Tab 4: 정산 리포트 ──────────────────────────────── */}
      {tab === '정산 리포트' && (
        <div className="memberPage">
          <section className="admin-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: '#23384f' }}>정산 월 선택</label>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #dbe5ee', fontSize: 14 }}
              >
                {dummyReports.map((r) => (
                  <option key={r.month} value={r.month}>{r.month}</option>
                ))}
              </select>
            </div>
          </section>

          {/* 세금 계산 */}
          <section className="admin-card" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#23384f', marginBottom: 12 }}>
              세금 계산서 ({reportMonth})
            </h3>
            <div className="vatRow">
              <div className="vatItem">
                <span>총 매출액 (부가세 포함)</span>
                <strong>₩{totalRev.toLocaleString()}</strong>
              </div>
              <div className="vatItem">
                <span>공급가액 (90.9%)</span>
                <strong>₩{supply.toLocaleString()}</strong>
              </div>
              <div className="vatItem">
                <span>부가세 (9.1%)</span>
                <strong>₩{vat.toLocaleString()}</strong>
              </div>
            </div>
          </section>

          {/* 채널별 매출 */}
          <section className="admin-card" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#23384f', marginBottom: 12 }}>
              채널별 매출 분류 ({reportMonth})
            </h3>
            <div className="revenueBreakdown">
              <div className="revenueItem">
                <span>B2C (개인 구독)</span>
                <strong>₩{reportData.b2cRevenue.toLocaleString()}</strong>
              </div>
              <div className="revenueItem">
                <span>B2B (기업 플랜)</span>
                <strong>₩{reportData.b2bRevenue.toLocaleString()}</strong>
              </div>
              <div className="revenueItem">
                <span>크레딧 판매</span>
                <strong>₩{reportData.creditRevenue.toLocaleString()}</strong>
              </div>
            </div>
          </section>

          {/* 월별 추이 테이블 */}
          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>월별 정산 추이</h3>
              <button>리포트 내보내기</button>
            </div>
            <table className="memberTable">
              <thead>
                <tr>
                  <th>월</th>
                  <th>B2C</th>
                  <th>B2B</th>
                  <th>크레딧</th>
                  <th>총 매출</th>
                  <th>공급가액</th>
                  <th>부가세</th>
                </tr>
              </thead>
              <tbody>
                {dummyReports.map((r) => {
                  const t   = r.b2cRevenue + r.b2bRevenue + r.creditRevenue;
                  const { supply: s, vat: v } = vatBreakdown(t);
                  return (
                    <tr key={r.month} style={r.month === reportMonth ? { background: '#f0f6ff' } : {}}>
                      <td>{r.month}</td>
                      <td>₩{r.b2cRevenue.toLocaleString()}</td>
                      <td>₩{r.b2bRevenue.toLocaleString()}</td>
                      <td>₩{r.creditRevenue.toLocaleString()}</td>
                      <td><strong>₩{t.toLocaleString()}</strong></td>
                      <td>₩{s.toLocaleString()}</td>
                      <td>₩{v.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ── 결제 상세 / 환불 처리 모달 ──────────────────────── */}
      {selected && refund && (
        <div className="modalOverlay" onClick={() => setSelected(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modalHeader">
              <div>
                <h3>{selected.memberName} · {selected.id}</h3>
                <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>Toss 주문번호: {selected.orderId}</p>
              </div>
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>

            <div className="modalInfoGrid">
              <div><span>상품명</span><strong>{selected.product}</strong></div>
              <div><span>결제일</span><strong>{selected.paidAt}</strong></div>
              <div><span>결제 금액</span><strong>₩{selected.amount.toLocaleString()}</strong></div>
              <div><span>구독 기간</span><strong>{selected.totalDays}일</strong></div>
              <div><span>현재 상태</span><strong>{selected.status}</strong></div>
            </div>

            {selected.status === '환불 요청' && (
              <div className="refundCalc">
                <p className="refundTitle">일할 계산 환불 금액</p>
                <div className="refundRow">
                  <span>이용한 일수</span><strong>{refund.usedDays}일</strong>
                </div>
                <div className="refundRow">
                  <span>남은 일수</span><strong>{refund.remainDays}일</strong>
                </div>
                <div className="refundRow highlight">
                  <span>환불 예정 금액</span><strong>₩{refund.refundAmt.toLocaleString()}</strong>
                </div>
              </div>
            )}

            <div className="modalAction">
              {selected.status === '환불 요청' && (
                <button onClick={() => processRefund(selected.id)}>환불 처리 확정</button>
              )}
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 크레딧 충전 / 차감 모달 ─────────────────────────── */}
      {creditModal && (
        <div className="modalOverlay" onClick={() => setCreditModal(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
            <div className="modalHeader">
              <div>
                <h3>크레딧 조정</h3>
                <p>{creditModal.name} · 현재 잔액: {creditModal.balance} CR</p>
              </div>
              <button onClick={() => setCreditModal(null)}>닫기</button>
            </div>

            <div className="csFormRows" style={{ padding: '16px 0' }}>
              <div className="csFormRow">
                <label>유형</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['충전', '차감'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCreditType(t)}
                      style={{
                        padding: '6px 20px',
                        borderRadius: 8,
                        border: '1px solid #dbe5ee',
                        background: creditType === t ? '#1c3e63' : 'white',
                        color: creditType === t ? 'white' : '#23384f',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="csFormRow">
                <label>크레딧 수량</label>
                <input
                  className="csFormInput"
                  type="number"
                  min={1}
                  placeholder="수량 입력"
                  value={creditAmt}
                  onChange={(e) => setCreditAmt(e.target.value)}
                />
              </div>
              <div className="csFormRow">
                <label>사유</label>
                <input
                  className="csFormInput"
                  type="text"
                  placeholder="처리 사유 입력"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                />
              </div>
            </div>

            <div className="modalAction">
              <button onClick={applyCredit}>적용</button>
              <button onClick={() => setCreditModal(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
