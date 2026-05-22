import { useEffect, useState } from 'react'
import { Plus, Search, Package, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'
import packageService, { type Package as GymPackage, type CreatePackageDto } from '@/services/package.service'

const STATUS_LABEL: Record<string, string> = { active: 'Đang kinh doanh', inactive: 'Ngừng kinh doanh' }

const getApiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback

export default function PackagesPage() {
  const [packages, setPackages] = useState<GymPackage[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [selected, setSelected] = useState<GymPackage | null>(null)
  const [toast, setToast] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreatePackageDto>({ name: '', durationDays: 30, price: 0 })

  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', durationDays: 30, price: '', benefits: '' })

  const load = (p = 1) => {
    setLoading(true)
    packageService.list({
      page: p,
      pageSize: 20,
      search: search || undefined,
      status: statusFilter || undefined,
      includeDeleted: includeDeleted || undefined,
      sort: 'created_at:desc',
    })
      .then((res) => { setPackages(res.data); setTotal(res.meta.total) })
      .catch(() => setError('Không thể tải danh sách gói tập'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [search, statusFilter, includeDeleted])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSelect = async (pkg: GymPackage) => {
    try {
      const detail = await packageService.get(pkg.packageId)
      setSelected(detail)
      setEditForm({
        name: detail.name,
        durationDays: detail.durationDays,
        price: detail.price,
        benefits: detail.benefits ?? '',
      })
      setEditMode(false)
    } catch {
      setSelected(pkg)
    }
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.durationDays || !createForm.price) return
    setSubmitting(true)
    try {
      await packageService.create(createForm)
      setShowCreate(false)
      setCreateForm({ name: '', durationDays: 30, price: 0 })
      load(1)
      showToast('Tạo gói tập thành công')
    } catch (e) {
      showToast(getApiError(e, 'Lỗi khi tạo gói tập'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const updated = await packageService.update(selected.packageId, {
        name: editForm.name || undefined,
        durationDays: editForm.durationDays || undefined,
        price: editForm.price ? Number(editForm.price) : undefined,
        benefits: editForm.benefits || undefined,
      })
      setSelected(updated)
      setEditMode(false)
      setPackages((prev) => prev.map((p) => p.packageId === updated.packageId ? updated : p))
      showToast('Cập nhật thành công')
    } catch (e) {
      showToast(getApiError(e, 'Không thể cập nhật gói tập'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!selected) return
    const nextStatus = selected.status === 'active' ? 'inactive' : 'active'
    setSubmitting(true)
    try {
      const updated = await packageService.updateStatus(selected.packageId, nextStatus)
      setSelected(updated)
      setPackages((prev) => prev.map((p) => p.packageId === updated.packageId ? updated : p))
      showToast(`Đã chuyển sang "${STATUS_LABEL[nextStatus]}"`)
    } catch (e) {
      showToast(getApiError(e, 'Không thể thay đổi trạng thái'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm(`Xóa gói tập "${selected.name}"?`)) return
    setSubmitting(true)
    try {
      await packageService.delete(selected.packageId)
      setSelected(null)
      load(1)
      showToast('Đã xóa gói tập')
    } catch (e) {
      showToast(getApiError(e, 'Không thể xóa gói tập'))
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (price: string) =>
    Number(price).toLocaleString('vi-VN') + ' ₫'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-surface-container-high border border-outline-variant px-4 py-3 text-sm text-on-surface shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary">Danh mục</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-on-surface">Quản lý Gói Tập</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{total} gói tập</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:opacity-90 transition"
        >
          <Plus className="size-4" />
          Tạo gói mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã gói..."
            className="w-full rounded-xl border border-outline-variant bg-surface-container-high pl-9 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
          className="rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang kinh doanh</option>
          <option value="inactive">Ngừng kinh doanh</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="rounded"
          />
          Bao gồm đã xóa
        </label>
        <button
          onClick={() => load(1)}
          className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {error && <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-sm text-on-surface-variant">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Package list */}
          <div className="lg:col-span-1 space-y-2">
            {packages.length === 0 && (
              <div className="py-12 text-center text-sm text-on-surface-variant">Không có gói tập nào</div>
            )}
            {packages.map((pkg) => (
              <button
                key={pkg.packageId}
                onClick={() => handleSelect(pkg)}
                className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                  selected?.packageId === pkg.packageId
                    ? 'border-primary bg-primary/10'
                    : pkg.deletedAt
                      ? 'border-outline-variant bg-surface-container opacity-50'
                      : 'border-outline-variant bg-surface-container-high hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-on-surface-variant shrink-0" />
                  <span className="text-sm font-medium text-on-surface truncate">{pkg.name}</span>
                  {pkg.status === 'inactive' && (
                    <span className="ml-auto text-xs text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">ngừng</span>
                  )}
                  {pkg.deletedAt && (
                    <span className="ml-auto text-xs text-error bg-error/10 px-1.5 py-0.5 rounded">đã xóa</span>
                  )}
                </div>
                <div className="mt-1 pl-6 flex gap-3 text-xs text-on-surface-variant">
                  <span>{pkg.durationDays} ngày</span>
                  <span>{formatPrice(pkg.price)}</span>
                  <span className="font-mono">{pkg.packageCode}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Package detail */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-outline-variant text-sm text-on-surface-variant">
                Chọn một gói tập để xem chi tiết
              </div>
            ) : (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-high overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
                  <div>
                    <p className="text-base font-semibold text-on-surface">{selected.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 font-mono">{selected.packageCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selected.deletedAt && (
                      <>
                        <button
                          onClick={handleToggleStatus}
                          disabled={submitting}
                          title={selected.status === 'active' ? 'Ngừng kinh doanh' : 'Mở lại'}
                          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:bg-surface-container px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {selected.status === 'active'
                            ? <ToggleRight className="size-4 text-primary" />
                            : <ToggleLeft className="size-4" />}
                          {STATUS_LABEL[selected.status]}
                        </button>
                        <button
                          onClick={() => setEditMode((v) => !v)}
                          className="flex items-center gap-1 text-xs text-on-surface-variant hover:bg-surface-container px-3 py-1.5 rounded-lg transition"
                        >
                          <Pencil className="size-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={submitting}
                          className="flex items-center gap-1 text-xs text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Stats */}
                  {selected.stats && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5 text-center">
                        <p className="text-xl font-semibold text-primary">{selected.stats.activeSubscriptions}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">Active</p>
                      </div>
                      <div className="rounded-xl bg-surface-container border border-outline-variant px-3 py-2.5 text-center">
                        <p className="text-xl font-semibold text-on-surface">{selected.stats.pendingSubscriptions}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">Pending</p>
                      </div>
                      <div className="rounded-xl bg-surface-container border border-outline-variant px-3 py-2.5 text-center">
                        <p className="text-xl font-semibold text-on-surface">{selected.stats.totalSubscriptions}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">Tổng</p>
                      </div>
                    </div>
                  )}

                  {editMode ? (
                    /* Edit form */
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-on-surface-variant">Tên gói</label>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-on-surface-variant">Số ngày</label>
                          <input
                            type="number"
                            min={1}
                            max={3650}
                            value={editForm.durationDays}
                            onChange={(e) => setEditForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
                            className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-on-surface-variant">Giá (VNĐ)</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.price}
                            onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                            className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-on-surface-variant">Quyền lợi</label>
                        <textarea
                          rows={2}
                          value={editForm.benefits}
                          onChange={(e) => setEditForm((f) => ({ ...f, benefits: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditMode(false)}
                          className="rounded-xl border border-outline-variant px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={submitting}
                          className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm text-on-primary hover:opacity-90 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          {submitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-on-surface-variant">Thời hạn</p>
                          <p className="text-sm font-medium text-on-surface mt-0.5">{selected.durationDays} ngày</p>
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-variant">Giá</p>
                          <p className="text-sm font-medium text-on-surface mt-0.5">{formatPrice(selected.price)}</p>
                        </div>
                      </div>
                      {selected.benefits && (
                        <div>
                          <p className="text-xs text-on-surface-variant">Quyền lợi</p>
                          <p className="text-sm text-on-surface mt-0.5">{selected.benefits}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-on-surface-variant">Ngày tạo</p>
                        <p className="text-sm text-on-surface mt-0.5">
                          {new Date(selected.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      {selected.deletedAt && (
                        <div className="rounded-xl bg-error/10 border border-error/20 px-3 py-2">
                          <p className="text-xs text-error">Đã xóa lúc {new Date(selected.deletedAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      )}
                    </div>
                  )}
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
              <p className="text-base font-semibold text-on-surface">Tạo gói tập mới</p>
              <button onClick={() => setShowCreate(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant">Tên gói *</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="vd: Standard 3 tháng"
                  className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-on-surface-variant">Số ngày *</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={createForm.durationDays}
                    onChange={(e) => setCreateForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant">Giá (VNĐ) *</label>
                  <input
                    type="number"
                    min={1}
                    value={createForm.price || ''}
                    onChange={(e) => setCreateForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    placeholder="500000"
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-on-surface-variant">Quyền lợi</label>
                <textarea
                  rows={2}
                  value={createForm.benefits ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, benefits: e.target.value || undefined }))}
                  placeholder="Mô tả quyền lợi gói tập..."
                  className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-on-surface-variant">Mã gói (tự sinh nếu bỏ trống)</label>
                <input
                  value={createForm.packageCode ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, packageCode: e.target.value.toUpperCase() || undefined }))}
                  placeholder="PKG-XXXX"
                  maxLength={8}
                  className="mt-1 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
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
                disabled={submitting || !createForm.name || !createForm.durationDays || !createForm.price}
                className="rounded-xl bg-primary px-4 py-2 text-sm text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Đang tạo...' : 'Tạo gói'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
