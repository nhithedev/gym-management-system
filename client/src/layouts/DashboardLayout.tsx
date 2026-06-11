import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/shared/Sidebar';
import Topbar from '@/components/shared/Topbar';
import { PageSkeleton } from '@/components/shared/PageUI';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import subscriptionService from '@/services/subscription.service';

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const hasActiveSub = useSubscriptionStore((state) => state.hasActiveSub);
  const setHasActiveSub = useSubscriptionStore((state) => state.setHasActiveSub);

  const role = user?.roles[0];
  const isMember = role === 'member';

  useEffect(() => {
    if (!isMember || hasActiveSub !== null) return;
    if (!user?.memberId) return;
    subscriptionService.getByMember(user.memberId).then((subs) => {
      const active = subs.some((s) => s.status === 'active');
      setHasActiveSub(active);
    }).catch(() => {
      setHasActiveSub(false);
    });
  }, [isMember, hasActiveSub, user?.memberId, setHasActiveSub]);

  const showSidebar = isMember ? hasActiveSub === true : true;

  return (
    <div className="min-h-screen bg-[#080e0b]" style={{ paddingLeft: showSidebar ? 80 : 0 }}>
      {showSidebar && <Sidebar />}
      <div className="flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<PageSkeleton rows={4} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
