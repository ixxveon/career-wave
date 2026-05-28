import { useNavigate } from 'react-router-dom';
import '../../styles/admin.css';

const kpis = [
  { icon: 'USER', title: '오늘 신규 가입자', value: '128', rate: '▲12%', desc: '어제 대비 +14명', theme: 'blue' },
  { icon: 'LIVE', title: '실시간 접속자', value: '1,042', rate: '▲8%', desc: '최근 7일 평균 이상', theme: 'green' },
  { icon: 'AI', title: 'AI 면접 세션', value: '37', rate: '▼3%', desc: '평균 응답 안정', theme: 'purple', down: true },
  { icon: 'PAY', title: '오늘 매출', value: '₩4.4M', rate: '▲18%', desc: '구독 결제 증가', theme: 'yellow' },
];

const alerts = [
  { icon: '!', level: '긴급', type: '신고', text: '게시글 신고 3건 처리 대기 중', button: '신고 관리로 이동', cls: 'danger', path: '/admin/reports' },
  { icon: '₩', level: '주의', type: '결제', text: '정기결제 실패 7건 확인 필요', button: '결제 및 정산으로 이동', cls: 'warning', path: '/admin/payments' },
  { icon: 'Q', level: '일반', type: '문의', text: '1:1 문의 미답변 12건', button: '고객센터로 이동', cls: 'normal', path: '/admin/cs' },
  { icon: 'AI', level: '주의', type: 'AI', text: '이상 토큰 사용 유저 2명 감지', button: 'AI 메트릭스으로 이동', cls: 'ai', path: '/admin/ai' },
];

const adminCards = [
  { icon: 'USER', title: '회원 관리', desc: '가입자, 구독 상태, 권한, 정지 회원을 관리합니다.', value: '신규 128명', cls: 'blue', path: '/admin/members' },
  { icon: 'REP', title: '신고 관리', desc: '커뮤니티 신고, 블라인드 처리, 스팸 게시글을 확인합니다.', value: '대기 3건', cls: 'red', path: '/admin/reports' },
  { icon: 'CS', title: '고객센터', desc: '공지사항·FAQ 관리 및 1:1 문의 응대를 처리합니다.', value: '미답변 12건', cls: 'orange', path: '/admin/cs' },
  { icon: 'PAY', title: '결제 및 정산', desc: '결제 내역, 정기결제 실패, 환불 요청을 관리합니다.', value: '실패 7건', cls: 'orange', path: '/admin/payments' },
  { icon: 'STT', title: '서비스 통계', desc: '매출 현황과 가입자 증가 추이를 확인합니다.', value: '이번 달 매출', cls: 'green', path: '/admin/stats' },
  { icon: 'AI', title: 'AI 메트릭스', desc: 'AI 토큰 사용량, 면접 세션, 이상 탐지를 모니터링합니다.', value: '세션 37건', cls: 'purple', path: '/admin/ai' },
];

const logs: [string, string, string, string][] = [
  ['09:12', 'cs_admin', '환불 요청 1건 확인', '/admin/payments'],
  ['09:18', 'backend_admin', '스크래핑 실패 로그 확인', '/admin/scraping'],
  ['09:22', 'super_admin', '관리자 계정 권한 변경', '/admin/admins'],
  ['09:31', 'cs_admin', '신고 게시글 블라인드 처리', '/admin/reports'],
  ['09:45', 'backend_admin', 'AI 토큰 사용량 임계치 알림 설정', '/admin/ai'],
];

const weeklyBars = [70, 100, 85, 140, 128, 155, 168];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <>
      <header className="admin-header">
        <div>
          <h2>종합 대시보드</h2>
          <p>실시간 운영 현황과 주요 처리 항목을 확인합니다.</p>
        </div>

        <div className="adminProfile">
          <span className="serviceBadge">서비스 정상</span>

          <div className="avatar">SA</div>

          <div className="adminText">
            <strong>super_admin</strong>
            <span>전체 권한 활성화</span>
            <small>최근 로그인 09:12</small>
          </div>

          <button className="admin-logoutButton" onClick={() => navigate('/admin/login')}>
            로그아웃
          </button>
        </div>
      </header>

      <section className="kpiGrid">
        {kpis.map((item) => (
          <article className="kpiCard" key={item.title}>
            <div className={`kpiIcon ${item.theme}`}>{item.icon}</div>
            <div>
              <p>{item.title}</p>
              <h3>{item.value}</h3>
              <b className={item.down ? 'down' : ''}>{item.rate}</b>
              <span>{item.desc}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="layoutGrid">
        <div className="leftColumn">
          <section className="admin-card alertPanel">
            <div className="sectionHead">
              <h3>오늘 처리할 주요 알림</h3>
              <button>전체 보기</button>
            </div>

            <div className="alertList">
              {alerts.map((item) => (
                <div className={`alertRow ${item.cls}`} key={item.text}>
                  <span className="alertIcon">{item.icon}</span>
                  <span className="alertLevel">{item.level}</span>
                  <strong>{item.type}</strong>
                  <p>{item.text}</p>
                  <button onClick={() => navigate(item.path)}>{item.button}</button>
                </div>
              ))}
            </div>
          </section>

          <section className="chartGrid">
            <article className="admin-card chartCard">
              <h3>주간 가입자 추이</h3>
              <div className="chartArea">
                <div className="yAxis">
                  <span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
                </div>
                <div className="bars">
                  {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
                    <div className="barItem" key={day}>
                      <div style={{ height: weeklyBars[i] }} />
                      <span>{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="admin-card donutCard">
              <h3>결제 비중</h3>
              <div className="donutContent">
                <div className="donut" />
                <ul>
                  <li><i className="c1" />카드 <b>62%</b></li>
                  <li><i className="c2" />간편결제 <b>28%</b></li>
                  <li><i className="c3" />기타 <b>10%</b></li>
                </ul>
              </div>
            </article>
          </section>

          <section className="adminCardGrid adminCardGrid--dashboard">
            {adminCards.map((card) => (
              <article className="adminCard" key={card.title}>
                <div className="adminTop">
                  <div className={`adminIcon ${card.cls}`}>{card.icon}</div>
                  <h3>{card.title}</h3>
                </div>
                <p>{card.desc}</p>
                <div className="adminBottom">
                  <strong>{card.value}</strong>
                  <button onClick={() => navigate(card.path)}>상세 보기</button>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="rightColumn">
          <section className="admin-card statusCard">
            <h3>시스템 상태</h3>
            <div className="statusRow"><span />AI API <b>정상</b></div>
            <div className="statusRow"><span />WebSocket <b>안정</b></div>
            <div className="statusRow"><span />CPU 사용률 <em>43%</em></div>
            <div className="statusRow"><span />메모리 사용률 <em>61%</em></div>
          </section>

          <section className="admin-card logCard">
            <div className="sectionHead">
              <h3>최근 관리자 활동</h3>
              <button onClick={() => navigate('/admin/log')}>전체 보기</button>
            </div>
            {logs.map((log) => (
              <div className="logRow" key={log.join('')} onClick={() => navigate(log[3])}>
                <span>{log[0]}</span>
                <strong>{log[1]}</strong>
                <p>{log[2]}</p>
              </div>
            ))}
          </section>
        </aside>
      </section>
    </>
  );
}
