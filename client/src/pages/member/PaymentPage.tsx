import { useState } from "react";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { CreditCard, Wallet, CheckCircle, AlertCircle, Clock, Package, ArrowLeft } from "lucide-react";

export default function PaymentPage() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "success" | "failed">("pending");

  const packageData = {
    name: "Premium Package",
    duration: 180,
    price: 2000000,
    member: {
      name: "Nguyễn Văn A",
      email: "nguyenvana@email.com",
      member_code: "MB2026001"
    }
  };

  const handlePayment = () => {
    setPaymentStatus("processing");
    setTimeout(() => {
      const success = Math.random() > 0.2;
      setPaymentStatus(success ? "success" : "failed");
      if (success) {
        setTimeout(() => navigate("/member/register-success"), 1500);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#121414' }}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 transition-all hover:gap-3"
          style={{ color: '#d0c5af' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f2ca50'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#d0c5af'}
        >
          <ArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
        <div className="text-center mb-8">
          <SectionHeader
            title="Thanh toán"
            description="Hoàn tất giao dịch và xác nhận gói tập đã chọn."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Method */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className="p-6 rounded-[1.75rem] backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <h2 className="member-card-title mb-6">
                Phương thức thanh toán
              </h2>

              <div className="space-y-3">
                {/* Credit Card */}
                <button
                  onClick={() => setPaymentMethod("card")}
                  className="w-full p-4 rounded-[1.75rem] flex items-center gap-4 transition-all"
                  style={{
                    backgroundColor: paymentMethod === "card" ? '#121414' : 'transparent',
                    border: `2px solid ${paymentMethod === "card" ? '#f2ca50' : '#4d4635'}`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: paymentMethod === "card" ? '#f2ca50' : '#121414' }}
                  >
                    <CreditCard size={24} style={{ color: paymentMethod === "card" ? '#000000' : '#f2ca50' }} />
                  </div>
                  <div className="text-left flex-1">
                    <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                      Thẻ tín dụng / Thẻ ghi nợ
                    </p>
                    <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                      Visa, Mastercard, JCB, American Express
                    </p>
                  </div>
                  {paymentMethod === "card" && (
                    <CheckCircle size={20} style={{ color: '#f2ca50' }} />
                  )}
                </button>

                {/* E-Wallet */}
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className="w-full p-4 rounded-[1.75rem] flex items-center gap-4 transition-all"
                  style={{
                    backgroundColor: paymentMethod === "wallet" ? '#121414' : 'transparent',
                    border: `2px solid ${paymentMethod === "wallet" ? '#f2ca50' : '#4d4635'}`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: paymentMethod === "wallet" ? '#f2ca50' : '#121414' }}
                  >
                    <Wallet size={24} style={{ color: paymentMethod === "wallet" ? '#000000' : '#f2ca50' }} />
                  </div>
                  <div className="text-left flex-1">
                    <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                      Ví điện tử
                    </p>
                    <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                      Momo, ZaloPay, VNPay, ShopeePay
                    </p>
                  </div>
                  {paymentMethod === "wallet" && (
                    <CheckCircle size={20} style={{ color: '#f2ca50' }} />
                  )}
                </button>
              </div>

              {/* Card Details */}
              {paymentMethod === "card" && paymentStatus === "pending" && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                      Số thẻ
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 rounded-[1.75rem] outline-none transition-all"
                      style={{
                        backgroundColor: '#121414',
                        color: '#e2e2e2',
                        border: '1px solid #4d4635',
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                        Ngày hết hạn
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 rounded-[1.75rem] outline-none"
                        style={{
                          backgroundColor: '#121414',
                          color: '#e2e2e2',
                          border: '1px solid #4d4635',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        maxLength={3}
                        className="w-full px-4 py-3 rounded-[1.75rem] outline-none"
                        style={{
                          backgroundColor: '#121414',
                          color: '#e2e2e2',
                          border: '1px solid #4d4635',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status */}
            {paymentStatus !== "pending" && (
              <div
                className="p-6 rounded-[1.75rem] backdrop-blur-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #4d4635',
                }}
              >
                <h3 className="mb-4" style={{ color: '#f2ca50', fontSize: '1.125rem', fontWeight: 600 }}>
                  Trạng thái thanh toán
                </h3>

                {paymentStatus === "processing" && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#f2ca50', borderTopColor: 'transparent' }} />
                    <div>
                      <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                        Đang xử lý thanh toán...
                      </p>
                      <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                        Vui lòng không đóng trang này
                      </p>
                    </div>
                  </div>
                )}

                {paymentStatus === "success" && (
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)' }}
                    >
                      <CheckCircle size={28} style={{ color: '#34D399' }} />
                    </div>
                    <div>
                      <p style={{ color: '#34D399', fontWeight: 600, fontSize: '1.125rem' }}>
                        Thanh toán thành công!
                      </p>
                      <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                        Đang chuyển hướng...
                      </p>
                    </div>
                  </div>
                )}

                {paymentStatus === "failed" && (
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        <AlertCircle size={28} style={{ color: '#EF4444' }} />
                      </div>
                      <div>
                        <p style={{ color: '#EF4444', fontWeight: 600, fontSize: '1.125rem' }}>
                          Thanh toán thất bại
                        </p>
                        <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                          Vui lòng thử lại hoặc chọn phương thức khác
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPaymentStatus("pending")}
                      className="w-full py-3 rounded-[1.75rem] transition-all"
                      style={{
                        backgroundColor: '#f2ca50',
                        color: '#000000',
                        fontWeight: 600,
                      }}
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div
              className="p-4 rounded-[1.75rem]"
              style={{
                backgroundColor: 'rgba(242, 202, 80, 0.1)',
                border: '1px solid #f2ca50'
              }}
            >
              <div className="flex items-start gap-3">
                <Clock size={20} style={{ color: '#f2ca50', flexShrink: 0, marginTop: '0.125rem' }} />
                <div>
                  <p style={{ color: '#f2ca50', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                    Lưu ý quan trọng
                  </p>
                  <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                    Gói tập sẽ ở trạng thái pending cho đến khi thanh toán thành công.
                    Bạn có 24 giờ để hoàn tất thanh toán.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div
              className="p-6 rounded-[1.75rem] sticky top-6 backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <h3 className="member-card-title mb-6">
                Chi tiết đơn hàng
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <Package size={20} style={{ color: '#f2ca50' }} />
                  <div className="flex-1">
                    <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>Gói tập</p>
                    <p style={{ color: '#e2e2e2', fontWeight: 600 }}>{packageData.name}</p>
                  </div>
                </div>

                <div
                  className="pt-4"
                  style={{ borderTop: '1px solid #4d4635' }}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#d0c5af' }}>Thời hạn:</span>
                      <span style={{ color: '#e2e2e2' }}>{packageData.duration} ngày</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#d0c5af' }}>Thành viên:</span>
                      <span style={{ color: '#e2e2e2' }}>{packageData.member.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#d0c5af' }}>Email:</span>
                      <span style={{ color: '#e2e2e2', fontSize: '0.75rem' }}>{packageData.member.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="pt-4 mb-6"
                style={{ borderTop: '1px solid #4d4635' }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span style={{ color: '#d0c5af' }}>Tạm tính:</span>
                  <span style={{ color: '#e2e2e2' }}>
                    {packageData.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Tổng cộng:</span>
                  <span className="member-card-title text-2xl">
                    {packageData.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={paymentStatus !== "pending"}
                className="w-full py-3 rounded-[1.75rem] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{
                  backgroundColor: '#f2ca50',
                  color: '#000000',
                  fontWeight: 600,
                }}
              >
                {paymentStatus === "pending" ? "Thanh toán ngay" : "Đang xử lý..."}
              </button>

              <div
                className="mt-4 p-3 rounded-[1.75rem] text-center"
                style={{ backgroundColor: '#121414' }}
              >
                <p style={{ color: '#d0c5af', fontSize: '0.75rem' }}>
                  🔒 Giao dịch được mã hóa và bảo mật
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
