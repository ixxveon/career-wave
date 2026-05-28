import { useEffect, useMemo, useState } from 'react';
import '../../styles/admin.css';
import { adminSecurityLogSeeds, aiMetricLogSeeds, scrapingLogSeeds } from '../../data/logSeeds';

type AuditSource = 'ALL' | 'ADMIN' | 'AI' | 'SCRAPING';
type AuditLevel = 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
type AuditTone = 'normal' | 'warning' | 'danger' | 'info';

interface UnifiedLog {
  id: string;
  source: Exclude<AuditSource, 'ALL'>;
  sourceLabel: string;
  timestamp: string;
  level: Exclude<AuditLevel, 'ALL'>;
  summary: string;
  detail: string;
}

const sourceLabelMap: Record<Exclude<AuditSource, 'ALL'>, string> = {
  ADMIN: '관리자 관리',
  AI: 'AI 메트릭스',
  SCRAPING: '스크래핑 관리',
};

const levelToneMap: Record<Exclude<AuditLevel, 'ALL'>, AuditTone> = {
  INFO: 'info',
  WARN: 'warning',
  ERROR: 'danger',
  SUCCESS: 'normal',
};

const unifiedLogsSeed: UnifiedLog[] = [
  ...adminSecurityLogSeeds.map((log) => ({
    id: `ADMIN-${log.id}`,
    source: 'ADMIN' as const,
    sourceLabel: sourceLabelMap.ADMIN,
    timestamp: log.time,
    level: log.severity,
    summary: log.action,
    detail: `actor: ${log.actor} / target: ${log.target} / ip: ${log.ip}`,
  })),
  ...aiMetricLogSeeds.map((log, index) => ({
    id: `AI-${index + 1}`,
    source: 'AI' as const,
    sourceLabel: sourceLabelMap.AI,
    timestamp: `2026.05.25 ${log.time}`,
    level: log.severity,
    summary: log.message,
    detail: 'AI 토큰 사용량 및 리소스 모니터링 이벤트',
  })),
  ...scrapingLogSeeds.map((log) => ({
    id: `SCRAPING-${log.id}`,
    source: 'SCRAPING' as const,
    sourceLabel: sourceLabelMap.SCRAPING,
    timestamp: `2026.05.25 ${log.time}`,
    level: log.level,
    summary: log.message,
    detail: log.detail ?? '스크래핑 파이프라인 상세 이벤트',
  })),
];

const splitTimestamp = (value: string) => {
  const [date = '', time = ''] = value.split(' ');
  return { date, time };
};

export default function AuditLogPage() {
  const [sourceFilter, setSourceFilter] = useState<AuditSource>('ALL');
  const [levelFilter, setLevelFilter] = useState<AuditLevel>('ALL');
  const [query, setQuery] = useState('');
  const [selectedLogId, setSelectedLogId] = useState(unifiedLogsSeed[0]?.id ?? '');

  const filteredLogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return unifiedLogsSeed.filter((log) => {
      const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter;
      const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
      const matchesQuery =
        keyword.length === 0 ||
        log.summary.toLowerCase().includes(keyword) ||
        log.detail.toLowerCase().includes(keyword) ||
        log.sourceLabel.toLowerCase().includes(keyword);
      return matchesSource && matchesLevel && matchesQuery;
    });
  }, [levelFilter, query, sourceFilter]);

  const selectedLog = useMemo(() => unifiedLogsSeed.find((log) => log.id === selectedLogId) ?? null, [selectedLogId]);

  useEffect(() => {
    const isSelectedVisible = filteredLogs.some((log) => log.id === selectedLogId);

    if (!isSelectedVisible && filteredLogs[0]) {
      setSelectedLogId(filteredLogs[0].id);
      return;
    }
  }, [filteredLogs, selectedLogId]);

  const sourceCounts = useMemo(
    () => ({
      ADMIN: unifiedLogsSeed.filter((log) => log.source === 'ADMIN').length,
      AI: unifiedLogsSeed.filter((log) => log.source === 'AI').length,
      SCRAPING: unifiedLogsSeed.filter((log) => log.source === 'SCRAPING').length,
    }),
    []
  );

  return (
    <section className="auditOpsPage">
      <header className="admin-header">
        <div>
          <h2>감사 로그</h2>
          <p>관리자 관리, AI 메트릭스, 스크래핑 관리의 상세 로그를 한 화면에서 검수합니다.</p>
        </div>
      </header>

      <div className="auditOpsSummary">
        <article className="admin-card auditOpsSummaryCard">
          <span>관리자 관리</span>
          <strong>{sourceCounts.ADMIN}</strong>
          <small>권한, ACL, 보안 이벤트</small>
        </article>
        <article className="admin-card auditOpsSummaryCard">
          <span>AI 메트릭스</span>
          <strong>{sourceCounts.AI}</strong>
          <small>리소스, 토큰, 모델 이벤트</small>
        </article>
        <article className="admin-card auditOpsSummaryCard">
          <span>스크래핑 관리</span>
          <strong>{sourceCounts.SCRAPING}</strong>
          <small>파이프라인, 복구, 장애 이벤트</small>
        </article>
      </div>

      <section className="admin-card auditOpsShell">
        <div className="auditOpsToolbar">
          <div className="auditOpsTabs">
            {[
              { key: 'ALL', label: '전체' },
              { key: 'ADMIN', label: '관리자 관리' },
              { key: 'AI', label: 'AI 메트릭스' },
              { key: 'SCRAPING', label: '스크래핑 관리' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={sourceFilter === tab.key ? 'active' : ''}
                onClick={() => setSourceFilter(tab.key as AuditSource)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="auditOpsFilters">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="로그 요약 또는 상세 내용 검색"
            />
            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as AuditLevel)}>
              <option value="ALL">전체 유형</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="SUCCESS">SUCCESS</option>
            </select>
          </div>
        </div>

        <div className="auditOpsGrid">
          <div className="auditOpsTableWrap">
            <div className="auditOpsTableHead">
              <span>TIMESTAMP</span>
              <span>TYPE</span>
              <span>MESSAGE</span>
            </div>

            <div className="auditOpsTableBody">
              {filteredLogs.map((log) => {
                const { date, time } = splitTimestamp(log.timestamp);
                return (
                  <button
                    key={log.id}
                    type="button"
                    className={`auditOpsTableRow ${selectedLog?.id === log.id ? 'selected' : ''}`}
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <span className="timestamp">
                      [{time || date}]
                    </span>
                    <span className={`auditOpsTag ${levelToneMap[log.level]}`}>[{log.level}]</span>
                    <strong className="summary">{`[${log.sourceLabel}] ${log.summary}`}</strong>
                  </button>
                );
              })}

              {filteredLogs.length === 0 ? (
                <div className="auditOpsEmpty">조건에 맞는 감사 로그가 없습니다.</div>
              ) : null}
            </div>
          </div>

          <aside className="auditOpsDetail">
            <div className="auditOpsDetailHead">
              <span>선택 로그 상세</span>
              {selectedLog ? <strong>{selectedLog.sourceLabel}</strong> : null}
            </div>

            {selectedLog ? (
              <div className="auditOpsDetailBody">
                <div className="auditOpsDetailMeta">
                  <div>
                    <span>발생 시각</span>
                    <strong>{selectedLog.timestamp}</strong>
                  </div>
                  <div>
                    <span>유형</span>
                    <strong className={`auditOpsTag ${levelToneMap[selectedLog.level]}`}>[{selectedLog.level}]</strong>
                  </div>
                </div>

                <div className="auditOpsDetailBlock">
                  <span>요약</span>
                  <strong>{selectedLog.summary}</strong>
                </div>

                <div className="auditOpsDetailBlock">
                  <span>상세 로그</span>
                  <p>{selectedLog.detail}</p>
                </div>
              </div>
            ) : (
              <div className="auditOpsEmpty detail">표시할 로그가 없습니다.</div>
            )}
          </aside>
        </div>
      </section>

      <style>{`
        .auditOpsPage {
          --audit-primary: #173553;
          --audit-border: #d8e4f1;
          --audit-surface: rgba(255, 255, 255, 0.98);
          --audit-muted: #72859b;
          --audit-success: #2d8b57;
          --audit-success-bg: #edf8f1;
          --audit-warning: #b17419;
          --audit-warning-bg: #fdf3de;
          --audit-danger: #d04545;
          --audit-danger-bg: #fff0f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 24px;
        }

        .auditOpsSummary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .auditOpsSummaryCard {
          display: grid;
          gap: 6px;
          padding: 18px;
        }

        .auditOpsSummaryCard span,
        .auditOpsDetailBlock span,
        .auditOpsDetailMeta span,
        .auditOpsDetailHead span {
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .auditOpsSummaryCard strong {
          color: var(--audit-primary);
          font-size: 32px;
          line-height: 1;
        }

        .auditOpsSummaryCard small {
          color: var(--audit-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .auditOpsShell {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 18px;
          overflow: hidden;
        }

        .auditOpsToolbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .auditOpsTabs,
        .auditOpsFilters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .auditOpsTabs button,
        .auditOpsFilters select,
        .auditOpsFilters input {
          height: 38px;
          border: 1px solid #c8d9ee;
          border-radius: 10px;
          background: #f7fafe;
          color: var(--audit-primary);
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
        }

        .auditOpsTabs button {
          cursor: pointer;
        }

        .auditOpsTabs button.active {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .auditOpsFilters input {
          width: 260px;
        }

        .auditOpsGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.85fr);
          gap: 14px;
          align-items: stretch;
        }

        .auditOpsTableWrap,
        .auditOpsDetail {
          display: flex;
          flex-direction: column;
          border: 1px solid #dfe8f2;
          border-radius: 16px;
          overflow: hidden;
          min-height: 448px;
        }

        .auditOpsTableWrap {
          background: linear-gradient(180deg, #13253d 0%, #0f2034 100%);
          border-color: #20344f;
        }

        .auditOpsDetail {
          background: #fff;
        }

        .auditOpsTableHead,
        .auditOpsTableRow {
          display: grid;
          grid-template-columns: 140px 90px minmax(0, 1fr);
          column-gap: 18px;
          align-items: center;
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .auditOpsTableHead {
          padding: 4px 14px 12px;
          border-bottom: 1px solid rgba(107, 137, 173, 0.2);
          color: #88a2bf;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .auditOpsTableHead span:nth-child(2),
        .auditOpsTableRow span:nth-child(2) {
          justify-self: start;
        }

        .auditOpsTableBody {
          display: flex;
          flex-direction: column;
          min-height: 360px;
          max-height: 360px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #48658a #13253d;
        }

        .auditOpsTableBody::-webkit-scrollbar {
          width: 10px;
        }

        .auditOpsTableBody::-webkit-scrollbar-track {
          background: #13253d;
          border-left: 1px solid rgba(107, 137, 173, 0.14);
        }

        .auditOpsTableBody::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #48658a 0%, #334e73 100%);
          border-radius: 999px;
          border: 2px solid #13253d;
        }

        .auditOpsTableBody::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #5a7aa4 0%, #3e5f88 100%);
        }

        .auditOpsTableRow {
          width: 100%;
          min-height: 54px;
          flex: 0 0 auto;
          padding: 10px 14px;
          border: 0;
          border-top: 1px solid rgba(37, 56, 81, 0.9);
          background: transparent;
          color: #dce7f3;
          text-align: left;
          cursor: pointer;
        }

        .auditOpsTableRow.selected {
          background: rgba(255, 255, 255, 0.05);
        }

        .auditOpsTableRow .timestamp,
        .auditOpsDetailBlock strong,
        .auditOpsDetailMeta strong,
        .auditOpsTableRow .summary {
          color: #f4f8fd;
          font-size: 12px;
          font-weight: 700;
        }

        .auditOpsTableRow .timestamp,
        .auditOpsTag {
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
        }

        .auditOpsTableRow .summary {
          color: #f4f8fd;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .auditOpsTag {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          min-width: 0;
          height: auto;
          padding: 0;
          border-radius: 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.01em;
          background: transparent;
        }

        .auditOpsTag.normal {
          color: #7dd49a;
        }

        .auditOpsTag.warning {
          color: #e1c36d;
        }

        .auditOpsTag.danger {
          color: #e39aa2;
        }

        .auditOpsTag.info {
          color: #9ec1ff;
        }

        .auditOpsDetail {
          min-height: 448px;
        }

        .auditOpsDetailHead {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 18px;
          border-bottom: 1px solid #edf2f7;
        }

        .auditOpsDetailHead strong {
          color: var(--audit-primary);
          font-size: 13px;
          font-weight: 800;
        }

        .auditOpsDetailBody {
          display: grid;
          align-content: start;
          flex: 1 1 auto;
          gap: 14px;
          padding: 18px;
        }

        .auditOpsDetailMeta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .auditOpsDetailMeta div,
        .auditOpsDetailBlock {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 14px;
          background: #f7fafe;
          border: 1px solid #e3ecf6;
        }

        .auditOpsDetailBlock p {
          margin: 0;
          color: var(--audit-primary);
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .auditOpsEmpty {
          min-height: 360px;
          padding: 28px 18px;
          display: grid;
          place-items: center;
          color: #9cb1ca;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        .auditOpsEmpty.detail {
          padding: 36px 18px;
        }

        @media (max-width: 1280px) {
          .auditOpsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .auditOpsSummary {
            grid-template-columns: 1fr;
          }

          .auditOpsTableHead,
          .auditOpsTableRow {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .auditOpsFilters input {
            width: 100%;
          }

          .auditOpsDetailMeta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
