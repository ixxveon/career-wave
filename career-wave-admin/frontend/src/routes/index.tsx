import { createBrowserRouter } from 'react-router-dom';
import CompanyListPage from '../pages/Company/CompanyListPage';
import JobNoticeListPage from '../pages/JobNotice/JobNoticeListPage';
import SettlementListPage from '../pages/Settlement/SettlementListPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <div>Dashboard</div>,
  },
  {
    path: '/companies',
    element: <CompanyListPage />,
  },
  {
    path: '/job-notices',
    element: <JobNoticeListPage />,
  },
  {
    path: '/settlements',
    element: <SettlementListPage />,
  },
]);
