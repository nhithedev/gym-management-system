import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#080e0b] flex items-center justify-center">
      <Outlet />
    </div>
  );
}
