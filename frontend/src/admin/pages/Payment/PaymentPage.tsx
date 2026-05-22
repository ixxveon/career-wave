import { useState } from 'react';
import '../../styles/admin.css';

type PayStatus = '결제 완료' | '환불 요청' | '환불 완료' | '결제 실패';

interface Payment {
  id: string;
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

const initial: Payment[] = [
  { id: 'PAY-3001', memberName: '김민지', product: '프리미엄 월정액',   paidAt: '2026.05.01', amount: 29000,  status: '결제 완료', totalDays: 30  },
  { id: 'PAY-3002', memberName: '이준호', product: '프리미엄 월정액',   paidAt: '2026.04.25', amount: 29000,  status: '환불 요청', totalDays: 30  },
  { id: 'PAY-3003', memberName: '최도윤', product: '기업 채용 패키지',  paidAt: '2026.05.10', amount: 150000, status: '결제 완료', totalDays: 90  },
  { id: 'PAY-3004', memberName: '박서연', product: '프리미엄 월정액',   paidAt: '2026.05.18', amount: 29000,  status: '결제 실패', totalDays: 30  },
  { id: 'PAY-3005', memberName: '홍길동', product: '프리미엄 연정액',   paidAt: '2026.03.01', amount: 290000, status: '환불 완료', totalDays: 365 },
  { id: 'PAY-3006', memberName: '이영희', product: '프리미엄 월정액',   paidAt: '2026.05.05', amount: 29000,  status: '결제 완료', totalDays: 30  },
];

const TODAY = new Date(2026, 4, 22); // 프로젝트 기준일 고정

function calcRefund(amount: number, paidAt: string, totalDays: number) {
  const [y, m, d] = paidAt.split('.').map(Number);
  const paid      = new Date(y, m - 1, d);
  const usedDays  = Math.max(0, Math.floor((TODAY.getTime() - paid.getTime()) / 86400000));
  const remainDays = Math.max(0, totalDays - usedDays);
  const refundAmt  = Math.floor(amount * (remainDays / totalDays));
  return { usedDays, remainDays, refundAmt };
}

export default function PaymentPage() {
  const [payments, setPayments]   = useState<Payment[]>(initial);
  const [selected, setSelected]   = useState<Payment | null>(null);
  const [keyword, setKeyword]     = useState('');
  const [statusFilter, setStatusFilter]   = useState('전체');
  const [productFilter, setProductFilter] = useState('전체');

  const filtered = payments.filter(
    (p) =>
      (statusFilter  === '전체' || p.status === statusFilter) &&
      (productFilter === '전체' || p.product.includes(productFilter)) &&
      (p.id.includes(keyword) || p.memberName.includes(keyword)),
  );

  const processRefund = (id: string) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: '환불 완료' } : p)));
    setSelected(null);
  };

  const totalRevenue = payments.filter((p) => p.status === '결제 완료').reduce((s, p) => s + p.amount, 0);
  const paidCount    = payments.filter((p) => p.status === '결제 완료').length;
  const refundReqCnt = payments.filter((p) => p.status === '환불 요청').length;
  const failCount    = payments.filter((p) => p.status === '결제 실패').length;

  const refund = selected ? calcRefund(selected.amount, selected.paidAt, selected.totalDays) : null;

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>결제 · 정산</h2>
          <p>결제 내역 및 환불 요청을 관리합니다.</p>
        </div>
      </header>

      <div className="memberPage">

        {/* KPI */}
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

        {/* Filter */}
        <section className="admin-card memberFilter">
          <input
            type="text"
            placeholder="결제 ID, 회원명 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="전체">상품 전체</option>
            <option value="월정액">프리미엄 월정액</option>
            <option value="연정액">프리미엄 연정액</option>
            <option value="기업">기업 채용 패키지</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="전체">상태 전체</option>
            <option>결제 완료</option>
            <option>환불 요청</option>
            <option>환불 완료</option>
            <option>결제 실패</option>
          </select>
        </section>

        {/* Table */}
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>결제 내역</h3>
            <button>내역 내보내기</button>
          </div>
          <table className="memberTable">
            <thead>
              <tr>
                <th>결제 ID</th>
                <th>회원명</th>
                <th>상품명</th>
                <th>결제일</th>
                <th>금액</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.memberName}</td>
                  <td>{p.product}</td>
                  <td>{p.paidAt}</td>
                  <td>₩{p.amount.toLocaleString()}</td>
                  <td>
                    <span className={`statusBadge ${statusCls[p.status]}`}>{p.status}</span>
                  </td>
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

      {/* 결제 상세 / 환불 처리 모달 */}
      {selected && refund && (
        <div className="modalOverlay" onClick={() => setSelected(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 540 }}>
            <div className="modalHeader">
              <div>
                <h3>{selected.memberName} · {selected.id}</h3>
                <p>{selected.product}</p>
              </div>
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>

            <div className="modalInfoGrid">
              <div><span>결제일</span><strong>{selected.paidAt}</strong></div>
              <div><span>결제 금액</span><strong>₩{selected.amount.toLocaleString()}</strong></div>
              <div><span>구독 기간</span><strong>{selected.totalDays}일</strong></div>
              <div><span>현재 상태</span><strong>{selected.status}</strong></div>
            </div>

            {selected.status === '환불 요청' && (
              <div className="refundCalc">
                <p className="refundTitle">일할 계산 환불 금액</p>
                <div className="refundRow">
                  <span>이용한 일수</span>
                  <strong>{refund.usedDays}일</strong>
                </div>
                <div className="refundRow">
                  <span>남은 일수</span>
                  <strong>{refund.remainDays}일</strong>
                </div>
                <div className="refundRow highlight">
                  <span>환불 예정 금액</span>
                  <strong>₩{refund.refundAmt.toLocaleString()}</strong>
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
    </section>
  );
}
