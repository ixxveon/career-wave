// ──────────────────────────────────────────────────────────────
// resume.d.ts — 서류 코칭 도메인 타입 정의
// api-schema.md 계약 기준으로 작성
// ──────────────────────────────────────────────────────────────

// ── 공통 ──────────────────────────────────────────────────────

/** 백엔드 ApiResponse<T> 래퍼 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

/** 백엔드 문서 status 값 (DB/API 응답) */
export type BackendDocumentStatus =
  | 'UPLOADED'
  | 'PENDING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED';

/** WebSocket 서버 → 클라이언트 status 값 */
export type WsAnalysisStatus = 'ANALYZING' | 'COMPLETED' | 'FAILED';

/** 프론트엔드 UI 상태 머신 */
export type ResumeUIState = 'IDLE' | 'SUBMITTING' | 'ANALYZING' | 'SUCCESS' | 'ERROR';

/** 파일 유형 */
export type FileType = 'RESUME' | 'COVER_LETTER';

// ── 백엔드 status → 프론트 상태 매핑 (constitution.md §2) ─────
// UPLOADED        → SUBMITTING → ANALYZING (WebSocket 연결 시작)
// PENDING         → ANALYZING (큐 대기 중)
// ANALYZING (WS)  → ANALYZING
// COMPLETED (WS)  → SUCCESS
// FAILED (WS)     → ERROR

// ── 1. 이력서 업로드 ──────────────────────────────────────────

/** POST /api/v1/resume/upload — Response data */
export interface UploadResumeResponse {
  documentId: string;
  status: BackendDocumentStatus;
  fileUrl: string;
  originalName: string;
  fileType: 'RESUME';
  createdAt: string;
}

// ── 2. 자기소개서 제출 ────────────────────────────────────────

/** 자기소개서 문항/답변 */
export interface CoverLetterItem {
  order: number;
  question: string;
  answer: string;
}

/** POST /api/v1/resume/cover-letter — Request body */
export interface SubmitCoverLetterRequest {
  company: string;
  job: string;
  content: CoverLetterItem[];
}

/** POST /api/v1/resume/cover-letter — Response data */
export interface SubmitCoverLetterResponse {
  documentId: string;
  status: BackendDocumentStatus;
  fileType: 'COVER_LETTER';
  createdAt: string;
}

// ── 3. 분석 결과 조회 ─────────────────────────────────────────

/** 역량 5개 항목 점수 (api-schema.md §3) */
export interface ScoreBreakdown {
  jobFitness: number;
  techStack: number;
  quantifiedAchievement: number;
  logicalStructure: number;
  total: number;
}

/** STAR 기법 항목별 분석 */
export interface StarItem {
  ok: boolean;
  comment: string;
}
export interface StarAnalysis {
  s: StarItem;
  t: StarItem;
  a: StarItem;
  r: StarItem;
}

/** 수치화·정량화 체크 */
export interface QuantItem {
  ok: boolean;
  comment: string;
}
export interface QuantAnalysis {
  numbers: QuantItem;
  timeframe: QuantItem;
  scale: QuantItem;
  impact: QuantItem;
}

/** 항목별 첨삭 가이드라인 */
export interface FeedbackDetail {
  sectionNumber: number;
  question: string;
  originalText: string;
  goodPoint: string;
  badPoint: string;
  improvedText: string;
  starAnalysis?: StarAnalysis;
  quantAnalysis?: QuantAnalysis;
}

/** GET /api/v1/resume/{documentId}/feedback — Response data */
export interface AnalysisResultResponse {
  documentId: string;
  status: BackendDocumentStatus;
  scores: ScoreBreakdown | null;
  overallReview: string;
  feedbackDetails: FeedbackDetail[];
  errorMessage: string | null;
  createdAt: string;
}

// ── 4. 분석 이력 목록 조회 ────────────────────────────────────

/** 이력 목록 단일 아이템 */
export interface ResumeHistoryItem {
  documentId: string;
  fileType: FileType;
  originalName: string | null;
  company: string | null;
  job: string | null;
  totalScore: number | null;
  createdAt: string;
}

/** GET /api/v1/resume/history — Query params */
export interface ResumeHistoryParams {
  page?: number;
  size?: number;
}

/** GET /api/v1/resume/history — Response data */
export interface ResumeHistoryResponse {
  content: ResumeHistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ── 5. WebSocket 메시지 ───────────────────────────────────────

/** WS /ws/resume/{documentId}/status — Server → Client 메시지 */
export interface WsStatusMessage {
  status: WsAnalysisStatus;
  message: string;
  progress: number;
}
