import { useEffect, useState } from 'react'
import { Search, User, Shield, CheckCircle, XCircle, Clock, Trash2, RefreshCw } from 'lucide-react'
import rbacService, { type UserAdmin, type Group } from '@/services/rbac.service'

const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  pending_verification: 'Chờ xác thực',
  locked: 'Bị khóa',
}

const STATUS_ICON: Record<string, JSX.Element> = {
  active: <CheckCircle className="size-3.5 text-green-500" />,
  pending_verification: <Clock className="size-3.5 text-yellow-500" />,
  locked: <XCircle className="size-3.5 text-error" />,
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-primary bg-primary/10',
  staff: 'text-blue-600 bg-blue-500/10',
  trainer: 'text-purple-600 bg-purple-500/10',
  member: 'text-green-600 bg-green-500/10',
}

interface UserDetail extends UserAdmin {
  groups: { groupId: string; name: string }[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserAdmin[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selected, setSelected] = useState<UserDetail | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [editGroupId, setEditGroupId] = useState('')
  const [groupLoading, setGroupLoading] = useState(false)

  const PAGE_SIZE = 20

  const loadUsers = (p = page) => {
    setLoading(true)
    rbacService.listUsers({
      page: p,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
    })
      .then((res) => {
        setUsers(res.data)
        setTotal(res.meta.total)
      })
      .catch(() => setError('Không thể tải danh sách người dùng'))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadUsers(1); setPage(1) }, [search, roleFilter, statusFilter])

  useEffect(() => {
    rbacService.listGroups(1, 100)
      .then((res) => setAllGroups(res.data))
      .catch(() => {})
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const selectUser = async (u: UserAdmin) => {
    setEditStatus(u.status)
    try {
      const res = await rbacService.getUser(u.userId)
      const detail = res.data as UserDetail
      setSelected(detail)
      setEditStatus(detail.status)
      setEditGroupId(detail.groups[0]?.groupId ?? '')
    } catch {
      setSelected({ ...u, groups: [] })
      setEditGroupId('')
    }
  }

  const handleDelete = async (u: UserAdmin) => {
    if (!confirm(`Xóa tài khoản "${u.fullName}" (${u.email})?`)) return
    try {
      await rbacService.deleteUser(u.userId)
      setSelected(null)
      showToast('Đã xóa tài khoản (soft delete)')
      loadUsers(page)
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Không thể xóa tài khoản')
    }
  }

  const handleUpdateStatus = async () => {
    if (!selected || !editStatus) return
    setSubmitting(true)
    try {
      const updated = await rbacService.updateUser(selected.userId, { status: editStatus })
      setSelected((prev) => prev ? { ...prev, status: updated.data.status } : prev)
      setUsers((prev) => prev.map((u) => u.userId === selected.userId ? { ...u, status: updated.data.status } : u))
      showToast('Cập nhật trạng thái thành công')
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Lỗi cập nhật')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveGroup = async () => {
    if (!selected || !editGroupId) return
    const currentGroupId = selected.groups[0]?.groupId
    if (editGroupId === currentGroupId) return
    setGroupLoading(true)
    try {
      await rbacService.assignUserGroup(selected.userId, editGroupId)
      if (currentGroupId) {
        await rbacService.revokeUserGroup(selected.userId, currentGroupId)
      }
      const res = await rbacService.getUser(selected.userId)
      const detail = res.data as UserDetail
      setSelected(detail)
      setEditGroupId(detail.groups[0]?.groupId ?? '')
      setUsers((prev) => prev.map((u) =>
        u.userId === selected.userId
          ? { ...u, roles: detail.groups.map((g) => g.name) }
          : u
      ))
      showToast('Đã cập nhật group')
    } catch (e) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Không thể cập nhật group')
    } finally {
      setGroupLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-surface-container-high border border-outline-variant px-4 py-3 text-sm text-on-surface shadow-lg">
          {toast}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary">Quản trị</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-surface">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{total} tài khoản</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT..."
            className="w-full rounded-xl border border-outline-variant bg-surface-container-high pl-9 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả vai trò</option>
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
          <option value="trainer">Trainer</option>
          <option value="member">Member</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="pending_verification">Chờ xác thực</option>
          <option value="locked">Bị khóa</option>
        </select>
        <button
          onClick={() => loadUsers()}
          className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {error && <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="py-16 text-center text-sm text-on-surface-variant">Đang tải...</div>
          ) : (
            <>
              <div className="rounded-2xl border border-outline-variant bg-surface-container-high overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Người dùng</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Vai trò</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {users.map((u) => (
                      <tr
                        key={u.userId}
                        onClick={() => selectUser(u)}
                        className={`cursor-pointer hover:bg-surface-container transition ${selected?.userId === u.userId ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-on-surface truncate max-w-[160px]">{u.fullName}</div>
                          <div className="text-xs text-on-surface-variant truncate max-w-[160px]">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span key={r} className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[r] ?? 'text-on-surface-variant bg-surface'}`}>
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {STATUS_ICON[u.status]}
                            <span className="text-xs text-on-surface-variant">{STATUS_LABELS[u.status] ?? u.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {users.length === 0 && (
                  <div className="py-12 text-center text-sm text-on-surface-variant">Không có người dùng nào</div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-on-surface-variant">Trang {page}/{totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => { setPage((p) => p - 1); loadUsers(page - 1) }}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs text-on-surface disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => { setPage((p) => p + 1); loadUsers(page + 1) }}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs text-on-surface disabled:opacity-40"
                    >
                      Tiếp
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User detail */}
        <div className="lg:col-span-1">
          {!selected ? (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-outline-variant text-sm text-on-surface-variant">
              Chọn người dùng
            </div>
          ) : (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-high overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{selected.fullName}</p>
                  <p className="text-xs text-on-surface-variant truncate">{selected.email}</p>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Trạng thái */}
                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Trạng thái</p>
                  <div className="flex gap-2">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="flex-1 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="pending_verification">Chờ xác thực</option>
                      <option value="locked">Khóa tài khoản</option>
                    </select>
                    <button
                      onClick={handleUpdateStatus}
                      disabled={submitting || editStatus === selected.status}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs text-on-primary hover:opacity-90 disabled:opacity-50"
                    >
                      Lưu
                    </button>
                  </div>
                </div>

                {/* Group — chỉ 1 group */}
                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Group</p>
                  <div className="flex gap-2">
                    <select
                      value={editGroupId}
                      onChange={(e) => setEditGroupId(e.target.value)}
                      disabled={groupLoading}
                      className="flex-1 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      {allGroups.map((g) => (
                        <option key={g.groupId} value={g.groupId}>{g.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveGroup}
                      disabled={groupLoading || editGroupId === selected.groups[0]?.groupId}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs text-on-primary hover:opacity-90 disabled:opacity-50"
                    >
                      Lưu
                    </button>
                  </div>
                </div>

                {/* Thông tin thêm */}
                {selected.phone && (
                  <div>
                    <p className="text-xs text-on-surface-variant">Điện thoại</p>
                    <p className="text-sm text-on-surface mt-0.5">{selected.phone}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-on-surface-variant" />
                  <p className="text-xs text-on-surface-variant">
                    {selected.emailVerifiedAt ? 'Email đã xác thực' : 'Chưa xác thực email'}
                  </p>
                </div>
              </div>

              {/* Xóa */}
              <div className="px-5 py-3 border-t border-outline-variant">
                <button
                  onClick={() => handleDelete(selected)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-error/30 py-2 text-xs text-error hover:bg-error/10 transition"
                >
                  <Trash2 className="size-3.5" />
                  Xóa tài khoản
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
