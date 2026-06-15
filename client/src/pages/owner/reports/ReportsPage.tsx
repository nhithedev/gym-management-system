import { Link } from 'react-router-dom'
import { BarChart3, Award, UserCheck } from 'lucide-react'
import { OwnerPage, OwnerPageHeader } from '@/components/OwnerUI'

const REPORT_TYPES = [
  {
    to: '/owner/reports/staff-performance',
    icon: <Award size={28} />,
    label: 'Báo cáo hiệu suất PT',
    description: 'Xếp hạng huấn luyện viên theo số buổi dạy và điểm feedback.',
    color: '#8b5cf6',
  },
  {
    to: '/owner/reports/employee-performance',
    icon: <UserCheck size={28} />,
    label: 'Báo cáo hiệu suất nhân viên',
    description: 'Số ca làm việc và điểm feedback của nhân viên theo khoảng thời gian.',
    color: '#06b6d4',
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
              <h3 className="text-base font-bold text-white group-hover:rogym-text-accent transition-colors">
                {report.label}
              </h3>
              <p className="mt-1.5 text-sm rogym-text-secondary">{report.description}</p>
            </div>
            <BarChart3
              size={18}
              className="shrink-0 rogym-text-dim group-hover:rogym-text-accent transition-colors"
            />
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-sm rogym-text-dim">
        <BarChart3 size={16} />
        Chọn khoảng thời gian trong mỗi báo cáo để xem dữ liệu chi tiết.
      </div>
    </OwnerPage>
  )
}
