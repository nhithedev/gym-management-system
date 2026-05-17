import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { TrendingUp, User, Scale, Activity, Target, FileText, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function AddProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedMember = location.state?.memberCode || "";

  const [formData, setFormData] = useState({ member_code: preSelectedMember, weight: "", bmi: "", goal: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const assignedMembers = [
    { code: "MEM001", name: "Nguyễn Văn A", latest_weight: 75.0, latest_bmi: 25.0 },
    { code: "MEM002", name: "Trần Thị B", latest_weight: 62.3, latest_bmi: 22.2 },
    { code: "MEM003", name: "Lê Văn C", latest_weight: 88.2, latest_bmi: 28.5 },
  ];

  const selectedMember = assignedMembers.find((m) => m.code === formData.member_code);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.member_code) errs.member_code = "Vui lòng chọn học viên";
    if (!formData.weight) errs.weight = "Vui lòng nhập cân nặng";
    else if (parseFloat(formData.weight) <= 0 || parseFloat(formData.weight) > 300) errs.weight = "Cân nặng không hợp lệ";
    if (!formData.bmi) errs.bmi = "Vui lòng nhập BMI";
    else if (parseFloat(formData.bmi) < 10 || parseFloat(formData.bmi) > 50) errs.bmi = "BMI phải trong khoảng 10-50";
    if (!formData.goal) errs.goal = "Vui lòng nhập mục tiêu";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) navigate("/trainer/progress-list");
  };

  const weightChange = selectedMember && formData.weight ? parseFloat(formData.weight) - selectedMember.latest_weight : null;
  const bmiChange = selectedMember && formData.bmi ? parseFloat(formData.bmi) - selectedMember.latest_bmi : null;

  const inputCls = (hasError: boolean) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-on-surface bg-[#282A2B] outline-none transition focus:border-primary focus:ring-1 focus:ring-primary ${hasError ? "border-[#EF4444]" : "border-[#4d4635]"}`;

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="mt-1 flex items-center gap-1 text-sm text-[#EF4444]">
        <AlertCircle className="size-3.5" />{msg}
      </p>
    ) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SectionHeader title="Thêm bản ghi tiến độ" description="Cập nhật tiến độ cho học viên" variant="page" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <section className="member-card mb-6">
              <h2 className="member-card-title mb-6">Thông tin tiến độ</h2>

              {/* Member */}
              <div className="mb-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <User className="size-4 text-primary" /><span>Học viên</span><span className="text-[#EF4444]">*</span>
                </label>
                <select value={formData.member_code} onChange={(e) => setFormData({ ...formData, member_code: e.target.value })} className={inputCls(!!errors.member_code)}>
                  <option value="">-- Chọn học viên --</option>
                  {assignedMembers.map((m) => (<option key={m.code} value={m.code}>{m.name} ({m.code})</option>))}
                </select>
                <FieldError msg={errors.member_code} />
              </div>

              {/* Weight */}
              <div className="mb-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Scale className="size-4 text-primary" /><span>Cân nặng (kg)</span><span className="text-[#EF4444]">*</span>
                </label>
                <input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="Nhập cân nặng" className={inputCls(!!errors.weight)} />
                <FieldError msg={errors.weight} />
              </div>

              {/* BMI */}
              <div className="mb-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Activity className="size-4 text-primary" /><span>BMI</span><span className="text-[#EF4444]">*</span>
                </label>
                <input type="number" step="0.1" value={formData.bmi} onChange={(e) => setFormData({ ...formData, bmi: e.target.value })} placeholder="Nhập BMI" className={inputCls(!!errors.bmi)} />
                <FieldError msg={errors.bmi} />
              </div>

              {/* Goal */}
              <div className="mb-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Target className="size-4 text-primary" /><span>Mục tiêu</span><span className="text-[#EF4444]">*</span>
                </label>
                <input type="text" value={formData.goal} onChange={(e) => setFormData({ ...formData, goal: e.target.value })} placeholder="Ví dụ: Giảm 2kg trong tháng này" className={inputCls(!!errors.goal)} />
                <FieldError msg={errors.goal} />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <FileText className="size-4 text-primary" /><span>Ghi chú</span>
                </label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Thêm ghi chú về quá trình tập luyện..." rows={4} className={`${inputCls(false)} resize-y`} />
              </div>
            </section>

            <div className="flex gap-4">
              <button type="submit" className="member-btn-primary">
                <TrendingUp className="size-4" /><span>Lưu bản ghi</span>
              </button>
              <button type="button" onClick={() => navigate("/trainer/progress-list")} className="member-btn-outline">
                Hủy
              </button>
            </div>
          </form>
        </div>

        {/* Comparison panel */}
        <div>
          {selectedMember ? (
            <section className="member-card">
              <h2 className="member-card-title mb-6">So sánh với lần gần nhất</h2>
              <div className="space-y-4">
                {/* Weight */}
                <div className="rounded-xl bg-[#121414] p-4">
                  <p className="member-card-label mb-2">Cân nặng</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-on-surface">{selectedMember.latest_weight} kg</p>
                      <p className="member-card-label text-xs">Lần trước</p>
                    </div>
                    {formData.weight && (
                      <div className="text-right">
                        <p className="text-lg font-semibold text-primary">{formData.weight} kg</p>
                        {weightChange !== null && weightChange !== 0 && (
                          <span className="inline-flex items-center gap-0.5 text-sm" style={{ color: weightChange > 0 ? "#EF4444" : "#34D399" }}>
                            {weightChange > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                            {Math.abs(weightChange).toFixed(1)} kg
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* BMI */}
                <div className="rounded-xl bg-[#121414] p-4">
                  <p className="member-card-label mb-2">BMI</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-on-surface">{selectedMember.latest_bmi}</p>
                      <p className="member-card-label text-xs">Lần trước</p>
                    </div>
                    {formData.bmi && (
                      <div className="text-right">
                        <p className="text-lg font-semibold text-primary">{formData.bmi}</p>
                        {bmiChange !== null && bmiChange !== 0 && (
                          <span className="inline-flex items-center gap-0.5 text-sm" style={{ color: bmiChange > 0 ? "#EF4444" : "#34D399" }}>
                            {bmiChange > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                            {Math.abs(bmiChange).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="member-card text-center py-8">
              <p className="member-card-label">Chọn học viên để xem so sánh tiến độ</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
