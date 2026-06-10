import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/shared/ProtectedRoute';
import SubscriptionRequired from './components/shared/SubscriptionRequired';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import QuickLoginPage from './pages/auth/QuickLoginPage';

// Home
import HomePage from './pages/home/HomePage';

// Member — public registration flow
import RegisterPage from './pages/member/register/RegisterPage';
import VerifyEmailPage from './pages/member/register/VerifyEmailPage';
import PaymentPage from './pages/member/subscription/PaymentPage';
import RegisterSuccessPage from './pages/member/register/RegisterSuccessPage';

// Member — protected
import MemberDashboardPage from './pages/member/DashboardPage';
import MemberProfilePage from './pages/member/ProfilePage';
import PaymentAccountsPage from './pages/member/PaymentAccountsPage';
import CurrentPackagePage from './pages/member/subscription/CurrentPackagePage';
import BuyPaymentPage from './pages/member/subscription/BuyPaymentPage';
import RenewPackagePage from './pages/member/subscription/RenewPackagePage';
import RenewPaymentPage from './pages/member/subscription/RenewPaymentPage';
import PackageHistoryPage from './pages/member/subscription/PackageHistoryPage';
import SubscriptionSetupPage from './pages/member/subscription/SubscriptionSetupPage';
import MyPlanPage from './pages/member/workout/MyPlanPage';
import MemberPlanBuilderPage from './pages/member/workout/PlanBuilderPage';
import MemberExercisesPage from './pages/member/workout/ExercisesPage';
import WorkoutHistoryPage from './pages/member/workout/WorkoutHistoryPage';
import WorkoutSessionPage from './pages/member/workout/WorkoutSessionPage';
import WorkoutSchedulePage from './pages/member/workout/WorkoutSchedulePage';
import ProgressPage from './pages/member/progress/ProgressPage';
import MyFeedbackPage from './pages/member/feedback/MyFeedbackPage';
import SendFeedbackPage from './pages/member/feedback/SendFeedbackPage';

// Trainer
import TrainerDashboardPage from './pages/trainer/DashboardPage';
import TrainerProfilePage from './pages/trainer/ProfilePage';
import StudentsListPage from './pages/trainer/students/StudentsListPage';
import StudentDetailPage from './pages/trainer/students/StudentDetailPage';
import AddProgressPage from './pages/trainer/students/AddProgressPage';
import ProgressListPage from './pages/trainer/students/ProgressListPage';
import TrainerSessionsListPage from './pages/trainer/sessions/SessionsListPage';
import TrainerSessionDetailPage from './pages/trainer/sessions/SessionDetailPage';
import CreateSessionPage from './pages/trainer/sessions/CreateSessionPage';
import CalendarPage from './pages/trainer/sessions/CalendarPage';
import WorkoutPlansPage from './pages/trainer/plans/WorkoutPlansPage';
import TrainerPlanBuilderPage from './pages/trainer/plans/PlanBuilderPage';
import LessonPlanListPage from './pages/trainer/plans/LessonPlanListPage';
import CreateLessonPlanPage from './pages/trainer/plans/CreateLessonPlanPage';
import ExercisesPage from './pages/trainer/exercises/ExercisesPage';
import TrainerAttendanceHistoryPage from './pages/trainer/attendance/AttendanceHistoryPage';

// Staff
import StaffDashboardPage from './pages/staff/DashboardPage';
import StaffProfilePage from './pages/staff/ProfilePage';
import MembersPage from './pages/staff/members/MembersPage';
import MemberDetailPage from './pages/staff/members/MemberDetailPage';
import CheckInPage from './pages/staff/check-in/CheckInPage';
import StaffFeedbackPage from './pages/staff/feedback/FeedbackPage';
import FacilityPage from './pages/staff/facility/FacilityPage';
import EquipmentPage from './pages/staff/equipment/EquipmentPage';

// Owner
import OwnerDashboardPage from './pages/owner/DashboardPage';
import OwnerProfilePage from './pages/owner/ProfilePage';
import PackagesPage from './pages/owner/packages/PackagesPage';
import UsersPage from './pages/owner/staff-management/UsersPage';
import UserDetailPage from './pages/owner/staff-management/UserDetailPage';
import GroupsPage from './pages/owner/rbac/GroupsPage';
import PermissionsPage from './pages/owner/rbac/PermissionsPage';
import ReportsPage from './pages/owner/reports/ReportsPage';
import RevenuePage from './pages/owner/reports/RevenuePage';

export default function App() {
  return (
    <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/other" element={<QuickLoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Member — public registration flow */}
        <Route path="/member/register" element={<RegisterPage />} />
        <Route path="/member/verify-email" element={<VerifyEmailPage />} />
        <Route path="/member/payment" element={<PaymentPage />} />
        <Route path="/member/register-success" element={<RegisterSuccessPage />} />

        {/* Member — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['member']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Accessible regardless of subscription */}
          <Route path="/member/profile" element={<MemberProfilePage />} />
          <Route path="/member/payment-accounts" element={<PaymentAccountsPage />} />
          <Route path="/member/subscription/setup" element={<SubscriptionSetupPage />} />
          <Route path="/member/subscription/buy" element={<SubscriptionSetupPage />} />
          <Route path="/member/subscription/buy/payment" element={<BuyPaymentPage />} />
          <Route path="/member/subscription/current" element={<CurrentPackagePage />} />
          <Route path="/member/subscription/renew" element={<RenewPackagePage />} />
          <Route path="/member/subscription/renew/payment" element={<RenewPaymentPage />} />
          <Route path="/member/subscription/history" element={<PackageHistoryPage />} />

          {/* Require active subscription */}
          <Route element={<SubscriptionRequired />}>
            <Route path="/member" element={<MemberDashboardPage />} />
            <Route path="/member/workout/plan" element={<MyPlanPage />} />
            <Route path="/member/workout/exercises" element={<MemberExercisesPage />} />
            <Route path="/member/workout/builder" element={<MemberPlanBuilderPage />} />
            <Route path="/member/workout/history" element={<WorkoutHistoryPage />} />
            <Route path="/member/workout/session/:id" element={<WorkoutSessionPage />} />
            <Route path="/member/workout/sessions" element={<WorkoutSchedulePage />} />
            <Route path="/member/progress" element={<ProgressPage />} />
            <Route path="/member/feedback" element={<MyFeedbackPage />} />
            <Route path="/member/feedback/send" element={<SendFeedbackPage />} />
          </Route>
        </Route>

        {/* Trainer — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/trainer" element={<TrainerDashboardPage />} />
          <Route path="/trainer/profile" element={<TrainerProfilePage />} />
          <Route path="/trainer/students" element={<StudentsListPage />} />
          <Route path="/trainer/students/:id" element={<StudentDetailPage />} />
          <Route path="/trainer/students/:id/progress" element={<AddProgressPage />} />
          <Route path="/trainer/students/:id/progress/list" element={<ProgressListPage />} />
          <Route path="/trainer/sessions" element={<TrainerSessionsListPage />} />
          <Route path="/trainer/sessions/create" element={<CreateSessionPage />} />
          <Route path="/trainer/sessions/:id" element={<TrainerSessionDetailPage />} />
          <Route path="/trainer/sessions/:id/edit" element={<CreateSessionPage />} />
          <Route path="/trainer/calendar" element={<CalendarPage />} />
          <Route path="/trainer/plans" element={<WorkoutPlansPage />} />
          <Route path="/trainer/plans/:id/builder" element={<TrainerPlanBuilderPage />} />
          <Route path="/trainer/lesson-plans" element={<LessonPlanListPage />} />
          <Route path="/trainer/lesson-plans/create" element={<CreateLessonPlanPage />} />
          <Route path="/trainer/lesson-plans/:id/edit" element={<CreateLessonPlanPage />} />
          <Route path="/trainer/exercises" element={<ExercisesPage />} />
          <Route path="/trainer/attendance" element={<TrainerAttendanceHistoryPage />} />
        </Route>

        {/* Staff + Owner — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['staff', 'owner']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/staff" element={<StaffDashboardPage />} />
          <Route path="/staff/profile" element={<StaffProfilePage />} />
          <Route path="/staff/members" element={<MembersPage />} />
          <Route path="/staff/members/:id" element={<MemberDetailPage />} />
          <Route path="/staff/check-in" element={<CheckInPage />} />
          <Route path="/staff/feedback" element={<StaffFeedbackPage />} />
          <Route path="/staff/facility" element={<FacilityPage />} />
          <Route path="/staff/equipment" element={<EquipmentPage />} />
        </Route>

        {/* Owner only — protected */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/owner" element={<OwnerDashboardPage />} />
          <Route path="/owner/profile" element={<OwnerProfilePage />} />
          <Route path="/owner/packages" element={<PackagesPage />} />
          <Route path="/owner/staff" element={<UsersPage />} />
          <Route path="/owner/staff/:id" element={<UserDetailPage />} />
          <Route path="/owner/rbac/groups" element={<GroupsPage />} />
          <Route path="/owner/rbac/permissions" element={<PermissionsPage />} />
          <Route path="/owner/reports" element={<ReportsPage />} />
          <Route path="/owner/reports/revenue" element={<RevenuePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}
