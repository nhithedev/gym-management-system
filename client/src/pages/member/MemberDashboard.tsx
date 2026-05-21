import { useState, useEffect } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { Package, TrendingUp, MessageSquare, Activity, Calendar, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/auth.service";
import subscriptionService, { type Subscription } from "@/services/subscription.service";

export default function MemberDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const [activeSub, setActiveSub] = useState<Subscription | null | undefined>(undefined);

  useEffect(() => {
    async function fetchActiveSub() {
      try {
        let memberId = user?.memberId ?? null;

        if (!memberId) {
          const me = await authService.me();
          memberId = me.memberId ?? null;
          if (user && token) setAuth({ ...user, memberId }, token);
        }

        if (!memberId) { setActiveSub(null); return; }

        const subs = await subscriptionService.getByMember(memberId);
        setActiveSub(subs.find((s) => s.status === 'active') ?? null);
      } catch {
        setActiveSub(null);
      }
    }
    fetchActiveSub();
  }, []);

  const daysLeft = activeSub?.daysLeft ?? null;

  const memberStats = [
    { label: "Ngày tập trong tháng", value: "—", icon: Activity },
    { label: "Calo tiêu hao", value: "—", icon: TrendingUp },
    { label: "Buổi tập hoàn thành", value: "—", icon: CheckCircle },
    { label: "Gói còn lại", value: daysLeft !== null ? `${daysLeft} ngày` : "—", icon: Package },
  ];

  const hasActivePackage = activeSub !== null && activeSub !== undefined;

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Dashboard"
          description="Theo dõi tiến độ, lịch tập và trạng thái gói ngay trên một màn hình."
        />

        {/* Member Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {memberStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="member-card"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-[#121414] rounded-lg">
                    <Icon size={24} className="text-[#f2ca50]" />
                  </div>
                </div>
                <div>
                  <p className="member-card-label mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-semibold text-[#e2e2e2]">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Package or Warning */}
        {hasActivePackage ? (
          <div className="member-card mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="member-card-title text-2xl">
                Gói tập hiện tại
              </h2>
              <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-sm font-semibold rounded-full">
                Active
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#f2ca50] rounded-lg flex items-center justify-center">
                  <Package size={32} className="text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#e2e2e2]">
                    {activeSub?.packageName ?? "—"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-[#d0c5af]" />
                    <p className="text-sm text-[#d0c5af]">
                      {activeSub
                        ? `${new Date(activeSub.startDate).toLocaleDateString('vi-VN')} - ${new Date(activeSub.endDate).toLocaleDateString('vi-VN')} • Còn ${activeSub.daysLeft} ngày`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/member/current-package')}
                  className="member-btn-outline"
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/member/renew-package')}
                  className="member-btn-primary"
                >
                  Gia hạn ngay
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-red-500/10 border border-red-500 rounded-[1.75rem] mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-500 mb-2">
                  Bạn chưa có gói tập active
                </h3>
                <p className="text-[#d0c5af] mb-4">
                  Mua gói tập để bắt đầu hành trình rèn luyện sức khỏe của bạn
                </p>
                <button
                  onClick={() => navigate('/member/buy-package')}
                  className="member-btn-primary"
                >
                  Mua gói tập ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Next Session */}
        <div className="member-card mb-8">
          <h2 className="member-card-title text-2xl mb-4">
            Buổi tập tiếp theo
          </h2>
          <div className="p-4 bg-[#121414] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e2e2e2] font-semibold mb-1">
                  Personal Training
                </p>
                <p className="text-sm text-[#d0c5af]">
                  PT. Nguyễn Văn A • Phòng 1
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#f2ca50] font-semibold">
                  Hôm nay
                </p>
                <p className="text-sm text-[#d0c5af]">
                  10:00 - 11:00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="member-card mb-8">
          <h2 className="member-card-title text-2xl mb-6">
            Hoạt động gần đây
          </h2>
          <div className="space-y-4">
            {[
              { activity: "Buổi tập Cardio", trainer: "PT. Nguyễn Văn A", date: "Hôm nay, 08:00" },
              { activity: "Buổi tập Yoga", trainer: "PT. Trần Thị B", date: "Hôm qua, 17:00" },
              { activity: "Buổi tập Strength", trainer: "PT. Lê Văn C", date: "20/05/2026, 09:00" },
              { activity: "Check-in", trainer: "Tự tập", date: "19/05/2026, 06:30" }
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#121414] rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#f2ca50] rounded-full flex items-center justify-center">
                    <Activity size={20} className="text-black" />
                  </div>
                  <div>
                    <p className="text-[#e2e2e2] font-medium">
                      {item.activity}
                    </p>
                    <p className="text-sm text-[#d0c5af]">
                      {item.trainer}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-[#d0c5af]">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/member/buy-package')}
            className="member-card text-left transition-all hover:scale-[1.02] hover:border-[#f2ca50]/30"
          >
            <Package size={32} className="text-[#f2ca50] mb-4" />
            <h3 className="text-xl font-semibold uppercase tracking-tight text-[#f2ca50] mb-2">
              Mua gói mới
            </h3>
            <p className="text-[#d0c5af]/70">
              Khám phá các gói tập phù hợp
            </p>
          </button>

          <button
            onClick={() => navigate('/member/progress-chart')}
            className="member-card text-left transition-all hover:scale-[1.02] hover:border-[#f2ca50]/30"
          >
            <TrendingUp size={32} className="text-[#f2ca50] mb-4" />
            <h3 className="text-xl font-semibold uppercase tracking-tight text-[#f2ca50] mb-2">
              Xem tiến độ
            </h3>
            <p className="text-[#d0c5af]/70">
              Theo dõi kết quả tập luyện
            </p>
          </button>

          <button
            onClick={() => navigate('/member/send-feedback')}
            className="member-card text-left transition-all hover:scale-[1.02] hover:border-[#f2ca50]/30"
          >
            <MessageSquare size={32} className="text-[#f2ca50] mb-4" />
            <h3 className="text-xl font-semibold uppercase tracking-tight text-[#f2ca50] mb-2">
              Gửi phản hồi
            </h3>
            <p className="text-[#d0c5af]/70">
              Chia sẻ ý kiến của bạn
            </p>
          </button>
        </div>
      </div>
    </MemberLayout>
  );
}
