import { Routes, Route, Navigate } from 'react-router-dom'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import HomePage from '@/pages/home/HomePage'

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
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Member */}
          <Route path="member/*" element={<div>Member routes — TODO</div>} />

          {/* Trainer */}
          <Route path="trainer/*" element={<div>Trainer routes — TODO</div>} />

          {/* Staff */}
          <Route path="staff/*" element={<div>Staff routes — TODO</div>} />

          {/* Owner */}
          <Route path="owner/*" element={<div>Owner routes — TODO</div>} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
