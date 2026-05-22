import { useState, useEffect } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { Package, CreditCard, Filter, ChevronRight, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/auth.service";
import subscriptionService, { type Subscription } from "@/services/subscription.service";
import paymentService, { type Payment } from "@/services/payment.service";

interface HistoryItem {
  sub: Subscription;
  payment: Payment | null;
}

const STATUS_FILTERS = [
  { value: "all",       label: "Tất cả" },
  { value: "active",    label: "Đang hoạt động" },
  { value: "pending",   label: "Chờ kích hoạt" },
  { value: "expired",   label: "Đã hết hạn" },
  { value: "cancelled", label: "Đã hủy" },
];

const METHOD_LABEL: Record<string, string> = {
  bank_card: "Thẻ tín dụng",
  ewallet:   "Ví điện tử",
  cash:      "Tiền mặt",
};

function getStatusStyle(status: string) {
  switch (status) {
    case "active":    return { bg: "rgba(52,211,153,0.1)",  color: "#34D399", label: "Đang hoạt động" };
    case "pending":   return { bg: "rgba(251,191,36,0.1)",  color: "#FBBF24", label: "Chờ kích hoạt" };
    case "expired":   return { bg: "rgba(239,68,68,0.1)",   color: "#EF4444", label: "Đã hết hạn" };
    case "cancelled": return { bg: "rgba(156,163,175,0.1)", color: "#9CA3AF", label: "Đã hủy" };
    default:          return { bg: "#121414",               color: "#d0c5af", label: status };
  }
}

function calcDuration(startDate: string, endDate: string) {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.round(ms / 86400000) + 1;
}

const fmt     = (d: string) => new Date(d).toLocaleDateString("vi-VN");
const fmtTime = (d: string) => new Date(d).toLocaleString("vi-VN");

export default function PackageHistory() {
  const user    = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token   = useAuthStore((s) => s.token);

  const [loading, setLoading]       = useState(true);
  const [items, setItems]           = useState<HistoryItem[]>([]);
  const [statusFilter, setFilter]   = useState("all");
  const [expandedId, setExpanded]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let memberId = user?.memberId ?? null;
        if (!memberId) {
          const me = await authService.me();
          memberId = me.memberId ?? null;
          if (user && token) setAuth({ ...user, memberId }, token);
        }
        if (!memberId) return;

        const [subs, payments] = await Promise.all([
          subscriptionService.getByMember(memberId),
          paymentService.listByMember(memberId),
        ]);

        const paymentMap = new Map<string, Payment>();
        payments.forEach((p) => paymentMap.set(p.subscriptionId, p));

        setItems(subs.map((sub) => ({ sub, payment: paymentMap.get(sub.subscriptionId) ?? null })));
      } catch {
        // giữ rỗng
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = statusFilter === "all"
    ? items
    : items.filter((i) => i.sub.status === statusFilter);

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
          title="Lịch sử gói tập"
          description="Xem lại các lần mua gói, thời hạn và trạng thái thanh toán."
        />

        {items.length === 0 ? (
          <div className="p-12 rounded-[1.75rem] text-center backdrop-blur-sm"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #4d4635" }}>
            <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ backgroundColor: "#121414" }}>
              <Package size={48} style={{ color: "#d0c5af" }} />
            </div>
            <h3 style={{ color: "#e2e2e2", fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Chưa có lịch sử gói tập
            </h3>
            <p className="member-page-subtitle">Các gói tập bạn đã mua sẽ hiển thị ở đây</p>
          </div>
        ) : (
          <>
            {/* Filter */}
            <div className="p-4 rounded-[1.75rem] mb-6 flex items-center gap-4 flex-wrap backdrop-blur-sm"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #4d4635" }}>
              <div className="flex items-center gap-2">
                <Filter size={20} style={{ color: "#f2ca50" }} />
                <span style={{ color: "#e2e2e2", fontWeight: 600 }}>Lọc theo:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <button key={f.value} onClick={() => setFilter(f.value)}
                    className="px-4 py-2 rounded-full transition-all"
                    style={{
                      backgroundColor: statusFilter === f.value ? "#f2ca50" : "#121414",
                      color: statusFilter === f.value ? "#000" : "#e2e2e2",
                      fontSize: "0.875rem",
                      fontWeight: statusFilter === f.value ? 600 : 400,
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-4">
              {filtered.map(({ sub, payment }) => {
                const statusStyle = getStatusStyle(sub.status);
                const isExpanded  = expandedId === sub.subscriptionId;
                const duration    = calcDuration(sub.startDate, sub.endDate);

                return (
                  <div key={sub.subscriptionId} className="rounded-[1.75rem] backdrop-blur-sm"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #4d4635" }}>

                    <button
                      onClick={() => setExpanded(isExpanded ? null : sub.subscriptionId)}
                      className="w-full p-6 text-left transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "#121414" }}>
                            <Package size={28} style={{ color: "#f2ca50" }} />
                          </div>
                          <div>
                            <p style={{ color: "#e2e2e2", fontWeight: 600, fontSize: "1.125rem" }}>
                              {sub.packageName}
                            </p>
                            <p style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                              #{sub.subscriptionId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontSize: "0.875rem", fontWeight: 600 }}>
                            {statusStyle.label}
                          </div>
                          <ChevronRight size={20} style={{
                            color: "#d0c5af",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                            transition: "transform 0.2s",
                          }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p style={{ color: "#d0c5af", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Ngày bắt đầu</p>
                          <p style={{ color: "#e2e2e2", fontSize: "0.875rem", fontWeight: 600 }}>{fmt(sub.startDate)}</p>
                        </div>
                        <div>
                          <p style={{ color: "#d0c5af", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Ngày hết hạn</p>
                          <p style={{ color: "#e2e2e2", fontSize: "0.875rem", fontWeight: 600 }}>{fmt(sub.endDate)}</p>
                        </div>
                        <div>
                          <p style={{ color: "#d0c5af", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Thời hạn</p>
                          <p style={{ color: "#e2e2e2", fontSize: "0.875rem", fontWeight: 600 }}>{duration} ngày</p>
                        </div>
                        <div>
                          <p style={{ color: "#d0c5af", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Số tiền</p>
                          <p style={{ color: "#f2ca50", fontSize: "0.875rem", fontWeight: 600 }}>
                            {payment ? parseFloat(payment.amount).toLocaleString("vi-VN") + "đ" : "—"}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Detail drawer */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-4" style={{ borderTop: "1px solid #4d4635" }}>
                        <h4 className="mb-4" style={{ color: "#f2ca50", fontWeight: 600 }}>Chi tiết thanh toán</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 rounded-[1.75rem]" style={{ backgroundColor: "#121414" }}>
                            <CreditCard size={20} style={{ color: "#f2ca50" }} />
                            <div className="flex-1">
                              <p style={{ color: "#d0c5af", fontSize: "0.875rem" }}>Phương thức thanh toán</p>
                              <p style={{ color: "#e2e2e2", fontWeight: 600 }}>
                                {payment ? METHOD_LABEL[payment.method] ?? payment.method : "—"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 rounded-[1.75rem]" style={{ backgroundColor: "#121414" }}>
                            <Clock size={20} style={{ color: "#f2ca50" }} />
                            <div className="flex-1">
                              <p style={{ color: "#d0c5af", fontSize: "0.875rem" }}>Thời gian thanh toán</p>
                              <p style={{ color: "#e2e2e2", fontWeight: 600 }}>
                                {payment ? fmtTime(payment.paidAt) : "Chưa thanh toán"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 rounded-[1.75rem]" style={{ backgroundColor: "#121414" }}>
                            <CheckCircle size={20} style={{ color: payment ? "#34D399" : "#d0c5af" }} />
                            <div className="flex-1">
                              <p style={{ color: "#d0c5af", fontSize: "0.875rem" }}>Trạng thái thanh toán</p>
                              <p style={{ color: payment ? "#34D399" : "#d0c5af", fontWeight: 600 }}>
                                {payment ? "Đã thanh toán" : "Chưa thanh toán"}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 rounded-[1.75rem]" style={{ backgroundColor: "#121414" }}>
                            <p className="mb-3" style={{ color: "#e2e2e2", fontWeight: 600 }}>Timeline</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#34D399" }} />
                                <span style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                                  Tạo: {fmtTime(sub.createdAt)}
                                </span>
                              </div>
                              {payment && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#34D399" }} />
                                  <span style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                                    Kích hoạt: {fmt(sub.startDate)}
                                  </span>
                                </div>
                              )}
                              {(sub.status === "expired" || sub.status === "cancelled") && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: sub.status === "cancelled" ? "#9CA3AF" : "#EF4444" }} />
                                  <span style={{ color: "#d0c5af", fontSize: "0.875rem" }}>
                                    {sub.status === "cancelled" ? "Đã hủy" : "Hết hạn"}: {fmt(sub.endDate)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="p-8 rounded-[1.75rem] text-center"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #4d4635" }}>
                  <p className="member-page-subtitle">Không có gói tập nào với bộ lọc này</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MemberLayout>
  );
}
