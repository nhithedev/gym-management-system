import { useState, useEffect } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { Package, Calendar, CheckCircle, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import packageService, { Package as PackageType } from "@/services/package.service";

export default function BuyPackage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasActivePackage = true;

  useEffect(() => {
    packageService.list({ status: 'active', pageSize: 100 })
      .then(({ data }) => {
        setPackages(data);
        if (data.length > 0) setSelectedPackage(data[0]);
      })
      .catch(() => setError("Không thể tải danh sách gói tập."))
      .finally(() => setLoading(false));
  }, []);

  const parseFeatures = (benefits: string | null): string[] => {
    if (!benefits) return [];
    return benefits.split('\n').map(s => s.trim()).filter(Boolean);
  };

  const parsePrice = (price: string) => parseFloat(price);

  const handlePurchase = () => {
    if (!selectedPackage) return;
    navigate("/member/payment", { state: { package: selectedPackage } });
  };

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Mua gói mới"
          description="So sánh quyền lợi, chọn gói phù hợp và đi đến thanh toán ngay."
        />

        {hasActivePackage && (
          <div className="p-4 bg-[#f2ca50]/10 border border-[#f2ca50] rounded-[1.75rem] mb-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#f2ca50] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#f2ca50] font-semibold mb-1">Lưu ý</p>
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

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#f2ca50]" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-[1.75rem] text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && packages.length === 0 && (
          <div className="text-center py-20 text-[#d0c5af]">
            Hiện chưa có gói tập nào khả dụng.
          </div>
        )}

        {!loading && !error && packages.length > 0 && selectedPackage && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Package Cards */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {packages.map((pkg) => {
                  const price = parsePrice(pkg.price);
                  const features = parseFeatures(pkg.benefits);
                  const isSelected = selectedPackage.packageId === pkg.packageId;

                  return (
                    <button
                      key={pkg.packageId}
                      onClick={() => setSelectedPackage(pkg)}
                      className="w-full text-left transition-all hover:scale-[1.01]"
                    >
                      <div
                        className={`p-6 rounded-[1.75rem] backdrop-blur-sm relative ${
                          isSelected
                            ? 'bg-[#1a1a1a] border-2 border-[#f2ca50]'
                            : 'bg-[#1a1a1a] border border-[#4d4635]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-[#f2ca50]' : 'bg-[#121414]'
                              }`}
                            >
                              <Package size={28} className={isSelected ? 'text-black' : 'text-[#f2ca50]'} />
                            </div>
                            <div>
                              <h3 className="text-2xl font-semibold text-[#e2e2e2]">
                                {pkg.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar size={16} className="text-[#d0c5af]" />
                                <span className="text-sm text-[#d0c5af]">
                                  {pkg.durationDays} ngày
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-semibold text-[#f2ca50]">
                              {price.toLocaleString('vi-VN')}đ
                            </p>
                            <p className="text-sm text-[#d0c5af]/70">
                              {Math.round(price / pkg.durationDays).toLocaleString('vi-VN')}đ/ngày
                            </p>
                          </div>
                        </div>

                        {features.length > 0 && (
                          <div className="pt-4 border-t border-[#4d4635]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <CheckCircle size={16} className="text-[#f2ca50] flex-shrink-0 mt-0.5" />
                                  <span className="text-sm text-[#e2e2e2]">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isSelected && (
                          <div className="mt-4">
                            <div className="w-full py-2 bg-[#f2ca50]/10 text-[#f2ca50] text-sm font-semibold rounded-lg text-center">
                              Đã chọn
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <div className="member-card sticky top-6">
                <h3 className="member-card-title mb-6">Tóm tắt đơn hàng</h3>

                <div className="p-4 bg-[#121414] rounded-xl mb-6">
                  <p className="text-sm text-[#d0c5af]/70 mb-2">Gói đã chọn</p>
                  <p className="text-xl font-semibold text-[#e2e2e2] mb-2">
                    {selectedPackage.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#d0c5af]" />
                    <span className="text-sm text-[#d0c5af]">
                      {selectedPackage.durationDays} ngày
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#d0c5af]">Giá gói:</span>
                    <span className="text-[#e2e2e2]">
                      {parsePrice(selectedPackage.price).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#d0c5af]">Thuế VAT (10%):</span>
                    <span className="text-[#e2e2e2]">
                      {(parsePrice(selectedPackage.price) * 0.1).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                <div className="pt-4 mb-6 border-t border-[#4d4635]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#e2e2e2] font-semibold">Tổng cộng:</span>
                    <span className="text-3xl font-semibold text-[#f2ca50]">
                      {(parsePrice(selectedPackage.price) * 1.1).toLocaleString('vi-VN')}đ
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
        )}
      </div>
    </MemberLayout>
  );
}
