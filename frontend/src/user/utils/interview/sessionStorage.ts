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

export function saveInterviewSession(data: StoredInterviewSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function loadInterviewSession(): StoredInterviewSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredInterviewSession) : null;
  } catch {
    return null;
  }
}

export function clearInterviewSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
