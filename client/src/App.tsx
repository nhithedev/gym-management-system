import { Navigate, Route, Routes } from 'react-router-dom'

// Auth pages
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import HomePage from '@/pages/home/HomePage'
import MemberDashboardPage from '@/pages/member/DashboardPage'
import OwnerDashboardPage from '@/pages/owner/DashboardPage'
import StaffDashboardPage from '@/pages/staff/DashboardPage'
import TrainerDashboardPage from '@/pages/trainer/DashboardPage'

// Layouts
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'

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

      {/* Protected: dashboard */}
      <Route element={<ProtectedRoute allowedRoles={['member']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="member/*" element={<MemberDashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="staff/*" element={<StaffDashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="trainer/*" element={<TrainerDashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="owner/*" element={<OwnerDashboardPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
