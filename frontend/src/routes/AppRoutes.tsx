import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import FavoriteCompanyPage from '@/user/pages/dashboard/FavoriteCompanyPage';

// ── 사용자 플랫폼 ──────────────────────────────────────────────
import JobSeekerDashboardPage from '../user/pages/dashboard/JobSeekerDashboardPage';
import CompanyDashboardPage from '../user/pages/dashboard/CompanyDashboardPage';
import UserMyPage from '../user/pages/dashboard/UserMyPage';


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
import ApplyPage from '../user/pages/application/ApplyPage';

import ResumeAnalysisPage from '../user/pages/documentAnalysis/ResumeAnalysisPage';
import CoverLetterAnalysisPage from '../user/pages/documentAnalysis/CoverLetterAnalysisPage';

import InterviewHomePage from '../user/pages/interview/InterviewHomePage';
import TextInterviewPage from '../user/pages/interview/TextInterviewPage';
import MediaInterviewPage from '../user/pages/interview/MediaInterviewPage';
import InterviewReportPage from '../user/pages/interview/InterviewReportPage';

import DiagnosisHistoryPage from '../user/pages/careerDiagnosis/DiagnosisHistoryPage';
import DiagnosisDetailPage from '../user/pages/careerDiagnosis/DiagnosisDetailPage';
import LearningRoadmapPage from '../user/pages/careerDiagnosis/LearningRoadmapPage';
import ComprehensiveReportPage from '../user/pages/careerDiagnosis/ComprehensiveReportPage';

import CommunityPage from '../user/pages/community/CommunityPage';
import PostDetailPage from '../user/pages/community/PostDetailPage';
import PostCreatePage from '../user/pages/community/PostCreatePage';
import MentorPage from '../user/pages/community/MentorPage';

import PricingPage from '../user/pages/billing/PricingPage';
import PaymentPage from '../user/pages/billing/PaymentPage';
import CompanyProductPage from '../user/pages/billing/CompanyProductPage';

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
import MatchingPage from '../admin/pages/Matching/MatchingPage';
import AiMetricsPage from '../admin/pages/AiMetrics/AiMetricsPage';
import ScrapingPage from '../admin/pages/Scraping/ScrapingPage';
import AuditLogPage from '../admin/pages/AuditLog/AuditLogPage';

function AppRoutes() {
  return (
    <Routes>
      {/* 사용자 플랫폼 */}
      <Route element={<MainLayout />}>
        <Route index element={<JobSeekerDashboardPage />} />
        <Route path="dashboard/company" element={<CompanyDashboardPage />} />
        <Route path="mypage" element={<UserMyPage />} />
        <Route path="mypage/favorites" element={<FavoriteCompanyPage />} />

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
          <Route path="apply" element={<ApplyPage />} />
        </Route>

        <Route path="documents">
          <Route index element={<Navigate to="/documents/resume" replace />} />
          <Route path="resume" element={<ResumeAnalysisPage />} />
          <Route path="cover-letter" element={<CoverLetterAnalysisPage />} />
        </Route>

        <Route path="interview">
          <Route index element={<InterviewHomePage />} />
          <Route path="report" element={<InterviewReportPage />} />
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

        <Route path="community">
          <Route index element={<CommunityPage />} />
          <Route path="posts/create" element={<PostCreatePage />} />
          <Route path="posts/:postId" element={<PostDetailPage />} />
          <Route path="mentor" element={<MentorPage />} />
        </Route>

        <Route path="billing">
          <Route index element={<Navigate to="/billing/pricing" replace />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="payment" element={<PaymentPage />} />
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
          <Route path="matching"  element={<MatchingPage />} />
          <Route path="ai"        element={<AiMetricsPage />} />
          <Route path="scraping"  element={<ScrapingPage />} />
          <Route path="log"       element={<AuditLogPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
