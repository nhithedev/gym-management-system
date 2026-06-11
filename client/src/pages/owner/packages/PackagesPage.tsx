import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, AlertCircle, X, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react'
import packageService, { type Package, type CreatePackageDto, type UpdatePackageDto } from '@/services/package.service'
import { Page, PageHeader, PageSkeleton } from '@/components/shared/PageUI'

const G = '#06c384'

function formatVND(raw: string | number): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw
  if (isNaN(n)) return String(raw)
  return n.toLocaleString('vi-VN') + ' ₫'
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: status === 'active' ? `${G}22` : 'rgba(107,114,128,0.15)',
        color: status === 'active' ? G : '#9ca3af',
        border: `1px solid ${status === 'active' ? `${G}44` : 'rgba(107,114,128,0.25)'}`,
      }}
    >
      {status === 'active' ? 'Đang bán' : 'Tạm dừng'}
    </span>
  )
}

// ─── Create / Edit Modal ───────────────────────────────────────────────────

interface PackageFormData {
  name: string
  durationDays: string
  price: string
  benefits: string
  status: 'active' | 'inactive'
}

function emptyForm(): PackageFormData {
  return { name: '', durationDays: '', price: '', benefits: '', status: 'active' }
}

function pkgToForm(p: Package): PackageFormData {
  return {
    name: p.name,
    durationDays: String(p.durationDays),
    price: String(parseFloat(p.price)),
    benefits: p.benefits ?? '',
    status: p.status,
  }
}

interface PkgModalProps {
  pkg?: Package
  onClose: () => void
  onSaved: () => void
}

function PkgModal({ pkg, onClose, onSaved }: PkgModalProps) {
  const isEdit = Boolean(pkg)
  const [form, setForm] = useState<PackageFormData>(pkg ? pkgToForm(pkg) : emptyForm())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function field<K extends keyof PackageFormData>(k: K, v: PackageFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Tên gói là bắt buộc.'); return }
    const days = parseInt(form.durationDays)
    if (isNaN(days) || days < 1) { setErr('Số ngày phải là số nguyên dương.'); return }
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) { setErr('Giá phải là số không âm.'); return }

    setSaving(true)
    setErr(null)
    try {
      if (isEdit && pkg) {
        const dto: UpdatePackageDto = {
          name: form.name.trim(),
          durationDays: days,
          price,
          benefits: form.benefits.trim() || undefined,
        }
        await packageService.update(pkg.packageId, dto)
      } else {
        const dto: CreatePackageDto = {
          name: form.name.trim(),
          durationDays: days,
          price,
          benefits: form.benefits.trim() || undefined,
          status: form.status,
        }
        await packageService.create(dto)
      }
      onSaved()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setErr(msg ?? `${isEdit ? 'Cập nhật' : 'Tạo'} gói tập thất bại.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rogym-card w-full max-w-md p-6" style={{ background: '#0f1c16' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Chỉnh sửa gói tập' : 'Thêm gói tập mới'}</h2>
          <button onClick={onClose} className="text-[var(--rogym-text-muted)] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--rogym-text-muted)]">Tên gói *</label>
            <input className="input-base w-full" value={form.name} onChange={(e) => field('name', e.target.value)} placeholder="VD: Gói 1 tháng" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--rogym-text-muted)]">Thời hạn (ngày) *</label>
              <input className="input-base w-full" type="number" min={1} value={form.durationDays} onChange={(e) => field('durationDays', e.target.value)} placeholder="30" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--rogym-text-muted)]">Giá (VND) *</label>
              <input className="input-base w-full" type="number" min={0} step={1000} value={form.price} onChange={(e) => field('price', e.target.value)} placeholder="500000" required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--rogym-text-muted)]">Quyền lợi</label>
            <textarea className="input-base w-full resize-none" rows={3} value={form.benefits} onChange={(e) => field('benefits', e.target.value)} placeholder="Mô tả quyền lợi đính kèm gói..." />
          </div>
          {!isEdit && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--rogym-text-muted)]">Trạng thái</label>
              <select className="input-base w-full" value={form.status} onChange={(e) => field('status', e.target.value as 'active' | 'inactive')}>
                <option value="active">Đang bán</option>
                <option value="inactive">Tạm dừng</option>
              </select>
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{err}</p>
            </div>
          )}

          <div className="mt-1 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rogym-btn rogym-btn--outline-white px-4 py-2 text-sm">Huỷ</button>
            <button type="submit" disabled={saving} className="rogym-btn rogym-btn--primary px-5 py-2 text-sm disabled:opacity-50">
              {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo gói tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm ────────────────────────────────────────────────────────

function DeleteConfirm({ pkg, onClose, onDeleted }: { pkg: Package; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function confirm() {
    setDeleting(true)
    setErr(null)
    try {
      await packageService.delete(pkg.packageId)
      onDeleted()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
      setErr(msg ?? 'Xoá gói tập thất bại.')
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rogym-card w-full max-w-sm p-6" style={{ background: '#0f1c16' }}>
        <h2 className="mb-2 text-lg font-bold text-white">Xoá gói tập?</h2>
        <p className="mb-5 text-sm text-[var(--rogym-text-secondary)]">
          Gói <span className="font-medium text-white">{pkg.name}</span> sẽ bị xoá khỏi danh sách.{' '}
          Hội viên đang dùng gói này không bị ảnh hưởng.
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

// ─── Main Page ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editPkg, setEditPkg] = useState<Package | null>(null)
  const [deletePkg, setDeletePkg] = useState<Package | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback((p: number, s: string, st: string) => {
    setLoading(true)
    setError(null)
    packageService.list({
      page: p,
      pageSize: PAGE_SIZE,
      search: s || undefined,
      status: (st as 'active' | 'inactive') || undefined,
    })
      .then((res) => {
        setPackages(res.data)
        setTotal(res.meta.total)
        setTotalPages(Math.ceil(res.meta.total / PAGE_SIZE) || 1)
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        setError(msg ?? 'Không thể tải danh sách gói tập.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(1, '', '') }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load(1, search, statusFilter)
  }

  function handleStatusChange(st: string) {
    setStatusFilter(st as '' | 'active' | 'inactive')
    setPage(1)
    load(1, search, st)
  }

  async function toggleStatus(pkg: Package) {
    setTogglingId(pkg.packageId)
    try {
      const next = pkg.status === 'active' ? 'inactive' : 'active'
      await packageService.updateStatus(pkg.packageId, next)
      load(page, search, statusFilter)
    } catch {
      // silent — reload will show current state
      load(page, search, statusFilter)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Quản lý"
        title="Gói tập"
        description={`${total} gói tập trong hệ thống`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="rogym-btn rogym-btn--primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={15} /> Thêm gói tập
          </button>
        }
      />

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rogym-text-muted)]" />
          <input className="input-base pl-9" placeholder="Tìm theo tên, mã gói..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-base w-auto min-w-[160px]" value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Tạm dừng</option>
        </select>
        <button type="submit" className="rogym-btn rogym-btn--primary px-5">Tìm kiếm</button>
      </form>

      {/* Content */}
      {loading ? (
        <PageSkeleton rows={6} />
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : packages.length === 0 ? (
        <div className="rogym-card rogym-card--compact flex min-h-48 flex-col items-center justify-center p-8 text-center">
          <h2 className="text-base font-semibold text-white">Không tìm thấy gói tập</h2>
          <p className="mt-2 text-sm text-[var(--rogym-text-secondary)]">Thử thay đổi điều kiện tìm kiếm hoặc thêm gói mới.</p>
          <button onClick={() => setShowCreate(true)} className="rogym-btn rogym-btn--primary mt-4 flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={14} /> Thêm gói tập
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.packageId}
              pkg={pkg}
              toggling={togglingId === pkg.packageId}
              onEdit={() => setEditPkg(pkg)}
              onToggle={() => toggleStatus(pkg)}
              onDelete={() => setDeletePkg(pkg)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--rogym-text-muted)]">Trang {page}/{totalPages} · {total} gói</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1, search, statusFilter) }} className="rogym-btn rogym-btn--outline-white px-3 py-2 text-sm disabled:opacity-40">← Trước</button>
            <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1, search, statusFilter) }} className="rogym-btn rogym-btn--outline-white px-3 py-2 text-sm disabled:opacity-40">Sau →</button>
          </div>
        </div>
      )}

      {showCreate && (
        <PkgModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(1, search, statusFilter) }} />
      )}
      {editPkg && (
        <PkgModal pkg={editPkg} onClose={() => setEditPkg(null)} onSaved={() => { setEditPkg(null); load(page, search, statusFilter) }} />
      )}
      {deletePkg && (
        <DeleteConfirm pkg={deletePkg} onClose={() => setDeletePkg(null)} onDeleted={() => { setDeletePkg(null); load(1, search, statusFilter) }} />
      )}
    </Page>
  )
}

function PackageCard({
  pkg,
  toggling,
  onEdit,
  onToggle,
  onDelete,
}: {
  pkg: Package
  toggling: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const stats = pkg.stats

  return (
    <div className="rogym-card rogym-card--compact flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-[var(--rogym-text-muted)]">{pkg.packageCode}</p>
          <h3 className="mt-0.5 text-base font-bold text-white leading-snug">{pkg.name}</h3>
        </div>
        <StatusBadge status={pkg.status} />
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-xs text-[var(--rogym-text-muted)]">Thời hạn</p>
          <p className="mt-0.5 text-sm font-semibold text-white">{pkg.durationDays} ngày</p>
        </div>
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-xs text-[var(--rogym-text-muted)]">Giá</p>
          <p className="mt-0.5 text-sm font-semibold text-white">{formatVND(pkg.price)}</p>
        </div>
      </div>

      {/* Benefits */}
      {pkg.benefits && (
        <p className="line-clamp-2 text-xs text-[var(--rogym-text-secondary)]">{pkg.benefits}</p>
      )}

      {/* Subscription stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 border-t border-[var(--rogym-border-section)] pt-3">
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: G }}>{stats.activeSubscriptions}</p>
            <p className="text-[10px] text-[var(--rogym-text-muted)]">Đang dùng</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-amber-400">{stats.pendingSubscriptions}</p>
            <p className="text-[10px] text-[var(--rogym-text-muted)]">Chờ thanh toán</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-white">{stats.totalSubscriptions}</p>
            <p className="text-[10px] text-[var(--rogym-text-muted)]">Tổng cộng</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-[var(--rogym-border-section)] pt-3">
        <button
          onClick={onToggle}
          disabled={toggling}
          title={pkg.status === 'active' ? 'Tạm dừng gói' : 'Kích hoạt gói'}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 disabled:opacity-50"
          style={{ color: pkg.status === 'active' ? '#9ca3af' : G }}
        >
          {pkg.status === 'active' ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
          {pkg.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--rogym-text-secondary)] transition-colors hover:bg-white/10 hover:text-white"
        >
          <Pencil size={13} /> Sửa
        </button>
        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={13} /> Xoá
        </button>
      </div>
    </div>
  )
}
