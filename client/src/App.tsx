import { Navigate, Route, Routes } from 'react-router-dom'

// Auth pages
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import HomePage from '@/pages/home/HomePage'
import MemberDashboard from '@/pages/member/MemberDashboard'
import CurrentPackage from '@/pages/member/CurrentPackage'
import BuyPackage from '@/pages/member/BuyPackage'
import RenewPackage from '@/pages/member/RenewPackage'
import PackageHistory from '@/pages/member/PackageHistory'
import AttendanceHistory from '@/pages/member/AttendanceHistory'
import SessionHistory from '@/pages/member/SessionHistory'
import ProgressChart from '@/pages/member/ProgressChart'
import ProgressLog from '@/pages/member/ProgressLog'
import SendFeedback from '@/pages/member/SendFeedback'
import MyFeedback from '@/pages/member/MyFeedback'
import Profile from '@/pages/member/Profile'
import RegisterPage from '@/pages/member/RegisterPage'
import RegisterOnline from '@/pages/member/RegisterOnline'
import VerifyEmail from '@/pages/member/VerifyEmail'
import VerifyEmailPage from '@/pages/member/VerifyEmailPage'
import RegisterSuccess from '@/pages/member/RegisterSuccess'
import Payment from '@/pages/member/Payment'
import PaymentPage from '@/pages/member/PaymentPage'
import TrainerDashboard from '@/pages/trainer/TrainerDashboard'
import StudentsList from '@/pages/trainer/StudentsList'
import StudentDetail from '@/pages/trainer/StudentDetail'
import CalendarView from '@/pages/trainer/CalendarView'
import SessionsList from '@/pages/trainer/SessionsList'
import SessionDetail from '@/pages/trainer/SessionDetail'
import CreateSession from '@/pages/trainer/CreateSession'
import AddProgress from '@/pages/trainer/AddProgress'
import ProgressList from '@/pages/trainer/ProgressList'
import TrainerAttendanceHistory from '@/pages/trainer/AttendanceHistory'
import TrainerProfile from '@/pages/trainer/TrainerProfile'
import OwnerDashboardPage from '@/pages/owner/DashboardPage'
import OwnerProfilePage from '@/pages/owner/ProfilePage'
import StaffDashboardPage from '@/pages/staff/DashboardPage'
import StaffProfilePage from '@/pages/staff/ProfilePage'

// Layouts
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import TrainerLayout from '@/layouts/TrainerLayout'

// Protected route guard
import ProtectedRoute from '@/components/common/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Public: auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Public: member onboarding */}
      <Route path="/member/register" element={<RegisterPage />} />
      <Route path="/member/register-online" element={<RegisterOnline />} />
      <Route path="/member/verify-email" element={<VerifyEmail />} />
      <Route path="/member/verify-email-page" element={<VerifyEmailPage />} />
      <Route path="/member/payment" element={<Payment />} />
      <Route path="/member/payment-page" element={<PaymentPage />} />
      <Route path="/member/register-success" element={<RegisterSuccess />} />
      <Route path="/member/success" element={<RegisterSuccess />} />

      {/* Protected: member */}
      <Route element={<ProtectedRoute allowedRoles={['member']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/member" element={<MemberDashboard />} />
          <Route path="/member/current-package" element={<CurrentPackage />} />
          <Route path="/member/buy-package" element={<BuyPackage />} />
          <Route path="/member/renew-package" element={<RenewPackage />} />
          <Route path="/member/package-history" element={<PackageHistory />} />
          <Route path="/member/attendance" element={<AttendanceHistory />} />
          <Route path="/member/sessions" element={<SessionHistory />} />
          <Route path="/member/progress-chart" element={<ProgressChart />} />
          <Route path="/member/progress-log" element={<ProgressLog />} />
          <Route path="/member/send-feedback" element={<SendFeedback />} />
          <Route path="/member/my-feedback" element={<MyFeedback />} />
          <Route path="/member/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/staff/profile" element={<StaffProfilePage />} />
          <Route path="staff/*" element={<StaffDashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
        <Route element={<TrainerLayout />}>
          {/* Dashboard */}
          <Route path="/trainer" element={<TrainerDashboard />} />

          {/* Students Management */}
          <Route path="/trainer/students" element={<StudentsList />} />
          <Route path="/trainer/students/:id" element={<StudentDetail />} />

          {/* Schedule & Sessions */}
          <Route path="/trainer/calendar" element={<CalendarView />} />
          <Route path="/trainer/sessions" element={<SessionsList />} />
          <Route path="/trainer/sessions/:id" element={<SessionDetail />} />
          <Route path="/trainer/create-session" element={<CreateSession />} />
          <Route path="/trainer/edit-session/:id" element={<CreateSession />} />

          {/* Progress Tracking */}
          <Route path="/trainer/progress-list" element={<ProgressList />} />
          <Route path="/trainer/add-progress" element={<AddProgress />} />

          {/* Attendance */}
          <Route path="/trainer/attendance" element={<TrainerAttendanceHistory />} />

          {/* Profile */}
          <Route path="/trainer/profile" element={<TrainerProfile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/owner" element={<OwnerDashboardPage />} />
          <Route path="/owner/profile" element={<OwnerProfilePage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
