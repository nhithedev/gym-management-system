import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { Package, CreditCard, Filter, ChevronRight, CheckCircle, Clock } from "lucide-react";

export default function PackageHistory() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailId, setShowDetailId] = useState<string | null>(null);

  const packageHistory = [
    {
      id: "PKG001",
      package_name: "Premium Package",
      start_date: "20/05/2026",
      end_date: "16/11/2026",
      status: "active",
      paid_amount: 2000000,
      paid_at: "20/05/2026 10:30",
      payment_method: "Thẻ tín dụng",
      duration: 180
    },
    {
      id: "PKG002",
      package_name: "Standard Package",
      start_date: "20/11/2025",
      end_date: "19/05/2026",
      status: "expired",
      paid_amount: 1200000,
      paid_at: "20/11/2025 14:20",
      payment_method: "Ví điện tử",
      duration: 90
    },
    {
      id: "PKG003",
      package_name: "Basic Package",
      start_date: "20/08/2025",
      end_date: "19/11/2025",
      status: "completed",
      paid_amount: 500000,
      paid_at: "20/08/2025 09:15",
      payment_method: "Thẻ tín dụng",
      duration: 30
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return { bg: 'rgba(52, 211, 153, 0.1)', color: '#34D399', label: 'Đang hoạt động' };
      case "expired":
        return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', label: 'Đã hết hạn' };
      case "completed":
        return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', label: 'Hoàn thành' };
      case "pending":
        return { bg: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24', label: 'Chờ kích hoạt' };
      default:
        return { bg: '#121414', color: '#d0c5af', label: status };
    }
  };

  const filteredHistory = statusFilter === "all"
    ? packageHistory
    : packageHistory.filter(pkg => pkg.status === statusFilter);

  const EmptyState = () => (
    <div
      className="p-12 rounded-[1.75rem] text-center backdrop-blur-sm"
      style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #4d4635',
      }}
    >
      <div
        className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
        style={{ backgroundColor: '#121414' }}
      >
        <Package size={48} style={{ color: '#d0c5af' }} />
      </div>
      <h3 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Chưa có lịch sử gói tập
      </h3>
      <p className="member-page-subtitle">
        Các gói tập bạn đã mua sẽ hiển thị ở đây
      </p>
    </div>
  );

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Lịch sử gói tập"
          description="Xem lại các lần mua gói, thời hạn và trạng thái thanh toán."
        />

        {packageHistory.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Filters */}
            <div
              className="p-4 rounded-[1.75rem] mb-6 flex items-center gap-4 flex-wrap backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <div className="flex items-center gap-2">
                <Filter size={20} style={{ color: '#f2ca50' }} />
                <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Lọc theo:</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "all", label: "Tất cả" },
                  { value: "active", label: "Đang hoạt động" },
                  { value: "pending", label: "Chờ kích hoạt" },
                  { value: "expired", label: "Đã hết hạn" },
                  { value: "completed", label: "Hoàn thành" }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className="px-4 py-2 rounded-full transition-all"
                    style={{
                      backgroundColor: statusFilter === filter.value ? '#f2ca50' : '#121414',
                      color: statusFilter === filter.value ? '#000000' : '#e2e2e2',
                      fontSize: '0.875rem',
                      fontWeight: statusFilter === filter.value ? 600 : 400
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
              {filteredHistory.map((pkg) => {
                const statusStyle = getStatusColor(pkg.status);
                const isExpanded = showDetailId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className="rounded-[1.75rem] backdrop-blur-sm"
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #4d4635',
                    }}
                  >
                    <button
                      onClick={() => setShowDetailId(isExpanded ? null : pkg.id)}
                      className="w-full p-6 text-left transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#121414' }}
                          >
                            <Package size={28} style={{ color: '#f2ca50' }} />
                          </div>
                          <div>
                            <p style={{ color: '#e2e2e2', fontWeight: 600, fontSize: '1.125rem' }}>
                              {pkg.package_name}
                            </p>
                            <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                              ID: {pkg.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem', fontWeight: 600 }}
                          >
                            {statusStyle.label}
                          </div>
                          <ChevronRight
                            size={20}
                            style={{
                              color: '#d0c5af',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                              transition: 'transform 0.2s'
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p style={{ color: '#d0c5af', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                            Ngày bắt đầu
                          </p>
                          <p style={{ color: '#e2e2e2', fontSize: '0.875rem', fontWeight: 600 }}>
                            {pkg.start_date}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#d0c5af', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                            Ngày hết hạn
                          </p>
                          <p style={{ color: '#e2e2e2', fontSize: '0.875rem', fontWeight: 600 }}>
                            {pkg.end_date}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#d0c5af', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                            Thời hạn
                          </p>
                          <p style={{ color: '#e2e2e2', fontSize: '0.875rem', fontWeight: 600 }}>
                            {pkg.duration} ngày
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#d0c5af', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                            Số tiền
                          </p>
                          <p style={{ color: '#f2ca50', fontSize: '0.875rem', fontWeight: 600 }}>
                            {pkg.paid_amount.toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Detail Drawer */}
                    {isExpanded && (
                      <div
                        className="px-6 pb-6 pt-4"
                        style={{ borderTop: '1px solid #4d4635' }}
                      >
                        <h4 className="mb-4" style={{ color: '#f2ca50', fontWeight: 600 }}>
                          Chi tiết thanh toán
                        </h4>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                            <CreditCard size={20} style={{ color: '#f2ca50' }} />
                            <div className="flex-1">
                              <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                Phương thức thanh toán
                              </p>
                              <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                                {pkg.payment_method}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                            <Clock size={20} style={{ color: '#f2ca50' }} />
                            <div className="flex-1">
                              <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                Thời gian thanh toán
                              </p>
                              <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                                {pkg.paid_at}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                            <CheckCircle size={20} style={{ color: '#34D399' }} />
                            <div className="flex-1">
                              <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                Trạng thái thanh toán
                              </p>
                              <p style={{ color: '#34D399', fontWeight: 600 }}>
                                Đã thanh toán
                              </p>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div
                            className="p-4 rounded-[1.75rem]"
                            style={{ backgroundColor: '#121414' }}
                          >
                            <p className="mb-3" style={{ color: '#e2e2e2', fontWeight: 600 }}>
                              Timeline
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#34D399' }} />
                                <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                  Đã tạo: {pkg.paid_at}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#34D399' }} />
                                <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                  Kích hoạt: {pkg.start_date}
                                </span>
                              </div>
                              {pkg.status === "expired" && (
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                                  <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                    Hết hạn: {pkg.end_date}
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
            </div>

            {filteredHistory.length === 0 && (
              <div
                className="p-8 rounded-[1.75rem] text-center backdrop-blur-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #4d4635',
                }}
              >
                <p className="member-page-subtitle">
                  Không có gói tập nào với bộ lọc này
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </MemberLayout>
  );
}
