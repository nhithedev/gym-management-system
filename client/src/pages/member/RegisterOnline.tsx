import { useState } from "react";
import { useNavigate } from "react-router";
import SectionHeader from "@/components/common/SectionHeader";
import { User, Mail, Phone, Calendar, MapPin, Lock, Package, ArrowLeft, CheckCircle } from "lucide-react";

const packages = [
  {
    id: "basic",
    name: "Basic Package",
    duration: 30,
    price: 500000,
    benefits: ["Truy cập phòng gym cơ bản", "Sử dụng thiết bị cardio", "Tủ đồ miễn phí"]
  },
  {
    id: "standard",
    name: "Standard Package",
    duration: 90,
    price: 1200000,
    benefits: ["Tất cả quyền lợi Basic", "1 buổi PT/tháng", "Sauna & Steam room", "Nước uống miễn phí"]
  },
  {
    id: "premium",
    name: "Premium Package",
    duration: 180,
    price: 2000000,
    benefits: ["Tất cả quyền lợi Standard", "4 buổi PT/tháng", "Dinh dưỡng tư vấn", "Ưu tiên đặt lịch"]
  }
];

export default function RegisterOnline() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState(packages[0]);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    dob: "",
    address: "",
    password: "",
    confirm_password: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.full_name) newErrors.full_name = "Họ tên không được để trống";
    if (!formData.email) newErrors.email = "Email không được để trống";
    if (!formData.phone) newErrors.phone = "Số điện thoại không được để trống";
    if (!formData.password) newErrors.password = "Mật khẩu không được để trống";
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Mật khẩu không khớp";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    navigate("/member/verify-email", { state: { email: formData.email } });
  };

  const InputField = ({ icon: Icon, label, type = "text", name, error }: any) => (
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
          className="w-full pl-12 pr-4 py-3 rounded-[1.75rem] transition-all focus:outline-none focus:ring-2"
          style={{
            backgroundColor: '#121414',
            border: error ? '1px solid #ff6b6b' : '1px solid #4d4635',
            color: '#e2e2e2',
          }}
          onFocus={(e) => !error && (e.target.style.borderColor = '#f2ca50')}
          onBlur={(e) => !error && (e.target.style.borderColor = '#4d4635')}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm" style={{ color: '#ff6b6b' }}>
          {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#121414' }}>
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 transition-all"
          style={{ color: '#d0c5af' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f2ca50'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#d0c5af'}
        >
          <ArrowLeft size={20} />
          <span>Quay về đăng nhập</span>
        </button>

        <div className="max-w-6xl mx-auto">
          <SectionHeader
            title="Đăng ký tài khoản"
            description="Hoàn thành thông tin để bắt đầu hành trình tập luyện."
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div
                  className="p-6 rounded-[1.75rem] backdrop-blur-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #4d4635',
                  }}
                >
                  <SectionHeader
                    title="Thông tin cá nhân"
                    description="Thông tin này dùng để nhận diện và hỗ trợ bạn nhanh hơn."
                    variant="section"
                  />
                  <div className="space-y-4">
                    <InputField
                      icon={User}
                      label="Họ và tên"
                      name="full_name"
                      error={errors.full_name}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        icon={Phone}
                        label="Số điện thoại"
                        type="tel"
                        name="phone"
                        error={errors.phone}
                      />
                      <InputField
                        icon={Mail}
                        label="Email"
                        type="email"
                        name="email"
                        error={errors.email}
                      />
                    </div>
                    <InputField
                      icon={Calendar}
                      label="Ngày sinh"
                      type="date"
                      name="dob"
                      error={errors.dob}
                    />
                    <InputField
                      icon={MapPin}
                      label="Địa chỉ"
                      name="address"
                      error={errors.address}
                    />
                  </div>
                </div>

                {/* Account & Package */}
                <div
                  className="p-6 rounded-[1.75rem] backdrop-blur-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #4d4635',
                  }}
                >
                  <SectionHeader
                    title="Tài khoản & Gói tập"
                    description="Đặt mật khẩu và chọn gói ngay trong một bước."
                    variant="section"
                  />
                  <div className="space-y-4">
                    <InputField
                      icon={Lock}
                      label="Mật khẩu"
                      type="password"
                      name="password"
                      error={errors.password}
                    />
                    <InputField
                      icon={Lock}
                      label="Xác nhận mật khẩu"
                      type="password"
                      name="confirm_password"
                      error={errors.confirm_password}
                    />

                    <div>
                      <label className="block mb-3" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                        Chọn gói tập
                      </label>
                      <div className="space-y-3">
                        {packages.map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setSelectedPackage(pkg)}
                            className="w-full p-4 rounded-[1.75rem] text-left transition-all"
                            style={{
                              backgroundColor: selectedPackage.id === pkg.id ? '#121414' : 'transparent',
                              border: selectedPackage.id === pkg.id ? '2px solid #f2ca50' : '1px solid #4d4635',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                                  {pkg.name}
                                </p>
                                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                  {pkg.duration} ngày
                                </p>
                              </div>
                              <p className="member-card-title">
                                {pkg.price.toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-[1.75rem] transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#f2ca50',
                    color: '#000000',
                    fontWeight: 600,
                    fontSize: '1.125rem',
                  }}
                >
                  Tạo tài khoản và tiếp tục
                </button>
              </form>
            </div>

            {/* Package Preview */}
            <div className="lg:col-span-1">
              <div
                className="p-6 rounded-[1.75rem] sticky top-8 backdrop-blur-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #4d4635',
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-3 rounded-[1.75rem]"
                    style={{ backgroundColor: '#121414' }}
                  >
                    <Package size={24} style={{ color: '#f2ca50' }} />
                  </div>
                  <h3 className="member-card-title">
                    Gói đã chọn
                  </h3>
                </div>

                <div className="mb-6">
                  <h4 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {selectedPackage.name}
                  </h4>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={16} style={{ color: '#d0c5af' }} />
                    <span style={{ color: '#d0c5af' }}>
                      {selectedPackage.duration} ngày
                    </span>
                  </div>
                  <p className="text-3xl font-semibold text-[#f2ca50]">
                    {selectedPackage.price.toLocaleString('vi-VN')}đ
                  </p>
                </div>

                <div
                  className="p-4 rounded-[1.75rem] mb-6"
                  style={{ backgroundColor: '#121414' }}
                >
                  <p className="mb-3" style={{ color: '#e2e2e2', fontWeight: 600 }}>
                    Quyền lợi
                  </p>
                  <ul className="space-y-2">
                    {selectedPackage.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle size={16} style={{ color: '#f2ca50', marginTop: '0.25rem', flexShrink: 0 }} />
                        <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="p-4 rounded-[1.75rem]"
                  style={{ backgroundColor: 'rgba(242, 202, 80, 0.1)', border: '1px solid #f2ca50' }}
                >
                  <p style={{ color: '#f2ca50', fontSize: '0.875rem' }}>
                    Bạn sẽ thanh toán sau khi xác thực email
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
