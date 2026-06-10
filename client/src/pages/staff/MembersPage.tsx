import { useCallback, useEffect, useState } from 'react'
import { Search, Plus, RefreshCcw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { memberService, type Member } from '@/services/member.service'
import packageService from '@/services/package.service'

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang hoạt động',
  pending_verification: 'Chờ xác minh',
  locked: 'Đã khoá',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending_verification: 'bg-amber-100 text-amber-700',
  locked: 'bg-error/10 text-error',
}

interface RegisterForm {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  packageId: string
  paymentMethod: 'cash' | 'bank_card' | 'ewallet'
}

const EMPTY_FORM: RegisterForm = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  packageId: '',
  paymentMethod: 'cash',
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Register modal
  const [showModal, setShowModal] = useState(false)
  const [packages, setPackages] = useState<{ packageId: string; name: string }[]>([])
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await memberService.list({
        page,
        pageSize: 20,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        sort: 'created_at:desc',
      })
      setMembers(res.data)
      setMeta(res.meta)
    } catch {
      setError('Không thể tải danh sách hội viên')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const openModal = async () => {
    setShowModal(true)
    setForm(EMPTY_FORM)
    setFormError('')
    if (packages.length === 0) {
      try {
        const res = await packageService.list({ status: 'active', pageSize: 100 })
        setPackages(res.data)
      } catch {
        // giữ packages rỗng
      }
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.packageId) {
      setFormError('Vui lòng chọn gói tập')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      await memberService.create({
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address || undefined,
        transactionReference: undefined,
      })
      setShowModal(false)
      setPage(1)
      fetchMembers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Đăng ký thất bại, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s === statusFilter ? '' : s)
    setPage(1)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý hội viên</p>
          <h1 className="mt-2 text-3xl font-semibold">Danh sách hội viên</h1>
          <p className="mt-2 text-sm text-on-surface/70">
            Tìm kiếm, gia hạn gói và xem lịch sử thanh toán ngay tại quầy.
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Đăng ký hội viên mới
        </button>
      </div>

      {/* Filter bar */}
      <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Tìm theo tên, mã, email, số điện thoại..."
              className="w-full rounded-2xl border border-outline bg-surface pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }}
            className="inline-flex items-center gap-2 rounded-full border border-outline px-3 py-2 text-sm hover:bg-surface-container-high shrink-0"
          >
            <RefreshCcw className="w-4 h-4" /> Làm mới
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[['', 'Tất cả'], ['active', 'Đang hoạt động'], ['pending_verification', 'Chờ xác minh'], ['locked', 'Đã khoá']].map(
            ([val, label]) => (
              <button
                key={val}
                onClick={() => handleStatusFilter(val)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  statusFilter === val
                    ? 'bg-primary text-white'
                    : 'bg-surface text-on-surface hover:bg-surface-container-high border border-outline-variant'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm overflow-x-auto">
        {error && (
          <p className="mb-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
        )}
        {loading ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">Đang tải...</div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-sm text-on-surface-variant">
            Không tìm thấy hội viên nào
          </div>
        ) : (
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                <th className="px-4 py-3">Mã HV</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tham gia</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberId} className="rounded-3xl bg-surface shadow-sm">
                  <td className="px-4 py-4 text-sm font-medium text-primary">{m.memberCode}</td>
                  <td className="px-4 py-4 text-sm font-medium">{m.fullName}</td>
                  <td className="px-4 py-4 text-sm">{m.phone}</td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">{m.email}</td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_CLASS[m.status] ?? 'bg-surface text-on-surface-variant'
                      }`}
                    >
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">
                    {new Date(m.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-on-surface-variant">
              {meta.totalItems} hội viên — trang {meta.page}/{meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-outline p-2 disabled:opacity-40 hover:bg-surface-container-high"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-outline p-2 disabled:opacity-40 hover:bg-surface-container-high"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Đăng ký hội viên mới</h2>
              <button onClick={() => setShowModal(false)} className="rounded-full p-2 hover:bg-surface-container-high">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Họ tên *
                  </label>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="mt-1 input-base"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Số điện thoại *
                  </label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 input-base"
                    placeholder="0901234567"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 input-base"
                  placeholder="email@example.com"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    className="mt-1 input-base"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Gói tập *
                  </label>
                  <select
                    required
                    value={form.packageId}
                    onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value }))}
                    className="mt-1 input-base"
                  >
                    <option value="">— Chọn gói —</option>
                    {packages.map((pkg) => (
                      <option key={pkg.packageId} value={pkg.packageId}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Phương thức thanh toán *
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['cash', 'bank_card', 'ewallet'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, paymentMethod: m }))}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        form.paymentMethod === m
                          ? 'bg-primary text-white'
                          : 'border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {m === 'cash' ? 'Tiền mặt' : m === 'bank_card' ? 'Thẻ ngân hàng' : 'Ví điện tử'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Địa chỉ
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="mt-1 input-base"
                  placeholder="Địa chỉ (tuỳ chọn)"
                />
              </div>

              {formError && (
                <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? 'Đang xử lý...' : 'Đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
