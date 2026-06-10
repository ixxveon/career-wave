import { describe, expect, it } from 'vitest';
import { sanitizeLogMessage } from './aiMetricsLogSanitizer';

const REDACTED_LOG_MESSAGE = '[민감정보 보호] 운영 로그 메시지가 요약 처리되었습니다.';

describe('sanitizeLogMessage', () => {
  it('redacts email addresses', () => {
    expect(sanitizeLogMessage('지원자 contact: applicant@example.com')).toBe(REDACTED_LOG_MESSAGE);
  });

  it('redacts Korean phone numbers', () => {
    expect(sanitizeLogMessage('면접 일정 안내 010-1234-5678')).toBe(REDACTED_LOG_MESSAGE);
  });

  it('redacts resident registration number patterns', () => {
    expect(sanitizeLogMessage('본인 확인 값 900101-1234567')).toBe(REDACTED_LOG_MESSAGE);
  });

  it('redacts long resume-like blocks', () => {
    const resumeLikeMessage = [
      '경력: 프론트엔드 개발 5년, React 기반 관리자 도구 구축 경험 다수',
      '학력: 컴퓨터공학 전공, 데이터 시각화와 접근성 개선 프로젝트 수행',
      '프로젝트: AI 면접 분석, 이력서 자동 요약, 포트폴리오 리뷰 기능 개발',
      '지원동기: 사용자 경험을 개선하고 안정적인 운영 지표를 제공하고자 지원했습니다.',
    ].join('\n');

    expect(sanitizeLogMessage(resumeLikeMessage)).toBe(REDACTED_LOG_MESSAGE);
  });

  it('keeps ordinary operational logs', () => {
    expect(sanitizeLogMessage('AI Metrics budget threshold updated by admin')).toBe('AI Metrics budget threshold updated by admin');
  });
});
