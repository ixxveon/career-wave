/* ── 서류 분석 공통 타입 ─────────────────────────────────────── */

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

export interface Evaluation {
  totalScore: number;
  jobFitnessScore: number;
  techStackScore: number;
  quantifiedScore: number;
  logicalScore: number;
  overallReview: string;
}

export interface DocumentResult {
  documentId: string | number;
  evaluation: Evaluation;
  feedbackDetails: FeedbackDetail[];
}

export interface CoverLetterItem {
  question: string;
  answer: string;
}

export interface AnalyzeCoverLetterParams {
  title: string;
  jobCategory: string;
  items: CoverLetterItem[];
}

export interface AnalyzeResumeParams {
  file: File;
  targetCompany: string;
  jobCategory: string;
}
