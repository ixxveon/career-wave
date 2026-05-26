import { useEffect, useMemo, useState } from 'react';
import '../../styles/admin.css';

type Tone = 'normal' | 'warning' | 'danger';
type UserStatus = '정상' | '주의' | '심각';
type RagStatus = '동기화됨' | '인덱싱 중' | '실패';
type EventSeverity = 'INFO' | 'WARN' | 'ERROR';

interface UsagePoint {
  hour: string;
  input: number;
  output: number;
}

interface HeavyUser {
  id: string;
  requests: number;
  risk: number;
  status: UserStatus;
}

interface RagDoc {
  id: string;
  name: string;
  chunks: number;
  progress: number;
  status: RagStatus;
}

interface LogEvent {
  time: string;
  severity: EventSeverity;
  message: string;
}

const usageData: UsagePoint[] = [
  { hour: '00', input: 34, output: 18 },
  { hour: '04', input: 42, output: 24 },
  { hour: '08', input: 46, output: 28 },
  { hour: '12', input: 26, output: 16 },
  { hour: '16', input: 64, output: 34 },
  { hour: '20', input: 42, output: 23 },
  { hour: '24', input: 18, output: 12 },
];

const heavyUsers: HeavyUser[] = [
  { id: 'USR_8892', requests: 12403, risk: 91, status: '심각' },
  { id: 'USR_2104', requests: 8110, risk: 66, status: '주의' },
  { id: 'USR_4451', requests: 4200, risk: 24, status: '정상' },
];

const ragDocs: RagDoc[] = [
  { id: 'DOC-001', name: 'cluster-provisioning-v3.pdf', chunks: 1420, progress: 79, status: '동기화됨' },
  { id: 'DOC-002', name: 'api-endpoint-security.docx', chunks: 542, progress: 43, status: '인덱싱 중' },
  { id: 'DOC-003', name: 'onboarding-schema-v1.json', chunks: 2100, progress: 8, status: '실패' },
];

const statCards = [
  { label: '실행', value: '890' },
  { label: '통', value: '42' },
  { label: '지연 시간', value: '240ms' },
  { label: '실패', value: '2', tone: 'danger' as Tone },
];

const logEvents: LogEvent[] = [
  { time: '17:12:24', severity: 'INFO', message: '[정보] 클러스터 상태 동기화 완료' },
  { time: '17:13:24', severity: 'INFO', message: '[정보] 리소스 점검 루프 실행' },
  { time: '17:14:24', severity: 'INFO', message: '[정보] RAG 인덱스 캐시 갱신' },
  { time: '17:15:24', severity: 'WARN', message: '[경고] 응답 시간 상승 감지' },
  { time: '17:16:24', severity: 'INFO', message: '[정보] 워커 헬스체크 통과' },
  { time: '17:17:24', severity: 'INFO', message: '[정보] 큐 대기량 정상 범위' },
  { time: '17:18:24', severity: 'INFO', message: '[정보] OpenAI 호출량 집계 반영' },
  { time: '17:19:24', severity: 'ERROR', message: '[오류] 온보딩 스키마 재처리 필요' },
  { time: '17:20:24', severity: 'INFO', message: '[정보] 임베딩 작업 재시도 예약' },
  { time: '17:21:24', severity: 'INFO', message: '[정보] 시스템 운영 상태 안정' },
];

const maxUsage = Math.max(...usageData.map((item) => item.input + item.output));

const toneForStatus = (value: UserStatus | RagStatus | EventSeverity): Tone => {
  if (value === '심각' || value === '실패' || value === 'ERROR') return 'danger';
  if (value === '주의' || value === '인덱싱 중' || value === 'WARN') return 'warning';
  return 'normal';
};

export default function AiMetricsPage() {
  const [secondsAgo, setSecondsAgo] = useState(12);
  const [docQuery, setDocQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('DOC-001');
  const [slackEnabled, setSlackEnabled] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsAgo((prev) => (prev >= 18 ? 12 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredUsers = useMemo(() => {
    return heavyUsers;
  }, []);

  const filteredDocs = useMemo(() => {
    const keyword = docQuery.trim().toLowerCase();
    if (!keyword) return ragDocs;
    return ragDocs.filter((doc) => doc.name.toLowerCase().includes(keyword));
  }, [docQuery]);

  const filteredLogs = useMemo(() => {
    return logEvents;
  }, []);

  const selectedDoc = useMemo(
    () => ragDocs.find((doc) => doc.id === selectedDocId) ?? ragDocs[0],
    [selectedDocId]
  );

  return (
    <section className="aiOpsPage">
      <header className="admin-header">
        <div>
          <h2>AI 메트릭스</h2>
          <p>AI 사용량과 리소스 상태를 한 화면에서 모니터링합니다.</p>
        </div>

        <div className="aiOpsHeaderStatus">
          <div className="aiOpsLiveState">
            <span className="aiOpsPulse" />
            <div>
              <strong>LIVE 모니터링</strong>
              <small>마지막 동기화 {secondsAgo}초 전</small>
            </div>
          </div>
          <div className="aiOpsHeaderMeta">
            <span>OpenAI API 정상</span>
            <span>평균 응답 842ms</span>
            <span>오늘 비용 $1,440.00</span>
          </div>
        </div>
      </header>

      <section className="aiOpsBoard">
        <div className="aiOpsBoardRow aiOpsBoardTop">
          <section className="admin-card aiOpsUsageCard">
            <div className="aiOpsPanelHead">
              <div>
                <span className="aiOpsEyebrow">LLM API 비용 컨트롤러</span>
                <h3>GPT-4-TURBO v2.1</h3>
              </div>
            </div>

            <div className="aiOpsUsageGrid">
              <div className="aiOpsUsageChartBlock">
                <div className="aiOpsMetricCaption">시간당 토큰 사용량 (입력/출력)</div>
                <div className="aiOpsUsageMeta">1.2M / 0.8M</div>
                <div className="aiOpsBars">
                  {usageData.map((item, index) => {
                    const total = item.input + item.output;
                    return (
                      <div className="aiOpsBarItem" key={item.hour}>
                        <div className="aiOpsStack">
                          <div
                            className={`output tone-${index === 4 ? 'strong' : 'soft'}`}
                            style={{ height: `${(item.output / maxUsage) * 100}%` }}
                          />
                          <div
                            className={`input tone-${index === 4 ? 'strong' : 'soft'}`}
                            style={{ height: `${(item.input / maxUsage) * 100}%` }}
                          />
                        </div>
                        <span>{item.hour}</span>
                        <small>{total}</small>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="aiOpsBudgetBox">
                <div>
                  <div className="aiOpsBudgetValue">$1,440.00</div>
                  <div className="aiOpsBudgetLine">
                    <span>/$2,000 예산</span>
                    <span>72% 소진</span>
                  </div>
                </div>

                <div className="aiOpsProgress">
                  <div style={{ width: '72%' }} />
                </div>

                <div className="aiOpsBudgetHealth">
                  <strong>안전 구간</strong>
                  <span>예산 제어 안정</span>
                </div>
              </aside>
            </div>

            <div className="aiOpsUsageFooter">
              <button
                type="button"
                className={`aiOpsSwitch ${slackEnabled ? 'active' : ''}`}
                onClick={() => setSlackEnabled((prev) => !prev)}
              >
                <span>Slack 알림</span>
                <i />
              </button>

              <div className="aiOpsThreshold">
                <span>알림 임계치</span>
                <strong>85%</strong>
              </div>

              <button type="button" className="aiOpsDangerButton">
                긴급 속도 제한
              </button>
            </div>
          </section>

          <section className="admin-card aiOpsHeavyCard">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">이상치 트래커 (API 랭킹)</span>
                <h3>헤비 유저 트래커</h3>
              </div>
            </div>

            <div className="aiOpsTableWrap compact">
              <table className="aiOpsTable">
                <thead>
                  <tr>
                    <th>사용자 ID</th>
                    <th>일별 호출 수</th>
                    <th>위험도</th>
                    <th>조치</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.requests.toLocaleString()}</td>
                      <td>
                        <span className={`aiOpsBadge ${toneForStatus(user.status)}`}>{user.status}</span>
                      </td>
                      <td>
                        <div className="aiOpsActionIcons">
                          <button type="button" className="aiOpsMiniIcon aiOpsMiniWarn" aria-label="경고">
                            !
                          </button>
                          <button type="button" className="aiOpsMiniIcon aiOpsMiniBlock" aria-label="차단">
                            -
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="aiOpsBoardRow aiOpsBoardMiddle">
          <section className="admin-card aiOpsRagCard">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">RAG 지식 베이스 관리</span>
                <h3>{selectedDoc.name}</h3>
              </div>
            </div>

            <div className="aiOpsRagLayout">
              <aside className="aiOpsUploadCard">
                <div className="aiOpsUploadIcon">
                  <span />
                </div>
                <strong>인프라 문서 업로드</strong>
                <span>PDF, TXT, DOCX 최대 50MB</span>
                <button type="button">업로드 및 임베딩</button>
              </aside>

              <div className="aiOpsRagTableBlock">
                <div className="aiOpsSearchRow">
                  <span className="aiOpsSearchIcon small" />
                  <input
                    type="text"
                    value={docQuery}
                    onChange={(e) => setDocQuery(e.target.value)}
                    placeholder="청크 또는 메타데이터 검색..."
                  />
                </div>

                <div className="aiOpsTableWrap">
                  <table className="aiOpsTable">
                    <thead>
                      <tr>
                        <th>문서명</th>
                        <th>청크</th>
                        <th>현재 진행도</th>
                        <th>상태</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map((doc) => (
                        <tr
                          key={doc.id}
                          className={selectedDocId === doc.id ? 'selected' : ''}
                          onClick={() => setSelectedDocId(doc.id)}
                        >
                          <td>{doc.name}</td>
                          <td>{doc.chunks.toLocaleString()}</td>
                          <td>
                            <div className="aiOpsInlineProgress">
                              <div style={{ width: `${doc.progress}%` }} />
                            </div>
                          </td>
                          <td>
                            <span className={`aiOpsBadge ${toneForStatus(doc.status)}`}>{doc.status}</span>
                          </td>
                          <td>
                            <button type="button" className="aiOpsTextButton">
                              재인덱싱
                            </button>
                            <button type="button" className="aiOpsTextButton danger">
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="aiOpsBoardRow aiOpsBoardBottom">
          <section className="admin-card aiOpsTrafficCard">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">군 클러스터 트래커</span>
                <h3>실행 상태</h3>
              </div>
              <button type="button" className="aiOpsTinyAction">
                스케일 아웃 트리거
              </button>
            </div>

            <div className="aiOpsStatGrid">
              {statCards.map((card) => (
                <article key={card.label} className={`aiOpsStatCard ${card.tone ?? 'normal'}`}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </div>

            <div className="aiOpsLineChart">
              <svg viewBox="0 0 520 180" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 116 C42 80, 88 70, 130 108 S220 168, 260 110 344 34, 388 76 478 186, 520 70" />
                <path d="M0 130 C50 148, 94 90, 136 72 S232 82, 272 132 360 176, 404 88 478 20, 520 56" />
              </svg>
              <div className="aiOpsLegendLine">
                <span>
                  <i className="solid" />
                  연산량
                </span>
                <span>
                  <i className="dashed" />
                  지연 시간
                </span>
              </div>
            </div>
          </section>

          <section className="admin-card aiOpsLogCard">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">실시간 리소스 및 시스템 로그</span>
                <h3>시스템 리소스 모니터 로그</h3>
              </div>
              <div className="aiOpsLogLights">
                <i className="red" />
                <i className="amber" />
                <i className="green" />
              </div>
            </div>

            <div className="aiOpsLogConsole">
              {filteredLogs.map((event) => (
                <article key={`${event.time}-${event.message}`} className="aiOpsLogRow">
                  <span className="time">[{event.time}]</span>
                  <span className={`aiOpsLogTag ${toneForStatus(event.severity)}`}>[{event.severity}]</span>
                  <strong>{event.message}</strong>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <style>{`
        .aiOpsPage {
          --ai-primary: #173553;
          --ai-border: #d8e4f1;
          --ai-surface: rgba(255, 255, 255, 0.98);
          --ai-surface-alt: #f6f9fd;
          --ai-muted: #72859b;
          --ai-accent: #2563c9;
          --ai-accent-soft: #9fbce2;
          --ai-success: #2d8b57;
          --ai-success-bg: #edf8f1;
          --ai-warning: #b17419;
          --ai-warning-bg: #fdf3de;
          --ai-danger: #d04545;
          --ai-danger-bg: #fff0f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 24px;
        }

        .aiOpsHeaderStatus {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .aiOpsLiveState {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
          padding: 0 12px;
          border-radius: 14px;
          border: 1px solid var(--ai-border);
          background: var(--ai-surface);
        }

        .aiOpsLiveState strong {
          display: block;
          color: var(--ai-primary);
          font-size: 13px;
        }

        .aiOpsLiveState small,
        .aiOpsHeaderMeta span {
          color: var(--ai-muted);
          font-size: 11px;
        }

        .aiOpsPulse {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--ai-accent);
          box-shadow: 0 0 0 0 rgba(37, 99, 201, 0.35);
          animation: aiOpsPulse 1.8s infinite;
        }

        .aiOpsHeaderMeta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .aiOpsHeaderMeta span {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          background: #f3f7fb;
          border: 1px solid var(--ai-border);
        }

        .aiOpsUsageCard,
        .aiOpsHeavyCard,
        .aiOpsRagCard,
        .aiOpsTrafficCard,
        .aiOpsLogCard {
          border-radius: 16px;
          border: 1px solid var(--ai-border);
          background: var(--ai-surface);
          box-shadow: 0 8px 20px rgba(22, 49, 77, 0.05);
        }

        .aiOpsSearchRow {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid #dfe7f1;
          background: #f4f7fb;
        }

        .aiOpsSearchRow input {
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          color: var(--ai-primary);
          font-size: 12px;
          font-family: inherit;
        }

        .aiOpsSearchRow input:focus {
          outline: none;
        }

        .aiOpsSearchIcon {
          position: relative;
          width: 12px;
          height: 12px;
          border: 2px solid #9ca9bb;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .aiOpsSearchIcon::after {
          content: '';
          position: absolute;
          right: -4px;
          bottom: -3px;
          width: 6px;
          height: 2px;
          background: #9ca9bb;
          transform: rotate(45deg);
          border-radius: 999px;
        }

        .aiOpsSearchIcon.small {
          width: 10px;
          height: 10px;
        }

        .aiOpsBoard {
          display: grid;
          gap: 12px;
        }

        .aiOpsBoardRow {
          display: grid;
          gap: 12px;
          align-items: stretch;
        }

        .aiOpsBoardTop {
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, 1fr);
        }

        .aiOpsBoardMiddle {
          grid-template-columns: 1fr;
        }

        .aiOpsBoardBottom {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }

        .aiOpsUsageCard,
        .aiOpsHeavyCard,
        .aiOpsRagCard,
        .aiOpsTrafficCard,
        .aiOpsLogCard {
          display: flex;
          flex-direction: column;
          padding: 18px;
          min-width: 0;
          height: 100%;
        }

        .aiOpsPanelHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
          min-height: 40px;
        }

        .aiOpsPanelHead.compact {
          margin-bottom: 14px;
        }

        .aiOpsPanelHead h3 {
          margin: 2px 0 0;
          color: var(--ai-primary);
          font-size: 15px;
          font-weight: 800;
        }

        .aiOpsEyebrow {
          display: block;
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsUsageGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) 230px;
          gap: 18px;
          align-items: stretch;
          flex: 1;
        }

        .aiOpsMetricCaption,
        .aiOpsUsageMeta {
          color: #55708d;
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsUsageMeta {
          margin-top: 4px;
        }

        .aiOpsBars {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          align-items: end;
          min-height: 136px;
          margin-top: 12px;
          padding: 8px 0 2px;
          background:
            linear-gradient(to bottom, rgba(219, 229, 241, 0.7) 1px, transparent 1px) 0 0 / 100% 34px,
            #f6f9ff;
          border-radius: 12px;
        }

        .aiOpsBarItem {
          display: grid;
          justify-items: center;
          gap: 4px;
        }

        .aiOpsStack {
          width: 100%;
          max-width: 34px;
          height: 118px;
          display: flex;
          flex-direction: column-reverse;
          gap: 2px;
        }

        .aiOpsStack .input,
        .aiOpsStack .output {
          border-radius: 0;
        }

        .aiOpsStack .input.tone-soft {
          background: #a9c3ea;
        }

        .aiOpsStack .output.tone-soft {
          background: #7ea5dd;
        }

        .aiOpsStack .input.tone-strong {
          background: #4f8bd9;
        }

        .aiOpsStack .output.tone-strong {
          background: #245fb8;
        }

        .aiOpsBarItem span,
        .aiOpsBarItem small {
          color: var(--ai-primary);
          font-size: 10px;
        }

        .aiOpsBarItem small {
          color: #9aaabd;
        }

        .aiOpsBudgetBox {
          display: grid;
          gap: 14px;
          align-content: center;
          padding: 12px 4px 12px 8px;
        }

        .aiOpsBudgetValue {
          color: #173b72;
          font-size: 34px;
          font-weight: 800;
          line-height: 1;
        }

        .aiOpsBudgetLine {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 8px;
          color: var(--ai-muted);
          font-size: 11px;
        }

        .aiOpsProgress,
        .aiOpsInlineProgress {
          height: 6px;
          border-radius: 999px;
          background: #e5edf6;
          overflow: hidden;
        }

        .aiOpsProgress div,
        .aiOpsInlineProgress div {
          height: 100%;
          background: linear-gradient(90deg, #5f94dd, #2563c9);
        }

        .aiOpsBudgetHealth {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--ai-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .aiOpsBudgetHealth span {
          color: var(--ai-success);
        }

        .aiOpsUsageFooter {
          display: grid;
          grid-template-columns: auto auto 1fr;
          gap: 10px;
          align-items: center;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #e7eef6;
        }

        .aiOpsSwitch {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 32px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid var(--ai-border);
          background: #f8fbff;
          color: var(--ai-primary);
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsSwitch i {
          width: 24px;
          height: 14px;
          border-radius: 999px;
          background: #d1dce8;
          position: relative;
        }

        .aiOpsSwitch i::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: white;
          transition: transform 0.2s ease;
        }

        .aiOpsSwitch.active i {
          background: #2563c9;
        }

        .aiOpsSwitch.active i::after {
          transform: translateX(10px);
        }

        .aiOpsThreshold {
          display: flex;
          gap: 8px;
          align-items: center;
          color: var(--ai-muted);
          font-size: 11px;
        }

        .aiOpsThreshold strong {
          color: var(--ai-primary);
        }

        .aiOpsDangerButton,
        .aiOpsUploadCard button,
        .aiOpsTinyAction,
        .aiOpsTextButton {
          height: 30px;
          border-radius: 8px;
          border: 1px solid #d6dfeb;
          background: white;
          color: var(--ai-primary);
          font-size: 11px;
          font-weight: 800;
          padding: 0 12px;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
        }

        .aiOpsDangerButton {
          justify-self: end;
          border-color: #dfb7b7;
          background: #da2e2e;
          color: white;
        }

        .aiOpsTinyAction {
          color: var(--ai-accent);
          background: #f3f8ff;
          border-color: #cbdcf2;
        }

        .aiOpsTextButton {
          margin-right: 6px;
          color: var(--ai-accent);
        }

        .aiOpsTextButton.danger {
          color: var(--ai-danger);
        }

        .aiOpsTableWrap {
          overflow: auto;
          border-radius: 0;
          border: 1px solid #dfe8f2;
          background: white;
        }

        .aiOpsTableWrap.compact {
          min-height: 236px;
        }

        .aiOpsTable {
          width: 100%;
          border-collapse: collapse;
        }

        .aiOpsTable th,
        .aiOpsTable td {
          padding: 10px 12px;
          border-bottom: 1px solid #edf2f7;
          text-align: left;
          font-size: 11px;
          vertical-align: middle;
          white-space: nowrap;
        }

        .aiOpsTable th {
          background: #1f3148;
          color: #eef4fb;
          font-weight: 800;
        }

        .aiOpsTable td {
          color: #24415f;
        }

        .aiOpsTable tbody tr {
          cursor: pointer;
        }

        .aiOpsTable tbody tr:hover td {
          background: #f8fbff;
        }

        .aiOpsTable tbody tr.selected td {
          background: #f2f7fd;
        }

        .aiOpsBadge {
          display: inline-flex;
          align-items: center;
          height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .aiOpsBadge.normal {
          background: var(--ai-success-bg);
          color: var(--ai-success);
        }

        .aiOpsBadge.warning {
          background: var(--ai-warning-bg);
          color: var(--ai-warning);
        }

        .aiOpsBadge.danger {
          background: var(--ai-danger-bg);
          color: var(--ai-danger);
        }

        .aiOpsActionIcons {
          display: flex;
          gap: 6px;
        }

        .aiOpsMiniIcon {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 1px solid currentColor;
          background: white;
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
        }

        .aiOpsMiniWarn {
          color: #2f6fcd;
        }

        .aiOpsMiniBlock {
          color: #d04545;
        }

        .aiOpsRagLayout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 18px;
          align-items: stretch;
          flex: 1;
        }

        .aiOpsUploadCard {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 12px;
          min-height: 260px;
          padding: 24px 18px;
          border-radius: 0;
          border: 1px dashed #c6d3e5;
          background: #f4f7fd;
          text-align: center;
        }

        .aiOpsUploadIcon {
          position: relative;
          width: 44px;
          height: 32px;
        }

        .aiOpsUploadIcon span {
          position: absolute;
          inset: 0;
          border: 3px solid #c5d1e0;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
          border-top-color: transparent;
        }

        .aiOpsUploadIcon::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          width: 12px;
          height: 18px;
          border-left: 3px solid #c5d1e0;
          border-top: 3px solid #c5d1e0;
          transform: translateX(-50%) rotate(45deg);
        }

        .aiOpsUploadCard strong {
          color: var(--ai-primary);
          font-size: 14px;
        }

        .aiOpsUploadCard span {
          color: var(--ai-muted);
          font-size: 11px;
        }

        .aiOpsUploadCard button {
          background: #2563c9;
          border-color: #2563c9;
          color: white;
        }

        .aiOpsRagTableBlock {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .aiOpsSearchRow {
          margin-bottom: 10px;
        }

        .aiOpsStatGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .aiOpsStatCard {
          min-height: 86px;
          padding: 14px;
          border-radius: 0;
          background: #eef4fc;
          border: 1px solid #dbe5f2;
        }

        .aiOpsStatCard span {
          display: block;
          color: var(--ai-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsStatCard strong {
          display: block;
          margin-top: 8px;
          color: var(--ai-primary);
          font-size: 16px;
          font-weight: 800;
        }

        .aiOpsStatCard.danger {
          background: #fff0f0;
        }

        .aiOpsLineChart {
          position: relative;
          min-height: 244px;
          border-radius: 0;
          background:
            linear-gradient(to bottom, rgba(216, 228, 241, 0.7) 1px, transparent 1px) 0 0 / 100% 42px,
            #f4f7fd;
          border: 1px solid #e3ebf4;
          overflow: hidden;
        }

        .aiOpsLineChart svg {
          width: 100%;
          height: 206px;
        }

        .aiOpsLineChart path:first-child {
          fill: none;
          stroke: #2563c9;
          stroke-width: 3;
        }

        .aiOpsLineChart path:last-child {
          fill: none;
          stroke: #ea6f6f;
          stroke-width: 2;
          stroke-dasharray: 5 5;
        }

        .aiOpsLegendLine {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 0 12px 12px;
          color: var(--ai-muted);
          font-size: 11px;
        }

        .aiOpsLegendLine span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .aiOpsLegendLine i {
          width: 16px;
          height: 2px;
        }

        .aiOpsLegendLine .solid {
          background: #2563c9;
        }

        .aiOpsLegendLine .dashed {
          background: linear-gradient(90deg, #ea6f6f 50%, transparent 50%);
          background-size: 6px 2px;
        }

        .aiOpsLogLights {
          display: flex;
          gap: 6px;
        }

        .aiOpsLogLights i {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: block;
        }

        .aiOpsLogLights .red { background: #ea4f4f; }
        .aiOpsLogLights .amber { background: #d8b46e; }
        .aiOpsLogLights .green { background: #76a37f; }

        .aiOpsLogConsole {
          display: grid;
          gap: 4px;
          min-height: 362px;
          max-height: 362px;
          overflow: auto;
          padding: 14px;
          border-radius: 0;
          background: linear-gradient(180deg, #13253d 0%, #0f2034 100%);
          border: 1px solid #20344f;
        }

        .aiOpsLogRow {
          display: grid;
          grid-template-columns: 92px 70px minmax(0, 1fr);
          gap: 8px;
          align-items: center;
          min-height: 22px;
          color: #d8e4f1;
          font-size: 11px;
        }

        .aiOpsLogRow .time,
        .aiOpsLogTag {
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
        }

        .aiOpsLogRow strong {
          font-family: inherit;
          font-weight: 600;
          line-height: 1.3;
        }

        .aiOpsLogTag.normal { color: #7dd49a; }
        .aiOpsLogTag.warning { color: #e1c36d; }
        .aiOpsLogTag.danger { color: #e39aa2; }

        @keyframes aiOpsPulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 201, 0.34); }
          70% { box-shadow: 0 0 0 8px rgba(37, 99, 201, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 201, 0); }
        }

        @media (max-width: 1480px) {
          .aiOpsBoardTop,
          .aiOpsBoardBottom,
          .aiOpsRagLayout,
          .aiOpsUsageGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1180px) {
          .aiOpsStatGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .aiOpsHeaderStatus,
          .aiOpsUsageFooter {
            flex-direction: column;
            align-items: stretch;
          }

          .aiOpsStatGrid {
            grid-template-columns: 1fr;
          }

          .aiOpsLogRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
