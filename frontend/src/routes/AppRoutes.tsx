import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import MainLayout from "../components/user/layout/MainLayout";
import ProtectedRoute from "../components/user/common/ProtectedRoute";
import AdminLayout from "../layouts/admin/AdminLayout";
import { adminSession } from "../api/admin/adminSession";
import {
  ADMIN_ROUTE_BASE,
  ADMIN_ROUTE_PATHS,
  hasAdminRouteAccess,
  isAdminNavigationPath,
} from "../constants/admin/adminRouteConstants";

const AboutPage = lazy(() => import("../pages/user/info/AboutPage"));
const TermsPage = lazy(() => import("../pages/user/info/TermsPage"));
const PrivacyPage = lazy(() => import("../pages/user/info/PrivacyPage"));
const JobSeekerDashboardPage = lazy(
  () => import("../pages/user/dashboard/JobSeekerDashboardPage"),
);
const CompanyDashboardPage = lazy(
  () => import("../pages/user/dashboard/CompanyDashboardPage"),
);
const UserMyPage = lazy(() => import("../pages/user/mypage/UserMyPage"));
const ScrappedJobPage = lazy(
  () => import("../pages/user/mypage/ScrappedJobPage"),
);
const SubscriptionPage = lazy(
  () => import("../pages/user/mypage/SubscriptionPage"),
);
const PaymentHistoryPage = lazy(
  () => import("../pages/user/mypage/PaymentHistoryPage"),
);

const LoginPage = lazy(() => import("../pages/user/auth/LoginPage"));
const FindAccountPage = lazy(
  () => import("../pages/user/auth/FindAccountPage"),
);
const RegisterPage = lazy(() => import("../pages/user/auth/RegisterPage"));
const RegisterVerifyPage = lazy(
  () => import("../pages/user/auth/RegisterVerifyPage"),
);
const OAuthCallbackPage = lazy(
  () => import("../pages/user/auth/OAuthCallbackPage"),
);
const FindIdPage = lazy(() => import("../pages/user/auth/FindIdPage"));
const FindPasswordPage = lazy(
  () => import("../pages/user/auth/FindPasswordPage"),
);
const ProfilePage = lazy(() => import("../pages/user/auth/ProfilePage"));

const CompanyProfilePage = lazy(
  () => import("../pages/user/company/CompanyProfilePage"),
);
const HrManagerPage = lazy(() => import("../pages/user/company/HrManagerPage"));

const JobNoticeListPage = lazy(
  () => import("../pages/user/jobNotice/JobNoticeListPage"),
);

const ApplicationStatusPage = lazy(
  () => import("../pages/user/application/ApplicationStatusPage"),
);
const ApplicantManagementPage = lazy(
  () => import("../pages/user/application/ApplicantManagementPage"),
);
const ApplicantDetailPage = lazy(
  () => import("../pages/user/application/ApplicantDetailPage"),
);
const ApplyPage = lazy(() => import("../pages/user/application/ApplyPage"));

const ResumeAnalysisPage = lazy(
  () => import("../pages/user/resume/ResumeAnalysisPage"),
);
const CoverLetterAnalysisPage = lazy(
  () => import("../pages/user/resume/CoverLetterAnalysisPage"),
);
const DocumentReportPage = lazy(
  () => import("../pages/user/resume/DocumentReportPage"),
);
const ResumeHistoryPage = lazy(
  () => import("../pages/user/resume/ResumeHistoryPage"),
);

const InterviewHomePage = lazy(
  () => import("../pages/user/interview/InterviewHomePage"),
);
const TextInterviewPage = lazy(
  () => import("../pages/user/interview/TextInterviewPage"),
);
const MediaInterviewPage = lazy(
  () => import("../pages/user/interview/MediaInterviewPage"),
);
const InterviewReportPage = lazy(
  () => import("../pages/user/interview/InterviewReportPage"),
);

const InterviewHistoryPage = lazy(
  () => import("../pages/user/interview/InterviewHistoryPage"),
);

const DiagnosisHistoryPage = lazy(
  () => import("../pages/user/careerDiagnosis/DiagnosisHistoryPage"),
);
const DiagnosisDetailPage = lazy(
  () => import("../pages/user/careerDiagnosis/DiagnosisDetailPage"),
);
const LearningRoadmapPage = lazy(
  () => import("../pages/user/careerDiagnosis/LearningRoadmapPage"),
);
const ComprehensiveReportPage = lazy(
  () => import("../pages/user/careerDiagnosis/ComprehensiveReportPage"),
);

const CommunityPage = lazy(
  () => import("../pages/user/community/CommunityPage"),
);
const PostDetailPage = lazy(
  () => import("../pages/user/community/PostDetailPage"),
);
const PostCreatePage = lazy(
  () => import("../pages/user/community/PostCreatePage"),
);
const MentorPage = lazy(() => import("../pages/user/community/MentorPage"));

// [non-MVP] const PricingPage = lazy(() => import('../pages/user/billing/PricingPage'));
const PaymentPage = lazy(() => import("../pages/user/billing/PaymentPage"));
// [non-MVP] const CompanyProductPage = lazy(() => import('../pages/user/billing/CompanyProductPage'));
const CheckoutPage = lazy(() => import("../pages/user/billing/CheckoutPage"));
const PaymentSuccessPage = lazy(
  () => import("../pages/user/billing/PaymentSuccessPage"),
);
const PaymentFailPage = lazy(
  () => import("../pages/user/billing/PaymentFailPage"),
);

const SupportPage = lazy(() => import("../pages/user/support/SupportPage"));
const NoticePage = lazy(() => import("../pages/user/support/NoticePage"));
const NoticeDetailPage = lazy(
  () => import("../pages/user/support/NoticeDetailPage"),
);
const FaqPage = lazy(() => import("../pages/user/support/FaqPage"));
const InquiryListPage = lazy(
  () => import("../pages/user/support/InquiryListPage"),
);
const InquiryCreatePage = lazy(
  () => import("../pages/user/support/InquiryCreatePage"),
);

const NotFoundPage = lazy(() => import("../pages/user/common/NotFoundPage"));

const AdminLoginPage = lazy(
  () => import("../pages/admin/AdminLogin/AdminLoginPage"),
);
const AdminDashboardPage = lazy(
  () => import("../pages/admin/Dashboard/AdminDashboardPage"),
);
const AdminManagementPage = lazy(
  () => import("../pages/admin/AdminManagement/AdminManagementPage"),
);
const UserManagementPage = lazy(
  () => import("../pages/admin/UserManagement/UserManagementPage"),
);
const ReportPage = lazy(() => import("../pages/admin/Report/ReportPage"));
const CustomerServicePage = lazy(
  () => import("../pages/admin/CustomerService/CustomerServicePage"),
);
const AdminPaymentPage = lazy(
  () => import("../pages/admin/Payment/PaymentPage"),
);
const StatisticsPage = lazy(
  () => import("../pages/admin/Statistics/StatisticsPage"),
);
const AiMetricsPage = lazy(
  () => import("../pages/admin/AiMetrics/AiMetricsPage"),
);
const ScrapingPage = lazy(() => import("../pages/admin/Scraping/ScrapingPage"));
const AuditLogPage = lazy(() => import("../pages/admin/AuditLog/AuditLogPage"));
const AdminCompanyListPage = lazy(
  () => import("../pages/admin/Company/CompanyListPage"),
);
const AdminSettlementListPage = lazy(
  () => import("../pages/admin/Settlement/SettlementListPage"),
);

function RouteLoadingFallback() {
  return (
    <div
      aria-live="polite"
      style={{
        minHeight: "calc(100vh - 160px)",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        color: "#5f6f86",
        fontSize: 14,
      }}
    >
      페이지를 불러오는 중입니다.
    </div>
  );
}

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>;
}

function AdminProtectedRoute() {
  const { pathname } = useLocation();
  const token = adminSession.getToken();
  const role = adminSession.getRole();

  if (!token) {
    return <Navigate to={ADMIN_ROUTE_PATHS.login} replace />;
  }

  if (!role) {
    adminSession.clearToken();
    adminSession.clearRole();
    return <Navigate to={ADMIN_ROUTE_PATHS.login} replace />;
  }

  // 현재 경로에 매핑되는 가장 구체적인 admin route를 찾아 role 접근 권한 확인
  const matchedRoute = Object.values(ADMIN_ROUTE_PATHS)
    .filter((p) => p !== ADMIN_ROUTE_PATHS.login)
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (
    matchedRoute &&
    isAdminNavigationPath(matchedRoute) &&
    !hasAdminRouteAccess(role, matchedRoute)
  ) {
    return <Navigate to={ADMIN_ROUTE_PATHS.dashboard} replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={lazyRoute(<JobSeekerDashboardPage />)} />

        <Route path="auth">
          <Route index element={<Navigate to="/auth/login" replace />} />
          <Route path="login" element={lazyRoute(<LoginPage />)} />
          <Route path="find-account" element={lazyRoute(<FindAccountPage />)} />
          <Route path="find-id/:roleType" element={lazyRoute(<FindIdPage />)} />
          <Route
            path="find-password/:roleType"
            element={lazyRoute(<FindPasswordPage />)}
          />
          <Route path="register" element={lazyRoute(<RegisterPage />)} />
          <Route
            path="register/verify"
            element={lazyRoute(<RegisterVerifyPage />)}
          />
          <Route
            path="oauth/callback"
            element={lazyRoute(<OAuthCallbackPage />)}
          />
          <Route path="profile" element={lazyRoute(<ProfilePage />)} />
        </Route>

        <Route path="jobs">
          <Route index element={lazyRoute(<JobNoticeListPage />)} />
        </Route>

        <Route path="community">
          <Route index element={lazyRoute(<CommunityPage />)} />
          <Route path="posts/create" element={lazyRoute(<PostCreatePage />)} />
          <Route path="posts/:postId" element={lazyRoute(<PostDetailPage />)} />
          <Route path="mentor" element={lazyRoute(<MentorPage />)} />
        </Route>

        <Route path="support" element={lazyRoute(<SupportPage />)}>
          <Route path="notices" element={lazyRoute(<NoticePage />)} />
          <Route path="notices/:id" element={lazyRoute(<NoticeDetailPage />)} />
          <Route path="faq" element={lazyRoute(<FaqPage />)} />
          <Route element={<ProtectedRoute />}>
            <Route path="inquiry" element={lazyRoute(<InquiryListPage />)} />
            <Route
              path="inquiry/create"
              element={lazyRoute(<InquiryCreatePage />)}
            />
          </Route>
        </Route>

        <Route path="about" element={lazyRoute(<AboutPage />)} />
        <Route path="terms" element={lazyRoute(<TermsPage />)} />
        <Route path="privacy" element={lazyRoute(<PrivacyPage />)} />

        {/* Toss 결제 콜백 — 외부 리디렉트이므로 세션 만료 시에도 렌더링 가능해야 함 (#854) */}
        <Route path="billing/success" element={lazyRoute(<PaymentSuccessPage />)} />
        <Route path="billing/fail" element={lazyRoute(<PaymentFailPage />)} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="dashboard/company"
            element={lazyRoute(<CompanyDashboardPage />)}
          />

          <Route path="mypage" element={lazyRoute(<UserMyPage />)} />
          <Route
            path="mypage/favorites"
            element={lazyRoute(<ScrappedJobPage />)}
          />
          <Route
            path="mypage/subscription"
            element={lazyRoute(<SubscriptionPage />)}
          />
          <Route
            path="mypage/payment-history"
            element={lazyRoute(<PaymentHistoryPage />)}
          />

          <Route path="company">
            <Route index element={<Navigate to="/company/profile" replace />} />
            <Route path="profile" element={lazyRoute(<CompanyProfilePage />)} />
            <Route path="hr-managers" element={lazyRoute(<HrManagerPage />)} />
          </Route>

          <Route path="applications">
            <Route
              index
              element={<Navigate to="/applications/status" replace />}
            />
            <Route
              path="status"
              element={lazyRoute(<ApplicationStatusPage />)}
            />
            <Route
              path="applicants"
              element={lazyRoute(<ApplicantManagementPage />)}
            />
            <Route
              path="applicants/:applicationId"
              element={lazyRoute(<ApplicantDetailPage />)}
            />
            <Route path="apply" element={lazyRoute(<ApplyPage />)} />
          </Route>

          <Route path="documents">
            <Route
              index
              element={<Navigate to="/documents/resume" replace />}
            />
            <Route path="resume" element={lazyRoute(<ResumeAnalysisPage />)} />
            <Route
              path="cover-letter"
              element={lazyRoute(<CoverLetterAnalysisPage />)}
            />
            <Route path="report" element={lazyRoute(<DocumentReportPage />)} />
            <Route path="history" element={lazyRoute(<ResumeHistoryPage />)} />
          </Route>

          <Route path="interview">
            <Route index element={lazyRoute(<InterviewHomePage />)} />
            <Route
              path="history"
              element={lazyRoute(<DiagnosisHistoryPage />)}
            />
            <Route
              path="detail/:id"
              element={lazyRoute(<ComprehensiveReportPage />)}
            />
            <Route
              path="roadmap"
              element={lazyRoute(<LearningRoadmapPage />)}
            />
            <Route path="report" element={lazyRoute(<InterviewReportPage />)} />
            <Route path="history" element={lazyRoute(<InterviewHistoryPage />)} />
            <Route
              path="report-export"
              element={lazyRoute(<ComprehensiveReportPage />)}
            />
            <Route path="text" element={lazyRoute(<TextInterviewPage />)} />
            <Route path="media" element={lazyRoute(<MediaInterviewPage />)} />
          </Route>

          <Route path="career-diagnosis">
            <Route
              index
              element={<Navigate to="/career-diagnosis/report" replace />}
            />
            <Route
              path="history"
              element={lazyRoute(<DiagnosisHistoryPage />)}
            />
            <Route
              path="detail/:id"
              element={lazyRoute(<DiagnosisDetailPage />)}
            />
            <Route
              path="roadmap"
              element={lazyRoute(<LearningRoadmapPage />)}
            />
            <Route
              path="report"
              element={lazyRoute(<ComprehensiveReportPage />)}
            />
          </Route>

          <Route path="billing">
            {/* [non-MVP] <Route index element={<Navigate to="/billing/pricing" replace />} /> */}
            {/* [non-MVP] <Route path="pricing" element={lazyRoute(<PricingPage />)} /> */}
            <Route path="payment" element={lazyRoute(<PaymentPage />)} />
            <Route path="checkout" element={lazyRoute(<CheckoutPage />)} />
            <Route
              path="document-coaching/plans"
              element={lazyRoute(<PaymentPage />)}
            />
            <Route
              path="interview/plans"
              element={lazyRoute(<PaymentPage />)}
            />
            {/* [non-MVP] <Route path="company-products" element={lazyRoute(<CompanyProductPage />)} /> */}
          </Route>
        </Route>

        <Route path="*" element={lazyRoute(<NotFoundPage />)} />
      </Route>

      <Route path={ADMIN_ROUTE_BASE}>
        <Route index element={<Navigate to={ADMIN_ROUTE_PATHS.dashboard} replace />} />
        <Route path="login" element={lazyRoute(<AdminLoginPage />)} />

        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route
              path="dashboard"
              element={lazyRoute(<AdminDashboardPage />)}
            />
            <Route path="admins" element={lazyRoute(<AdminManagementPage />)} />
            <Route path="members" element={lazyRoute(<UserManagementPage />)} />
            <Route path="reports" element={lazyRoute(<ReportPage />)} />
            <Route path="cs" element={lazyRoute(<CustomerServicePage />)} />
            <Route path="payments" element={lazyRoute(<AdminPaymentPage />)} />
            <Route path="stats" element={lazyRoute(<StatisticsPage />)} />
            <Route path="ai" element={lazyRoute(<AiMetricsPage />)} />
            <Route path="scraping" element={lazyRoute(<ScrapingPage />)} />
            <Route path="log" element={lazyRoute(<AuditLogPage />)} />
            <Route
              path="companies"
              element={lazyRoute(<AdminCompanyListPage />)}
            />
            <Route
              path="settlements"
              element={lazyRoute(<AdminSettlementListPage />)}
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
