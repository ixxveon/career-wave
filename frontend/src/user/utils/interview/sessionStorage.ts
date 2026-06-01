/**
 * 면접 세션 복구용 sessionStorage 헬퍼
 * localStorage 사용 금지 — 탭 종료 시 민감 데이터 자동 삭제 (constitution.md §6)
 */

const SESSION_KEY = 'cw_interview_session';

export interface StoredInterviewSession {
  sessionId: string;
  sessionType: string;
  questionOrder: number;
  startedAt: string;
}

function isValidSession(value: unknown): value is StoredInterviewSession {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sessionId === 'string' &&
    typeof v.sessionType === 'string' &&
    typeof v.questionOrder === 'number' &&
    typeof v.startedAt === 'string'
  );
}

export function saveInterviewSession(data: StoredInterviewSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // storage 용량 초과 등 setItem 실패 시 무시
  }
}

export function loadInterviewSession(): StoredInterviewSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearInterviewSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
