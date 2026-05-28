export type SharedAuditSeverity = 'INFO' | 'WARN' | 'ERROR';
export type SharedLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface AdminSecurityLogSeed {
  id: string;
  time: string;
  actor: string;
  ip: string;
  action: string;
  target: string;
  severity: SharedAuditSeverity;
}

export interface AiMetricLogSeed {
  time: string;
  severity: SharedAuditSeverity;
  message: string;
}

export interface ScrapingLogSeed {
  id: string;
  time: string;
  level: SharedLogLevel;
  message: string;
  detail?: string;
}

export const adminSecurityLogSeeds: AdminSecurityLogSeed[] = [
  {
    id: 'LOG-001',
    time: '2026.05.25 14:29:12',
    actor: 'super_admin',
    ip: '10.20.0.10',
    action: '권한 변경 승인',
    target: 'member:U-1007 / role:CS',
    severity: 'WARN',
  },
  {
    id: 'LOG-002',
    time: '2026.05.25 14:22:49',
    actor: 'backend_admin',
    ip: '10.20.0.22',
    action: 'DB 변경 감지',
    target: 'schema:member',
    severity: 'ERROR',
  },
  {
    id: 'LOG-003',
    time: '2026.05.25 14:18:27',
    actor: 'cs_admin',
    ip: '10.20.0.21',
    action: '회원 문의 처리',
    target: 'ticket:CS-1842',
    severity: 'INFO',
  },
  {
    id: 'LOG-004',
    time: '2026.05.25 14:12:08',
    actor: 'ops_admin',
    ip: '10.20.0.23',
    action: 'IP ACL 갱신',
    target: 'ACL-002',
    severity: 'WARN',
  },
  {
    id: 'LOG-005',
    time: '2026.05.25 13:58:41',
    actor: 'audit_admin',
    ip: '10.20.10.8',
    action: '감사 정책 검토',
    target: 'policy:admin-access',
    severity: 'INFO',
  },
];

export const aiMetricLogSeeds: AiMetricLogSeed[] = [
  { time: '17:12:24', severity: 'INFO', message: '[정보] 클러스터 상태 동기화 완료' },
  { time: '17:13:24', severity: 'INFO', message: '[정보] 리소스 점검 루프 실행' },
  { time: '17:14:24', severity: 'INFO', message: '[정보] RAG 인덱스 캐시 갱신' },
  { time: '17:15:24', severity: 'WARN', message: '[경고] 응답 시간 상승 감지' },
  { time: '17:16:24', severity: 'INFO', message: '[정보] 워커 헬스체크 통과' },
];

export const scrapingLogSeeds: ScrapingLogSeed[] = [
  {
    id: 'LOG-001',
    time: '18:42:13',
    level: 'ERROR',
    message: 'Saramin 셀렉터 매칭 실패',
    detail: 'DOM 구조 변경으로 상세 페이지 수집이 중단되었습니다.',
  },
  {
    id: 'LOG-002',
    time: '18:39:52',
    level: 'WARN',
    message: '검수 운영에서 QA 보정 검수 생성',
    detail: '331-Z 공고가 보정 제안 검수로 연결되었습니다.',
  },
  {
    id: 'LOG-003',
    time: '18:34:10',
    level: 'SUCCESS',
    message: 'Wanted Feed 복구 완료',
    detail: '프록시 교체 이후 성공률이 91.8%로 회복되었습니다.',
  },
];
