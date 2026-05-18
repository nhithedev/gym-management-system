import { useState } from "react";
import { useNavigate } from "react-router";
import { TrendingUp, Calendar, User, Plus, ArrowUp, ArrowDown } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function ProgressList() {
  const navigate = useNavigate();
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("this-month");

  const members = [
    { code: "MEM001", name: "Nguyễn Văn A" },
    { code: "MEM002", name: "Trần Thị B" },
    { code: "MEM003", name: "Lê Văn C" },
  ];

  const progressRecords = [
    { id: 1, recorded_at: "16/05/2026 10:30", member: { code: "MEM001", name: "Nguyễn Văn A" }, weight: 75.5, weight_change: 0.5, bmi: 24.8, bmi_change: -0.2, goal: "Giảm 2kg trong tháng này", recorded_by: "PT. Nguyễn Văn A" },
    { id: 2, recorded_at: "15/05/2026 14:20", member: { code: "MEM002", name: "Trần Thị B" }, weight: 62.0, weight_change: -0.3, bmi: 22.1, bmi_change: -0.1, goal: "Tăng cơ bắp, giảm mỡ thừa", recorded_by: "PT. Nguyễn Văn A" },
    { id: 3, recorded_at: "14/05/2026 09:15", member: { code: "MEM003", name: "Lê Văn C" }, weight: 88.2, weight_change: -1.2, bmi: 28.5, bmi_change: -0.4, goal: "Giảm cân xuống 80kg", recorded_by: "PT. Nguyễn Văn A" },
    { id: 4, recorded_at: "13/05/2026 16:45", member: { code: "MEM001", name: "Nguyễn Văn A" }, weight: 75.0, weight_change: -0.5, bmi: 25.0, bmi_change: -0.2, goal: "Giảm 2kg trong tháng này", recorded_by: "PT. Nguyễn Văn A" },
    { id: 5, recorded_at: "12/05/2026 11:00", member: { code: "MEM002", name: "Trần Thị B" }, weight: 62.3, weight_change: 0.2, bmi: 22.2, bmi_change: 0.1, goal: "Tăng cơ bắp, giảm mỡ thừa", recorded_by: "PT. Nguyễn Văn A" },
  ];

  const filtered = progressRecords.filter((r) => memberFilter === "all" || r.member.code === memberFilter);

  const ChangeBadge = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isUp = value > 0;
    return (
      <span
        className="ml-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs"
        style={{ backgroundColor: isUp ? "rgba(239,68,68,0.12)" : "rgba(52,211,153,0.12)", color: isUp ? "#EF4444" : "#34D399" }}
      >
        {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
        {Math.abs(value)}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader title="Danh sách tiến độ" description="Theo dõi tiến độ của tất cả học viên" variant="page" />
        <button onClick={() => navigate('/trainer/add-progress')} className="member-btn-primary shrink-0">
          <Plus className="size-4" />
          <span>Thêm bản ghi mới</span>
        </button>
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
              <button
                onClick={() => setMemberFilter("all")}
                className={memberFilter === "all" ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}
              >
                Tất cả
              </button>
              {members.map((m) => (
                <button
                  key={m.code}
                  onClick={() => setMemberFilter(m.code)}
                  className={memberFilter === m.code ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}
                >
                  {m.name}
                </button>
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
                <button
                  key={f.value}
                  onClick={() => setDateRange(f.value)}
                  className={dateRange === f.value ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="member-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#121414]">
            <TrendingUp className="size-10 text-on-surface-variant" />
          </div>
          <h3 className="member-card-title mb-2">Chưa có bản ghi tiến độ</h3>
          <p className="member-card-label mb-6">Các bản ghi tiến độ bạn tạo sẽ hiển thị ở đây</p>
          <button onClick={() => navigate('/trainer/add-progress')} className="member-btn-primary">
            Thêm bản ghi đầu tiên
          </button>
        </section>
      ) : (
        <section className="member-card overflow-hidden p-0">
          <div className="overflow-x-auto app-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#4d4635] bg-[#121414]">
                  {["Thời gian ghi nhận", "Học viên", "Cân nặng", "BMI", "Mục tiêu", "Ghi nhận bởi"].map((h) => (
                    <th key={h} className="p-4 text-left text-sm font-semibold text-primary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((record, idx) => (
                  <tr key={record.id} className={idx < filtered.length - 1 ? "border-b border-[#4d4635]/50" : ""}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-primary" />
                        <span className="text-sm text-on-surface">{record.recorded_at}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-semibold text-on-surface">{record.member.name}</p>
                      <p className="member-card-label text-xs">{record.member.code}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-on-surface">{record.weight} kg</span>
                      <ChangeBadge value={record.weight_change} />
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-on-surface">{record.bmi}</span>
                      <ChangeBadge value={record.bmi_change} />
                    </td>
                    <td className="p-4 text-sm text-on-surface max-w-[260px]">{record.goal}</td>
                    <td className="p-4 member-card-label text-sm">{record.recorded_by}</td>
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
