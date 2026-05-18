import { useState } from "react";
import { useNavigate } from "react-router";
import SectionHeader from "@/components/common/SectionHeader";
import { User, Mail, Phone, Calendar, MapPin, Lock, Package, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<string>("premium");

  const packages = [
    {
      id: "basic",
      name: "Basic",
      duration: 30,
      price: "500,000",
      benefits: ["Tập gym cơ bản", "Tủ đồ miễn phí", "Wifi miễn phí"]
    },
    {
      id: "standard",
      name: "Standard",
      duration: 90,
      price: "1,200,000",
      benefits: ["Tập gym không giới hạn", "Tủ đồ miễn phí", "1 buổi PT/tuần", "Đồ uống miễn phí"]
    },
    {
      id: "premium",
      name: "Premium",
      duration: 180,
      price: "2,000,000",
      benefits: ["Tất cả lợi ích Standard", "3 buổi PT/tuần", "Massage miễn phí", "Ưu tiên đặt lịch"]
    }
  ];

  const selectedPackageData = packages.find(p => p.id === selectedPackage);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#121414' }}>
      <div className="w-full max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 transition-all hover:gap-3"
          style={{ color: '#d0c5af' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f2ca50'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#d0c5af'}
        >
          <ArrowLeft size={20} />
          <span>Quay về đăng nhập</span>
        </button>
        <SectionHeader
          title="Đăng ký thành viên"
          description="Điền thông tin để tạo tài khoản mới và chọn gói phù hợp."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div
              className="p-8 rounded-[1.75rem] backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              {/* Personal Information */}
              <div className="mb-8">
                <SectionHeader
                  title="Thông tin cá nhân"
                  description="Nhập dữ liệu chính xác để hoàn tất quá trình đăng ký."
                  variant="section"
                />

                <div className="space-y-4">
                  <div>
                    <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                      Họ và tên *
                    </label>
                    <div className="relative">
                      <User size={20} style={{ color: '#d0c5af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Nhập họ và tên"
                        className="w-full pl-10 pr-4 py-3 rounded-[1.75rem] outline-none"
                        style={{
                          backgroundColor: '#121414',
                          color: '#e2e2e2',
                          border: '1px solid #4d4635'
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                        Email *
                      </label>
                      <div className="relative">
                        <Mail size={20} style={{ color: '#d0c5af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="email"
                          placeholder="email@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-[1.75rem] outline-none"
                          style={{
                            backgroundColor: '#121414',
                            color: '#e2e2e2',
                            border: '1px solid #4d4635'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                        Số điện thoại *
                      </label>
                      <div className="relative">
                        <Phone size={20} style={{ color: '#d0c5af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="tel"
                          placeholder="0123456789"
                          className="w-full pl-10 pr-4 py-3 rounded-[1.75rem] outline-none"
                          style={{
                            backgroundColor: '#121414',
                            color: '#e2e2e2',
                            border: '1px solid #4d4635'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                      Ngày sinh *
                    </label>
                    <div className="relative">
                      <Calendar size={20} style={{ color: '#d0c5af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="date"
                        className="w-full pl-10 pr-4 py-3 rounded-[1.75rem] outline-none"
                        style={{
                          backgroundColor: '#121414',
                          color: '#e2e2e2',
                          border: '1px solid #4d4635'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                      Địa chỉ
                    </label>
                    <div className="relative">
                      <MapPin size={20} style={{ color: '#d0c5af', position: 'absolute', left: '12px', top: '14px' }} />
                      <textarea
                        placeholder="Nhập địa chỉ"
                        rows={3}
                        className="w-full pl-10 pr-4 py-3 rounded-[1.75rem] outline-none resize-none"
                        style={{
                          backgroundColor: '#121414',
                          color: '#e2e2e2',
                          border: '1px solid #4d4635'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account & Package */}
              <div>
                <SectionHeader
                  title="Tài khoản & Gói tập"
                  description="Chọn gói phù hợp và đặt thông tin bảo mật cho tài khoản."
                  variant="section"
                />

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                        Mật khẩu *
                      </label>
                      <div className="relative">
                        <Lock size={20} style={{ color: '#d0c5af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 rounded-[1.75rem] outline-none"
                          style={{
                            backgroundColor: '#121414',
                            color: '#e2e2e2',
                            border: '1px solid #4d4635'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                        Xác nhận mật khẩu *
                      </label>
                      <div className="relative">
                        <Lock size={20} style={{ color: '#d0c5af', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 rounded-[1.75rem] outline-none"
                          style={{
                            backgroundColor: '#121414',
                            color: '#e2e2e2',
                            border: '1px solid #4d4635'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                      Chọn gói tập *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {packages.map(pkg => (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg.id)}
                          className="p-4 rounded-[1.75rem] transition-all"
                          style={{
                            backgroundColor: selectedPackage === pkg.id ? '#f2ca50' : '#121414',
                            color: selectedPackage === pkg.id ? '#000000' : '#e2e2e2',
                            border: `2px solid ${selectedPackage === pkg.id ? '#f2ca50' : '#4d4635'}`
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{pkg.name}</div>
                          <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                            {pkg.duration} ngày
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 rounded-full transition-all"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#d0c5af',
                    border: '1px solid #4d4635'
                  }}
                >
                  Quay về đăng nhập
                </button>
                <button
                  onClick={() => navigate('/member/verify-email')}
                  className="flex-1 px-6 py-3 rounded-full transition-all"
                  style={{
                    backgroundColor: '#f2ca50',
                    color: '#000000',
                    fontWeight: 600
                  }}
                >
                  Tạo tài khoản và tiếp tục
                </button>
              </div>
            </div>
          </div>

          {/* Package Preview */}
          <div>
            <div
              className="p-6 rounded-[1.75rem] sticky top-6 backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Package size={24} style={{ color: '#f2ca50' }} />
                <h3 className="member-card-title">
                  Gói đã chọn
                </h3>
              </div>

              {selectedPackageData && (
                <>
                  <div className="mb-6">
                    <div
                      className="text-center py-4 px-6 rounded-[1.75rem] mb-4"
                      style={{ backgroundColor: '#f2ca50' }}
                    >
                      <div style={{ color: '#000000', fontSize: '1.5rem', fontWeight: 600 }}>
                        {selectedPackageData.name}
                      </div>
                      <div style={{ color: '#000000', fontSize: '0.875rem' }}>
                        {selectedPackageData.duration} ngày
                      </div>
                    </div>

                    <div className="text-center mb-4">
                      <div style={{ color: '#d0c5af', fontSize: '0.875rem' }}>Giá gói</div>
                      <div className="text-3xl font-semibold text-[#f2ca50]">
                        {selectedPackageData.price}đ
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3" style={{ color: '#e2e2e2', fontWeight: 600 }}>
                      Quyền lợi:
                    </div>
                    <ul className="space-y-2">
                      {selectedPackageData.benefits.map((benefit, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2"
                          style={{ color: '#d0c5af', fontSize: '0.875rem' }}
                        >
                          <span style={{ color: '#f2ca50' }}>✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
