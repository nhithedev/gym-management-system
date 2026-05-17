import { useNavigate } from "react-router";
import { Users, Dumbbell, Clock, AlertTriangle, Plus, TrendingUp, Activity } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function TrainerDashboard() {
  const navigate = useNavigate();

  const kpiStats = [
    { label: "Học viên được gán", value: "24", icon: Users },
    { label: "Session hôm nay", value: "8", icon: Dumbbell },
    { label: "Session đang diễn ra", value: "2", icon: Activity },
    { label: "Progress mới cập nhật", value: "5", icon: TrendingUp },
  ];

  const todaySessions = [
    { time: "08:00 - 09:00", student: "Nguyễn Văn A", type: "Cardio", room: "Phòng 1", status: "completed" },
    { time: "09:30 - 10:30", student: "Trần Thị B", type: "Yoga", room: "Phòng 2", status: "in_progress" },
    { time: "11:00 - 12:00", student: "Lê Văn C", type: "Personal Training", room: "Phòng 1", status: "scheduled" },
    { time: "14:00 - 15:00", student: "Phạm Thị D", type: "Strength", room: "Phòng 3", status: "scheduled" },
  ];

  const recentAttendance = [
    { member: "Nguyễn Văn A", checked_in_at: "08:00", session: "Cardio - Phòng 1" },
    { member: "Trần Thị B", checked_in_at: "09:30", session: "Yoga - Phòng 2" },
    { member: "Lê Văn C", checked_in_at: "07:00", session: "Tự tập" },
  ];

  const alerts = [
    { type: "expiring", member: "Nguyễn Văn A", message: "Gói tập hết hạn sau 3 ngày" },
    { type: "overlap", message: "Session 14:00 - Phòng 3 trùng với buổi tập khác" },
  ];

  const getSessionStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return { bg: "rgba(52,211,153,0.12)", color: "#34D399", label: "Hoàn thành" };
      case "in_progress": return { bg: "rgba(99,102,241,0.12)", color: "#6366F1", label: "Đang diễn ra" };
      case "scheduled": return { bg: "rgba(251,191,36,0.12)", color: "#FBBF24", label: "Đã lên lịch" };
      default: return { bg: "rgba(255,255,255,0.05)", color: "#99907C", label: status };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SectionHeader
        title="Dashboard"
        description="Tổng quan hoạt động huấn luyện hôm nay"
        variant="page"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="member-card flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#121414]">
                <Icon className="size-6 text-primary" />
              </div>
              <div>
                <p className="member-card-label">{stat.label}</p>
                <p className="member-card-value text-2xl">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-8 rounded-2xl border border-[#FBBF24]/40 bg-[#FBBF24]/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#FBBF24]" />
            <div className="flex-1">
              <p className="mb-2 text-sm font-semibold text-[#FBBF24]">Cảnh báo ({alerts.length})</p>
              <div className="space-y-1.5">
                {alerts.map((alert, idx) => (
                  <p key={idx} className="member-card-label">
                    • {alert.member && `${alert.member}: `}{alert.message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <section className="member-card mb-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="member-card-title">Lịch hôm nay</h2>
          <button onClick={() => navigate('/trainer/create-session')} className="member-btn-primary">
            <Plus className="size-4" />
            <span>Tạo buổi tập</span>
          </button>
        </div>
        <div className="space-y-3">
          {todaySessions.map((session, idx) => {
            const st = getSessionStatusStyle(session.status);
            return (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-[#121414] p-4">
                <div className="flex items-center gap-4 flex-1">
                  <p className="min-w-[110px] text-sm font-semibold text-primary">{session.time}</p>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{session.student}</p>
                    <p className="member-card-label">{session.type} · {session.room}</p>
                  </div>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: st.bg, color: st.color }}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <section className="member-card">
          <h2 className="member-card-title mb-6">Attendance gần đây</h2>
          <div className="space-y-3">
            {recentAttendance.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-[#121414] p-4">
                <div>
                  <p className="text-sm font-semibold text-on-surface">{att.member}</p>
                  <p className="member-card-label">{att.session}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-sm text-on-surface">{att.checked_in_at}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/trainer/create-session')}
            className="member-card w-full text-left transition-transform hover:scale-[1.02]"
          >
            <Dumbbell className="mb-3 size-8 text-primary" />
            <h3 className="member-card-title mb-1">Tạo buổi tập mới</h3>
            <p className="member-card-label">Lên lịch buổi tập cho học viên</p>
          </button>

          <button
            onClick={() => navigate('/trainer/add-progress')}
            className="member-card w-full text-left transition-transform hover:scale-[1.02]"
          >
            <TrendingUp className="mb-3 size-8 text-primary" />
            <h3 className="member-card-title mb-1">Thêm bản ghi tiến độ</h3>
            <p className="member-card-label">Cập nhật tiến độ cho học viên</p>
          </button>
        </div>
      </div>
    </div>
  );
}
