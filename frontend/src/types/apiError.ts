/**
 * 프로젝트 전체 API 에러의 공통 shape.
 * - user 도메인: MemberApiError (errorMapping.ts) 가 이 인터페이스를 구현한다.
 * - admin 도메인: axios interceptor가 401/기타 에러를 이 shape로 정규화한다.
 */
export interface ApiError {
  /** HTTP 상태 코드 (네트워크 단절 시 0) */
  status: number;
  /** 사용자에게 노출 가능한 메시지 */
  message: string;
  /** 백엔드가 내려주는 도메인 에러 코드 (선택) */
  serverCode?: string;
}
