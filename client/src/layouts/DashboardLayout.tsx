import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/shared/Sidebar';
import Topbar from '@/components/shared/Topbar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#080e0b]" style={{ paddingLeft: 80 }}>
      <Sidebar />
      <div className="flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
