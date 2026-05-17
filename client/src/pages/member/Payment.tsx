import { useState } from "react";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { CreditCard, Wallet, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

export default function Payment() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");

  const handlePayment = () => {
    setPaymentStatus("processing");
    setTimeout(() => {
      setPaymentStatus("success");
      setTimeout(() => navigate('/member/success'), 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#121414' }}>
      <div className="w-full max-w-4xl mx-auto">
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
        <div className="mb-8 text-center">
          <SectionHeader
            title="Thanh toán"
            description="Hoàn tất giao dịch để kích hoạt gói tập của bạn."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Method */}
          <div className="lg:col-span-2">
            <div
              className="p-8 rounded-[1.75rem] mb-6 backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <h2 className="member-card-title text-2xl mb-6">
                Phương thức thanh toán
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => setPaymentMethod("card")}
                  className="w-full p-4 rounded-[1.75rem] flex items-center gap-4 transition-all"
                  style={{
                    backgroundColor: paymentMethod === "card" ? '#121414' : 'transparent',
                    border: `2px solid ${paymentMethod === "card" ? '#f2ca50' : '#4d4635'}`
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#f2ca50' }}
                  >
                    <CreditCard size={24} style={{ color: '#000000' }} />
                  </div>
                  <div className="text-left">
                    <div style={{ color: '#e2e2e2', fontWeight: 600 }}>
                      Thẻ tín dụng / Thẻ ghi nợ
                    </div>
                    <div style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                      Visa, Mastercard, JCB
                    </div>
                  </div>
                  {paymentMethod === "card" && (
                    <CheckCircle size={24} style={{ color: '#f2ca50', marginLeft: 'auto' }} />
                  )}
                </button>

                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className="w-full p-4 rounded-[1.75rem] flex items-center gap-4 transition-all"
                  style={{
                    backgroundColor: paymentMethod === "wallet" ? '#121414' : 'transparent',
                    border: `2px solid ${paymentMethod === "wallet" ? '#f2ca50' : '#4d4635'}`
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#f2ca50' }}
                  >
                    <Wallet size={24} style={{ color: '#000000' }} />
                  </div>
                  <div className="text-left">
                    <div style={{ color: '#e2e2e2', fontWeight: 600 }}>
                      Ví điện tử
                    </div>
                    <div style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                      Momo, ZaloPay, VNPay
                    </div>
                  </div>
                  {paymentMethod === "wallet" && (
                    <CheckCircle size={24} style={{ color: '#f2ca50', marginLeft: 'auto' }} />
                  )}
                </button>
              </div>

              {paymentMethod === "card" && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                      Số thẻ
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 rounded-[1.75rem] outline-none"
                      style={{
                        backgroundColor: '#121414',
                        color: '#e2e2e2',
                        border: '1px solid #4d4635'
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                        Ngày hết hạn
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 rounded-[1.75rem] outline-none"
                        style={{
                          backgroundColor: '#121414',
                          color: '#e2e2e2',
                          border: '1px solid #4d4635'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block mb-2" style={{ color: '#e2e2e2' }}>
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-3 rounded-[1.75rem] outline-none"
                        style={{
                          backgroundColor: '#121414',
                          color: '#e2e2e2',
                          border: '1px solid #4d4635'
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
                {paymentStatus === "processing" && (
                  <div className="flex items-center gap-4">
                    <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#f2ca50', borderTopColor: 'transparent' }} />
                    <div>
                      <div style={{ color: '#e2e2e2', fontWeight: 600 }}>
                        Đang xử lý thanh toán...
                      </div>
                      <div style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                        Vui lòng không đóng trang này
                      </div>
                    </div>
                  </div>
                )}

                {paymentStatus === "success" && (
                  <div className="flex items-center gap-4">
                    <CheckCircle size={32} style={{ color: '#f2ca50' }} />
                    <div>
                      <div style={{ color: '#f2ca50', fontWeight: 600 }}>
                        Thanh toán thành công!
                      </div>
                      <div style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                        Đang chuyển hướng...
                      </div>
                    </div>
                  </div>
                )}

                {paymentStatus === "failed" && (
                  <div className="flex items-center gap-4">
                    <AlertCircle size={32} style={{ color: '#FF6B6B' }} />
                    <div>
                      <div style={{ color: '#FF6B6B', fontWeight: 600 }}>
                        Thanh toán thất bại
                      </div>
                      <div style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                        Vui lòng thử lại hoặc chọn phương thức khác
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                Tóm tắt đơn hàng
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span style={{ color: '#d0c5af' }}>Gói tập:</span>
                  <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Premium</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#d0c5af' }}>Thời hạn:</span>
                  <span style={{ color: '#e2e2e2' }}>180 ngày</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#d0c5af' }}>Thành viên:</span>
                  <span style={{ color: '#e2e2e2' }}>Nguyễn Văn A</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#d0c5af' }}>Email:</span>
                  <span style={{ color: '#e2e2e2', fontSize: '0.875rem' }}>example@email.com</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6" style={{ borderColor: '#4d4635' }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Tổng cộng:</span>
                  <span className="member-card-title text-2xl">
                    2,000,000đ
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={paymentStatus === "processing"}
                className="w-full px-6 py-3 rounded-full transition-all disabled:opacity-50"
                style={{
                  backgroundColor: '#f2ca50',
                  color: '#000000',
                  fontWeight: 600
                }}
              >
                {paymentStatus === "processing" ? "Đang xử lý..." : "Thanh toán ngay"}
              </button>

              <div
                className="mt-4 p-4 rounded-[1.75rem] text-center"
                style={{ backgroundColor: '#121414' }}
              >
                <p style={{ color: '#d0c5af', fontSize: '0.75rem' }}>
                  Thông tin thanh toán được bảo mật và mã hóa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
