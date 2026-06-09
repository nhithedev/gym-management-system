import { Outlet } from 'react-router-dom';
import Sidebar from '../shared/Sidebar';
import Topbar from '../shared/Topbar';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-[#080e0b]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
