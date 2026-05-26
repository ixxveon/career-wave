import { useEffect, useMemo, useState } from 'react';
import '../../styles/admin.css';
import MiniPagination from '../../components/MiniPagination';

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
  tokenUsage: number;
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

const DOC_PAGE_SIZE = 3;

const llmModelOptions = ['GPT-4-TURBO v2.1', 'GPT-4.1', 'GPT-4o', 'GPT-4o-mini'];

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
  { id: 'USR_8892', tokenUsage: 12403, status: '심각' },
  { id: 'USR_2104', tokenUsage: 8110, status: '주의' },
  { id: 'USR_4451', tokenUsage: 4200, status: '정상' },
  { id: 'USR_5580', tokenUsage: 3960, status: '주의' },
  { id: 'USR_6721', tokenUsage: 3584, status: '정상' },
  { id: 'USR_7814', tokenUsage: 3310, status: '정상' },
];

const ragDocs: RagDoc[] = [
  { id: 'DOC-001', name: 'cluster-provisioning-v3.pdf', chunks: 1420, progress: 79, status: '동기화됨' },
  { id: 'DOC-002', name: 'api-endpoint-security.docx', chunks: 542, progress: 43, status: '인덱싱 중' },
  { id: 'DOC-003', name: 'onboarding-schema-v1.json', chunks: 2100, progress: 8, status: '실패' },
  { id: 'DOC-004', name: 'vector-search-playbook-v2.txt', chunks: 864, progress: 100, status: '?숆린?붾맖' },
];

export const logEvents: LogEvent[] = [
  { time: '17:12:24', severity: 'INFO', message: '[정보] 클러스터 상태 동기화 완료' },
  { time: '17:13:24', severity: 'INFO', message: '[정보] 리소스 점검 루프 실행' },
  { time: '17:14:24', severity: 'INFO', message: '[정보] RAG 인덱스 캐시 갱신' },
  { time: '17:15:24', severity: 'WARN', message: '[경고] 응답 시간 상승 감지' },
  { time: '17:16:24', severity: 'INFO', message: '[정보] 워커 헬스체크 통과' },
];

const toneForStatus = (value: UserStatus | RagStatus | EventSeverity): Tone => {
  if (value === '심각' || value === '실패' || value === 'ERROR') return 'danger';
  if (value === '주의' || value === '인덱싱 중' || value === 'WARN') return 'warning';
  return 'normal';
};

export default function AiMetricsPage() {
  const [secondsAgo, setSecondsAgo] = useState(12);
  const [docQuery, setDocQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('DOC-001');
  const [selectedModel, setSelectedModel] = useState(llmModelOptions[0]);
  const [discordAlertEnabled, setDiscordAlertEnabled] = useState(true);
  const [docPage, setDocPage] = useState(1);
  const [monthlyBudget, setMonthlyBudget] = useState(2000);
  const [budgetDraft, setBudgetDraft] = useState('2000');
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);

  const monthlySpend = 1440;
  const budgetUsed = Math.round((monthlySpend / monthlyBudget) * 100);
  const forecastSpend = 1870;
  const tokensPerMinute = 128;
  const isBudgetRisk = budgetUsed >= 90;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsAgo((prev) => (prev >= 18 ? 12 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredDocs = useMemo(() => {
    const keyword = docQuery.trim().toLowerCase();
    if (!keyword) return ragDocs;
    return ragDocs.filter((doc) => doc.name.toLowerCase().includes(keyword));
  }, [docQuery]);

  const selectedDoc = useMemo(
    () => ragDocs.find((doc) => doc.id === selectedDocId) ?? ragDocs[0],
    [selectedDocId]
  );

  const docTotalPages = Math.max(1, Math.ceil(filteredDocs.length / DOC_PAGE_SIZE));
  const pagedDocs = useMemo(() => {
    const start = (docPage - 1) * DOC_PAGE_SIZE;
    return filteredDocs.slice(start, start + DOC_PAGE_SIZE);
  }, [docPage, filteredDocs]);
  const emptyDocRows = DOC_PAGE_SIZE - pagedDocs.length;

  const axisMax = useMemo(
    () => Math.ceil(Math.max(...usageData.map((item) => Math.max(item.input, item.output))) / 10) * 10,
    []
  );

  const axisTicks = useMemo(
    () => [1, 0.75, 0.5, 0.25, 0].map((ratio) => `${Math.round(axisMax * ratio)}K`),
    [axisMax]
  );

  useEffect(() => {
    setDocPage((prev) => Math.min(prev, docTotalPages));
  }, [docTotalPages]);

  const handleDownloadDocument = (doc: RagDoc) => {
    const content = [
      `Document: ${doc.name}`,
      `Chunks: ${doc.chunks}`,
      `Progress: ${doc.progress}%`,
      `Status: ${doc.status}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = doc.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  };

  const handleBudgetSave = () => {
    const nextBudget = Number(budgetDraft.replace(/,/g, '').trim());
    if (!Number.isFinite(nextBudget) || nextBudget <= 0) return;
    setMonthlyBudget(nextBudget);
    setBudgetDraft(String(nextBudget));
    setBudgetEditorOpen(false);
  };

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
                <h3>{selectedModel}</h3>
              </div>
              <label className="aiOpsModelField">
                <span>모델 변경</span>
                <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
                  {llmModelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="aiOpsUsageGrid">
              <div className="aiOpsUsageChartBlock">
                <div className="aiOpsChartHead">
                  <div>
                    <div className="aiOpsMetricCaption">시간대별 토큰 사용량</div>
                    <div className="aiOpsUsageMeta">시간대별 입력/출력 토큰 분포</div>
                    <div className="aiOpsBudgetControls">
                      {budgetEditorOpen ? (
                        <>
                          <input
                            type="text"
                            value={budgetDraft}
                            onChange={(event) => setBudgetDraft(event.target.value.replace(/[^\d,]/g, ''))}
                            aria-label="총 예산 입력"
                          />
                          <button type="button" className="aiOpsBudgetButton primary" onClick={handleBudgetSave}>
                            저장
                          </button>
                          <button
                            type="button"
                            className="aiOpsBudgetButton"
                            onClick={() => {
                              setBudgetDraft(String(monthlyBudget));
                              setBudgetEditorOpen(false);
                            }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="aiOpsBudgetButton"
                          onClick={() => {
                            setBudgetDraft(String(monthlyBudget));
                            setBudgetEditorOpen(true);
                          }}
                        >
                          총 예산 변경
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="aiOpsLegend">
                    <span className="input">입력 토큰</span>
                    <span className="output">출력 토큰</span>
                  </div>
                </div>

                <div className="aiOpsChartPlot">
                  <div className="aiOpsYAxis">
                    {axisTicks.map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>

                  <div className="aiOpsChartPanel">
                    <div className="aiOpsBars">
                      {usageData.map((item, index) => {
                        const total = item.input + item.output;
                        return (
                          <div className="aiOpsBarItem" key={item.hour}>
                            <div
                              className="aiOpsBarGroup"
                              data-tooltip={`입력 ${item.input}K | 출력 ${item.output}K | 합계 ${total}K`}
                            >
                              <div
                                className={`aiOpsBar input tone-${index === 4 ? 'strong' : 'soft'}`}
                                style={{ height: `${(item.input / axisMax) * 100}%` }}
                              />
                              <div
                                className={`aiOpsBar output tone-${index === 4 ? 'strong' : 'soft'}`}
                                style={{ height: `${(item.output / axisMax) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="aiOpsXAxisLabels">
                      {usageData.map((item) => {
                        const total = item.input + item.output;
                        return (
                          <div className="aiOpsXAxisItem" key={`${item.hour}-label`}>
                            <span>{item.hour}h</span>
                            <small>{total}K 요청</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="aiOpsBudgetBox">
                <div className="aiOpsBudgetShell">
                  <div className="aiOpsBudgetMain">
                    <div className="aiOpsBudgetValue">${monthlySpend.toLocaleString()}</div>
                    <div className="aiOpsBudgetLabel">월간 사용 비용</div>
                    <div className="aiOpsBudgetLine">${monthlyBudget.toLocaleString()} 예산 중 {budgetUsed}% 사용</div>
                  </div>

                  <div className="aiOpsProgress">
                    <div style={{ width: `${budgetUsed}%` }} />
                  </div>

                  <div className={`aiOpsStatusBadge ${isBudgetRisk ? 'danger' : 'stable'}`}>
                    <span />
                    {isBudgetRisk ? '위험' : '안정'}
                  </div>

                  <div className="aiOpsBudgetFacts">
                    <div>
                      <span>예상 비용</span>
                      <strong>${forecastSpend.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>최고 비용 모델</span>
                      <strong>{selectedModel}</strong>
                    </div>
                    <div>
                      <span>분당 토큰 사용량</span>
                      <strong>{tokensPerMinute}</strong>
                    </div>
                  </div>

                  <div className="aiOpsAlertCard">
                    <div className="aiOpsAlertHead">
                      <div>
                        <strong>디스코드 알림</strong>
                        <span>{discordAlertEnabled ? '켜짐' : '꺼짐'}</span>
                      </div>
                      <button
                        type="button"
                        className={`aiOpsSwitch compact ${discordAlertEnabled ? 'active' : ''}`}
                        onClick={() => setDiscordAlertEnabled((prev) => !prev)}
                        aria-label="디스코드 알림 토글"
                      >
                        <i />
                      </button>
                    </div>

                    <div className="aiOpsThreshold">
                      <span>임계치</span>
                      <strong>85%</strong>
                    </div>
                  </div>

                  <button type="button" className={`aiOpsDangerButton ${isBudgetRisk ? 'danger' : 'neutral'}`}>
                    {isBudgetRisk ? '긴급 제한' : '속도 제한 제어'}
                  </button>
                </div>
              </aside>
            </div>
          </section>

          <section className="admin-card aiOpsHeavyCard">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">이상치 트래커 (토큰 사용량)</span>
                <h3>헤비 유저 토큰 트래커</h3>
              </div>
            </div>

            <div className="aiOpsTableWrap compact">
              <table className="aiOpsTable">
                <thead>
                  <tr>
                    <th>사용자 ID</th>
                    <th>누적 토큰 사용량</th>
                    <th>위험도</th>
                    <th>조치</th>
                  </tr>
                </thead>
                <tbody>
                  {heavyUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.tokenUsage.toLocaleString()}</td>
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
                    onChange={(event) => {
                      setDocQuery(event.target.value);
                      setDocPage(1);
                    }}
                    placeholder="청크 또는 메타데이터 검색..."
                  />
                </div>

                <div className="aiOpsTableWrap ragFixed">
                  <table className="aiOpsTable">
                    <colgroup>
                      <col style={{ width: '34%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
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
                      {pagedDocs.map((doc) => (
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
                            <button
                              type="button"
                              className="aiOpsTextButton"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDownloadDocument(doc);
                              }}
                            >
                              다운로드
                            </button>
                            <button type="button" className="aiOpsTextButton danger">
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                      {Array.from({ length: emptyDocRows }, (_, index) => (
                        <tr key={`doc-placeholder-${index}`} className="placeholder" aria-hidden="true">
                          <td colSpan={5} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <MiniPagination
                  page={docPage}
                  totalPages={docTotalPages}
                  onChange={setDocPage}
                  className="aiOpsPagination"
                  showWhenSingle
                />
              </div>
            </div>
          </section>
        </div>

        <div className="aiOpsBoardRow aiOpsBoardBottom">
          <section className="admin-card aiOpsLogCard fullWidth">
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
              <div className="aiOpsLogHead">
                <span>TIMESTAMP</span>
                <span>TYPE</span>
                <span>MESSAGE</span>
              </div>
              {logEvents.map((event) => (
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

        .aiOpsPulse {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #2563c9;
          animation: aiOpsPulse 1.8s infinite;
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

        .aiOpsHeaderMeta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .aiOpsHeaderMeta span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .aiOpsHeaderMeta span::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #a5b7ca;
        }

        .aiOpsBoard {
          display: flex;
          flex-direction: column;
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

        .aiOpsBoardMiddle,
        .aiOpsBoardBottom {
          grid-template-columns: 1fr;
        }

        .aiOpsUsageCard,
        .aiOpsHeavyCard,
        .aiOpsRagCard,
        .aiOpsLogCard {
          display: flex;
          flex-direction: column;
          padding: 18px;
          min-width: 0;
          height: 100%;
        }

        .aiOpsHeavyCard {
          min-height: 100%;
          align-self: start;
          height: auto;
        }

        .aiOpsRagCard {
          min-height: 418px;
        }

        .aiOpsLogCard.fullWidth {
          grid-column: 1 / -1;
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

        .aiOpsRagCard .aiOpsPanelHead {
          min-height: 42px;
        }

        .aiOpsPanelHead h3 {
          margin: 2px 0 0;
          color: var(--ai-primary);
          font-size: 15px;
          font-weight: 800;
        }

        .aiOpsRagCard .aiOpsPanelHead h3 {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .aiOpsEyebrow {
          display: block;
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsModelField {
          display: grid;
          gap: 6px;
          justify-items: end;
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsModelField select {
          min-width: 168px;
          height: 38px;
          border: 1px solid #c8d9ee;
          border-radius: 10px;
          background: #f7fafe;
          color: var(--ai-primary);
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
        }

        .aiOpsUsageGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) 230px;
          gap: 18px;
          align-items: start;
          flex: 1;
        }

        .aiOpsUsageChartBlock {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }

        .aiOpsChartHead {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .aiOpsMetricCaption {
          color: #173b72;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .aiOpsUsageMeta {
          margin-top: 4px;
          color: #55708d;
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsLegend {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          color: #4f6d92;
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsLegend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .aiOpsLegend span::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: block;
        }

        .aiOpsLegend span.input::before {
          background: #9dc0eb;
        }

        .aiOpsLegend span.output::before {
          background: #245fb8;
        }

        .aiOpsChartPlot {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }

        .aiOpsYAxis {
          display: grid;
          grid-template-rows: repeat(5, 1fr);
          align-items: end;
          justify-items: end;
          height: 250px;
          padding: 2px 0 10px;
          color: #7a90ab;
          font-size: 10px;
          font-weight: 700;
        }

        .aiOpsChartPanel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .aiOpsBars {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          align-items: end;
          min-height: 250px;
          height: 250px;
          padding: 12px 10px 10px;
          background:
            linear-gradient(to bottom, rgba(200, 216, 236, 0.45) 1px, transparent 1px) 0 0 / 100% 36px,
            #f6f9ff;
          border: 1px solid #e1ebf5;
          border-radius: 12px;
        }

        .aiOpsBarItem {
          display: flex;
          align-items: end;
          justify-content: center;
          height: 100%;
        }

        .aiOpsBarGroup {
          position: relative;
          width: 100%;
          max-width: 54px;
          height: 212px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
        }

        .aiOpsBarGroup::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%);
          min-width: 164px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(22, 42, 67, 0.96);
          color: #eef5ff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.4;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          box-shadow: 0 10px 20px rgba(18, 39, 64, 0.16);
          transition: opacity 0.16s ease;
        }

        .aiOpsBarGroup:hover::after {
          opacity: 1;
        }

        .aiOpsBar {
          width: 18px;
          min-height: 12px;
          border-radius: 4px 4px 0 0;
        }

        .aiOpsBar.input.tone-soft {
          background: #a9c3ea;
        }

        .aiOpsBar.output.tone-soft {
          background: #4d7fc6;
        }

        .aiOpsBar.input.tone-strong {
          background: #7aa8e8;
        }

        .aiOpsBar.output.tone-strong {
          background: #1f58af;
        }

        .aiOpsXAxisLabels {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          padding: 0 10px;
        }

        .aiOpsXAxisItem {
          display: grid;
          justify-items: center;
          gap: 4px;
        }

        .aiOpsXAxisItem span {
          color: var(--ai-primary);
          font-size: 10px;
          font-weight: 700;
        }

        .aiOpsXAxisItem small {
          color: #7a90ab;
          font-size: 9px;
          font-weight: 700;
        }

        .aiOpsBudgetShell {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .aiOpsBudgetValue {
          color: #173b72;
          font-size: 34px;
          font-weight: 800;
          line-height: 1;
        }

        .aiOpsBudgetLabel {
          color: #5a7694;
          font-size: 12px;
          font-weight: 700;
        }

        .aiOpsBudgetLine {
          color: var(--ai-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsBudgetControls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .aiOpsBudgetControls input {
          width: 118px;
          height: 32px;
          border: 1px solid #d6dfeb;
          border-radius: 8px;
          background: #fff;
          color: var(--ai-primary);
          padding: 0 10px;
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
        }

        .aiOpsBudgetButton {
          height: 32px;
          border-radius: 8px;
          border: 1px solid #d6dfeb;
          background: #fff;
          color: var(--ai-primary);
          padding: 0 12px;
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsBudgetButton.primary {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .aiOpsProgress,
        .aiOpsInlineProgress {
          height: 8px;
          border-radius: 999px;
          background: #e5edf6;
          overflow: hidden;
        }

        .aiOpsProgress div,
        .aiOpsInlineProgress div {
          height: 100%;
          background: linear-gradient(90deg, #78a8ea, #2563c9);
        }

        .aiOpsStatusBadge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #d5e3f2;
          background: #edf9f3;
          color: #1c4d3e;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsStatusBadge span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #28a36a;
        }

        .aiOpsStatusBadge.danger {
          border-color: #f0c7c7;
          background: #fff1f1;
          color: #9f2f2f;
        }

        .aiOpsStatusBadge.danger span {
          background: #d94141;
        }

        .aiOpsBudgetFacts,
        .aiOpsAlertCard {
          display: grid;
          gap: 8px;
          padding: 12px;
          border: 1px solid #e1ebf5;
          border-radius: 12px;
          background: #f7fafe;
        }

        .aiOpsBudgetFacts div,
        .aiOpsThreshold {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .aiOpsBudgetFacts span,
        .aiOpsAlertHead span,
        .aiOpsThreshold {
          color: #68839f;
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsBudgetFacts strong,
        .aiOpsAlertHead strong {
          color: #173b72;
          font-size: 12px;
          font-weight: 800;
        }

        .aiOpsAlertHead {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .aiOpsAlertHead > div {
          display: grid;
          gap: 2px;
        }

        .aiOpsSwitch {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 32px;
          border: 1px solid var(--ai-border);
          border-radius: 999px;
          background: #f8fbff;
          cursor: pointer;
        }

        .aiOpsSwitch i {
          position: relative;
          width: 24px;
          height: 14px;
          border-radius: 999px;
          background: #d1dce8;
        }

        .aiOpsSwitch i::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #fff;
          transition: transform 0.2s ease;
        }

        .aiOpsSwitch.active i {
          background: #2563c9;
        }

        .aiOpsSwitch.active i::after {
          transform: translateX(10px);
        }

        .aiOpsDangerButton,
        .aiOpsUploadCard button,
        .aiOpsTextButton {
          height: 32px;
          border-radius: 8px;
          border: 1px solid #d6dfeb;
          background: #fff;
          color: var(--ai-primary);
          font-size: 11px;
          font-weight: 800;
          padding: 0 12px;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsDangerButton {
          width: 100%;
        }

        .aiOpsDangerButton.neutral {
          border-color: #c6d6ea;
          background: #eaf1fb;
          color: #173b72;
        }

        .aiOpsDangerButton.danger {
          border-color: #dfb7b7;
          background: #da2e2e;
          color: #fff;
        }

        .aiOpsTableWrap {
          overflow: auto;
          border: 1px solid #dfe8f2;
          background: #fff;
        }

        .aiOpsTableWrap.compact {
          flex: 1 1 auto;
          min-height: 0;
          height: 100%;
        }

        .aiOpsHeavyCard .aiOpsTableWrap.compact {
          flex: 0 0 auto;
          height: auto;
        }

        .aiOpsTableWrap.ragFixed {
          min-height: 212px;
          max-height: 212px;
          overflow: hidden;
        }

        .aiOpsTable {
          width: 100%;
          border-collapse: collapse;
        }

        .aiOpsTableWrap.ragFixed .aiOpsTable {
          table-layout: fixed;
        }

        .aiOpsTable tbody tr {
          height: 56px;
        }

        .aiOpsTable th,
        .aiOpsTable td {
          padding: 12px 14px;
          border-bottom: 1px solid #edf2f7;
          color: var(--ai-primary);
          font-size: 12px;
          text-align: left;
          white-space: nowrap;
        }

        .aiOpsTableWrap.ragFixed th:nth-child(2),
        .aiOpsTableWrap.ragFixed td:nth-child(2),
        .aiOpsTableWrap.ragFixed th:nth-child(4),
        .aiOpsTableWrap.ragFixed td:nth-child(4) {
          text-align: center;
        }

        .aiOpsTableWrap.ragFixed th:nth-child(3),
        .aiOpsTableWrap.ragFixed td:nth-child(3),
        .aiOpsTableWrap.ragFixed th:nth-child(5),
        .aiOpsTableWrap.ragFixed td:nth-child(5) {
          text-align: left;
        }

        .aiOpsTableWrap.ragFixed td:first-child,
        .aiOpsTableWrap.ragFixed td:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .aiOpsTable th {
          color: #6b86a3;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsTable tbody tr.selected {
          background: #f5f9ff;
        }

        .aiOpsTable tbody tr.placeholder td {
          color: transparent;
          background: #fff;
        }

        .aiOpsBadge {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
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
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid currentColor;
          background: #fff;
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
          min-height: 304px;
        }

        .aiOpsUploadCard {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 12px;
          min-height: 260px;
          padding: 24px 18px;
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
          color: #fff;
        }

        .aiOpsRagTableBlock {
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 304px;
        }

        .aiOpsSearchRow {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 12px;
          margin-bottom: 10px;
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
        }

        .aiOpsSearchIcon::before,
        .aiOpsSearchIcon::after {
          content: '';
          position: absolute;
        }

        .aiOpsSearchIcon::before {
          width: 9px;
          height: 9px;
          border: 2px solid #88a2bf;
          border-radius: 999px;
          left: 0;
          top: 0;
        }

        .aiOpsSearchIcon::after {
          width: 6px;
          height: 2px;
          background: #88a2bf;
          right: -1px;
          bottom: 0;
          transform: rotate(45deg);
          transform-origin: right center;
        }

        .aiOpsTextButton {
          margin-right: 6px;
          color: var(--ai-accent);
        }

        .aiOpsTextButton.danger {
          color: var(--ai-danger);
        }

        .aiOpsPagination {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding-top: 12px;
          min-height: 44px;
        }

        .aiOpsPagination button {
          min-width: 32px;
          height: 32px;
          border: 1px solid #d6dfeb;
          border-radius: 8px;
          background: #fff;
          color: var(--ai-primary);
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsPagination button.active {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .aiOpsPagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
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

        .aiOpsLogLights .red {
          background: #ea4f4f;
        }

        .aiOpsLogLights .amber {
          background: #d8b46e;
        }

        .aiOpsLogLights .green {
          background: #76a37f;
        }

        .aiOpsLogConsole {
          display: flex;
          flex-direction: column;
          min-height: 274px;
          max-height: 274px;
          overflow: auto;
          padding: 14px 16px;
          border-radius: 14px;
          background: linear-gradient(180deg, #13253d 0%, #0f2034 100%);
          border: 1px solid #20344f;
        }

        .aiOpsLogHead,
        .aiOpsLogRow {
          display: grid;
          grid-template-columns: 140px 90px minmax(0, 1fr);
          column-gap: 18px;
          align-items: center;
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .aiOpsLogHead {
          padding: 4px 14px 12px;
          border-bottom: 1px solid rgba(107, 137, 173, 0.2);
          color: #88a2bf;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .aiOpsLogRow {
          padding: 10px 14px;
          color: #dce7f3;
          border-top: 1px solid rgba(37, 56, 81, 0.9);
        }

        .aiOpsLogTag.normal {
          color: #7dd49a;
        }

        .aiOpsLogTag.warning {
          color: #e1c36d;
        }

        .aiOpsLogTag.danger {
          color: #e39aa2;
        }

        .aiOpsLogRow strong {
          color: #f4f8fd;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes aiOpsPulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 201, 0.34); }
          70% { box-shadow: 0 0 0 8px rgba(37, 99, 201, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 201, 0); }
        }

        @media (max-width: 1480px) {
          .aiOpsBoardTop,
          .aiOpsUsageGrid,
          .aiOpsRagLayout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .aiOpsHeaderStatus,
          .aiOpsPanelHead,
          .aiOpsChartHead {
            flex-direction: column;
            align-items: stretch;
          }

          .aiOpsModelField {
            justify-items: stretch;
          }

          .aiOpsModelField select {
            width: 100%;
            min-width: 0;
          }

          .aiOpsLogHead,
          .aiOpsLogRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
