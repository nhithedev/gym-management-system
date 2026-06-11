import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, UserPlus, Briefcase, ChevronRight, AlertCircle } from 'lucide-react'
import { Page, PageHeader } from '@/components/shared/PageUI'
import { reportService, type RevenueReport, type MembersReport } from '@/services/report.service'
import { memberService } from '@/services/member.service'
import { staffService } from '@/services/staff.service'

function todayVN(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function startOfMonthVN(): string {
  const today = todayVN()
  return today.slice(0, 8) + '01'
}

function formatVND(raw: string | number): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw
  if (isNaN(n)) return String(raw)
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ ₫'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr ₫'
  return n.toLocaleString('vi-VN') + ' ₫'
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

interface StatCard {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color: string
  href: string
}

interface DashState {
  revenue: RevenueReport | null
  newMembers: MembersReport | null
  totalActiveMembers: number | null
  totalStaff: number | null
  loading: boolean
  errors: Record<string, string>
}

const QUICK_LINKS = [
  { label: 'Nhân sự', sub: 'Quản lý nhân viên & HLV', href: '/owner/staff', color: '#06c384' },
  { label: 'Gói tập', sub: 'Tạo và quản lý gói tập', href: '/owner/packages', color: '#3b82f6' },
  { label: 'Phân quyền', sub: 'Nhóm và quyền hệ thống', href: '/owner/rbac/groups', color: '#8b5cf6' },
  { label: 'Báo cáo', sub: 'Doanh thu & hội viên', href: '/owner/reports', color: '#f59e0b' },
]

export default function OwnerDashboardPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<DashState>({
    revenue: null,
    newMembers: null,
    totalActiveMembers: null,
    totalStaff: null,
    loading: true,
    errors: {},
  })

  useEffect(() => {
    const from = startOfMonthVN()
    const to = todayVN()
    const errors: Record<string, string> = {}

    Promise.allSettled([
      reportService.revenue(from, to),
      reportService.members(from, to),
      memberService.list({ status: 'active', pageSize: 1 }),
      staffService.list({ pageSize: 1 }),
    ]).then(([revRes, memRes, activeMembersRes, staffRes]) => {
      setState({
        revenue: revRes.status === 'fulfilled' ? revRes.value : null,
        newMembers: memRes.status === 'fulfilled' ? memRes.value : null,
        totalActiveMembers: activeMembersRes.status === 'fulfilled' ? activeMembersRes.value.total : null,
        totalStaff: staffRes.status === 'fulfilled' ? staffRes.value.total : null,
        loading: false,
        errors,
      })
      if (revRes.status === 'rejected') errors.revenue = 'Không tải được doanh thu'
      if (memRes.status === 'rejected') errors.members = 'Không tải được số hội viên mới'
      if (activeMembersRes.status === 'rejected') errors.activeMembers = 'Không tải được số hội viên'
      if (staffRes.status === 'rejected') errors.staff = 'Không tải được số nhân sự'
    })
  }, [])

  const monthLabel = formatMonth(startOfMonthVN())

  const statCards: StatCard[] = [
    {
      label: 'Doanh thu tháng',
      value: state.revenue ? formatVND(state.revenue.total) : '—',
      sub: monthLabel,
      icon: <TrendingUp size={22} />,
      color: '#06c384',
      href: '/owner/reports/revenue',
    },
    {
      label: 'Hội viên active',
      value: state.totalActiveMembers !== null ? state.totalActiveMembers.toLocaleString('vi-VN') : '—',
      sub: 'Đang có gói tập',
      icon: <Users size={22} />,
      color: '#3b82f6',
      href: '/staff/members',
    },
    {
      label: 'Hội viên mới tháng',
      value: state.newMembers ? state.newMembers.total.toLocaleString('vi-VN') : '—',
      sub: monthLabel,
      icon: <UserPlus size={22} />,
      color: '#8b5cf6',
      href: '/staff/members',
    },
    {
      label: 'Nhân sự',
      value: state.totalStaff !== null ? state.totalStaff.toLocaleString('vi-VN') : '—',
      sub: 'Nhân viên + HLV',
      icon: <Briefcase size={22} />,
      color: '#f59e0b',
      href: '/owner/staff',
    },
  ]

  const hasErrors = Object.keys(state.errors).length > 0

  return (
    <Page>
      <PageHeader
        eyebrow="Tổng quan"
        title="Bảng điều khiển"
        description="Thống kê hoạt động phòng tập"
      />

      {hasErrors && !state.loading && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">Một số số liệu không tải được. Kiểm tra kết nối đến server.</p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.href)}
            className="rogym-card rogym-card--compact flex flex-col gap-3 p-5 text-left hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${card.color}1a`, color: card.color }}
              >
                {card.icon}
              </div>
              <ChevronRight size={15} className="text-[var(--rogym-text-dim)]" />
            </div>
            <div>
              {state.loading ? (
                <div className="h-7 w-24 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <p className="text-2xl font-bold text-white">{card.value}</p>
              )}
              <p className="mt-1 text-xs font-medium text-[var(--rogym-text-secondary)]">{card.label}</p>
              {card.sub && <p className="mt-0.5 text-xs text-[var(--rogym-text-muted)]">{card.sub}</p>}
            </div>
          </button>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--rogym-text-muted)]">
          Truy cập nhanh
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => navigate(link.href)}
              className="rogym-card rogym-card--compact flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.04] transition-colors"
            >
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: link.color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{link.label}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--rogym-text-muted)]">{link.sub}</p>
              </div>
              <ChevronRight size={14} className="ml-auto shrink-0 text-[var(--rogym-text-dim)]" />
            </button>
          ))}
        </div>
      </div>

      {/* Revenue breakdown mini-chart (simple bar) */}
      {!state.loading && state.revenue && state.revenue.breakdown.length > 1 && (
        <div className="rogym-card rogym-card--compact p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Doanh thu theo ngày — {monthLabel}
          </h2>
          <RevenueBar breakdown={state.revenue.breakdown} />
        </div>
      )}
    </Page>
  )
}

function RevenueBar({ breakdown }: { breakdown: Array<{ date: string; amount: string }> }) {
  const max = Math.max(...breakdown.map((b) => parseFloat(b.amount)))
  if (max <= 0) return <p className="text-xs text-[var(--rogym-text-muted)]">Chưa có giao dịch trong tháng.</p>

  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 80 }}>
      {breakdown.map((b) => {
        const pct = (parseFloat(b.amount) / max) * 100
        const day = b.date.slice(8)
        return (
          <div key={b.date} className="flex flex-1 min-w-[18px] flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{ height: `${Math.max(pct * 0.6, 4)}px`, background: '#06c384', opacity: 0.85 }}
              title={`${b.date}: ${formatVND(b.amount)}`}
            />
            <span className="text-[9px] text-[var(--rogym-text-dim)] leading-none">{day}</span>
          </div>
        )
      })}
    </div>
  )
}
