import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import rbacService, { type Group, type Permission } from '@/services/rbac.service'

const SYSTEM_GROUPS = new Set(['owner', 'staff', 'trainer', 'member'])

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Group | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [editForm, setEditForm] = useState({ description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      rbacService.listGroups(1, 50),
      rbacService.listPermissions(1, 100),
    ])
      .then(([g, p]) => {
        setGroups(g.data)
        setPermissions(p.data)
      })
      .catch(() => setError('Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSelectGroup = async (g: Group) => {
    const detail = await rbacService.getGroup(g.groupId)
    setSelected(detail.data)
    setEditForm({ description: detail.data.description ?? '' })
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.description) return
    setSubmitting(true)
    try {
      await rbacService.createGroup(createForm)
      setShowCreate(false)
      setCreateForm({ name: '', description: '' })
      load()
      showToast('Tạo group thành công')
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Lỗi khi tạo group')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateDesc = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await rbacService.updateGroup(selected.groupId, { description: editForm.description })
      load()
      setSelected((prev) => prev ? { ...prev, description: editForm.description } : prev)
      showToast('Cập nhật thành công')
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Lỗi khi cập nhật')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (g: Group) => {
    if (!confirm(`Xóa group "${g.name}"?`)) return
    try {
      await rbacService.deleteGroup(g.groupId)
      setSelected(null)
      load()
      showToast('Đã xóa group')
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Không thể xóa group')
    }
  }

  const handleTogglePermission = async (code: string, permId: string, hasIt: boolean) => {
    if (!selected) return
    try {
      if (hasIt) {
        await rbacService.revokePermission(selected.groupId, permId)
        setSelected((prev) =>
          prev ? { ...prev, permissions: prev.permissions?.filter((p) => p.permissionId !== permId) } : prev
        )
      } else {
        await rbacService.assignPermissions(selected.groupId, [code])
        const perm = permissions.find((p) => p.permissionId === permId)
        if (perm) setSelected((prev) => prev ? { ...prev, permissions: [...(prev.permissions ?? []), perm] } : prev)
      }
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Lỗi cập nhật quyền')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-surface-container-high border border-outline-variant px-4 py-3 text-sm text-on-surface shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary">Phân quyền</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-surface">Quản lý Groups</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:opacity-90 transition"
        >
          <Plus className="size-4" />
          Tạo group
        </button>
      </div>

      {loading && <div className="py-16 text-center text-sm text-on-surface-variant">Đang tải...</div>}
      {error && <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Group list */}
          <div className="lg:col-span-1 space-y-2">
            {groups.map((g) => (
              <button
                key={g.groupId}
                onClick={() => handleSelectGroup(g)}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                  selected?.groupId === g.groupId
                    ? 'border-primary bg-primary/10'
                    : 'border-outline-variant bg-surface-container-high hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-on-surface-variant shrink-0" />
                  <span className="text-sm font-medium text-on-surface">{g.name}</span>
                  {SYSTEM_GROUPS.has(g.name) && (
                    <span className="ml-auto text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">system</span>
                  )}
                </div>
                <div className="mt-1 flex gap-3 text-xs text-on-surface-variant pl-6">
                  <span>{g.memberCount} thành viên</span>
                  <span>{g.permissionCount} quyền</span>
                </div>
              </button>
            ))}
          </div>

          {/* Group detail */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-outline-variant text-sm text-on-surface-variant">
                Chọn một group để xem chi tiết
              </div>
            ) : (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-high overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
                  <div>
                    <p className="text-base font-semibold text-on-surface">{selected.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{selected.permissions?.length ?? 0} quyền được gán</p>
                  </div>
                  {!SYSTEM_GROUPS.has(selected.name) && (
                    <button
                      onClick={() => handleDelete(selected)}
                      className="flex items-center gap-1.5 text-xs text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition"
                    >
                      <Trash2 className="size-3.5" />
                      Xóa
                    </button>
                  )}
                </div>

                {/* Description edit */}
                <div className="px-5 py-4 border-b border-outline-variant space-y-2">
                  <label className="text-xs text-on-surface-variant">Mô tả</label>
                  <div className="flex gap-2">
                    <input
                      value={editForm.description}
                      onChange={(e) => setEditForm({ description: e.target.value })}
                      className="flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleUpdateDesc}
                      disabled={submitting}
                      className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs text-on-primary hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                      Lưu
                    </button>
                  </div>
                </div>

                {/* Permissions toggle */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                    <Pencil className="size-3.5 inline mr-1" />
                    Phân quyền
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {permissions.map((p) => {
                      const hasIt = selected.permissions?.some((sp) => sp.permissionId === p.permissionId) ?? false
                      return (
                        <button
                          key={p.permissionId}
                          onClick={() => handleTogglePermission(p.code, p.permissionId, hasIt)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${
                            hasIt
                              ? 'bg-primary/15 text-primary border border-primary/30'
                              : 'bg-surface text-on-surface-variant border border-outline-variant hover:bg-surface-container'
                          }`}
                        >
                          <span className={`block size-2 rounded-full shrink-0 ${hasIt ? 'bg-primary' : 'bg-outline'}`} />
                          <code className="truncate">{p.code}</code>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-high p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-on-surface">Tạo group mới</p>
              <button onClick={() => setShowCreate(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant">Tên group (lowercase, không dấu)</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  placeholder="vd: manager"
                  className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Mô tả (10-500 ký tự)</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !createForm.name || createForm.description.length < 10}
                className="rounded-xl bg-primary px-4 py-2 text-sm text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Đang tạo...' : 'Tạo group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
