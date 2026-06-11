import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, Users, RefreshCw, Award } from 'lucide-react'
import {
  OwnerPage,
  OwnerPageHeader,
} from '@/components/OwnerUI'

const REPORT_TYPES = [
  {
    to: '/owner/reports/revenue',
    icon: <TrendingUp size={28} />,
    label: 'Báo cáo doanh thu',
    description: 'Tổng doanh thu, breakdown theo ngày/tuần/tháng. Xem xu hướng tăng trưởng.',
    color: '#06c384',
  },
  {
    to: '/owner/reports/members',
    icon: <Users size={28} />,
    label: 'Báo cáo hội viên mới',
    description: 'Số lượng hội viên đăng ký mới theo khoảng thời gian.',
    color: '#3b82f6',
  },
  {
    to: '/owner/reports/renewals',
    icon: <RefreshCw size={28} />,
    label: 'Báo cáo tỷ lệ gia hạn',
    description: 'Tỷ lệ hội viên gia hạn gói tập sau khi hết hạn.',
    color: '#f59e0b',
  },
  {
    to: '/owner/reports/staff-performance',
    icon: <Award size={28} />,
    label: 'Báo cáo hiệu suất PT',
    description: 'Xếp hạng huấn luyện viên theo số buổi dạy và điểm feedback.',
    color: '#8b5cf6',
  },
]

export default function ReportsPage() {
  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Thống kê"
        title="Báo cáo thống kê"
        description="Chọn loại báo cáo để xem chi tiết. Chọn khoảng thời gian trong từng báo cáo."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {REPORT_TYPES.map((report) => (
          <Link
            key={report.to}
            to={report.to}
            className="rogym-card rogym-card--compact p-6 flex items-start gap-5 group hover:no-underline"
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `${report.color}1a`, border: `2px solid ${report.color}33` }}
            >
              <span style={{ color: report.color }}>{report.icon}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white group-hover:text-[var(--rogym-teal)] transition-colors">
                {report.label}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--rogym-text-secondary)]">{report.description}</p>
            </div>
            <BarChart3 size={18} className="shrink-0 text-[var(--rogym-text-dim)] group-hover:text-[var(--rogym-teal)] transition-colors" />
          </Link>
        ))}
      </div>

      <div
        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-sm text-[var(--rogym-text-dim)]"
      >
        <BarChart3 size={16} />
        Chọn khoảng thời gian trong mỗi báo cáo để xem dữ liệu chi tiết.
      </div>
    </OwnerPage>
  )
}