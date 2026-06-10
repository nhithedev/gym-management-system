import { useEffect, useState } from 'react'
import { Users, Wrench, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { memberService } from '@/services/member.service'
import { facilityService } from '@/services/facility.service'
import { feedbackService } from '@/services/feedback.service'

interface StatCard {
  label: string
  value: string
  note: string
  icon: React.ReactNode
  color: string
  href: string
}

export default function StaffDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalMembers: '—',
    brokenEquipment: '—',
    pendingFeedback: '—',
    activeMembers: '—',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      memberService.list({ pageSize: 1, status: 'active' }),
      memberService.list({ pageSize: 1 }),
      facilityService.listEquipment({ pageSize: 1, status: 'broken' }),
      feedbackService.list({ pageSize: 1, status: 'open' }),
    ]).then(([activeRes, totalRes, equipRes, feedbackRes]) => {
      setStats({
        activeMembers:
          activeRes.status === 'fulfilled' ? String(activeRes.value.meta.totalItems) : '—',
        totalMembers:
          totalRes.status === 'fulfilled' ? String(totalRes.value.meta.totalItems) : '—',
        brokenEquipment:
          equipRes.status === 'fulfilled' ? String(equipRes.value.meta.totalItems) : '—',
        pendingFeedback:
          feedbackRes.status === 'fulfilled' ? String(feedbackRes.value.meta.totalItems) : '—',
      })
      setLoading(false)
    })
  }, [])

  const statCards: StatCard[] = [
    {
      label: 'Hội viên đang hoạt động',
      value: loading ? '...' : stats.activeMembers,
      note: `Tổng ${loading ? '...' : stats.totalMembers} hội viên trong hệ thống`,
      icon: <Users className="w-5 h-5" />,
      color: 'text-primary bg-primary/10',
      href: '/staff/members',
    },
    {
      label: 'Thiết bị đang hỏng',
      value: loading ? '...' : stats.brokenEquipment,
      note: 'Cần xử lý bảo trì',
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-error bg-error/10',
      href: '/staff/equipment',
    },
    {
      label: 'Feedback chờ xử lý',
      value: loading ? '...' : stats.pendingFeedback,
      note: 'Phản hồi chưa được tiếp nhận',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'text-amber-600 bg-amber-100',
      href: '/staff/feedback',
    },
    {
      label: 'Giao dịch hôm nay',
      value: '—',
      note: 'Tính năng sắp ra mắt',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-green-600 bg-green-100',
      href: '/staff/members',
    },
  ]

  const quickActions = [
    {
      eyebrow: 'Hội viên',
      title: 'Quản lý hội viên',
      description: 'Tìm kiếm, đăng ký mới, gia hạn gói và xem lịch sử thanh toán tại quầy.',
      href: '/staff/members',
    },
    {
      eyebrow: 'Phòng tập',
      title: 'Cơ sở vật chất',
      description: 'Quản lý phòng tập, sức chứa và tình trạng từng khu vực.',
      href: '/staff/facility',
    },
    {
      eyebrow: 'Thiết bị',
      title: 'Quản lý thiết bị',
      description: 'Theo dõi trạng thái, báo hỏng và lịch sử bảo trì thiết bị.',
      href: '/staff/equipment',
    },
    {
      eyebrow: 'Phản hồi',
      title: 'Xử lý feedback',
      description: 'Tiếp nhận và cập nhật kết quả xử lý phản hồi của hội viên.',
      href: '/staff/feedback',
    },
  ]

  return (
    <div className="space-y-8 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Staff Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">Bảng điều hành</h1>
        <p className="mt-2 text-sm text-on-surface/70">
          Tổng quan trạng thái hoạt động — hội viên, thiết bị và phản hồi cần xử lý.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.href)}
            className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 text-left shadow-sm transition hover:shadow-md hover:border-primary/30"
          >
            <div className={`inline-flex items-center justify-center rounded-2xl p-2.5 ${card.color}`}>
              {card.icon}
            </div>
            <p className="mt-4 text-3xl font-semibold">{card.value}</p>
            <p className="mt-1 text-sm font-medium text-on-surface">{card.label}</p>
            <p className="mt-1 text-xs text-on-surface/60">{card.note}</p>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant font-semibold mb-4">
          Truy cập nhanh
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => (
            <button
              key={action.href}
              onClick={() => navigate(action.href)}
              className="group rounded-3xl border border-outline-variant/70 bg-surface-container-high p-6 text-left shadow-sm transition hover:shadow-md hover:border-primary/30"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
                {action.eyebrow}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-on-surface">{action.title}</h2>
                <ArrowRight className="w-4 h-4 text-on-surface-variant transition group-hover:translate-x-1 group-hover:text-primary shrink-0" />
              </div>
              <p className="mt-2 text-sm text-on-surface/70">{action.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
