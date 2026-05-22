import { createBrowserRouter } from 'react-router-dom';
import CompanyListPage from '../admin/pages/Company/CompanyListPage';
import JobNoticeListPage from '../admin/pages/JobNotice/JobNoticeListPage';
import SettlementListPage from '../admin/pages/Settlement/SettlementListPage';

export const router = createBrowserRouter([
  // 사용자 플랫폼 라우트
  {
    path: '/',
    element: <div>User Dashboard</div>,
  },

  // 어드민 플랫폼 라우트
  {
    path: '/admin',
    element: <div>Admin Dashboard</div>,
  },
  {
    path: '/admin/companies',
    element: <CompanyListPage />,
  },
  {
    path: '/admin/job-notices',
    element: <JobNoticeListPage />,
  },
  {
    path: '/admin/settlements',
    element: <SettlementListPage />,
  },
]);
