import { http, HttpResponse, ws } from 'msw';
import type { ApiResponse } from '../../user/types/resume.d';
import {
  MOCK_DOCUMENT_ID,
  MOCK_UPLOAD_RESPONSE,
  MOCK_COVER_LETTER_RESPONSE,
  MOCK_ANALYSIS_RESULT,
  MOCK_HISTORY_RESPONSE,
} from './data';

const BASE = '/api/v1/resume';

// WebSocket 핸들러 — 분석 상태 단계별 메시지 시뮬레이션
const wsAnalysis = ws.link(`*/ws/resume/${MOCK_DOCUMENT_ID}/status`);

const wsHandler = wsAnalysis.addEventListener('connection', ({ client }) => {
  const steps = [
    { status: 'ANALYZING', message: '파일을 읽고 있어요',     progress: 10 },
    { status: 'ANALYZING', message: '키워드를 추출하고 있어요', progress: 40 },
    { status: 'ANALYZING', message: '피드백을 생성하고 있어요', progress: 70 },
    { status: 'COMPLETED', message: '분석이 완료되었어요',     progress: 100 },
  ];

  let i = 0;
  const timer = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(timer);
      return;
    }
    client.send(JSON.stringify(steps[i]));
    if (steps[i].status === 'COMPLETED') clearInterval(timer);
    i++;
  }, 1500);

  client.addEventListener('close', () => clearInterval(timer));
});

// REST 핸들러
export const resumeHandlers = [
  wsHandler,

  // POST /api/v1/resume/upload
  http.post(`${BASE}/upload`, async () => {
    await delay(800);
    return HttpResponse.json<ApiResponse<typeof MOCK_UPLOAD_RESPONSE>>({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: MOCK_UPLOAD_RESPONSE,
    });
  }),

  // POST /api/v1/resume/cover-letter
  http.post(`${BASE}/cover-letter`, async () => {
    await delay(600);
    return HttpResponse.json<ApiResponse<typeof MOCK_COVER_LETTER_RESPONSE>>({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: MOCK_COVER_LETTER_RESPONSE,
    });
  }),

  // GET /api/v1/resume/history — 반드시 /:documentId/feedback 보다 앞에 등록
  http.get(`${BASE}/history`, async () => {
    await delay(400);
    return HttpResponse.json<ApiResponse<typeof MOCK_HISTORY_RESPONSE>>({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: MOCK_HISTORY_RESPONSE,
    });
  }),

  // GET /api/v1/resume/:documentId/feedback
  http.get(`${BASE}/:documentId/feedback`, async () => {
    await delay(400);
    return HttpResponse.json<ApiResponse<typeof MOCK_ANALYSIS_RESULT>>({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: MOCK_ANALYSIS_RESULT,
    });
  }),
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
