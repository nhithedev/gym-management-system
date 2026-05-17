import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { User, Mail, Phone, Calendar, MapPin, Lock, CheckCircle, Edit2 } from "lucide-react";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    phone: "0123456789",
    dob: "1995-05-20",
    address: "123 Đường ABC, Quận 1, TP.HCM"
  });

  const accountInfo = {
    member_code: "MB2026001",
    join_date: "20/05/2026",
    email_verified: true,
    account_status: "active"
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const InputField = ({ icon: Icon, label, name, type = "text", disabled = false }: any) => (
    <div>
      <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon size={20} style={{ color: '#d0c5af' }} />
        </div>
        <input
          type={type}
          name={name}
          value={formData[name as keyof typeof formData]}
          onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
          disabled={disabled || !isEditing}
          className="w-full pl-12 pr-4 py-3 rounded-[1.75rem] outline-none transition-all"
          style={{
            backgroundColor: disabled ? '#1A1C1C' : '#121414',
            color: disabled ? '#d0c5af' : '#e2e2e2',
            border: '1px solid #4d4635',
            cursor: disabled || !isEditing ? 'not-allowed' : 'text',
          }}
        />
      </div>
    </div>
  );

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
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#f2ca50' }}
                >
                  <User size={40} style={{ color: '#000000' }} />
                </div>
                <div>
                  <h2 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600 }}>
                    {formData.full_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#121414', color: '#f2ca50', fontSize: '0.875rem', fontWeight: 600 }}
                    >
                      {accountInfo.member_code}
                    </span>
                    <div
                      className="px-2 py-1 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34D399', fontSize: '0.875rem' }}
                    >
                      <CheckCircle size={14} />
                      <span>Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#f2ca50',
                    color: '#000000',
                    fontWeight: 600
                  }}
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
                  <span style={{ color: '#e2e2e2', fontWeight: 600 }}>
                    {accountInfo.join_date}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Trạng thái email
                </p>
                <div className="flex items-center gap-2">
                  {accountInfo.email_verified ? (
                    <>
                      <CheckCircle size={16} style={{ color: '#34D399' }} />
                      <span style={{ color: '#34D399', fontWeight: 600 }}>
                        Đã xác thực
                      </span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} style={{ color: '#FBBF24' }} />
                      <span style={{ color: '#FBBF24', fontWeight: 600 }}>
                        Chưa xác thực
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div
            className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <h3 className="member-card-title mb-6">
              Thông tin cá nhân
            </h3>

            <div className="space-y-4">
              <InputField
                icon={User}
                label="Họ và tên"
                name="full_name"
              />

              <InputField
                icon={Mail}
                label="Email"
                name="email"
                type="email"
                disabled={true}
              />

              <InputField
                icon={Phone}
                label="Số điện thoại"
                name="phone"
                type="tel"
              />

              <InputField
                icon={Calendar}
                label="Ngày sinh"
                name="dob"
                type="date"
              />

              <div>
                <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                  Địa chỉ
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3">
                    <MapPin size={20} style={{ color: '#d0c5af' }} />
                  </div>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                    className="w-full pl-12 pr-4 py-3 rounded-[1.75rem] outline-none resize-none transition-all"
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
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <h3 className="member-card-title mb-4">
              Bảo mật
            </h3>

            <button
              className="w-full p-4 rounded-xl flex items-center justify-between transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: '#121414',
              }}
            >
              <div className="flex items-center gap-3">
                <Lock size={20} style={{ color: '#f2ca50' }} />
                <div className="text-left">
                  <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                    Đổi mật khẩu
                  </p>
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
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-full transition-all"
                style={{
                  backgroundColor: 'transparent',
                  color: '#d0c5af',
                  border: '1px solid #4d4635'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-full transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#f2ca50',
                  color: '#000000',
                  fontWeight: 600
                }}
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
