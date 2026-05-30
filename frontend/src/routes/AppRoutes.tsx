import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ScrappedJobPage from '@/user/pages/mypage/ScrappedJobPage';

// ── 사용자 플랫폼 ──────────────────────────────────────────────
import JobSeekerDashboardPage from '../user/pages/dashboard/JobSeekerDashboardPage';
import CompanyDashboardPage from '../user/pages/dashboard/CompanyDashboardPage';
import UserMyPage from '../user/pages/mypage/UserMyPage';
import SubscriptionPage from '../user/pages/mypage/SubscriptionPage';
import PaymentHistoryPage from '../user/pages/mypage/PaymentHistoryPage';


import LoginPage from '../user/pages/auth/LoginPage';
import FindAccountPage from '../user/pages/auth/FindAccountPage';
import RegisterPage from '../user/pages/auth/RegisterPage';
import RegisterVerifyPage from '../user/pages/auth/RegisterVerifyPage';
import FindIdPage from '../user/pages/auth/FindIdPage';
import FindPasswordPage from '../user/pages/auth/FindPasswordPage';
import ProfilePage from '../user/pages/auth/ProfilePage';

import CompanyProfilePage from '../user/pages/company/CompanyProfilePage';
import HrManagerPage from '../user/pages/company/HrManagerPage';

import JobNoticeListPage from '../user/pages/jobNotice/JobNoticeListPage';

import ApplicationStatusPage from '../user/pages/application/ApplicationStatusPage';
import ApplicantManagementPage from '../user/pages/application/ApplicantManagementPage';
import ApplicantDetailPage from '../user/pages/application/ApplicantDetailPage';
import ApplyPage from '../user/pages/application/ApplyPage';

import ResumeAnalysisPage from '../user/pages/documentAnalysis/ResumeAnalysisPage';
import CoverLetterAnalysisPage from '../user/pages/documentAnalysis/CoverLetterAnalysisPage';
import DocumentReportPage from '../user/pages/documentAnalysis/DocumentReportPage';

import InterviewHomePage from '../user/pages/interview/InterviewHomePage';
import TextInterviewPage from '../user/pages/interview/TextInterviewPage';
import MediaInterviewPage from '../user/pages/interview/MediaInterviewPage';
import InterviewReportPage from '../user/pages/interview/InterviewReportPage';
import DiagnosisHistoryPage from '../user/pages/careerDiagnosis/DiagnosisHistoryPage';
import LearningRoadmapPage from '../user/pages/careerDiagnosis/LearningRoadmapPage';
import ComprehensiveReportPage from '../user/pages/careerDiagnosis/ComprehensiveReportPage';

import CommunityPage from '../user/pages/community/CommunityPage';
import PostDetailPage from '../user/pages/community/PostDetailPage';
import PostCreatePage from '../user/pages/community/PostCreatePage';
import MentorPage from '../user/pages/community/MentorPage';

import PricingPage from '../user/pages/billing/PricingPage';
import PaymentPage from '../user/pages/billing/PaymentPage';
import CompanyProductPage from '../user/pages/billing/CompanyProductPage';
import CheckoutPage from '../user/pages/billing/CheckoutPage';
import PaymentSuccessPage from '../user/pages/billing/PaymentSuccessPage';
import PaymentFailPage from '../user/pages/billing/PaymentFailPage';

import SupportPage from '../user/pages/support/SupportPage';
import NoticePage from '../user/pages/support/NoticePage';
import NoticeDetailPage from '../user/pages/support/NoticeDetailPage';
import FaqPage from '../user/pages/support/FaqPage';
import InquiryListPage from '../user/pages/support/InquiryListPage';
import InquiryCreatePage from '../user/pages/support/InquiryCreatePage';

import NotFoundPage from '../user/pages/common/NotFoundPage';

// ── 어드민 플랫폼 ──────────────────────────────────────────────
import AdminLayout from '../admin/layouts/AdminLayout';
import AdminLoginPage from '../admin/pages/AdminLogin/AdminLoginPage';
import AdminDashboardPage from '../admin/pages/Dashboard/AdminDashboardPage';
import AdminManagementPage from '../admin/pages/AdminManagement/AdminManagementPage';
import UserManagementPage from '../admin/pages/UserManagement/UserManagementPage';
import ReportPage from '../admin/pages/Report/ReportPage';
import CustomerServicePage from '../admin/pages/CustomerService/CustomerServicePage';
import AdminPaymentPage from '../admin/pages/Payment/PaymentPage';
import StatisticsPage from '../admin/pages/Statistics/StatisticsPage';
import AiMetricsPage from '../admin/pages/AiMetrics/AiMetricsPage';
import ScrapingPage from '../admin/pages/Scraping/ScrapingPage';
import AuditLogPage from '../admin/pages/AuditLog/AuditLogPage';
import AdminCompanyListPage from '../admin/pages/Company/CompanyListPage';
import AdminJobNoticeListPage from '../admin/pages/JobNotice/JobNoticeListPage';
import AdminSettlementListPage from '../admin/pages/Settlement/SettlementListPage';

function AppRoutes() {
  return (
    <Routes>
      {/* 사용자 플랫폼 */}
      <Route element={<MainLayout />}>
        <Route index element={<JobSeekerDashboardPage />} />
        <Route path="dashboard/company" element={<CompanyDashboardPage />} />
        <Route path="mypage" element={<UserMyPage />} />
        <Route path="mypage/favorites" element={<ScrappedJobPage />} />
        <Route path="mypage/subscription" element={<SubscriptionPage />} />
        <Route path="mypage/payment-history" element={<PaymentHistoryPage />} />

        <Route path="auth">
          <Route index element={<Navigate to="/auth/login" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="find-account" element={<FindAccountPage />} />
          <Route path="find-id/:memberType" element={<FindIdPage />} />
          <Route path="find-password/:memberType" element={<FindPasswordPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="register/verify" element={<RegisterVerifyPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="company">
          <Route index element={<Navigate to="/company/profile" replace />} />
          <Route path="profile" element={<CompanyProfilePage />} />
          <Route path="hr-managers" element={<HrManagerPage />} />
        </Route>

        <Route path="jobs">
          <Route index element={<JobNoticeListPage />} />
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
          <Route path="detail/:id" element={<ComprehensiveReportPage />} />
          <Route path="roadmap" element={<LearningRoadmapPage />} />
          <Route path="report" element={<ComprehensiveReportPage />} />
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
          <Route path="inquiry" element={<InquiryListPage />} />
          <Route path="inquiry/create" element={<InquiryCreatePage />} />
        </Route>

        <Route path="billing">
          <Route index element={<Navigate to="/billing/pricing" replace />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="success" element={<PaymentSuccessPage />} />
          <Route path="fail" element={<PaymentFailPage />} />
          <Route path="document-coaching/plans" element={<PaymentPage />} />
          <Route path="interview/plans" element={<PaymentPage />} />
          <Route path="company-products" element={<CompanyProductPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 어드민 플랫폼 */}
      <Route path="admin">
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="login" element={<AdminLoginPage />} />

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
          <Route path="job-notices" element={<AdminJobNoticeListPage />} />
          <Route path="settlements" element={<AdminSettlementListPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
