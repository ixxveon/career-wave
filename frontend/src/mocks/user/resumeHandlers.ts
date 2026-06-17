import { http, HttpResponse, ws } from 'msw';
import type { ApiResponse } from '../../types/user/resume';
import {
  MOCK_UPLOAD_RESPONSE,
  MOCK_COVER_LETTER_RESPONSE,
  MOCK_ANALYSIS_RESULT,
  MOCK_HISTORY_ALL,
} from './resumeData';

const BASE = '/api/v1/user/resume';

// ── STOMP 프레임 유틸 ─────────────────────────────────────────────
function buildStompFrame(command: string, headers: Record<string, string>, body = ''): string {
  const headerStr = Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n');
  return `${command}\n${headerStr}\n\n${body}\0`;
}

function parseStompCommand(raw: string): string {
  return raw.split('\n')[0];
}

function parseStompHeader(raw: string, name: string): string | undefined {
  const match = raw.match(new RegExp(`^${name}:(.+)$`, 'm'));
  return match?.[1]?.trim();
}

// ── STOMP WebSocket 핸들러 (/ws/user/resume) ──────────────────────
const wsAnalysis = ws.link('*/ws/user/resume');

const wsHandler = wsAnalysis.addEventListener('connection', ({ client }) => {
  let simulationTimer: ReturnType<typeof setInterval> | null = null;

  client.addEventListener('message', (event) => {
    const raw = typeof event.data === 'string' ? event.data : '';
    const command = parseStompCommand(raw);

    if (command === 'CONNECT') {
      client.send(buildStompFrame('CONNECTED', {
        'version': '1.2',
        'heart-beat': '0,0',
        'server': 'MSW-STOMP-Mock',
      }));
    }

    if (command === 'SUBSCRIBE') {
      const destination = parseStompHeader(raw, 'destination') ?? '';
      const subscriptionId = parseStompHeader(raw, 'id') ?? 'sub-0';

      // /topic/resume/{documentId}/status 구독 시 분석 시뮬레이션 시작
      const topicMatch = destination.match(/^\/topic\/resume\/([^/]+)\/status$/);
      if (topicMatch) {
        simulationTimer = startAnalysisSimulation(client, destination, subscriptionId);
      }

      // /user/queue/resume/{documentId}/status 구독 시 현재 상태 Snapshot 1회 전송
      const queueMatch = destination.match(/^\/user\/queue\/resume\/([^/]+)\/status$/);
      if (queueMatch) {
        const snap = { status: 'ANALYZING', message: '분석 진행 중', progress: 20, errorMessage: null };
        client.send(buildStompFrame('MESSAGE', {
          'subscription': subscriptionId,
          'message-id': `snap-${Date.now()}`,
          'destination': destination,
          'content-type': 'application/json',
        }, JSON.stringify(snap)));
      }
    }

    if (command === 'DISCONNECT') {
      if (simulationTimer) clearInterval(simulationTimer);
    }
  });

  client.addEventListener('close', () => {
    if (simulationTimer) clearInterval(simulationTimer);
  });
});

function startAnalysisSimulation(
  client: Parameters<Parameters<typeof wsAnalysis.addEventListener>[1]>[0]['client'],
  destination: string,
  subscriptionId: string,
): ReturnType<typeof setInterval> {
  const steps = [
    { status: 'ANALYZING', message: '파일을 읽고 있어요',      progress: 10,  errorMessage: null },
    { status: 'ANALYZING', message: '키워드를 추출하고 있어요',  progress: 40,  errorMessage: null },
    { status: 'ANALYZING', message: '피드백을 생성하고 있어요',  progress: 70,  errorMessage: null },
    { status: 'COMPLETED', message: '분석이 완료되었어요',       progress: 100, errorMessage: null },
  ];

  let i = 0;
  const timer = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(timer);
      return;
    }
    client.send(buildStompFrame('MESSAGE', {
      'subscription': subscriptionId,
      'message-id': `msg-${Date.now()}`,
      'destination': destination,
      'content-type': 'application/json',
    }, JSON.stringify(steps[i])));

    if (steps[i].status === 'COMPLETED') clearInterval(timer);
    i++;
  }, 1500);

  return timer;
}

// ── REST 핸들러 ───────────────────────────────────────────────────
export const resumeHandlers = [
  wsHandler,

  // POST /api/v1/user/resume/upload
  http.post(`${BASE}/upload`, async () => {
    await delay(800);
    return HttpResponse.json<ApiResponse<typeof MOCK_UPLOAD_RESPONSE>>({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: MOCK_UPLOAD_RESPONSE,
    });
  }),

  // POST /api/v1/user/resume/cover-letter
  http.post(`${BASE}/cover-letter`, async () => {
    await delay(600);
    return HttpResponse.json<ApiResponse<typeof MOCK_COVER_LETTER_RESPONSE>>({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: MOCK_COVER_LETTER_RESPONSE,
    });
  }),

  // GET /api/v1/user/resume/history — 반드시 /:documentId/feedback 보다 앞에 등록
  http.get(`${BASE}/history`, async ({ request }) => {
    await delay(400);
    const url      = new URL(request.url);
    const page     = Number(url.searchParams.get('page')     ?? 0);
    const size     = Number(url.searchParams.get('size')     ?? 5);
    const fileType = url.searchParams.get('fileType') ?? null;

    const filtered = fileType
      ? MOCK_HISTORY_ALL.filter(item => item.fileType === fileType)
      : MOCK_HISTORY_ALL;

    const start   = page * size;
    const content = filtered.slice(start, start + size);

    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: {
        content,
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      },
    });
  }),

  // GET /api/v1/user/resume/:documentId/feedback
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
