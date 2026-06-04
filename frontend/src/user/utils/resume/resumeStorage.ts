// ──────────────────────────────────────────────────────────────
// resumeStorage.ts — 서류 코칭 sessionStorage 헬퍼
//
// constitution.md 불변 규칙:
// - localStorage 사용 금지 (탭 종료 시 자동 만료 의도)
// - try-catch로 직렬화/역직렬화 예외 처리 (Private 모드 등 접근 불가 케이스 대응)
//
// fileType 별 키 분리:
// - RESUME / COVER_LETTER가 동일 키를 공유하면 페이지 간 이동 시 WS 경합 발생
// - 키에 fileType을 포함시켜 독립된 세션을 보장한다
// ──────────────────────────────────────────────────────────────

import type { FileType } from '../../types/resume.d';

const keys = (fileType: FileType) => ({
  DOCUMENT_ID: `resume:documentId:${fileType}`,
  UI_STATE:    `resume:uiState:${fileType}`,
});

/** documentId 저장 */
const saveDocumentId = (fileType: FileType, documentId: string): void => {
  try { sessionStorage.setItem(keys(fileType).DOCUMENT_ID, documentId); } catch { /* 무시 */ }
};

/** documentId 조회 */
const getDocumentId = (fileType: FileType): string | null => {
  try { return sessionStorage.getItem(keys(fileType).DOCUMENT_ID); } catch { return null; }
};

/** documentId 삭제 */
const removeDocumentId = (fileType: FileType): void => {
  try { sessionStorage.removeItem(keys(fileType).DOCUMENT_ID); } catch { /* 무시 */ }
};

/** UI 상태 저장 */
const saveUIState = (fileType: FileType, state: string): void => {
  try { sessionStorage.setItem(keys(fileType).UI_STATE, state); } catch { /* 무시 */ }
};

/** UI 상태 조회 */
const getUIState = (fileType: FileType): string | null => {
  try { return sessionStorage.getItem(keys(fileType).UI_STATE); } catch { return null; }
};

/** UI 상태 삭제 */
const removeUIState = (fileType: FileType): void => {
  try { sessionStorage.removeItem(keys(fileType).UI_STATE); } catch { /* 무시 */ }
};

/** 해당 fileType 세션 전체 초기화 */
const clear = (fileType: FileType): void => {
  try {
    const k = keys(fileType);
    sessionStorage.removeItem(k.DOCUMENT_ID);
    sessionStorage.removeItem(k.UI_STATE);
  } catch { /* 무시 */ }
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
