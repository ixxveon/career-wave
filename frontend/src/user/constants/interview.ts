/**
 * AI 면접 도메인 공통 상수
 * 매직 넘버를 한 곳에서 관리 — 변경 시 이 파일만 수정
 */

// ── 타이머 ─────────────────────────────────────────────────────
/** 문항당 최대 답변 시간 (spec FR-004) */
export const ANSWER_LIMIT_SEC = 150;

/** 타이머 임박 기준 (이하일 때 시각적 강조) */
export const ANSWER_URGENT_SEC = 30;

// ── 음성 녹음 ──────────────────────────────────────────────────
/** 음성 청크 전송 주기 ms (spec FR-003) */
export const CHUNK_INTERVAL_MS = 5_000;

// ── WebSocket ─────────────────────────────────────────────────
/** Spring / FastAPI WS 최대 재연결 시도 횟수 */
export const MAX_RECONNECT_ATTEMPTS = 5;

/** Pre-flight WebSocket ping 타임아웃 ms */
export const WS_PING_TIMEOUT_MS = 5_000;

// ── LLM ───────────────────────────────────────────────────────
/** LLM 첫 토큰 대기 제한 시간 ms — 초과 시 폴백 질문 삽입 (spec FR-005) */
export const LLM_STREAM_TIMEOUT_MS = 8_000;

// ── 리포트 ────────────────────────────────────────────────────
/** 개선 추천 임계값 — 이 점수 미만 지표는 개선 항목으로 표시 */
export const IMPROVEMENT_THRESHOLD = 85;

/** 서버 설정 최대 질문 수 (추후 API 응답값으로 대체 예정) */
export const MAX_QUESTION_COUNT = 5;
