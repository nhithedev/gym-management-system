import { useState } from "react";
import { User, Mail, Phone, Calendar, MapPin, Shield, Clock, Key, Edit2, Save, X } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";

export default function TrainerProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "Nguyễn Văn A",
    email: "trainer.a@gym.com",
    phone: "0901234567",
    dob: "1990-05-15",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    specialization: "Personal Training, Yoga, Cardio",
  });

  const accountInfo = {
    trainer_code: "PT001",
    join_date: "01/01/2024",
    role: "Personal Trainer",
    permissions: ["Quản lý học viên được gán", "Tạo và chỉnh sửa buổi tập", "Ghi nhận tiến độ", "Xem lịch sử điểm danh"],
  };

  const workSchedule = [
    { day: "Thứ 2", hours: "08:00 - 17:00", active: true },
    { day: "Thứ 3", hours: "08:00 - 17:00", active: true },
    { day: "Thứ 4", hours: "08:00 - 17:00", active: true },
    { day: "Thứ 5", hours: "08:00 - 17:00", active: true },
    { day: "Thứ 6", hours: "08:00 - 17:00", active: true },
    { day: "Thứ 7", hours: "08:00 - 12:00", active: true },
    { day: "Chủ nhật", hours: "Nghỉ", active: false },
  ];

  const handleSave = () => { setIsEditing(false); };
  const handleCancel = () => {
    setFormData({ full_name: "Nguyễn Văn A", email: "trainer.a@gym.com", phone: "0901234567", dob: "1990-05-15", address: "123 Đường ABC, Quận 1, TP.HCM", specialization: "Personal Training, Yoga, Cardio" });
    setIsEditing(false);
  };

  const inputCls = `w-full rounded-lg border border-[#4d4635] px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-[#121414] disabled:cursor-default bg-[#282A2B]`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader title="Hồ sơ cá nhân" description="Quản lý thông tin cá nhân và cài đặt tài khoản" variant="page" />
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="member-btn-primary shrink-0">
            <Edit2 className="size-4" /><span>Chỉnh sửa</span>
          </button>
        ) : (
          <div className="flex gap-3 shrink-0">
            <button onClick={handleSave} className="member-btn-primary"><Save className="size-4" /><span>Lưu</span></button>
            <button onClick={handleCancel} className="member-btn-outline"><X className="size-4" /><span>Hủy</span></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Avatar */}
          <section className="member-card flex items-center gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-bold text-on-primary">
              {formData.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-on-surface">{formData.full_name}</h2>
              <p className="mt-1 text-lg text-primary">{accountInfo.trainer_code}</p>
              <p className="member-card-label mt-0.5">{accountInfo.role}</p>
            </div>
          </section>

          {/* Personal info */}
          <section className="member-card">
            <h2 className="member-card-title mb-6">Thông tin cá nhân</h2>
            <div className="space-y-4">
              <div>
                <label className="member-card-label mb-1.5 flex items-center gap-2"><User className="size-4" /><span>Họ và tên</span></label>
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} disabled={!isEditing} className={inputCls} />
              </div>
              <div>
                <label className="member-card-label mb-1.5 flex items-center gap-2"><Mail className="size-4" /><span>Email</span></label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={!isEditing} className={inputCls} />
              </div>
              <div>
                <label className="member-card-label mb-1.5 flex items-center gap-2"><Phone className="size-4" /><span>Số điện thoại</span></label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} disabled={!isEditing} className={inputCls} />
              </div>
              <div>
                <label className="member-card-label mb-1.5 flex items-center gap-2"><Calendar className="size-4" /><span>Ngày sinh</span></label>
                <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} disabled={!isEditing} className={inputCls} />
              </div>
              <div>
                <label className="member-card-label mb-1.5 flex items-center gap-2"><MapPin className="size-4" /><span>Địa chỉ</span></label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} disabled={!isEditing} rows={2} className={`${inputCls} resize-y`} />
              </div>
              <div>
                <label className="member-card-label mb-1.5 flex items-center gap-2"><Shield className="size-4" /><span>Chuyên môn</span></label>
                <input type="text" value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} disabled={!isEditing} className={inputCls} />
              </div>
            </div>
          </section>

          {/* Work schedule */}
          <section className="member-card">
            <h2 className="member-card-title mb-6">Lịch làm việc</h2>
            <div className="space-y-3">
              {workSchedule.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-[#121414] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Clock className="size-4 text-primary" />
                    <span className="text-sm font-semibold text-on-surface">{s.day}</span>
                  </div>
                  <span className={`text-sm font-semibold ${s.active ? "text-[#34D399]" : "text-on-surface-variant"}`}>{s.hours}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <section className="member-card">
            <h2 className="member-card-title mb-4">Trạng thái tài khoản</h2>
            <div className="space-y-4">
              <div>
                <p className="member-card-label mb-1">Ngày gia nhập</p>
                <p className="text-sm font-semibold text-on-surface">{accountInfo.join_date}</p>
              </div>
              <div>
                <p className="member-card-label mb-1">Email xác thực</p>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                  <span className="text-sm font-semibold text-[#34D399]">Đã xác thực</span>
                </div>
              </div>
            </div>
          </section>

          <section className="member-card">
            <h2 className="member-card-title mb-4">Quyền hạn</h2>
            <div className="space-y-2.5">
              {accountInfo.permissions.map((p, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Shield className="mt-0.5 size-4 shrink-0 text-[#34D399]" />
                  <span className="text-sm text-on-surface">{p}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="member-card">
            <h2 className="member-card-title mb-4">Bảo mật</h2>
            <button className="member-btn-outline w-full justify-center">
              <Key className="size-4 text-primary" />
              <span>Đổi mật khẩu</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
