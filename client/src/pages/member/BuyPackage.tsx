import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { Package, Calendar, CheckCircle, CreditCard, AlertTriangle } from "lucide-react";

const packages = [
  {
    id: "basic",
    name: "Basic Package",
    duration: 30,
    price: 500000,
    features: [
      "Truy cập phòng gym cơ bản",
      "Sử dụng thiết bị cardio",
      "Tủ đồ miễn phí",
      "Wifi miễn phí"
    ],
    popular: false
  },
  {
    id: "standard",
    name: "Standard Package",
    duration: 90,
    price: 1200000,
    features: [
      "Tất cả quyền lợi Basic",
      "1 buổi PT/tuần",
      "Sauna & Steam room",
      "Nước uống miễn phí",
      "Tư vấn dinh dưỡng cơ bản"
    ],
    popular: true
  },
  {
    id: "premium",
    name: "Premium Package",
    duration: 180,
    price: 2000000,
    features: [
      "Tất cả quyền lợi Standard",
      "4 buổi PT/tháng",
      "Tư vấn dinh dưỡng chuyên sâu",
      "Massage miễn phí",
      "Ưu tiên đặt lịch",
      "Guest pass (2 lần/tháng)"
    ],
    popular: false
  }
];

export default function BuyPackage() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState(packages[1]);
  const hasActivePackage = true;

  const handlePurchase = () => {
    navigate("/member/payment");
  };

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Mua gói mới"
          description="So sánh quyền lợi, chọn gói phù hợp và đi đến thanh toán ngay."
        />

        {/* Warning if has active package */}
        {hasActivePackage && (
          <div className="p-4 bg-[#f2ca50]/10 border border-[#f2ca50] rounded-[1.75rem] mb-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#f2ca50] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#f2ca50] font-semibold mb-1">
                Lưu ý
              </p>
              <p className="text-sm text-[#d0c5af]">
                Bạn đang có gói tập active. Nếu muốn gia hạn gói hiện tại, vui lòng sử dụng chức năng{' '}
                <button
                  onClick={() => navigate('/member/renew-package')}
                  className="text-[#f2ca50] font-semibold underline hover:no-underline"
                >
                  Gia hạn gói
                </button>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Package Cards */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className="w-full text-left transition-all hover:scale-[1.01]"
                >
                  <div
                    className={`p-6 rounded-[1.75rem] backdrop-blur-sm relative ${
                      selectedPackage.id === pkg.id
                        ? 'bg-[#1a1a1a] border-2 border-[#f2ca50]'
                        : 'bg-[#1a1a1a] border border-[#4d4635]'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-6 px-4 py-1 bg-[#f2ca50] text-black text-xs font-semibold rounded-full uppercase tracking-wide">
                        PHỔ BIẾN NHẤT
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center ${
                            selectedPackage.id === pkg.id ? 'bg-[#f2ca50]' : 'bg-[#121414]'
                          }`}
                        >
                          <Package size={28} className={selectedPackage.id === pkg.id ? 'text-black' : 'text-[#f2ca50]'} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold text-[#e2e2e2]">
                            {pkg.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar size={16} className="text-[#d0c5af]" />
                            <span className="text-sm text-[#d0c5af]">
                              {pkg.duration} ngày
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-semibold text-[#f2ca50]">
                          {pkg.price.toLocaleString('vi-VN')}đ
                        </p>
                        <p className="text-sm text-[#d0c5af]/70">
                          {Math.round(pkg.price / pkg.duration).toLocaleString('vi-VN')}đ/ngày
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#4d4635]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {pkg.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle size={16} className="text-[#f2ca50] flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-[#e2e2e2]">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedPackage.id === pkg.id && (
                      <div className="mt-4">
                        <div className="w-full py-2 bg-[#f2ca50]/10 text-[#f2ca50] text-sm font-semibold rounded-lg text-center">
                          Đã chọn
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div>
            <div className="member-card sticky top-6">
              <h3 className="member-card-title mb-6">
                Tóm tắt đơn hàng
              </h3>

              <div className="p-4 bg-[#121414] rounded-xl mb-6">
                <p className="text-sm text-[#d0c5af]/70 mb-2">
                  Gói đã chọn
                </p>
                <p className="text-xl font-semibold text-[#e2e2e2] mb-2">
                  {selectedPackage.name}
                </p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[#d0c5af]" />
                  <span className="text-sm text-[#d0c5af]">
                    {selectedPackage.duration} ngày
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-[#d0c5af]">Giá gói:</span>
                  <span className="text-[#e2e2e2]">
                    {selectedPackage.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#d0c5af]">Thuế VAT (10%):</span>
                  <span className="text-[#e2e2e2]">
                    {(selectedPackage.price * 0.1).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <div className="pt-4 mb-6 border-t border-[#4d4635]">
                <div className="flex justify-between items-center">
                  <span className="text-[#e2e2e2] font-semibold">Tổng cộng:</span>
                  <span className="text-3xl font-semibold text-[#f2ca50]">
                    {(selectedPackage.price * 1.1).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                className="member-btn-primary w-full"
              >
                <CreditCard size={20} />
                <span>Tiếp tục thanh toán</span>
              </button>

              <div className="mt-4 p-3 bg-[#121414] rounded-xl text-center">
                <p className="text-xs text-[#d0c5af]/70">
                  🔒 Thanh toán an toàn và bảo mật
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
