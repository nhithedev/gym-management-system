import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { User, MapPin, Clock, AlertTriangle, CheckCircle, Save } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function CreateSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const preSelectedStudent = location.state?.student;
  const isEditing = Boolean(params.id) || location.state?.mode === "edit";

  const [formData, setFormData] = useState({ member_id: preSelectedStudent?.id || "", room_id: "", start_time: "", end_time: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const students = [
    { id: 1, name: "Nguyễn Văn A", code: "MB001", package_status: "active" },
    { id: 2, name: "Trần Thị B", code: "MB002", package_status: "active" },
    { id: 3, name: "Lê Văn C", code: "MB003", package_status: "expiring" },
  ];

  const rooms = [{ id: 1, name: "Phòng 1" }, { id: 2, name: "Phòng 2" }, { id: 3, name: "Phòng 3" }];

  const selectedStudent = students.find((s) => s.id === parseInt(formData.member_id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formData.member_id) errs.member_id = "Vui lòng chọn học viên";
    if (!formData.room_id) errs.room_id = "Vui lòng chọn phòng";
    if (!formData.start_time) errs.start_time = "Vui lòng chọn thời gian bắt đầu";
    if (!formData.end_time) errs.end_time = "Vui lòng chọn thời gian kết thúc";
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time)
      errs.end_time = "Thời gian kết thúc phải sau thời gian bắt đầu";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    navigate("/trainer/sessions");
  };

  const inputCls = (hasError: boolean) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-on-surface bg-[#282A2B] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary ${hasError ? "border-[#EF4444]" : "border-[#4d4635]"}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SectionHeader
        title={isEditing ? "Chỉnh sửa buổi tập" : "Tạo buổi tập mới"}
        description={isEditing ? "Cập nhật thông tin buổi tập đã lên lịch" : "Lên lịch buổi tập cho học viên"}
        variant="page"
      />

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <section className="member-card mb-6">
            <h3 className="member-card-title mb-6">Thông tin buổi tập</h3>
            <div className="space-y-5">
              {/* Student */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-on-surface">Học viên *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
                  <select value={formData.member_id} onChange={(e) => setFormData({ ...formData, member_id: e.target.value })} className={`${inputCls(!!errors.member_id)} pl-9`}>
                    <option value="">-- Chọn học viên --</option>
                    {students.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
                  </select>
                </div>
                {errors.member_id && <p className="mt-1 text-sm text-[#EF4444]">{errors.member_id}</p>}
              </div>

              {/* Package status info */}
              {selectedStudent && (
                <div className={`rounded-xl border p-4 ${selectedStudent.package_status === "active" ? "border-[#34D399]/40 bg-[#34D399]/8" : "border-[#FBBF24]/40 bg-[#FBBF24]/8"}`}>
                  <div className="flex items-start gap-3">
                    {selectedStudent.package_status === "active"
                      ? <CheckCircle className="size-5 shrink-0 text-[#34D399]" />
                      : <AlertTriangle className="size-5 shrink-0 text-[#FBBF24]" />}
                    <div>
                      <p className={`text-sm font-semibold mb-1 ${selectedStudent.package_status === "active" ? "text-[#34D399]" : "text-[#FBBF24]"}`}>
                        {selectedStudent.package_status === "active" ? "Gói tập đang hoạt động" : "Gói tập sắp hết hạn"}
                      </p>
                      <p className="member-card-label text-sm">
                        {selectedStudent.package_status === "active" ? "Học viên có thể đăng ký buổi tập" : "Gói tập sẽ hết hạn trong vài ngày tới"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Room */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-on-surface">Phòng tập *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
                  <select value={formData.room_id} onChange={(e) => setFormData({ ...formData, room_id: e.target.value })} className={`${inputCls(!!errors.room_id)} pl-9`}>
                    <option value="">-- Chọn phòng --</option>
                    {rooms.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                  </select>
                </div>
                {errors.room_id && <p className="mt-1 text-sm text-[#EF4444]">{errors.room_id}</p>}
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-on-surface">Thời gian bắt đầu *</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
                    <input type="datetime-local" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className={`${inputCls(!!errors.start_time)} pl-9`} />
                  </div>
                  {errors.start_time && <p className="mt-1 text-sm text-[#EF4444]">{errors.start_time}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-on-surface">Thời gian kết thúc *</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
                    <input type="datetime-local" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className={`${inputCls(!!errors.end_time)} pl-9`} />
                  </div>
                  {errors.end_time && <p className="mt-1 text-sm text-[#EF4444]">{errors.end_time}</p>}
                </div>
              </div>
            </div>
          </section>

          <div className="flex gap-4">
            <button type="button" onClick={() => navigate("/trainer/sessions")} className="member-btn-outline flex-1 justify-center">Hủy</button>
            <button type="submit" className="member-btn-primary flex-1 justify-center">
              <Save className="size-4" /><span>{isEditing ? "Cập nhật buổi tập" : "Lưu buổi tập"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
