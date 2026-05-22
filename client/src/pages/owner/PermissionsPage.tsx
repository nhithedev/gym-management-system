import { useEffect, useState } from 'react'
import { Shield, ChevronRight } from 'lucide-react'
import rbacService, { type Permission } from '@/services/rbac.service'

const RESOURCES = ['user', 'rbac', 'member', 'staff', 'package', 'subscription', 'payment', 'room', 'equipment', 'maintenance', 'session', 'attendance', 'progress', 'feedback', 'schedule', 'report']

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    rbacService.listPermissions(1, 100)
      .then((res) => setPermissions(res.data))
      .catch(() => setError('Không thể tải danh sách quyền'))
      .finally(() => setLoading(false))
  }, [])

  const grouped = RESOURCES.reduce<Record<string, Permission[]>>((acc, r) => {
    const items = permissions.filter((p) => p.code.startsWith(`${r}.`))
    if (items.length) acc[r] = items
    return acc
  }, {})

  const filteredGroups = filter
    ? Object.fromEntries(
        Object.entries(grouped).filter(([resource, items]) =>
          resource.includes(filter) || items.some((p) => p.code.includes(filter) || p.name.toLowerCase().includes(filter.toLowerCase()))
        )
      )
    : grouped

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary">Phân quyền</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-surface">Danh mục quyền</h1>
        <p className="mt-1 text-sm text-on-surface-variant">35 permission codes — read-only, quản lý qua seed.ts</p>
      </div>

      <div>
        <input
          type="text"
          placeholder="Tìm theo resource hoặc tên quyền..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading && (
        <div className="py-16 text-center text-sm text-on-surface-variant">Đang tải...</div>
      )}

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {Object.entries(filteredGroups).map(([resource, items]) => (
            <div key={resource} className="rounded-2xl border border-outline-variant bg-surface-container-high overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-outline-variant bg-surface-container">
                <Shield className="size-4 text-primary" />
                <span className="text-sm font-semibold text-on-surface capitalize">{resource}</span>
                <span className="ml-auto text-xs text-on-surface-variant">{items.length} quyền</span>
              </div>
              <ul className="divide-y divide-outline-variant">
                {items.map((p) => (
                  <li key={p.permissionId} className="flex items-center gap-4 px-5 py-3">
                    <ChevronRight className="size-3.5 text-on-surface-variant shrink-0" />
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{p.code}</code>
                    <span className="text-sm text-on-surface">{p.name}</span>
                    {p.description && (
                      <span className="ml-auto text-xs text-on-surface-variant truncate max-w-xs">{p.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {Object.keys(filteredGroups).length === 0 && (
            <div className="py-16 text-center text-sm text-on-surface-variant">Không tìm thấy quyền nào</div>
          )}
        </div>
      )}
    </div>
  )
}
