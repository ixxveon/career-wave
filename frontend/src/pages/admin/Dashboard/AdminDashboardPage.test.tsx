/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSession } from '../../../api/admin/adminAuthApi';
import type { AdminDashboardSummary } from '../../../api/admin/dashboardApi';
import { ADMIN_DETAIL_ROLE } from '../../../constants/admin/adminRoleConstants';
import { ADMIN_ROUTE_PATHS } from '../../../constants/admin/adminRouteConstants';
import AdminDashboardPage from './AdminDashboardPage';

const navigateMock = vi.hoisted(() => vi.fn());
const dashboardApiMock = vi.hoisted(() => ({
  getSummary: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../../api/admin/dashboardApi', async () => {
  const actual = await vi.importActual<typeof import('../../../api/admin/dashboardApi')>(
    '../../../api/admin/dashboardApi',
  );

  return {
    ...actual,
    dashboardApi: dashboardApiMock,
  };
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AdminDashboardPage />
    </QueryClientProvider>,
  );
}

function apiResponse(data: AdminDashboardSummary) {
  return {
    data: {
      success: true,
      statusCode: 200,
      message: 'OK',
      data,
    },
  };
}

function createSummary(overrides: Partial<AdminDashboardSummary> = {}): AdminDashboardSummary {
  return {
    baseDateTime: '2026-06-28T09:00:00Z',
    kpis: [
      {
        key: 'TODAY_NEW_ADMINS',
        title: '?ㅻ뒛 ?좉퇋 媛?낆옄',
        value: 7,
        unit: '紐?,
        deltaText: '?좏깮 湲곌컙 湲곗?',
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.admins,
      },
      {
        key: 'REALTIME_ACTIVE_ADMINS',
        title: '?ㅼ떆媛??쒖꽦 愿由ъ옄',
        value: 3,
        unit: '紐?,
        deltaText: '理쒓렐 濡쒓렇??1紐?,
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.admins,
      },
      {
        key: 'AI_INTERVIEW_SESSIONS',
        title: 'AI ?명꽣酉??몄뀡',
        value: 12,
        unit: '嫄?,
        deltaText: '?좏깮 湲곌컙 湲곗?',
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.ai,
      },
      {
        key: 'TODAY_REVENUE',
        title: '?ㅻ뒛 留ㅼ텧',
        value: 29000,
        unit: '??,
        deltaText: '移대뱶 寃곗젣 湲곗?',
        severity: 'NORMAL',
        targetPath: ADMIN_ROUTE_PATHS.payments,
      },
    ],
    alerts: [
      {
        id: 1,
        level: 'WARNING',
        domain: 'AUDIT_LOG',
        title: '媛먯궗 濡쒓렇 寃쎄퀬',
        message: '沅뚰븳 蹂寃?寃쎄퀬',
        targetPath: ADMIN_ROUTE_PATHS.log,
        createdAt: '2026-06-28T08:55:00Z',
      },
      {
        id: 2,
        level: 'URGENT',
        domain: 'SCRAPING',
        title: '?ㅽ겕?섑븨 ?ㅽ뙣',
        message: '?먰떚???ㅽ겕?섑븨 ?ㅽ뙣',
        targetPath: ADMIN_ROUTE_PATHS.scraping,
        createdAt: '2026-06-28T08:58:00Z',
      },
    ],
    weeklySignups: [
      { label: '06/22', count: 2 },
      { label: '06/23', count: 5 },
    ],
    paymentRatio: [
      { method: 'CARD', label: 'Toss Payments', ratio: 100 },
    ],
    serviceCards: [
      {
        key: 'ADMIN',
        title: '愿由ъ옄 愿由?,
        description: '愿由ъ옄 怨꾩젙怨?沅뚰븳??愿由ы빀?덈떎.',
        summaryText: '?좉퇋 7紐?,
        targetPath: ADMIN_ROUTE_PATHS.admins,
      },
      {
        key: 'SCRAPING',
        title: '?ㅽ겕?섑븨 愿由?,
        description: '梨꾩슜 怨듦퀬 ?섏쭛 ?뚯씠?꾨씪???곹깭瑜??뺤씤?⑸땲??',
        summaryText: '?ㅽ뻾以?1媛?,
        targetPath: ADMIN_ROUTE_PATHS.scraping,
      },
      {
        key: 'AUDIT_LOG',
        title: '媛먯궗 濡쒓렇',
        description: '愿由ъ옄 ?쒕룞怨??쒖뒪??蹂寃??대젰???뺤씤?⑸땲??',
        summaryText: '?뚮┝ 2嫄?,
        targetPath: ADMIN_ROUTE_PATHS.log,
      },
    ],
    systemStatus: [
      {
        key: 'SCRAPING_PIPELINE',
        label: '?ㅽ겕?섑븨 ?뚯씠?꾨씪??,
        status: 'WARNING',
        valueText: '?ㅽ뻾以?1媛?/ ?ㅽ뙣 0媛?,
      },
    ],
    recentActivities: [
      {
        id: 100,
        occurredAt: '2026-06-28T08:50:00Z',
        adminId: 'master',
        message: '愿由ъ옄 ?쒕룞 - 沅뚰븳 蹂寃?,
        targetPath: ADMIN_ROUTE_PATHS.log,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  adminSession.setRole(ADMIN_DETAIL_ROLE.MASTER);
  dashboardApiMock.getSummary.mockResolvedValue(apiResponse(createSummary()));
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('AdminDashboardPage contract rendering', () => {
  it('renders dashboard summary using backend KPI keys, target paths, and domain values', async () => {
    renderPage();

    expect(await screen.findByText('?ㅻ뒛 ?좉퇋 媛?낆옄')).toBeTruthy();
    expect(screen.getByText('7紐?)).toBeTruthy();
    expect(screen.getByText('?ㅼ떆媛??쒖꽦 愿由ъ옄')).toBeTruthy();
    expect(screen.getByText('AI ?명꽣酉??몄뀡')).toBeTruthy();
    expect(screen.getByText('29,000??)).toBeTruthy();
    expect(screen.getByText('沅뚰븳 蹂寃?寃쎄퀬')).toBeTruthy();
    expect(screen.getByText('?먰떚???ㅽ겕?섑븨 ?ㅽ뙣')).toBeTruthy();
    expect(screen.getByText('Toss Payments')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getAllByText('Toss Payments 100%')).toHaveLength(2);
    expect(screen.getByText('愿由ъ옄 ?쒕룞 - 沅뚰븳 蹂寃?)).toBeTruthy();
  });

  it('renders the recent activity all alerts button when the destination page is accessible', async () => {
    renderPage();

    expect(await screen.findByText('沅뚰븳 蹂寃?寃쎄퀬')).toBeTruthy();
    expect(screen.getByRole('button', { name: '?꾩껜 蹂닿린' }).hasAttribute('disabled')).toBe(false);
  });

  it('navigates through valid alert, service card, and recent activity target paths', async () => {
    const { container } = renderPage();

    expect(await screen.findByText('沅뚰븳 蹂寃?寃쎄퀬')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '?곸꽭 蹂닿린' })[0]);
    expect(navigateMock).toHaveBeenCalledWith(ADMIN_ROUTE_PATHS.log);

    const scrapingCard = screen.getByText('?ㅽ겕?섑븨 愿由?).closest('.adminCard');
    const scrapingButton = scrapingCard?.querySelector('button');
    expect(scrapingButton).toBeTruthy();
    fireEvent.click(scrapingButton as HTMLButtonElement);
    expect(navigateMock).toHaveBeenCalledWith(ADMIN_ROUTE_PATHS.scraping);

    const activityRow = container.querySelector('.logRow');
    expect(activityRow).toBeTruthy();
    fireEvent.click(activityRow as HTMLElement);
    expect(navigateMock).toHaveBeenCalledWith(ADMIN_ROUTE_PATHS.log);
  });

  it('filters restricted alert and service card domains for CS admins', async () => {
    adminSession.setRole(ADMIN_DETAIL_ROLE.CS);

    renderPage();

    expect(await screen.findByText('?ㅻ뒛 ?좉퇋 媛?낆옄')).toBeTruthy();
    expect(screen.queryByText('沅뚰븳 蹂寃?寃쎄퀬')).toBeNull();
    expect(screen.queryByText('?먰떚???ㅽ겕?섑븨 ?ㅽ뙣')).toBeNull();
    expect(screen.queryByText('?ㅽ겕?섑븨 愿由?)).toBeNull();
    expect(screen.queryByText('媛먯궗 濡쒓렇')).toBeNull();
    expect(screen.getByText('?꾩옱 泥섎━??二쇱슂 ?뚮┝???놁뒿?덈떎.')).toBeTruthy();
  });

  it('renders complete empty state when every dashboard section is empty', async () => {
    dashboardApiMock.getSummary.mockResolvedValueOnce(apiResponse(createSummary({
      kpis: [],
      alerts: [],
      weeklySignups: [],
      paymentRatio: [],
      serviceCards: [],
      systemStatus: [],
      recentActivities: [],
    })));

    renderPage();

    expect(await screen.findByText('?쒖떆????쒕낫???곗씠?곌? ?놁뒿?덈떎.')).toBeTruthy();
  });

  it('renders error state and retries the summary request', async () => {
    dashboardApiMock.getSummary
      .mockRejectedValueOnce(new Error('dashboard failed'))
      .mockResolvedValueOnce(apiResponse(createSummary()));

    renderPage();

    expect(await screen.findByText('??쒕낫???곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '?ㅼ떆 ?쒕룄' }));

    await waitFor(() => expect(dashboardApiMock.getSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('?ㅻ뒛 ?좉퇋 媛?낆옄')).toBeTruthy();
  });
});
