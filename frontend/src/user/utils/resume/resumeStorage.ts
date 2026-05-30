// ──────────────────────────────────────────────────────────────
// resumeStorage.ts — 서류 코칭 sessionStorage 헬퍼
//
// constitution.md 불변 규칙:
// - localStorage 사용 금지 (탭 종료 시 자동 만료 의도)
// - try-catch로 직렬화/역직렬화 예외 처리 (Private 모드 등 접근 불가 케이스 대응)
// ──────────────────────────────────────────────────────────────

const KEYS = {
  DOCUMENT_ID: 'resume:documentId',
  UI_STATE: 'resume:uiState',
} as const;

/** documentId 저장 */
const saveDocumentId = (documentId: string): void => {
  try {
    sessionStorage.setItem(KEYS.DOCUMENT_ID, documentId);
  } catch {
    // sessionStorage 접근 불가 시 무시 (Private 모드 등)
  }
};

/** documentId 조회 */
const getDocumentId = (): string | null => {
  try {
    return sessionStorage.getItem(KEYS.DOCUMENT_ID);
  } catch {
    return null;
  }
};

/** documentId 삭제 */
const removeDocumentId = (): void => {
  try {
    sessionStorage.removeItem(KEYS.DOCUMENT_ID);
  } catch {
    // 무시
  }
};

// ── UI 상태 (새로고침 시 ANALYZING 복원용) ───────────────────

/** UI 상태 저장 */
const saveUIState = (state: string): void => {
  try {
    sessionStorage.setItem(KEYS.UI_STATE, state);
  } catch {
    // 무시
  }
};

/** UI 상태 조회 */
const getUIState = (): string | null => {
  try {
    return sessionStorage.getItem(KEYS.UI_STATE);
  } catch {
    return null;
  }
};

/** UI 상태 삭제 */
const removeUIState = (): void => {
  try {
    sessionStorage.removeItem(KEYS.UI_STATE);
  } catch {
    // 무시
  }
};

/** 세션 전체 초기화 (분석 취소 또는 완료 후 재시도 시) */
const clear = (): void => {
  try {
    Object.values(KEYS).forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // 무시
  }
};

export const resumeStorage = {
  saveDocumentId,
  getDocumentId,
  removeDocumentId,
  saveUIState,
  getUIState,
  removeUIState,
  clear,
};
