import { useState, useEffect } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { Package, Calendar, CheckCircle, CreditCard, AlertCircle, Info, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/auth.service";
import subscriptionService, { type Subscription } from "@/services/subscription.service";
import packageService, { type Package as PackageType } from "@/services/package.service";

export default function RenewPackage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let memberId = user?.memberId ?? null;
        if (!memberId) {
          const me = await authService.me();
          memberId = me.memberId ?? null;
          if (user && token) setAuth({ ...user, memberId }, token);
        }

        const [{ data: pkgs }, subs] = await Promise.all([
          packageService.list({ status: "active", pageSize: 100 }),
          memberId ? subscriptionService.getByMember(memberId) : Promise.resolve([]),
        ]);

        setPackages(pkgs);
        if (pkgs.length > 0) setSelectedPackage(pkgs[0]);

        const active = subs.find((s) => s.status === "active") ?? null;
        const pending = subs.find((s) => s.status === "pending") ?? null;
        setActiveSub(active);
        setHasPending(!!pending);
      } catch {
        // giữ state rỗng
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRenew = () => {
    if (!selectedPackage) return;
    navigate("/member/payment", { state: { package: selectedPackage } });
  };

  const parseFeatures = (benefits: string | null) =>
    benefits ? benefits.split("\n").map((s) => s.trim()).filter(Boolean) : [];

  const fmt = (d: string) => new Date(d).toLocaleDateString("vi-VN");

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={36} className="animate-spin text-[#f2ca50]" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Gia hạn gói"
          description="Chọn chu kỳ mới trước khi gói hiện tại hết hạn."
        />

        {/* Gói hiện tại */}
        {activeSub && (
          <div className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #4d4635" }}>
            <h3 className="member-card-title mb-4">Gói hiện tại</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#f2ca50" }}>
                  <Package size={24} style={{ color: "#000" }} />
                </div>
                <div>
                  <p style={{ color: "#e2e2e2", fontWeight: 600, fontSize: "1.125rem" }}>
                    {activeSub.packageName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={14} style={{ color: "#d0c5af" }} />
                    <span style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                      Hết hạn: {fmt(activeSub.endDate)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(52,211,153,0.1)", color: "#34D399", fontSize: "0.875rem", fontWeight: 600 }}>
                Active
              </div>
            </div>
          </div>
        )}

        {/* Quy định */}
        <div className="p-4 rounded-[1.75rem] mb-6"
          style={{ backgroundColor: "rgba(242,202,80,0.1)", border: "1px solid #f2ca50" }}>
          <div className="flex items-start gap-3">
            <Info size={20} style={{ color: "#f2ca50", flexShrink: 0, marginTop: "0.125rem" }} />
            <div>
              <p style={{ color: "#f2ca50", fontWeight: 600, marginBottom: "0.5rem" }}>Quy định gia hạn</p>
              <ul className="space-y-1" style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                <li>• Nếu gói hiện tại còn active, gói mới sẽ pending và tự động kích hoạt khi gói cũ hết hạn</li>
                <li>• Nếu đã có gói pending, bạn không thể gia hạn thêm</li>
                <li>• Thanh toán phải được hoàn tất để xác nhận đơn hàng</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Block nếu có pending */}
        {hasPending && (
          <div className="p-4 rounded-[1.75rem] mb-6"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid #EF4444" }}>
            <div className="flex items-start gap-3">
              <AlertCircle size={20} style={{ color: "#EF4444", flexShrink: 0 }} />
              <div>
                <p style={{ color: "#EF4444", fontWeight: 600, marginBottom: "0.25rem" }}>Không thể gia hạn</p>
                <p style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                  Bạn đã có gói chờ kích hoạt. Vui lòng đợi gói này được kích hoạt trước khi gia hạn thêm.
                </p>
              </div>
            </div>
          </div>
        )}

        {packages.length === 0 ? (
          <p className="text-center text-[#d0c5af] py-10">Hiện không có gói tập nào khả dụng.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Danh sách gói */}
            <div className="lg:col-span-2">
              <h3 className="member-card-title mb-4">Chọn gói gia hạn</h3>
              <div className="space-y-3">
                {packages.map((pkg) => {
                  const price = parseFloat(pkg.price);
                  const features = parseFeatures(pkg.benefits);
                  const isSelected = selectedPackage?.packageId === pkg.packageId;

                  return (
                    <button
                      key={pkg.packageId}
                      onClick={() => setSelectedPackage(pkg)}
                      disabled={hasPending}
                      className="w-full text-left transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="p-5 rounded-[1.75rem] backdrop-blur-sm"
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: isSelected ? "2px solid #f2ca50" : "1px solid #4d4635",
                        }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: isSelected ? "#f2ca50" : "#121414" }}>
                              <Package size={20} style={{ color: isSelected ? "#000" : "#f2ca50" }} />
                            </div>
                            <div>
                              <p style={{ color: "#e2e2e2", fontWeight: 600, fontSize: "1.125rem" }}>
                                {pkg.name}
                              </p>
                              <div className="flex items-center gap-2">
                                <Calendar size={14} style={{ color: "#d0c5af" }} />
                                <span style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                                  {pkg.durationDays} ngày
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="member-card-title text-2xl">
                            {price.toLocaleString("vi-VN")}đ
                          </p>
                        </div>

                        {features.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {features.map((f, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle size={14} style={{ color: "#f2ca50", flexShrink: 0, marginTop: "0.25rem" }} />
                                <span style={{ color: "#d0c5af", fontSize: "0.875rem" }}>{f}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tóm tắt */}
            {selectedPackage && (
              <div>
                <div className="p-6 rounded-[1.75rem] backdrop-blur-sm sticky top-6"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #4d4635" }}>
                  <h3 className="member-card-title mb-6">Tóm tắt thanh toán</h3>

                  <div className="space-y-4 mb-6">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: "#121414" }}>
                      <p style={{ color: "#d0c5af", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Gói gia hạn</p>
                      <p style={{ color: "#e2e2e2", fontWeight: 600, fontSize: "1.125rem" }}>
                        {selectedPackage.name}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <span style={{ color: "#d0c5af" }}>Giá gói:</span>
                      <span style={{ color: "#e2e2e2" }}>
                        {parseFloat(selectedPackage.price).toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span style={{ color: "#d0c5af" }}>Thời hạn:</span>
                      <span style={{ color: "#e2e2e2" }}>{selectedPackage.durationDays} ngày</span>
                    </div>

                    {activeSub && (
                      <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(242,202,80,0.1)" }}>
                        <p style={{ color: "#f2ca50", fontSize: "0.75rem" }}>
                          Gói mới sẽ tự động kích hoạt từ {fmt(activeSub.endDate)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mb-6" style={{ borderTop: "1px solid #4d4635" }}>
                    <div className="flex justify-between items-center">
                      <span style={{ color: "#e2e2e2", fontWeight: 600 }}>Tổng cộng:</span>
                      <span style={{ color: "#f2ca50", fontSize: "1.75rem", fontWeight: 600 }}>
                        {parseFloat(selectedPackage.price).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleRenew}
                    disabled={hasPending}
                    className="w-full py-3 rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#f2ca50", color: "#000", fontWeight: 600 }}
                  >
                    <CreditCard size={20} />
                    <span>Thanh toán và gia hạn</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
