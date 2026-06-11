import { useEffect, useState } from 'react'
import { Search, Shield, AlertCircle } from 'lucide-react'
import { rbacService, type Permission } from '@/services/rbac.service'
import { Page, PageHeader, PageSkeleton } from '@/components/shared/PageUI'

const G = '#06c384'

const RESOURCE_LABELS: Record<string, string> = {
  auth: 'Xác thực',
  user: 'Người dùng',
  member: 'Hội viên',
  staff: 'Nhân sự',
  package: 'Gói tập',
  subscription: 'Đăng ký',
  payment: 'Thanh toán',
  training: 'Huấn luyện',
  facility: 'Phòng tập',
  equipment: 'Thiết bị',
  feedback: 'Phản hồi',
  report: 'Báo cáo',
  rbac: 'Phân quyền',
  notification: 'Thông báo',
  audit: 'Nhật ký',
  workout: 'Kế hoạch tập',
  workout_plan: 'Kế hoạch tập',
  exercise: 'Bài tập',
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    rbacService.listPermissions({ pageSize: 200 })
      .then((res) => {
        setPermissions(res.data)
        setTotal(res.meta.total)
        setLoading(false)
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        setError(msg ?? 'Không thể tải danh sách quyền.')
        setLoading(false)
      })
  }, [])

  const resources = [...new Set(permissions.map((p) => p.code.split('.')[0]))].sort()

  const filtered = permissions.filter((p) => {
    const matchSearch = !search || p.code.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
    const matchResource = !resourceFilter || p.code.startsWith(resourceFilter + '.')
    return matchSearch && matchResource
  })

  const byResource = filtered.reduce<Record<string, Permission[]>>((acc, p) => {
    const res = p.code.split('.')[0]
    if (!acc[res]) acc[res] = []
    acc[res].push(p)
    return acc
  }, {})

  return (
    <Page>
      <PageHeader
        eyebrow="Phân quyền"
        title="Danh sách quyền"
        description={`${total} quyền trong hệ thống (chỉ đọc)`}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rogym-text-muted)]" />
          <input className="input-base pl-9" placeholder="Tìm permission code..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-base w-auto min-w-[180px]" value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)}>
          <option value="">Tất cả nhóm</option>
          {resources.map((r) => (
            <option key={r} value={r}>{RESOURCE_LABELS[r] ?? r}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <PageSkeleton rows={8} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rogym-card rogym-card--compact flex min-h-32 items-center justify-center p-8">
          <p className="text-sm text-[var(--rogym-text-secondary)]">Không tìm thấy quyền nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byResource).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
            <div key={resource} className="rogym-card rogym-card--compact overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-[var(--rogym-border-section)] px-5 py-3">
                <Shield size={14} style={{ color: G }} />
                <h3 className="text-sm font-semibold text-white capitalize">
                  {RESOURCE_LABELS[resource] ?? resource}
                </h3>
                <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${G}22`, color: G }}>
                  {perms.length}
                </span>
              </div>

              {perms.map((p, i) => (
                <div
                  key={p.permissionId}
                  className="flex items-center gap-4 px-5 py-3"
                  style={{ borderBottom: i < perms.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <code className="text-xs font-mono text-white min-w-[220px]">{p.code}</code>
                  <p className="text-xs text-[var(--rogym-text-secondary)]">{p.description ?? '—'}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
