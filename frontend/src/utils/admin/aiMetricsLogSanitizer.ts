const REDACTED_LOG_MESSAGE = '[민감정보 보호] 운영 로그 메시지가 요약 처리되었습니다.';

const PII_PATTERNS = [
  /(prompt|프롬프트|개인정보|주민등록|전화번호|이메일|email|면접 답변|answer|resume|이력서|자기소개서)/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d{1,3}[-.\s]?)?(?:0\d{1,2}[-.\s]?)?\d{3,4}[-.\s]?\d{4}/,
  /\b\d{6}[-\s]?[1-4]\d{6}\b/,
  /\b(?:\d[ -]?){13,19}\b/,
];

function looksLikeResumeBlock(message: string) {
  const normalized = message.trim();
  if (normalized.length < 180) return false;

  const lineCount = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const profileWordCount = (normalized.match(/(경력|학력|프로젝트|자격증|포트폴리오|지원동기|성장과정|experience|education|project|portfolio)/gi) ?? []).length;

  return lineCount >= 3 || profileWordCount >= 2;
}

export function sanitizeLogMessage(message: string) {
  if (PII_PATTERNS.some((pattern) => pattern.test(message)) || looksLikeResumeBlock(message)) {
    return REDACTED_LOG_MESSAGE;
  }
  return message;
}
