import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { User, Mail, Phone, Calendar, Lock, CheckCircle, Edit2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.fullName ?? "",
    phone: user?.phone ?? "",
  });

  const emailVerified = user?.status === "active";

  const handleSave = () => {
    // TODO Module 4: PATCH /users/:id
    setIsEditing(false);
  };

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Hồ sơ cá nhân"
          description="Cập nhật thông tin tài khoản và bảo mật ở một nơi."
        />

        <div className="max-w-3xl">
          {/* Profile Header */}
          <div
            className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #4d4635' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f2ca50' }}>
                  <User size={40} style={{ color: '#000000' }} />
                </div>
                <div>
                  <h2 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600 }}>
                    {user?.fullName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="px-2 py-1 rounded-full flex items-center gap-1"
                      style={{
                        backgroundColor: user?.status === 'active' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                        color: user?.status === 'active' ? '#34D399' : '#FBBF24',
                        fontSize: '0.875rem'
                      }}
                    >
                      <CheckCircle size={14} />
                      <span className="capitalize">{user?.status ?? 'active'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105"
                  style={{ backgroundColor: '#f2ca50', color: '#000000', fontWeight: 600 }}
                >
                  <Edit2 size={16} />
                  <span>Chỉnh sửa</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Ngày tham gia
                </p>
                <div className="flex items-center gap-2">
                  <Calendar size={16} style={{ color: '#f2ca50' }} />
                  <span style={{ color: '#d0c5af', fontWeight: 600, fontSize: '0.875rem' }}>
                    — (cần Module 4)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Trạng thái email
                </p>
                <div className="flex items-center gap-2">
                  {emailVerified ? (
                    <>
                      <CheckCircle size={16} style={{ color: '#34D399' }} />
                      <span style={{ color: '#34D399', fontWeight: 600 }}>Đã xác thực</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} style={{ color: '#FBBF24' }} />
                      <span style={{ color: '#FBBF24', fontWeight: 600 }}>Chưa xác thực</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div
            className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #4d4635' }}
          >
            <h3 className="member-card-title mb-6">Thông tin cá nhân</h3>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                  Họ và tên
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <User size={20} style={{ color: '#d0c5af' }} />
                  </div>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full pl-12 pr-4 py-3 rounded-[1.75rem] outline-none transition-all"
                    style={{
                      backgroundColor: '#121414',
                      color: '#e2e2e2',
                      border: '1px solid #4d4635',
                      cursor: !isEditing ? 'not-allowed' : 'text',
                    }}
                  />
                </div>
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Mail size={20} style={{ color: '#d0c5af' }} />
                  </div>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="w-full pl-12 pr-4 py-3 rounded-[1.75rem] outline-none"
                    style={{
                      backgroundColor: '#1A1C1C',
                      color: '#d0c5af',
                      border: '1px solid #4d4635',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                  Số điện thoại
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Phone size={20} style={{ color: '#d0c5af' }} />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="w-full pl-12 pr-4 py-3 rounded-[1.75rem] outline-none transition-all"
                    style={{
                      backgroundColor: '#121414',
                      color: '#e2e2e2',
                      border: '1px solid #4d4635',
                      cursor: !isEditing ? 'not-allowed' : 'text',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div
            className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #4d4635' }}
          >
            <h3 className="member-card-title mb-4">Bảo mật</h3>
            <button
              className="w-full p-4 rounded-xl flex items-center justify-between transition-all hover:scale-[1.01]"
              style={{ backgroundColor: '#121414' }}
            >
              <div className="flex items-center gap-3">
                <Lock size={20} style={{ color: '#f2ca50' }} />
                <div className="text-left">
                  <p style={{ color: '#e2e2e2', fontWeight: 600 }}>Đổi mật khẩu</p>
                  <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                    Thay đổi mật khẩu đăng nhập của bạn
                  </p>
                </div>
              </div>
              <Edit2 size={20} style={{ color: '#d0c5af' }} />
            </button>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setFormData({ full_name: user?.fullName ?? "", phone: user?.phone ?? "" });
                  setIsEditing(false);
                }}
                className="flex-1 py-3 rounded-full transition-all"
                style={{ backgroundColor: 'transparent', color: '#d0c5af', border: '1px solid #4d4635' }}
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-full transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#f2ca50', color: '#000000', fontWeight: 600 }}
              >
                <CheckCircle size={20} />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
