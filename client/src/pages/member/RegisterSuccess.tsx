import { useNavigate, useLocation } from "react-router";
import SectionHeader from "@/components/common/SectionHeader";
import { CheckCircle2, Mail, Package, ArrowLeft } from "lucide-react";
import type { Package as PackageType } from "@/services/package.service";

interface SuccessState {
  package?: PackageType;
  paymentMethod?: string;
  total?: number;
  user?: { fullName?: string; email?: string } | null;
}

export default function RegisterSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as SuccessState;

  const registrationData = {
    package: state.package?.name ?? "—",
    email: state.user?.email ?? "—",
    amount_paid: state.total ?? 0,
    payment_method: state.paymentMethod ?? "Thẻ tín dụng",
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#121414' }}>
      <div className="w-full max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 transition-all hover:gap-3"
          style={{ color: '#d0c5af' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f2ca50'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#d0c5af'}
        >
          <ArrowLeft size={20} />
          <span>Quay lại trang đăng nhập</span>
        </button>
        {/* Success Banner */}
        <div
          className="p-8 rounded-[1.75rem] text-center mb-6 backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #f2ca50',
          }}
        >
          <div
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(242, 202, 80, 0.1)' }}
          >
            <CheckCircle2 size={60} style={{ color: '#f2ca50' }} />
          </div>

          <SectionHeader
            title="Đăng ký thành công!"
            description="Tài khoản đã kích hoạt và sẵn sàng sử dụng ngay."
          />
          <p style={{ color: '#e2e2e2', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Chào mừng bạn đến với cộng đồng GYM
          </p>
        </div>

        {/* Registration Details */}
        <div
          className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <h2 className="member-card-title mb-6">
            Thông tin tài khoản
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f2ca50' }}>
                <Mail size={20} style={{ color: '#000000' }} />
              </div>
              <div className="flex-1">
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>Email</p>
                <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                  {registrationData.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f2ca50' }}>
                <Package size={20} style={{ color: '#000000' }} />
              </div>
              <div className="flex-1">
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>Gói tập đã đăng ký</p>
                <p style={{ color: '#e2e2e2', fontWeight: 600 }}>
                  {registrationData.package}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Summary */}
        <div
          className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <h3 className="mb-4" style={{ color: '#f2ca50', fontSize: '1.125rem', fontWeight: 600 }}>
            Thông tin thanh toán
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span style={{ color: '#d0c5af' }}>Phương thức thanh toán:</span>
              <span style={{ color: '#e2e2e2' }}>{registrationData.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#d0c5af' }}>Gói tập:</span>
              <span style={{ color: '#e2e2e2' }}>{registrationData.package}</span>
            </div>
            <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #4d4635' }}>
              <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Tổng thanh toán:</span>
              <span className="member-card-title text-2xl">
                {registrationData.amount_paid.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/')}
            className="py-3 rounded-[1.75rem] transition-all hover:scale-105"
            style={{
              backgroundColor: 'transparent',
              color: '#d0c5af',
              border: '1px solid #4d4635',
            }}
          >
            Về trang đăng nhập
          </button>
          <button
            onClick={() => navigate('/member')}
            className="py-3 rounded-[1.75rem] transition-all hover:scale-105"
            style={{
              backgroundColor: '#f2ca50',
              color: '#000000',
              fontWeight: 600,
            }}
          >
            Vào Dashboard
          </button>
        </div>

        {/* Info Note */}
        <div
          className="mt-6 p-4 rounded-[1.75rem] text-center"
          style={{
            backgroundColor: 'rgba(242, 202, 80, 0.1)',
            border: '1px solid #f2ca50'
          }}
        >
          <p style={{ color: '#f2ca50', fontSize: '0.875rem' }}>
            Thông tin đăng nhập đã được gửi đến email của bạn
          </p>
        </div>
      </div>
    </div>
  );
}
