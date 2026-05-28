import { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  RefreshCw,
  Clock,
  AlertTriangle,
  Construction,
} from 'lucide-react';
import '../../styles/admin.css';
import '../../styles/Payment.css';

// ── Types (ERD-aligned) ───────────────────────────────────────
type PayTab = '결제 내역' | '구독 현황' | '정산 리포트';

type PayStatus = 'COMPLETED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'FAILED';
type SubStatus = 'ACTIVE' | 'RENEWAL_SCHEDULED' | 'CANCEL_SCHEDULED' | 'AT_RISK';

const payStatusLabel: Record<PayStatus, string> = {
  COMPLETED:        '결제 완료',
  REFUND_REQUESTED: '환불 요청',
  REFUNDED:         '환불 완료',
  FAILED:           '결제 실패',
};

const payStatusCls: Record<PayStatus, string> = {
  COMPLETED:        'normal',
  REFUND_REQUESTED: 'pending',
  REFUNDED:         'dismissed',
  FAILED:           'blinded',
};

const subStatusLabel: Record<SubStatus, string> = {
  ACTIVE:            '활성',
  RENEWAL_SCHEDULED: '갱신예정',
  CANCEL_SCHEDULED:  '취소예정',
  AT_RISK:           '이탈위험',
};

const subStatusCls: Record<SubStatus, string> = {
  ACTIVE:            'normal',
  RENEWAL_SCHEDULED: 'answering',
  CANCEL_SCHEDULED:  'pending',
  AT_RISK:           'blinded',
};

// ── Interfaces ────────────────────────────────────────────────
interface Payment {
  id: string;
  orderId: string;
  memberName: string;
  product: string;
  paidAt: string;
  amount: number;
  status: PayStatus;
}

interface Subscription {
  id: string;
  memberName: string;
  plan: string;
  startDate: string;
  renewDate: string;
  status: SubStatus;
}

// ── Dummy Data ────────────────────────────────────────────────
const initialPayments: Payment[] = [
  { id: 'PAY-3001', orderId: 'TOSS-20260501-A1B2C3', memberName: '김민지', product: '프리미엄 월정액', paidAt: '2026.05.01', amount: 29000, status: 'COMPLETED'        },
  { id: 'PAY-3002', orderId: 'TOSS-20260425-D4E5F6', memberName: '이준호', product: '프리미엄 월정액', paidAt: '2026.04.25', amount: 29000, status: 'REFUND_REQUESTED' },
  { id: 'PAY-3003', orderId: 'TOSS-20260518-J1K2L3', memberName: '박서연', product: '프리미엄 월정액', paidAt: '2026.05.18', amount: 29000, status: 'FAILED'           },
  { id: 'PAY-3004', orderId: 'TOSS-20260301-M4N5O6', memberName: '홍길동', product: '프리미엄 월정액', paidAt: '2026.03.01', amount: 29000, status: 'REFUNDED'         },
  { id: 'PAY-3005', orderId: 'TOSS-20260505-P7Q8R9', memberName: '이영희', product: '프리미엄 월정액', paidAt: '2026.05.05', amount: 29000, status: 'COMPLETED'        },
  { id: 'PAY-3006', orderId: 'TOSS-20260412-S1T2U3', memberName: '정현우', product: '프리미엄 월정액', paidAt: '2026.04.12', amount: 29000, status: 'COMPLETED'        },
  { id: 'PAY-3007', orderId: 'TOSS-20260501-V4W5X6', memberName: '최도윤', product: '프리미엄 월정액', paidAt: '2026.05.01', amount: 29000, status: 'COMPLETED'        },
  { id: 'PAY-3008', orderId: 'TOSS-20260503-W7X8Y9', memberName: '강지수', product: '프리미엄 월정액', paidAt: '2026.05.03', amount: 29000, status: 'COMPLETED'        },
];

const dummySubs: Subscription[] = [
  { id: 'SUB-001', memberName: '김민지', plan: '프리미엄 월정액', startDate: '2026.05.01', renewDate: '2026.06.01', status: 'ACTIVE'            },
  { id: 'SUB-002', memberName: '최도윤', plan: '프리미엄 월정액', startDate: '2026.04.10', renewDate: '2026.05.29', status: 'RENEWAL_SCHEDULED' },
  { id: 'SUB-003', memberName: '이영희', plan: '프리미엄 월정액', startDate: '2026.05.05', renewDate: '2026.06.05', status: 'ACTIVE'            },
  { id: 'SUB-004', memberName: '정현우', plan: '프리미엄 월정액', startDate: '2026.04.01', renewDate: '2026.05.31', status: 'CANCEL_SCHEDULED'  },
  { id: 'SUB-005', memberName: '강지수', plan: '프리미엄 월정액', startDate: '2026.05.03', renewDate: '2026.06.03', status: 'ACTIVE'            },
  { id: 'SUB-006', memberName: '홍길동', plan: '프리미엄 월정액', startDate: '2026.03.01', renewDate: '2026.05.30', status: 'AT_RISK'           },
  { id: 'SUB-007', memberName: '박서연', plan: '프리미엄 월정액', startDate: '2026.03.18', renewDate: '2026.05.28', status: 'RENEWAL_SCHEDULED' },
  { id: 'SUB-008', memberName: '이준호', plan: '프리미엄 월정액', startDate: '2026.04.25', renewDate: '2026.05.25', status: 'AT_RISK'           },
];

const TABS: PayTab[] = ['결제 내역', '구독 현황', '정산 리포트'];

// ── Main Component ────────────────────────────────────────────
export default function PaymentPage() {
  const [tab, setTab] = useState<PayTab>('결제 내역');

  // Tab 1 state
  const [payments, setPayments]           = useState<Payment[]>(initialPayments);
  const [selected, setSelected]           = useState<Payment | null>(null);
  const [keyword, setKeyword]             = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [productFilter, setProductFilter] = useState('');

  // Tab 2 state
  const [subStatusFilter, setSubStatusFilter] = useState('');

  // ── Tab 1 derived ─────────────────────────────────────────────
  const filteredPay = payments.filter(
    (p) =>
      (!statusFilter  || p.status  === statusFilter) &&
      (!productFilter || p.product.includes(productFilter)) &&
      (!keyword ||
        p.id.includes(keyword) ||
        p.memberName.includes(keyword) ||
        p.orderId.includes(keyword)),
  );

  const totalRevenue = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((s, p) => s + p.amount, 0);
  const paidCount    = payments.filter((p) => p.status === 'COMPLETED').length;
  const refundReqCnt = payments.filter((p) => p.status === 'REFUND_REQUESTED').length;
  const failCount    = payments.filter((p) => p.status === 'FAILED').length;

  const processRefund = (id: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'REFUNDED' as PayStatus } : p)),
    );
    setSelected(null);
  };

  // ── Tab 2 derived ─────────────────────────────────────────────
  const filteredSubs = dummySubs.filter(
    (s) => !subStatusFilter || s.status === subStatusFilter,
  );
  const activeCount  = dummySubs.filter((s) => s.status === 'ACTIVE').length;
  const renewCount   = dummySubs.filter((s) => s.status === 'RENEWAL_SCHEDULED').length;
  const cancelCount  = dummySubs.filter((s) => s.status === 'CANCEL_SCHEDULED').length;
  const atRiskCount  = dummySubs.filter((s) => s.status === 'AT_RISK').length;

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>결제 · 정산</h2>
          <p>구독 결제 내역, 구독 현황, 정산 리포트를 관리합니다.</p>
        </div>
      </header>

      {/* 탭 바 */}
      <div className="csTabBar" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`csTab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 1: 결제 내역 ────────────────────────────────────── */}
      {tab === '결제 내역' && (
        <div className="memberPage">
          {/* KPI 카드 */}
          <div className="kpiGrid">
            <div className="kpiCard kpi-blue">
              <div className="kpiContent">
                <p>이번달 총 매출</p>
                <h3>₩{totalRevenue.toLocaleString()}</h3>
                <span>결제 완료 기준</span>
              </div>
              <div className="kpiIcon kpi-blue"><CreditCard size={24} /></div>
            </div>
            <div className="kpiCard kpi-green">
              <div className="kpiContent">
                <p>결제 건수</p>
                <h3>{paidCount}</h3>
                <span>정상 처리</span>
              </div>
              <div className="kpiIcon kpi-green"><CheckCircle2 size={24} /></div>
            </div>
            <div className="kpiCard kpi-yellow">
              <div className="kpiContent">
                <p>환불 요청</p>
                <h3>{refundReqCnt}</h3>
                <span>처리 대기 중</span>
              </div>
              <div className="kpiIcon kpi-yellow"><AlertCircle size={24} /></div>
            </div>
            <div className="kpiCard kpi-purple">
              <div className="kpiContent">
                <p>결제 실패</p>
                <h3>{failCount}</h3>
                <span>재시도 필요</span>
              </div>
              <div className="kpiIcon kpi-purple"><XCircle size={24} /></div>
            </div>
          </div>

          {/* 필터 */}
          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="결제 ID, 주문번호, 회원명 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
              <option value="">상품 전체</option>
              <option value="프리미엄 월정액">프리미엄 월정액</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">상태 전체</option>
              <option value="COMPLETED">결제 완료</option>
              <option value="REFUND_REQUESTED">환불 요청</option>
              <option value="REFUNDED">환불 완료</option>
              <option value="FAILED">결제 실패</option>
            </select>
          </section>

          {/* 테이블 */}
          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                결제 내역
                <span className="payTotalCount">{filteredPay.length}건</span>
              </h3>
              <button>내역 내보내기</button>
            </div>
            <div className="tableScroll">
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
                      <td className="payOrderId">{p.orderId}</td>
                      <td>{p.memberName}</td>
                      <td>{p.product}</td>
                      <td>{p.paidAt}</td>
                      <td>₩{p.amount.toLocaleString()}</td>
                      <td>
                        <span className={`statusBadge ${payStatusCls[p.status]}`}>
                          {payStatusLabel[p.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`tableBtn${p.status === 'REFUND_REQUESTED' ? ' tableBtn--refund' : ''}`}
                          onClick={() => setSelected(p)}
                        >
                          {p.status === 'REFUND_REQUESTED' ? '환불 처리' : '상세보기'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button>{'<'}</button>
              <button className="activePage">1</button>
              <button>2</button>
              <button>{'>'}</button>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 2: 구독 현황 ────────────────────────────────────── */}
      {tab === '구독 현황' && (
        <div className="memberPage">
          {/* KPI 카드 */}
          <div className="kpiGrid">
            <div className="kpiCard kpi-green">
              <div className="kpiContent">
                <p>활성 구독</p>
                <h3>{activeCount}</h3>
                <span>정상 이용 중</span>
              </div>
              <div className="kpiIcon kpi-green"><Users size={24} /></div>
            </div>
            <div className="kpiCard kpi-blue">
              <div className="kpiContent">
                <p>갱신 예정 (D-7)</p>
                <h3>{renewCount}</h3>
                <span>자동 갱신 대기</span>
              </div>
              <div className="kpiIcon kpi-blue"><RefreshCw size={24} /></div>
            </div>
            <div className="kpiCard kpi-yellow">
              <div className="kpiContent">
                <p>취소 예정</p>
                <h3>{cancelCount}</h3>
                <span>기간 만료 후 종료</span>
              </div>
              <div className="kpiIcon kpi-yellow"><Clock size={24} /></div>
            </div>
            <div className="kpiCard kpi-purple">
              <div className="kpiContent">
                <p>이탈 위험</p>
                <h3>{atRiskCount}</h3>
                <span>갱신 미납 위험</span>
              </div>
              <div className="kpiIcon kpi-purple"><AlertTriangle size={24} /></div>
            </div>
          </div>

          {/* 필터 */}
          <section className="admin-card memberFilter">
            <select value={subStatusFilter} onChange={(e) => setSubStatusFilter(e.target.value)}>
              <option value="">상태 전체</option>
              <option value="ACTIVE">활성</option>
              <option value="RENEWAL_SCHEDULED">갱신예정</option>
              <option value="CANCEL_SCHEDULED">취소예정</option>
              <option value="AT_RISK">이탈위험</option>
            </select>
          </section>

          {/* 테이블 */}
          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                구독 현황
                <span className="payTotalCount">{filteredSubs.length}건</span>
              </h3>
              <button>내보내기</button>
            </div>
            <div className="tableScroll">
              <table className="memberTable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>회원명</th>
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
                      <td>{s.plan}</td>
                      <td>{s.startDate}</td>
                      <td>{s.renewDate}</td>
                      <td>
                        <span className={`statusBadge ${subStatusCls[s.status]}`}>
                          {subStatusLabel[s.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 3: 정산 리포트 (v2 예정) ───────────────────────── */}
      {tab === '정산 리포트' && (
        <div className="memberPage">
          <div className="payV2Blind">
            <div className="payV2BlindInner">
              <div className="payV2IconWrap">
                <Construction size={40} />
              </div>
              <h3 className="payV2Title">정산 리포트</h3>
              <p className="payV2Msg">다음 버전에 구현 될 예정입니다.</p>
              <span className="payV2Sub">
                현재 해당 기능은 준비 중입니다.<br />
                v2 업데이트 시 제공될 예정입니다.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 결제 상세 / 환불 처리 모달 ──────────────────────────── */}
      {selected && (
        <div className="modalOverlay" onClick={() => setSelected(null)}>
          <div
            className="memberModal"
            style={{ width: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="modalHeader">
              <div>
                <h3>{selected.memberName} · {selected.id}</h3>
                <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>
                  Toss 주문번호: {selected.orderId}
                </p>
              </div>
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>

            {/* 본문 */}
            <div className="modalInfoGrid" style={{ padding: '8px 0 16px' }}>
              <div><span>상품명</span><strong>{selected.product}</strong></div>
              <div><span>결제일</span><strong>{selected.paidAt}</strong></div>
              <div><span>결제 금액</span><strong>₩{selected.amount.toLocaleString()}</strong></div>
              <div>
                <span>현재 상태</span>
                <span className={`statusBadge ${payStatusCls[selected.status]}`}>
                  {payStatusLabel[selected.status]}
                </span>
              </div>
            </div>

            {selected.status === 'REFUND_REQUESTED' && (
              <div className="refundNote">
                환불 요청 건입니다. 확정 시 즉시 처리됩니다.
              </div>
            )}

            {/* 액션 */}
            <div className="modalAction">
              {selected.status === 'REFUND_REQUESTED' && (
                <button onClick={() => processRefund(selected.id)}>환불 처리 확정</button>
              )}
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
