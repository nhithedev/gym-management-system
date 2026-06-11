import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, LoaderCircle } from 'lucide-react'
import { getApiError, isApiConflict } from '@/lib/api-error'
import { staffService, type StaffProfile, type ListStaffParams } from '@/services/staff.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
} from '@/components/OwnerUI'

const G = '#06c384'
const POSITION_COLOR: Record<string, string> = {
  staff: '#3b82f6', trainer: '#8b5cf6', owner: '#f59e0b', member: '#06c384',
}
const POSITION_LABEL: Record<string, string> = {
  staff: 'Nhân viên', trainer: 'Huấn luyện viên', owner: 'Chủ sở hữu', member: 'Hội viên',
}
const STATUS_COLOR: Record<string, string> = {
  active: '#22c55e', pending_verification: '#f59e0b', locked: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động', pending_verification: 'Chờ xác thực', locked: 'Bị khóa',
}

const PAGE_SIZE = 20

export default function UsersPage() {
  const navigate = useNavigate()

  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [status, setStatus] = useState('active')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchStaff = useCallback(async (pg: number) => {
    setLoading(true)
    setError(null)
    try {
      const params: ListStaffParams = {
        page: pg,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        position: position || undefined,
        search: debouncedSearch || undefined,
      }
      const { data, total: t } = await staffService.list(params)
      setStaffList(data)
      setTotal(t)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải danh sách nhân sự.'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, position, status])

  useEffect(() => { fetchStaff(page) }, [fetchStaff, page])

  // Reset page on filter change
  function handleFilterChange(setter: (v: string) => void) {
    return (val: string) => { setter(val); setPage(1) }
  }

  async function handleDelete(staff: StaffProfile) {
    setDeletingId(staff.staffId)
    setDeleteError(null)
    try {
      await staffService.delete(staff.staffId)
      setStaffList((prev) => prev.filter((s) => s.staffId !== staff.staffId))
      setTotal((prev) => prev - 1)
    } catch (err) {
      if (isApiConflict(err)) {
        setDeleteError('Không thể xóa nhân viên này.')
      } else {
        setDeleteError(getApiError(err, 'Xóa thất bại.'))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Nhân sự"
        title="Quản lý nhân sự"
        description={`${total} nhân viên trong hệ thống`}
        actions={
          <Link className="rogym-btn rogym-btn--primary" to="/owner/staff/new">
            <Plus size={16} /> Thêm nhân viên
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rogym-text-dim)]"
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email, mã nhân viên..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
            className="rogym-input pl-9 pr-4"
          />
        </div>

        {/* Position filter */}
        <select
          value={position}
          onChange={(e) => handleFilterChange(setPosition)(e.target.value)}
          className="rogym-select min-w-[160px]"
        >
          <option value="">all</option>
          <option value="staff">staff</option>
          <option value="trainer">trainer</option>
          <option value="owner">owner</option>
          <option value="member">member</option>
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => handleFilterChange(setStatus)(e.target.value)}
          className="rogym-select min-w-[160px]"
        >
          <option value="active">Hoạt động</option>
          <option value="deleted">Đã xóa</option>
        </select>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
          {deleteError}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <OwnerSkeleton rows={PAGE_SIZE} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => fetchStaff(page)} />
      ) : staffList.length === 0 ? (
        <OwnerEmptyState
          title="Không có nhân viên nào"
          description="Thử thay đổi bộ lọc hoặc thêm nhân viên mới."
          action={
            <Link className="rogym-btn rogym-btn--primary" to="/owner/staff/new">
              <Plus size={16} /> Thêm nhân viên
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-[var(--rogym-text-dim)]">
                  <th className="px-5 py-3 font-medium">Mã NV</th>
                  <th className="px-5 py-3 font-medium">Họ tên</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium text-right">Vị trí</th>
                  <th className="px-5 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staffList.map((staff) => (
                  <tr
                    key={staff.staffId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-[var(--rogym-text-dim)]">
                      {staff.staffCode}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">{staff.fullName}</td>
                    <td className="px-5 py-4 text-[var(--rogym-text-secondary)]">{staff.email}</td>
                    <td className="px-5 py-4 text-right">
                      <OwnerBadge
                        label={staff.position}
                        color={POSITION_COLOR[staff.position] ?? '#6b7280'}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <OwnerBadge
                        label={STATUS_LABEL[staff.status] ?? staff.status}
                        color={STATUS_COLOR[staff.status] ?? '#6b7280'}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/owner/staff/${staff.staffId}`}
                          className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
                        >
                          <Edit2 size={14} /> Chi tiết
                        </Link>
                        {status === 'active' && (
                          <button
                            className="rogym-btn rogym-btn--danger rogym-btn--nav"
                            disabled={deletingId === staff.staffId}
                            onClick={() => handleDelete(staff)}
                          >
                            {deletingId === staff.staffId ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
                disabled={page === 1}
                onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >
                Trước
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="h-9 w-9 rounded-full border text-sm font-medium transition-colors"
                    style={{
                      background: page === p ? 'rgba(6,195,132,0.15)' : 'transparent',
                      color: page === p ? G : 'var(--rogym-text-secondary)',
                      borderColor: page === p ? 'rgba(6,195,132,0.3)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
                disabled={page === totalPages}
                onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </OwnerPage>
  )
}