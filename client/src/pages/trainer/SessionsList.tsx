import { useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Filter, Eye, Edit, Clock } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function SessionsList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

  const sessions = [
    { id: 1, member: "Nguyễn Văn A", member_code: "MB001", room: "Phòng 1", start_time: "16/05/2026 08:00", end_time: "16/05/2026 09:00", status: "scheduled", attendance_linked: false },
    { id: 2, member: "Trần Thị B", member_code: "MB002", room: "Phòng 2", start_time: "16/05/2026 09:30", end_time: "16/05/2026 10:30", status: "in_progress", attendance_linked: true },
    { id: 3, member: "Lê Văn C", member_code: "MB003", room: "Phòng 1", start_time: "15/05/2026 11:00", end_time: "15/05/2026 12:00", status: "completed", attendance_linked: true },
    { id: 4, member: "Phạm Thị D", member_code: "MB004", room: "Phòng 3", start_time: "14/05/2026 14:00", end_time: "14/05/2026 15:00", status: "cancelled", attendance_linked: false },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "scheduled": return { bg: "rgba(251,191,36,0.12)", color: "#FBBF24", label: "Đã lên lịch" };
      case "in_progress": return { bg: "rgba(99,102,241,0.12)", color: "#6366F1", label: "Đang diễn ra" };
      case "completed": return { bg: "rgba(52,211,153,0.12)", color: "#34D399", label: "Hoàn thành" };
      case "cancelled": return { bg: "rgba(239,68,68,0.12)", color: "#EF4444", label: "Đã hủy" };
      default: return { bg: "rgba(255,255,255,0.05)", color: "#99907C", label: status };
    }
  };

  const filtered = statusFilter === "all" ? sessions : sessions.filter((s) => s.status === statusFilter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SectionHeader
        title="Danh sách buổi tập"
        description="Quản lý tất cả buổi tập của bạn"
        variant="page"
      />

      {/* Filter */}
      <section className="member-card mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="size-4 text-primary" />
          <span className="text-sm font-semibold text-on-surface">Trạng thái:</span>
          {[
            { value: "all", label: "Tất cả" },
            { value: "scheduled", label: "Đã lên lịch" },
            { value: "in_progress", label: "Đang diễn ra" },
            { value: "completed", label: "Hoàn thành" },
            { value: "cancelled", label: "Đã hủy" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={statusFilter === f.value ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="member-card overflow-hidden p-0">
        <div className="overflow-x-auto app-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#4d4635] bg-[#121414]">
                {["ID", "Học viên", "Phòng", "Bắt đầu", "Kết thúc", "Trạng thái", "Attendance", "Hành động"].map((h) => (
                  <th key={h} className="p-4 text-left text-sm font-semibold text-primary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((session, idx) => {
                const st = getStatusStyle(session.status);
                return (
                  <tr key={session.id} className={idx < filtered.length - 1 ? "border-b border-[#4d4635]/50" : ""}>
                    <td className="p-4 text-sm font-semibold text-on-surface">S{String(session.id).padStart(3, "0")}</td>
                    <td className="p-4">
                      <p className="text-sm font-semibold text-on-surface">{session.member}</p>
                      <p className="member-card-label text-xs">{session.member_code}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-primary" />
                        <span className="text-sm text-on-surface">{session.room}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-on-surface-variant" />
                        <span className="text-sm text-on-surface">{session.start_time}</span>
                      </div>
                    </td>
                    <td className="p-4 member-card-label text-sm">{session.end_time}</td>
                    <td className="p-4">
                      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-sm font-semibold ${session.attendance_linked ? "text-[#34D399]" : "text-on-surface-variant"}`}>
                        {session.attendance_linked ? "Đã điểm danh" : "Chưa điểm danh"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/trainer/sessions/${session.id}`)}
                          className="rounded-lg bg-[#121414] p-2 text-primary transition hover:bg-surface-container-high"
                          title="Xem chi tiết"
                        >
                          <Eye className="size-4" />
                        </button>
                        {session.status === "scheduled" && (
                          <button
                            onClick={() => navigate(`/trainer/edit-session/${session.id}`)}
                            className="rounded-lg bg-[#121414] p-2 text-primary transition hover:bg-surface-container-high"
                            title="Chỉnh sửa"
                          >
                            <Edit className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
