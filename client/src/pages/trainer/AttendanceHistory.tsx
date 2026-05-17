import { useState } from "react";
import { Clock, Activity, AlertTriangle, Calendar, User, CheckCircle } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function AttendanceHistory() {
  const [dateRange, setDateRange] = useState<string>("today");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  const kpiStats = [
    { label: "Check-in hôm nay", value: "12", icon: CheckCircle, color: "#34D399" },
    { label: "Session được liên kết", value: "8", icon: Activity, color: "#f2ca50" },
    { label: "Ước tính no-show", value: "2", icon: AlertTriangle, color: "#EF4444" },
  ];

  const members = [
    { code: "MEM001", name: "Nguyễn Văn A" },
    { code: "MEM002", name: "Trần Thị B" },
    { code: "MEM003", name: "Lê Văn C" },
  ];

  const attendanceRecords = [
    { id: 1, member: { code: "MEM001", name: "Nguyễn Văn A" }, checked_in_at: "16/05/2026 08:05", checked_out_at: "16/05/2026 09:55", method: "QR Code", linked_session: "Personal Training - Phòng 1", session_id: "SS001", duration: "1h 50m" },
    { id: 2, member: { code: "MEM002", name: "Trần Thị B" }, checked_in_at: "16/05/2026 09:30", checked_out_at: "16/05/2026 11:00", method: "App Check-in", linked_session: "Yoga - Phòng 2", session_id: "SS002", duration: "1h 30m" },
    { id: 3, member: { code: "MEM003", name: "Lê Văn C" }, checked_in_at: "16/05/2026 06:30", checked_out_at: null, method: "Member Code", linked_session: "Tự tập", session_id: null, duration: "Đang tập" },
    { id: 4, member: { code: "MEM001", name: "Nguyễn Văn A" }, checked_in_at: "15/05/2026 17:00", checked_out_at: "15/05/2026 18:30", method: "QR Code", linked_session: "Cardio - Phòng 1", session_id: "SS003", duration: "1h 30m" },
    { id: 5, member: { code: "MEM002", name: "Trần Thị B" }, checked_in_at: "15/05/2026 14:00", checked_out_at: "15/05/2026 15:30", method: "App Check-in", linked_session: "Strength Training - Phòng 3", session_id: "SS004", duration: "1h 30m" },
  ];

  const filtered = attendanceRecords.filter((r) => memberFilter === "all" || r.member.code === memberFilter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SectionHeader
        title="Lịch sử điểm danh"
        description="Theo dõi attendance của học viên"
        variant="page"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {kpiStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="member-card flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#121414]">
                <Icon className="size-7" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="member-card-label">{stat.label}</p>
                <p className="text-3xl font-semibold text-on-surface">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <section className="member-card mb-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Member filter */}
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <User className="size-4 text-primary" />
              <span className="text-sm font-semibold text-on-surface">Học viên:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setMemberFilter("all")} className={memberFilter === "all" ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}>Tất cả</button>
              {members.map((m) => (
                <button key={m.code} onClick={() => setMemberFilter(m.code)} className={memberFilter === m.code ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}>{m.name}</button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span className="text-sm font-semibold text-on-surface">Thời gian:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ value: "today", label: "Hôm nay" }, { value: "this-week", label: "Tuần này" }, { value: "this-month", label: "Tháng này" }, { value: "all", label: "Tất cả" }].map((f) => (
                <button key={f.value} onClick={() => setDateRange(f.value)} className={dateRange === f.value ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="member-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#121414]">
            <Activity className="size-10 text-on-surface-variant" />
          </div>
          <h3 className="member-card-title mb-2">Chưa có lịch sử điểm danh</h3>
          <p className="member-card-label">Dữ liệu điểm danh sẽ hiển thị khi học viên check-in</p>
        </section>
      ) : (
        <section className="member-card overflow-hidden p-0">
          <div className="overflow-x-auto app-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#4d4635] bg-[#121414]">
                  {["Học viên", "Check-in", "Check-out", "Thời gian tập", "Phương thức", "Buổi tập liên kết"].map((h) => (
                    <th key={h} className="p-4 text-left text-sm font-semibold text-primary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((record, idx) => (
                  <tr key={record.id} className={idx < filtered.length - 1 ? "border-b border-[#4d4635]/50" : ""}>
                    <td className="p-4">
                      <p className="text-sm font-semibold text-on-surface">{record.member.name}</p>
                      <p className="member-card-label text-xs">{record.member.code}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="size-3.5 text-[#34D399]" />
                        <span className="text-sm text-on-surface">{record.checked_in_at}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {record.checked_out_at ? (
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-[#6366F1]" />
                          <span className="text-sm text-on-surface">{record.checked_out_at}</span>
                        </div>
                      ) : (
                        <span className="member-card-label text-sm">Chưa check-out</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-sm font-semibold ${record.checked_out_at ? "text-on-surface" : "text-[#FBBF24]"}`}>
                        {record.duration}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[#121414] px-3 py-1 text-xs text-primary">{record.method}</span>
                    </td>
                    <td className="p-4">
                      {record.session_id ? (
                        <div>
                          <p className="text-sm text-on-surface">{record.linked_session}</p>
                          <p className="member-card-label text-xs">ID: {record.session_id}</p>
                        </div>
                      ) : (
                        <span className="member-card-label text-sm">{record.linked_session}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
