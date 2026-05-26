import '../../styles/admin.css';

const kpis = [
  { label: '총 지원 건수',  value: '14,382', sub: '이번 달 기준' },
  { label: '서류 합격률',   value: '38.4%',  sub: '전월 대비 +2.1%' },
  { label: '최종 합격률',   value: '12.7%',  sub: '업계 평균 11%' },
  { label: '평균 경쟁률',   value: '7.9:1',  sub: '공고당 지원자 기준' },
];

const jobStats = [
  { job: '프론트엔드', applies: 2840, docPass: 1120, finalPass: 340, rate: '12.0%', barH: 170 },
  { job: '백엔드',     applies: 3210, docPass: 1280, finalPass: 420, rate: '13.1%', barH: 190 },
  { job: '데이터 분석', applies: 1870, docPass: 680,  finalPass: 210, rate: '11.2%', barH: 130 },
  { job: 'AI/ML',     applies: 1240, docPass: 430,  finalPass: 140, rate: '11.3%', barH: 96  },
  { job: '기획/PM',   applies: 980,  docPass: 380,  finalPass: 118, rate: '12.0%', barH: 76  },
  { job: 'UI/UX',     applies: 760,  docPass: 290,  finalPass: 88,  rate: '11.6%', barH: 60  },
  { job: 'DevOps',    applies: 620,  docPass: 240,  finalPass: 78,  rate: '12.6%', barH: 50  },
];

const monthlyTrend = [
  { month: '12월', docRate: 32, finalRate: 10 },
  { month: '1월',  docRate: 34, finalRate: 11 },
  { month: '2월',  docRate: 33, finalRate: 10 },
  { month: '3월',  docRate: 36, finalRate: 12 },
  { month: '4월',  docRate: 37, finalRate: 12 },
  { month: '5월',  docRate: 38, finalRate: 13 },
];

export default function MatchingPage() {
  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>매칭 통계</h2>
          <p>지원 및 합격률 데이터를 확인합니다.</p>
        </div>
      </header>

      <div className="memberPage">

        {/* KPI */}
        <section className="memberSummaryGrid">
          {kpis.map((k) => (
            <article className="memberSummaryCard" key={k.label}>
              <p>{k.label}</p><h3>{k.value}</h3><span>{k.sub}</span>
            </article>
          ))}
        </section>

        {/* 차트 영역 */}
        <div className="matchChartGrid">

          {/* 직무별 지원 현황 바 차트 */}
          <section className="admin-card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 700, color: '#1c3e63' }}>
              직무별 지원 현황
            </h3>
            <div className="matchBarChart">
              {jobStats.map((j) => (
                <div className="matchBarItem" key={j.job}>
                  <span className="matchBarVal">{j.applies.toLocaleString()}</span>
                  <div className="matchBarFill" style={{ height: j.barH }} />
                  <span className="matchBarLabel">{j.job}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 월별 합격률 추이 */}
          <section className="admin-card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#1c3e63' }}>
              월별 합격률 추이
            </h3>
            <div className="matchTrendLegend">
              <span><i className="matchDot doc" />서류 합격률</span>
              <span><i className="matchDot final" />최종 합격률</span>
            </div>
            <div className="matchTrend">
              {monthlyTrend.map((m) => (
                <div className="matchTrendCol" key={m.month}>
                  <div className="matchTrendBars">
                    <div className="matchTrendBar doc" style={{ height: m.docRate * 3 }}>
                      <span>{m.docRate}%</span>
                    </div>
                    <div className="matchTrendBar final" style={{ height: m.finalRate * 3 }}>
                      <span>{m.finalRate}%</span>
                    </div>
                  </div>
                  <p>{m.month}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 직무별 상세 테이블 */}
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>직무별 상세 통계</h3>
            <button>데이터 내보내기</button>
          </div>
          <table className="memberTable">
            <thead>
              <tr>
                <th>직무</th>
                <th>총 지원</th>
                <th>서류 합격</th>
                <th>최종 합격</th>
                <th>최종 합격률</th>
                <th>경쟁률</th>
              </tr>
            </thead>
            <tbody>
              {jobStats.map((j) => (
                <tr key={j.job}>
                  <td><strong>{j.job}</strong></td>
                  <td>{j.applies.toLocaleString()}</td>
                  <td>{j.docPass.toLocaleString()}</td>
                  <td>{j.finalPass.toLocaleString()}</td>
                  <td>
                    <span className="statusBadge normal" style={{ minWidth: 'auto', padding: '0 12px' }}>
                      {j.rate}
                    </span>
                  </td>
                  <td>{(j.applies / j.finalPass).toFixed(1)}:1</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
