import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { Package, Calendar, CheckCircle, CreditCard, AlertCircle, Info } from "lucide-react";

const packages = [
  {
    id: "basic",
    name: "Basic Package",
    duration: 30,
    price: 500000,
    features: ["Truy cập phòng gym cơ bản", "Sử dụng thiết bị cardio", "Tủ đồ miễn phí"]
  },
  {
    id: "standard",
    name: "Standard Package",
    duration: 90,
    price: 1200000,
    features: ["Tất cả quyền lợi Basic", "1 buổi PT/tuần", "Sauna & Steam room", "Nước uống miễn phí"]
  },
  {
    id: "premium",
    name: "Premium Package",
    duration: 180,
    price: 2000000,
    features: ["Tất cả quyền lợi Standard", "4 buổi PT/tháng", "Tư vấn dinh dưỡng", "Massage miễn phí"]
  }
];

export default function RenewPackage() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState(packages[2]);

  const currentPackage = {
    name: "Premium Package",
    end_date: "16/11/2026",
    status: "active"
  };

  const hasPendingPackage = false;

  const handleRenew = () => {
    navigate("/member/payment");
  };

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Gia hạn gói"
          description="Chọn chu kỳ mới trước khi gói hiện tại hết hạn."
        />

        {/* Current Package Info */}
        <div
          className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <h3 className="member-card-title mb-4">
            Gói hiện tại
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#f2ca50' }}
              >
                <Package size={24} style={{ color: '#000000' }} />
              </div>
              <div>
                <p style={{ color: '#e2e2e2', fontWeight: 600, fontSize: '1.125rem' }}>
                  {currentPackage.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={14} style={{ color: '#d0c5af' }} />
                  <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                    Hết hạn: {currentPackage.end_date}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34D399', fontSize: '0.875rem', fontWeight: 600 }}
            >
              Active
            </div>
          </div>
        </div>

        {/* Rules Info */}
        <div
          className="p-4 rounded-[1.75rem] mb-6"
          style={{
            backgroundColor: 'rgba(242, 202, 80, 0.1)',
            border: '1px solid #f2ca50'
          }}
        >
          <div className="flex items-start gap-3">
            <Info size={20} style={{ color: '#f2ca50', flexShrink: 0, marginTop: '0.125rem' }} />
            <div>
              <p style={{ color: '#f2ca50', fontWeight: 600, marginBottom: '0.5rem' }}>
                Quy định gia hạn
              </p>
              <ul className="space-y-1" style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                <li>• Nếu gói hiện tại còn active, gói mới sẽ pending và tự động kích hoạt khi gói cũ hết hạn</li>
                <li>• Nếu đã có gói pending, bạn không thể gia hạn thêm</li>
                <li>• Thanh toán phải được hoàn tất để xác nhận đơn hàng</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error if has pending */}
        {hasPendingPackage && (
          <div
            className="p-4 rounded-[1.75rem] mb-6"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444'
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={20} style={{ color: '#EF4444', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#EF4444', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Không thể gia hạn
                </p>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                  Bạn đã có gói chờ kích hoạt. Vui lòng đợi gói này được kích hoạt trước khi gia hạn thêm.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package Selection */}
          <div className="lg:col-span-2">
            <h3 className="member-card-title mb-4">
              Chọn gói gia hạn
            </h3>
            <div className="space-y-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  disabled={hasPendingPackage}
                  className="w-full text-left transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div
                    className="p-5 rounded-[1.75rem] backdrop-blur-sm"
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: selectedPackage.id === pkg.id ? '2px solid #f2ca50' : '1px solid #4d4635',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: selectedPackage.id === pkg.id ? '#f2ca50' : '#121414' }}
                        >
                          <Package size={20} style={{ color: selectedPackage.id === pkg.id ? '#000000' : '#f2ca50' }} />
                        </div>
                        <div>
                          <p style={{ color: '#e2e2e2', fontWeight: 600, fontSize: '1.125rem' }}>
                            {pkg.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} style={{ color: '#d0c5af' }} />
                            <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                              {pkg.duration} ngày
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="member-card-title text-2xl">
                        {pkg.price.toLocaleString('vi-VN')}đ
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {pkg.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle size={14} style={{ color: '#f2ca50', flexShrink: 0, marginTop: '0.25rem' }} />
                          <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div>
            <div
              className="p-6 rounded-[1.75rem] backdrop-blur-sm sticky top-6"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <h3 className="member-card-title mb-6">
                Tóm tắt thanh toán
              </h3>

              <div className="space-y-4 mb-6">
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: '#121414' }}
                >
                  <p style={{ color: '#d0c5af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Gói gia hạn
                  </p>
                  <p style={{ color: '#e2e2e2', fontWeight: 600, fontSize: '1.125rem' }}>
                    {selectedPackage.name}
                  </p>
                </div>

                <div className="flex justify-between">
                  <span style={{ color: '#d0c5af' }}>Giá gói:</span>
                  <span style={{ color: '#e2e2e2' }}>
                    {selectedPackage.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="flex justify-between">
                  <span style={{ color: '#d0c5af' }}>Thời hạn:</span>
                  <span style={{ color: '#e2e2e2' }}>
                    {selectedPackage.duration} ngày
                  </span>
                </div>

                {currentPackage.status === "active" && (
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: 'rgba(242, 202, 80, 0.1)' }}
                  >
                    <p style={{ color: '#f2ca50', fontSize: '0.75rem' }}>
                      Gói mới sẽ tự động kích hoạt từ {currentPackage.end_date}
                    </p>
                  </div>
                )}
              </div>

              <div
                className="pt-4 mb-6"
                style={{ borderTop: '1px solid #4d4635' }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Tổng cộng:</span>
                  <span style={{ color: '#f2ca50', fontSize: '1.75rem', fontWeight: 600 }}>
                    {selectedPackage.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <button
                onClick={handleRenew}
                disabled={hasPendingPackage}
                className="w-full py-3 rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#f2ca50',
                  color: '#000000',
                  fontWeight: 600,
                }}
              >
                <CreditCard size={20} />
                <span>Thanh toán và gia hạn</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
