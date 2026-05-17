import { useState } from "react";
import { useNavigate } from "react-router";
import { Users, Search, Filter, Plus, TrendingUp, Calendar, Eye } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function StudentsList() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");

  const students = [
    { id: 1, member_code: "MB001", full_name: "Nguyễn Văn A", phone: "0123456789", package_status: "active", package_name: "Premium", next_session: "16/05/2026 10:00", latest_progress_date: "15/05/2026" },
    { id: 2, member_code: "MB002", full_name: "Trần Thị B", phone: "0987654321", package_status: "active", package_name: "Standard", next_session: "16/05/2026 14:00", latest_progress_date: "14/05/2026" },
    { id: 3, member_code: "MB003", full_name: "Lê Văn C", phone: "0369852147", package_status: "expiring", package_name: "Basic", next_session: "17/05/2026 09:00", latest_progress_date: "10/05/2026" },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active": return { bg: "rgba(52,211,153,0.12)", color: "#34D399", label: "Active" };
      case "expiring": return { bg: "rgba(251,191,36,0.12)", color: "#FBBF24", label: "Sắp hết hạn" };
      case "expired": return { bg: "rgba(239,68,68,0.12)", color: "#EF4444", label: "Hết hạn" };
      default: return { bg: "rgba(255,255,255,0.05)", color: "#99907C", label: status };
    }
  };

  const filtered = students.filter((s) => {
    if (packageFilter !== "all" && s.package_status !== packageFilter) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      return s.full_name.toLowerCase().includes(kw) || s.member_code.toLowerCase().includes(kw) || s.phone.includes(kw);
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SectionHeader
        title="Danh sách học viên"
        description="Quản lý học viên được gán cho bạn"
        variant="page"
      />

      {/* Filter bar */}
      <section className="member-card mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Tìm kiếm tên, mã, số điện thoại..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input-base pl-9"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="size-4 text-primary" />
            {[
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Active" },
              { value: "expiring", label: "Sắp hết hạn" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setPackageFilter(f.value)}
                className={packageFilter === f.value ? "member-btn-primary px-4 py-1.5 text-sm" : "member-btn-outline px-4 py-1.5 text-sm"}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="member-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#121414]">
            <Users className="size-10 text-on-surface-variant" />
          </div>
          <h3 className="member-card-title mb-2">Chưa có học viên</h3>
          <p className="member-card-label">Liên hệ quản lý để được gán học viên</p>
        </section>
      ) : (
        <section className="member-card overflow-hidden p-0">
          <div className="overflow-x-auto app-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#4d4635] bg-[#121414]">
                  {["Mã HV", "Họ tên", "Số điện thoại", "Gói tập", "Buổi tập tiếp theo", "Progress gần nhất", "Hành động"].map((h) => (
                    <th key={h} className="p-4 text-left text-sm font-semibold text-primary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, idx) => {
                  const st = getStatusStyle(student.package_status);
                  return (
                    <tr key={student.id} className={idx < filtered.length - 1 ? "border-b border-[#4d4635]/50" : ""}>
                      <td className="p-4 text-sm font-semibold text-on-surface">{student.member_code}</td>
                      <td className="p-4 text-sm text-on-surface">{student.full_name}</td>
                      <td className="p-4 member-card-label">{student.phone}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-on-surface">{student.package_name}</span>
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-3.5 text-primary" />
                          <span className="text-sm text-on-surface">{student.next_session}</span>
                        </div>
                      </td>
                      <td className="p-4 member-card-label text-sm">{student.latest_progress_date}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/trainer/students/${student.id}`)}
                            className="rounded-lg bg-[#121414] p-2 text-primary transition hover:bg-surface-container-high"
                            title="Xem chi tiết"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => navigate('/trainer/create-session', { state: { student } })}
                            className="rounded-lg bg-[#121414] p-2 text-primary transition hover:bg-surface-container-high"
                            title="Tạo buổi tập"
                          >
                            <Plus className="size-4" />
                          </button>
                          <button
                            onClick={() => navigate('/trainer/add-progress', { state: { student } })}
                            className="rounded-lg bg-[#121414] p-2 text-primary transition hover:bg-surface-container-high"
                            title="Thêm tiến độ"
                          >
                            <TrendingUp className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
