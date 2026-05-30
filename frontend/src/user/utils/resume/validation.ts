// ──────────────────────────────────────────────────────────────
// validation.ts — 이력서 파일 검증
// constitution.md: 반드시 이 함수를 통과해야만 API 요청 허용
// ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

// 확장자 위장 파일 차단용 MIME 타입 허용 목록
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export type FileValidationErrorCode =
  | 'FILE_SIZE_EXCEEDED'
  | 'INVALID_FILE_TYPE'
  | 'INVALID_MIME_TYPE';

export interface FileValidationResult {
  valid: boolean;
  errorCode?: FileValidationErrorCode;
  message?: string;
}

/**
 * 이력서 파일 3단계 검증
 * 1. 용량 (10MB 초과 차단)
 * 2. 확장자 (PDF·DOC·DOCX만 허용)
 * 3. MIME 타입 (확장자 위장 파일 차단)
 */
export function validateResumeFile(file: File): FileValidationResult {
  // 1. 용량 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      errorCode: 'FILE_SIZE_EXCEEDED',
      message: `파일 크기가 10MB를 초과합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  // 2. 확장자 검증
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      errorCode: 'INVALID_FILE_TYPE',
      message: `'${file.name}' 파일은 업로드할 수 없습니다. PDF, DOC, DOCX 형식만 허용됩니다.`,
    };
  }

  // 3. MIME 타입 검증 (확장자 위장 방지)
  // file.type이 빈 문자열인 경우(일부 구형 브라우저)는 통과 허용
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      errorCode: 'INVALID_MIME_TYPE',
      message: '파일 형식이 올바르지 않습니다. PDF, DOC, DOCX 형식만 허용됩니다.',
    };
  }

  return { valid: true };
}
