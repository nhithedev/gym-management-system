import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, AlertCircle, X, Shield, Users, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { rbacService, type Group, type GroupDetail, type CreateGroupDto, type Permission } from '@/services/rbac.service'
import { Page, PageHeader, PageSkeleton } from '@/components/shared/PageUI'

const G = '#06c384'

// ─── Create/Edit Group Modal ───────────────────────────────────────────────

interface GroupModalProps {
  group?: Group
  onClose: () => void
  onSaved: () => void
}

function GroupModal({ group, onClose, onSaved }: GroupModalProps) {
  const isEdit = Boolean(group)
  const [form, setForm] = useState<CreateGroupDto>({
    name: group?.name ?? '',
    description: group?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Tên nhóm là bắt buộc.'); return }
    setSaving(true)
    setErr(null)
    try {
      if (isEdit && group) {
        await rbacService.updateGroup(group.groupId, { name: form.name.trim(), description: form.description?.trim() || undefined })
      } else {
        await rbacService.createGroup({ name: form.name.trim(), description: form.description?.trim() || undefined })
      }
      onSaved()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setErr(msg ?? `${isEdit ? 'Cập nhật' : 'Tạo'} nhóm thất bại.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rogym-card w-full max-w-md p-6" style={{ background: '#0f1c16' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}</h2>
          <button onClick={onClose} className="text-[var(--rogym-text-muted)] hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--rogym-text-muted)]">Tên nhóm *</label>
            <input className="input-base w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="VD: receptionist" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--rogym-text-muted)]">Mô tả</label>
            <input className="input-base w-full" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Mô tả ngắn về nhóm này" />
          </div>
          {err && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{err}</p>
            </div>
          )}
          <div className="mt-1 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rogym-btn rogym-btn--outline-white px-4 py-2 text-sm">Huỷ</button>
            <button type="submit" disabled={saving} className="rogym-btn rogym-btn--primary px-5 py-2 text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : isEdit ? 'Lưu' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm ────────────────────────────────────────────────────────

function DeleteConfirm({ group, onClose, onDeleted }: { group: Group; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function confirm() {
    setDeleting(true)
    try {
      await rbacService.deleteGroup(group.groupId)
      onDeleted()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setErr(msg ?? 'Xoá nhóm thất bại.')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rogym-card w-full max-w-sm p-6" style={{ background: '#0f1c16' }}>
        <h2 className="mb-2 text-lg font-bold text-white">Xoá nhóm?</h2>
        <p className="mb-5 text-sm text-[var(--rogym-text-secondary)]">
          Nhóm <span className="font-semibold text-white">{group.name}</span> và tất cả liên kết quyền sẽ bị xoá. Người dùng trong nhóm không bị xoá.
        </p>
        {err && <p className="mb-3 text-xs text-red-300">{err}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rogym-btn rogym-btn--outline-white px-4 py-2 text-sm">Huỷ</button>
          <button onClick={confirm} disabled={deleting} className="rogym-btn px-5 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: '#ef444422', border: '1px solid #ef444444', color: '#f87171' }}>
            {deleting ? 'Đang xoá...' : 'Xoá'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Group Detail Drawer ───────────────────────────────────────────────────

function GroupDetailDrawer({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [allPerms, setAllPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      rbacService.getGroup(groupId),
      rbacService.listPermissions({ pageSize: 100 }),
    ]).then(([g, permsRes]) => {
      setDetail(g)
      setAllPerms(permsRes.data)
      setLoading(false)
    }).catch(() => {
      setErr('Không thể tải chi tiết nhóm.')
      setLoading(false)
    })
  }, [groupId])

  async function togglePerm(perm: Permission, assigned: boolean) {
    if (!detail) return
    setToggling(perm.permissionId)
    try {
      if (assigned) {
        await rbacService.revokePermission(detail.groupId, perm.permissionId)
      } else {
        await rbacService.assignPermissions(detail.groupId, [perm.permissionId])
      }
      const updated = await rbacService.getGroup(detail.groupId)
      setDetail(updated)
    } catch {
      // ignore toggle errors silently
    } finally {
      setToggling(null)
    }
  }

  const assignedIds = new Set(detail?.permissions.map((p) => p.permissionId) ?? [])

  // group permissions by resource prefix
  const byResource = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    const resource = p.code.split('.')[0]
    if (!acc[resource]) acc[resource] = []
    acc[resource].push(p)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="relative h-full w-full max-w-sm overflow-y-auto flex flex-col gap-0" style={{ background: '#0b1812' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--rogym-border-section)] px-5 py-4" style={{ background: '#0b1812' }}>
          <h2 className="text-base font-bold text-white">{detail?.name ?? 'Chi tiết nhóm'}</h2>
          <button onClick={onClose} className="text-[var(--rogym-text-muted)] hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />)}
            </div>
          ) : err ? (
            <p className="text-sm text-red-300">{err}</p>
          ) : detail ? (
            <>
              <div className="flex gap-4">
                <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-lg font-bold" style={{ color: G }}>{detail.memberCount}</p>
                  <p className="text-xs text-[var(--rogym-text-muted)]">Thành viên</p>
                </div>
                <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-lg font-bold text-amber-400">{detail.permissionCount}</p>
                  <p className="text-xs text-[var(--rogym-text-muted)]">Quyền</p>
                </div>
              </div>

              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--rogym-text-muted)]">Phân quyền</h3>

              {Object.entries(byResource).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
                <ResourcePermGroup
                  key={resource}
                  resource={resource}
                  perms={perms}
                  assignedIds={assignedIds}
                  toggling={toggling}
                  onToggle={togglePerm}
                />
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ResourcePermGroup({
  resource, perms, assignedIds, toggling, onToggle,
}: {
  resource: string
  perms: Permission[]
  assignedIds: Set<string>
  toggling: string | null
  onToggle: (p: Permission, assigned: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const assignedCount = perms.filter((p) => assignedIds.has(p.permissionId)).length

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <button className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors" onClick={() => setOpen((o) => !o)}>
        <span className="flex items-center gap-2">
          <Shield size={13} style={{ color: G }} />
          <span className="capitalize">{resource}</span>
          {assignedCount > 0 && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${G}22`, color: G }}>
              {assignedCount}/{perms.length}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={14} className="text-[var(--rogym-text-dim)]" /> : <ChevronDown size={14} className="text-[var(--rogym-text-dim)]" />}
      </button>

      {open && (
        <div className="divide-y divide-white/5 border-t border-white/5">
          {perms.map((p) => {
            const assigned = assignedIds.has(p.permissionId)
            const loading = toggling === p.permissionId
            return (
              <label key={p.permissionId} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                <input
                  type="checkbox"
                  checked={assigned}
                  disabled={loading}
                  onChange={() => onToggle(p, assigned)}
                  className="h-4 w-4 rounded accent-[#06c384] disabled:opacity-50"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-white truncate">{p.code}</p>
                  {p.description && <p className="mt-0.5 text-[10px] text-[var(--rogym-text-muted)] truncate">{p.description}</p>}
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const SYSTEM_GROUPS = new Set(['owner', 'staff', 'trainer', 'member'])

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null)
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null)

  const load = useCallback((s: string) => {
    setLoading(true)
    setError(null)
    rbacService.listGroups({ pageSize: 50, search: s || undefined })
      .then((res) => {
        setGroups(res.data)
        setTotal(res.meta.total)
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        setError(msg ?? 'Không thể tải danh sách nhóm.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load('') }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load(search)
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Phân quyền"
        title="Nhóm quyền"
        description={`${total} nhóm trong hệ thống`}
        actions={
          <button onClick={() => setShowCreate(true)} className="rogym-btn rogym-btn--primary flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={15} /> Thêm nhóm
          </button>
        }
      />

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rogym-text-muted)]" />
          <input className="input-base pl-9" placeholder="Tìm tên nhóm..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="submit" className="rogym-btn rogym-btn--primary px-5">Tìm kiếm</button>
      </form>

      {loading ? (
        <PageSkeleton rows={5} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : (
        <div className="rogym-card rogym-card--compact overflow-hidden p-0">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <p className="text-sm text-[var(--rogym-text-secondary)]">Không tìm thấy nhóm nào.</p>
            </div>
          ) : (
            <>
              <div className="grid items-center gap-3 border-b border-[var(--rogym-border-section)] px-5 py-3 text-xs font-semibold uppercase text-[var(--rogym-text-muted)]" style={{ gridTemplateColumns: '1.5fr 2fr 0.8fr 0.8fr auto' }}>
                <span>Tên nhóm</span>
                <span>Mô tả</span>
                <span className="flex items-center gap-1"><Users size={12} /> Thành viên</span>
                <span className="flex items-center gap-1"><Shield size={12} /> Quyền</span>
                <span />
              </div>
              {groups.map((g, i) => {
                const isSystem = SYSTEM_GROUPS.has(g.name)
                return (
                  <div
                    key={g.groupId}
                    className="grid cursor-pointer items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                    style={{ gridTemplateColumns: '1.5fr 2fr 0.8fr 0.8fr auto', borderBottom: i < groups.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    onClick={() => setDetailGroupId(g.groupId)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${G}1a` }}>
                        <Shield size={14} style={{ color: G }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{g.name}</p>
                        {isSystem && <span className="text-[10px] text-amber-400">Hệ thống</span>}
                      </div>
                    </div>
                    <p className="truncate text-sm text-[var(--rogym-text-secondary)]">{g.description ?? '—'}</p>
                    <p className="text-sm text-white">{g.memberCount}</p>
                    <p className="text-sm text-white">{g.permissionCount}</p>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setEditGroup(g)} title="Sửa" className="rounded-lg p-1.5 text-[var(--rogym-text-muted)] hover:bg-white/10 hover:text-white transition-colors">
                        <Pencil size={14} />
                      </button>
                      {!isSystem && (
                        <button onClick={() => setDeleteGroup(g)} title="Xoá" className="rounded-lg p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {showCreate && <GroupModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(search) }} />}
      {editGroup && <GroupModal group={editGroup} onClose={() => setEditGroup(null)} onSaved={() => { setEditGroup(null); load(search) }} />}
      {deleteGroup && <DeleteConfirm group={deleteGroup} onClose={() => setDeleteGroup(null)} onDeleted={() => { setDeleteGroup(null); load(search) }} />}
      {detailGroupId && <GroupDetailDrawer groupId={detailGroupId} onClose={() => setDetailGroupId(null)} />}
    </Page>
  )
}
