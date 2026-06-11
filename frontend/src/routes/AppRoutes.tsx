import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from '../components/user/layout/MainLayout';
import ProtectedRoute from '../components/user/common/ProtectedRoute';
import ScrappedJobPage from '../pages/user/mypage/ScrappedJobPage';

// ── 사용자 플랫폼 ──────────────────────────────────────────────
import JobSeekerDashboardPage from '../pages/user/dashboard/JobSeekerDashboardPage';
import CompanyDashboardPage from '../pages/user/dashboard/CompanyDashboardPage';
import UserMyPage from '../pages/user/mypage/UserMyPage';
import SubscriptionPage from '../pages/user/mypage/SubscriptionPage';
import PaymentHistoryPage from '../pages/user/mypage/PaymentHistoryPage';

import LoginPage from '../pages/user/auth/LoginPage';
import FindAccountPage from '../pages/user/auth/FindAccountPage';
import RegisterPage from '../pages/user/auth/RegisterPage';
import RegisterVerifyPage from '../pages/user/auth/RegisterVerifyPage';
import FindIdPage from '../pages/user/auth/FindIdPage';
import FindPasswordPage from '../pages/user/auth/FindPasswordPage';
import ProfilePage from '../pages/user/auth/ProfilePage';

import CompanyProfilePage from '../pages/user/company/CompanyProfilePage';
import HrManagerPage from '../pages/user/company/HrManagerPage';

import JobNoticeListPage from '../pages/user/jobNotice/JobNoticeListPage';

import ApplicationStatusPage from '../pages/user/application/ApplicationStatusPage';
import ApplicantManagementPage from '../pages/user/application/ApplicantManagementPage';
import ApplicantDetailPage from '../pages/user/application/ApplicantDetailPage';
import ApplyPage from '../pages/user/application/ApplyPage';

import ResumeAnalysisPage from '../pages/user/resume/ResumeAnalysisPage';
import CoverLetterAnalysisPage from '../pages/user/resume/CoverLetterAnalysisPage';
import DocumentReportPage from '../pages/user/resume/DocumentReportPage';
import ResumeHistoryPage from '../pages/user/resume/ResumeHistoryPage';

import InterviewHomePage from '../pages/user/interview/InterviewHomePage';
import TextInterviewPage from '../pages/user/interview/TextInterviewPage';
import MediaInterviewPage from '../pages/user/interview/MediaInterviewPage';
import InterviewReportPage from '../pages/user/interview/InterviewReportPage';

import DiagnosisHistoryPage from '../pages/user/careerDiagnosis/DiagnosisHistoryPage';
import DiagnosisDetailPage from '../pages/user/careerDiagnosis/DiagnosisDetailPage';
import LearningRoadmapPage from '../pages/user/careerDiagnosis/LearningRoadmapPage';
import ComprehensiveReportPage from '../pages/user/careerDiagnosis/ComprehensiveReportPage';

import CommunityPage from '../pages/user/community/CommunityPage';
import PostDetailPage from '../pages/user/community/PostDetailPage';
import PostCreatePage from '../pages/user/community/PostCreatePage';
import MentorPage from '../pages/user/community/MentorPage';

// [non-MVP] import PricingPage from '../pages/user/billing/PricingPage';
import PaymentPage from '../pages/user/billing/PaymentPage';
// [non-MVP] import CompanyProductPage from '../pages/user/billing/CompanyProductPage';
import CheckoutPage from '../pages/user/billing/CheckoutPage';
import PaymentSuccessPage from '../pages/user/billing/PaymentSuccessPage';
import PaymentFailPage from '../pages/user/billing/PaymentFailPage';

import SupportPage from '../pages/user/support/SupportPage';
import NoticePage from '../pages/user/support/NoticePage';
import NoticeDetailPage from '../pages/user/support/NoticeDetailPage';
import FaqPage from '../pages/user/support/FaqPage';
import InquiryListPage from '../pages/user/support/InquiryListPage';
import InquiryCreatePage from '../pages/user/support/InquiryCreatePage';

import NotFoundPage from '../pages/user/common/NotFoundPage';

// ── 어드민 플랫폼 ──────────────────────────────────────────────
import AdminLayout from '../layouts/admin/AdminLayout';
import AdminLoginPage from '../pages/admin/AdminLogin/AdminLoginPage';
import AdminDashboardPage from '../pages/admin/Dashboard/AdminDashboardPage';
import AdminManagementPage from '../pages/admin/AdminManagement/AdminManagementPage';
import UserManagementPage from '../pages/admin/UserManagement/UserManagementPage';
import ReportPage from '../pages/admin/Report/ReportPage';
import CustomerServicePage from '../pages/admin/CustomerService/CustomerServicePage';
import AdminPaymentPage from '../pages/admin/Payment/PaymentPage';
import StatisticsPage from '../pages/admin/Statistics/StatisticsPage';
import AiMetricsPage from '../pages/admin/AiMetrics/AiMetricsPage';
import ScrapingPage from '../pages/admin/Scraping/ScrapingPage';
import AuditLogPage from '../pages/admin/AuditLog/AuditLogPage';
import AdminCompanyListPage from '../pages/admin/Company/CompanyListPage';
import AdminSettlementListPage from '../pages/admin/Settlement/SettlementListPage';
import { adminSession } from '../api/admin/adminSession';
import { ADMIN_ROUTE_PATHS, hasAdminRouteAccess, isAdminNavigationPath } from '../constants/admin/adminRouteConstants';

function AdminProtectedRoute() {
  const { pathname } = useLocation();
  const token = adminSession.getToken();
  const role = adminSession.getRole();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // 현재 경로에 매핑되는 가장 구체적인 admin route를 찾아 role 접근 권한 확인
  const matchedRoute = Object.values(ADMIN_ROUTE_PATHS)
    .filter(p => p !== ADMIN_ROUTE_PATHS.login)
    .sort((a, b) => b.length - a.length)
    .find(p => pathname === p || pathname.startsWith(`${p}/`));

  if (matchedRoute && isAdminNavigationPath(matchedRoute) && !hasAdminRouteAccess(role, matchedRoute)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 사용자 플랫폼 */}
      <Route element={<MainLayout />}>

        {/* 공개 라우트 — 인증 불필요 */}
        <Route index element={<JobSeekerDashboardPage />} />

        <Route path="auth">
          <Route index element={<Navigate to="/auth/login" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="find-account" element={<FindAccountPage />} />
          <Route path="find-id/:roleType" element={<FindIdPage />} />
          <Route path="find-password/:roleType" element={<FindPasswordPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="register/verify" element={<RegisterVerifyPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="jobs">
          <Route index element={<JobNoticeListPage />} />
        </Route>

        <Route path="community">
          <Route index element={<CommunityPage />} />
          <Route path="posts/create" element={<PostCreatePage />} />
          <Route path="posts/:postId" element={<PostDetailPage />} />
          <Route path="mentor" element={<MentorPage />} />
        </Route>

        <Route path="support" element={<SupportPage />}>
          <Route path="notices" element={<NoticePage />} />
          <Route path="notices/:id" element={<NoticeDetailPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="inquiry" element={<InquiryListPage />} />
            <Route path="inquiry/create" element={<InquiryCreatePage />} />
          </Route>
        </Route>

        {/* 인증 필요 라우트 — 미로그인 시 /auth/login?next=... 리다이렉트 */}
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard/company" element={<CompanyDashboardPage />} />

          <Route path="mypage" element={<UserMyPage />} />
          <Route path="mypage/favorites" element={<ScrappedJobPage />} />
          <Route path="mypage/subscription" element={<SubscriptionPage />} />
          <Route path="mypage/payment-history" element={<PaymentHistoryPage />} />

          <Route path="company">
            <Route index element={<Navigate to="/company/profile" replace />} />
            <Route path="profile" element={<CompanyProfilePage />} />
            <Route path="hr-managers" element={<HrManagerPage />} />
          </Route>

          <Route path="applications">
            <Route index element={<Navigate to="/applications/status" replace />} />
            <Route path="status" element={<ApplicationStatusPage />} />
            <Route path="applicants" element={<ApplicantManagementPage />} />
            <Route path="applicants/:applicationId" element={<ApplicantDetailPage />} />
            <Route path="apply" element={<ApplyPage />} />
          </Route>

          <Route path="documents">
            <Route index element={<Navigate to="/documents/resume" replace />} />
            <Route path="resume" element={<ResumeAnalysisPage />} />
            <Route path="cover-letter" element={<CoverLetterAnalysisPage />} />
            <Route path="report" element={<DocumentReportPage />} />
            <Route path="history" element={<ResumeHistoryPage />} />
          </Route>

          <Route path="interview">
            <Route index element={<InterviewHomePage />} />
            <Route path="history" element={<DiagnosisHistoryPage />} />
            <Route path="detail/:id" element={<ComprehensiveReportPage />} />
            <Route path="roadmap" element={<LearningRoadmapPage />} />
            <Route path="report" element={<InterviewReportPage />} />
            <Route path="report-export" element={<ComprehensiveReportPage />} />
            <Route path="text" element={<TextInterviewPage />} />
            <Route path="media" element={<MediaInterviewPage />} />
          </Route>

          <Route path="career-diagnosis">
            <Route index element={<Navigate to="/career-diagnosis/report" replace />} />
            <Route path="history" element={<DiagnosisHistoryPage />} />
            <Route path="detail/:id" element={<DiagnosisDetailPage />} />
            <Route path="roadmap" element={<LearningRoadmapPage />} />
            <Route path="report" element={<ComprehensiveReportPage />} />
          </Route>

          <Route path="billing">
            {/* [non-MVP] <Route index element={<Navigate to="/billing/pricing" replace />} /> */}
            {/* [non-MVP] <Route path="pricing" element={<PricingPage />} /> */}
            <Route path="payment" element={<PaymentPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="success" element={<PaymentSuccessPage />} />
            <Route path="fail" element={<PaymentFailPage />} />
            <Route path="document-coaching/plans" element={<PaymentPage />} />
            <Route path="interview/plans" element={<PaymentPage />} />
            {/* [non-MVP] <Route path="company-products" element={<CompanyProductPage />} /> */}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 어드민 플랫폼 */}
      <Route path="admin">
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="login" element={<AdminLoginPage />} />

        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="admins"    element={<AdminManagementPage />} />
            <Route path="members"   element={<UserManagementPage />} />
            <Route path="reports"   element={<ReportPage />} />
            <Route path="cs"        element={<CustomerServicePage />} />
            <Route path="payments"  element={<AdminPaymentPage />} />
            <Route path="stats"     element={<StatisticsPage />} />
            <Route path="ai"        element={<AiMetricsPage />} />
            <Route path="scraping"  element={<ScrapingPage />} />
            <Route path="log"       element={<AuditLogPage />} />
            <Route path="companies" element={<AdminCompanyListPage />} />
            <Route path="settlements" element={<AdminSettlementListPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
