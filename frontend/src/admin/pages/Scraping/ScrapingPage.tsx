import { useEffect, useMemo, useState } from 'react';
import '../../styles/admin.css';
import MiniPagination from '../../components/MiniPagination';

type Tone = 'normal' | 'warning' | 'danger' | 'info';
type PipelineStatus = 'ACTIVE' | 'WARNING' | 'FAILED' | 'RECOVERING' | 'PAUSED';

interface PipelineRow {
  id: string;
  source: string;
  status: PipelineStatus;
  successRate: number;
  avgDurationMs: number;
  cycle: string;
  volume: number;
  recentError: string;
  live?: boolean;
}

interface LogLine {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  detail?: string;
}

const PIPELINE_PAGE_SIZE = 5;
const PIPELINE_TABLE_BODY_HEIGHT = 280;

const initialPipelines: PipelineRow[] = [
  { id: 'PL-001', source: 'LinkedIn API', status: 'ACTIVE', successRate: 99.1, avgDurationMs: 1240, cycle: '*/15m', volume: 1402, recentError: '-', live: true },
  { id: 'PL-002', source: 'Saramin DOM', status: 'FAILED', successRate: 12.4, avgDurationMs: 4810, cycle: '*/5m', volume: 0, recentError: 'SelectorMismatch', live: true },
  { id: 'PL-003', source: 'Indeed Cloud', status: 'WARNING', successRate: 84.2, avgDurationMs: 2100, cycle: '*/30m', volume: 421, recentError: 'RateLimitApproach' },
  { id: 'PL-004', source: 'Wanted Feed', status: 'RECOVERING', successRate: 91.8, avgDurationMs: 1620, cycle: '*/20m', volume: 1042, recentError: 'ProxyRecovered' },
  { id: 'PL-005', source: 'JobKorea Sync', status: 'ACTIVE', successRate: 97.4, avgDurationMs: 1380, cycle: '*/10m', volume: 1184, recentError: '-' },
  { id: 'PL-006', source: 'RocketPunch Feed', status: 'WARNING', successRate: 79.6, avgDurationMs: 2660, cycle: '*/30m', volume: 354, recentError: 'SchemaDrift' },
];

export const initialLogs: LogLine[] = [
  { id: 'LOG-001', time: '18:42:13', level: 'ERROR', message: 'Saramin 셀렉터 매칭 실패', detail: 'DOM 구조 변경으로 상세 페이지 수집이 중단되었습니다.' },
  { id: 'LOG-002', time: '18:39:52', level: 'WARN', message: '검수 운영에서 QA 보정 검수 생성', detail: '331-Z 공고가 보정 제안 검수로 연결되었습니다.' },
  { id: 'LOG-003', time: '18:34:10', level: 'SUCCESS', message: 'Wanted Feed 복구 완료', detail: '프록시 교체 이후 성공률이 91.8%로 회복되었습니다.' },
];

const statusTone: Record<PipelineStatus, Tone> = {
  ACTIVE: 'normal',
  WARNING: 'warning',
  FAILED: 'danger',
  RECOVERING: 'info',
  PAUSED: 'info',
};

const statusLabel: Record<PipelineStatus, string> = {
  ACTIVE: '정상',
  WARNING: '주의',
  FAILED: '실패',
  RECOVERING: '복구 중',
  PAUSED: '중지',
};

const levelTone: Record<LogLine['level'], Tone> = {
  INFO: 'info',
  WARN: 'warning',
  ERROR: 'danger',
  SUCCESS: 'normal',
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDuration = (ms: number) => `${ms.toLocaleString()}ms`;
const formatVolume = (value: number) => value.toLocaleString();

const paginate = <T,>(items: T[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export default function ScrapingPage() {
  const [pipelines] = useState(initialPipelines);
  const [logs] = useState(initialLogs);
  const [pipelineQuery, setPipelineQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PipelineStatus>('ALL');
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>([]);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [updatedSeconds] = useState(35);

  const filteredPipelines = useMemo(() => {
    const keyword = pipelineQuery.trim().toLowerCase();
    return pipelines.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesQuery =
        keyword.length === 0 ||
        item.source.toLowerCase().includes(keyword) ||
        item.recentError.toLowerCase().includes(keyword);
      return matchesStatus && matchesQuery;
    });
  }, [pipelineQuery, pipelines, statusFilter]);

  const pipelineTotalPages = Math.max(1, Math.ceil(filteredPipelines.length / PIPELINE_PAGE_SIZE));
  const pagedPipelines = useMemo(
    () => paginate(filteredPipelines, pipelinePage, PIPELINE_PAGE_SIZE),
    [filteredPipelines, pipelinePage]
  );
  const pipelinePlaceholderCount = Math.max(0, PIPELINE_PAGE_SIZE - pagedPipelines.length);
  const pipelineRowHeight = Math.floor(PIPELINE_TABLE_BODY_HEIGHT / PIPELINE_PAGE_SIZE);

  useEffect(() => {
    setPipelinePage((prev) => Math.min(prev, pipelineTotalPages));
  }, [pipelineTotalPages]);

  const allVisibleSelected =
    pagedPipelines.length > 0 && pagedPipelines.every((item) => selectedPipelineIds.includes(item.id));

  const toggleAllRows = () => {
    if (allVisibleSelected) {
      setSelectedPipelineIds((prev) => prev.filter((id) => !pagedPipelines.some((item) => item.id === id)));
      return;
    }

    setSelectedPipelineIds((prev) => Array.from(new Set([...prev, ...pagedPipelines.map((item) => item.id)])));
  };

  const toggleRow = (id: string) => {
    setSelectedPipelineIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <section className="scrapeOpsPage">
      <header className="admin-header">
        <div>
          <h2>스크래핑 관리</h2>
          <p>스크래핑 배치 상태와 실시간 운영 로그를 한 화면에서 모니터링합니다.</p>
        </div>

        <div className="scrapeOpsHeaderStatus">
          <div className="scrapeOpsLivePill">
            <span className="scrapeOpsPulse" />
            <strong>실시간 파이프라인 모니터링</strong>
          </div>
          <span className="scrapeOpsUpdatedAt">Updated {updatedSeconds}s ago</span>
        </div>
      </header>

      <div className="scrapeOpsBoard">
        <section className="admin-card scrapeOpsPanel">
          <div className="scrapeOpsPanelHeader">
            <div>
              <span className="scrapeOpsEyebrow">PIPELINE</span>
              <h3>스크래핑 배치 모니터링</h3>
            </div>

            <div className="scrapeOpsFilters">
              <input
                type="search"
                value={pipelineQuery}
                onChange={(event) => {
                  setPipelineQuery(event.target.value);
                  setPipelinePage(1);
                }}
                placeholder="파이프라인 또는 에러 검색"
              />

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as 'ALL' | PipelineStatus);
                  setPipelinePage(1);
                }}
              >
                <option value="ALL">전체 상태</option>
                <option value="ACTIVE">정상</option>
                <option value="WARNING">주의</option>
                <option value="FAILED">실패</option>
                <option value="RECOVERING">복구 중</option>
                <option value="PAUSED">중지</option>
              </select>
            </div>
          </div>

          <div className="scrapeOpsTableWrap fixed">
            <table className="scrapeOpsTable">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllRows}
                      aria-label="전체 선택"
                    />
                  </th>
                  <th>Source</th>
                  <th>상태</th>
                  <th>성공률</th>
                  <th>평균 응답</th>
                  <th>주기</th>
                  <th>수집 건수</th>
                  <th>최근 에러</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {pagedPipelines.map((row) => (
                  <tr key={row.id} style={{ height: `${pipelineRowHeight}px` }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedPipelineIds.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`${row.source} 선택`}
                      />
                    </td>
                    <td>{row.source}</td>
                    <td>
                      <span className={`scrapeOpsBadge ${statusTone[row.status]}`}>{statusLabel[row.status]}</span>
                    </td>
                    <td>{formatPercent(row.successRate)}</td>
                    <td>{formatDuration(row.avgDurationMs)}</td>
                    <td>{row.cycle}</td>
                    <td>{formatVolume(row.volume)}</td>
                    <td>{row.recentError}</td>
                    <td>
                      <div className="scrapeOpsActionGroup">
                        <button type="button" className="scrapeOpsActionButton subtle">실행</button>
                        <button type="button" className="scrapeOpsActionButton primary">재시도</button>
                        <button type="button" className="scrapeOpsActionButton subtle">테스트</button>
                        <button type="button" className="scrapeOpsActionButton dangerGhost">중지</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {Array.from({ length: pipelinePlaceholderCount }, (_, index) => (
                  <tr key={`pipeline-placeholder-${index}`} className="scrapeOpsPlaceholderRow" aria-hidden="true" style={{ height: `${pipelineRowHeight}px` }}>
                    <td colSpan={9}>
                      <span />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <MiniPagination
            page={pipelinePage}
            totalPages={pipelineTotalPages}
            onChange={setPipelinePage}
            className="pagination scrapeOpsPagination"
            activeClassName="activePage"
          />
        </section>

        <section className="admin-card scrapeOpsPanel">
          <div className="scrapeOpsPanelHeader compact">
            <div>
              <span className="scrapeOpsEyebrow">LOG</span>
              <h3>실시간 로그</h3>
            </div>
          </div>

          <div className="scrapeOpsLogConsole">
            <div className="scrapeOpsLogHead">
              <span>TIMESTAMP</span>
              <span>TYPE</span>
              <span>MESSAGE</span>
            </div>
            {logs.map((log) => (
              <article key={log.id} className="scrapeOpsConsoleRow">
                <span className="time">[{log.time}]</span>
                <span className={`scrapeOpsConsoleTag ${levelTone[log.level]}`}>[{log.level}]</span>
                <strong>{log.detail ? `${log.message} ${log.detail}` : log.message}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .scrapeOpsPage {
          --scrape-primary: #173553;
          --scrape-border: #d8e4f1;
          --scrape-surface: rgba(255, 255, 255, 0.98);
          --scrape-muted: #72859b;
          --scrape-accent: #2563c9;
          --scrape-success: #2d8b57;
          --scrape-success-bg: #edf8f1;
          --scrape-warning: #b17419;
          --scrape-warning-bg: #fdf3de;
          --scrape-danger: #d04545;
          --scrape-danger-bg: #fff0f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 24px;
        }

        .scrapeOpsHeaderStatus {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .scrapeOpsLivePill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid #bcd2eb;
          background: #f7fbff;
          color: var(--scrape-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .scrapeOpsPulse {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #2f9b63;
        }

        .scrapeOpsUpdatedAt {
          color: #6684a7;
          font-size: 12px;
          font-weight: 700;
        }

        .scrapeOpsBoard {
          display: grid;
          gap: 14px;
        }

        .scrapeOpsPanel {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 18px;
        }

        .scrapeOpsPanelHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .scrapeOpsPanelHeader.compact {
          margin-bottom: 2px;
        }

        .scrapeOpsPanel:last-child .scrapeOpsPanelHeader.compact::after {
          content: '';
          width: 42px;
          height: 10px;
          flex: 0 0 auto;
          border-radius: 999px;
          background:
            radial-gradient(circle at 5px 5px, #ea4f4f 0 4px, transparent 4.5px),
            radial-gradient(circle at 21px 5px, #d8b46e 0 4px, transparent 4.5px),
            radial-gradient(circle at 37px 5px, #76a37f 0 4px, transparent 4.5px);
        }

        .scrapeOpsEyebrow {
          display: block;
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsPanelHeader h3 {
          margin: 4px 0 0;
          color: var(--scrape-primary);
          font-size: 16px;
          font-weight: 800;
        }

        .scrapeOpsFilters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .scrapeOpsFilters input,
        .scrapeOpsFilters select {
          height: 40px;
          border: 1px solid #c8d9ee;
          border-radius: 10px;
          background: #f7fafe;
          color: var(--scrape-primary);
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
        }

        .scrapeOpsFilters input {
          width: 260px;
        }

        .scrapeOpsTableWrap.fixed {
          overflow: hidden;
          border: 1px solid #dfe8f2;
          background: #fff;
          min-height: 332px;
          height: 332px;
        }

        .scrapeOpsTable {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .scrapeOpsTable thead tr {
          height: 52px;
        }

        .scrapeOpsTable th,
        .scrapeOpsTable td {
          padding: 12px 14px;
          border-bottom: 1px solid #edf2f7;
          color: var(--scrape-primary);
          font-size: 12px;
          text-align: left;
          white-space: nowrap;
          vertical-align: middle;
        }

        .scrapeOpsTable th {
          color: #6b86a3;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsPlaceholderRow td {
          padding: 0;
          background: #fff;
        }

        .scrapeOpsPlaceholderRow span {
          display: block;
          width: 100%;
          height: 100%;
        }

        .scrapeOpsBadge {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsBadge.normal {
          background: var(--scrape-success-bg);
          color: var(--scrape-success);
        }

        .scrapeOpsBadge.warning {
          background: var(--scrape-warning-bg);
          color: var(--scrape-warning);
        }

        .scrapeOpsBadge.danger {
          background: var(--scrape-danger-bg);
          color: var(--scrape-danger);
        }

        .scrapeOpsBadge.info {
          background: #edf4fd;
          color: #356eb6;
        }

        .scrapeOpsActionGroup {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: flex-start;
        }

        .scrapeOpsActionButton {
          height: 30px;
          min-width: 48px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #d6dfeb;
          background: #fff;
          color: var(--scrape-primary);
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .scrapeOpsActionButton.primary {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .scrapeOpsActionButton.subtle {
          background: #f7fafe;
        }

        .scrapeOpsActionButton.dangerGhost {
          border-color: #e8c2c2;
          color: var(--scrape-danger);
        }

        .scrapeOpsLogConsole {
          display: flex;
          flex-direction: column;
          padding: 14px 16px;
          border-radius: 16px;
          background: linear-gradient(180deg, #13253d 0%, #0f2034 100%);
          border: 1px solid #20344f;
        }

        .scrapeOpsLogHead,
        .scrapeOpsConsoleRow {
          display: grid;
          grid-template-columns: 140px 100px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
        }

        .scrapeOpsLogHead {
          padding: 6px 12px 14px;
          border-bottom: 1px solid rgba(84, 112, 148, 0.34);
          color: #8fb1d8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .scrapeOpsConsoleRow {
          min-height: 54px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(84, 112, 148, 0.22);
        }

        .scrapeOpsConsoleRow:last-child {
          border-bottom: 0;
        }

        .scrapeOpsConsoleRow .time {
          color: #f4f8fd;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsConsoleTag {
          font-size: 11px;
          font-weight: 800;
          font-family: 'Consolas', 'Monaco', monospace;
        }

        .scrapeOpsConsoleTag.normal {
          color: #7de1aa;
        }

        .scrapeOpsConsoleTag.warning {
          color: #ffd27a;
        }

        .scrapeOpsConsoleTag.danger {
          color: #ff9b9b;
        }

        .scrapeOpsConsoleTag.info {
          color: #9ec1ff;
        }

        .scrapeOpsConsoleRow strong {
          color: #f4f8fd;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
        }

        @media (max-width: 1280px) {
          .scrapeOpsPanelHeader {
            flex-direction: column;
          }
        }

        @media (max-width: 820px) {
          .scrapeOpsFilters input,
          .scrapeOpsFilters select {
            width: 100%;
          }

          .scrapeOpsLogHead,
          .scrapeOpsConsoleRow {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </section>
  );
}
