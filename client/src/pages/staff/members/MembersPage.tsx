import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSelect,
  StaffSkeleton,
  StaffStatusBadge,
} from '@/components/StaffUI'

export default function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)
  const status = searchParams.get('status') ?? ''
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [data, setData] = useState<TrainerStudentSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    memberService
      .list({
        page,
        pageSize: 15,
        search: searchParams.get('search') ?? undefined,
        status: status || undefined,
      })
      .then((result) => {
        setData(result.data)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải danh sách hội viên.')))
      .finally(() => setLoading(false))
  }, [page, status, searchParams])

  function applySearch() {
    const next = new URLSearchParams(searchParams)
    search ? next.set('search', search) : next.delete('search')
    next.set('page', '1')
    setSearchParams(next)
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Quản lý hội viên"
        title="Danh sách hội viên"
        description={`${total} hội viên trong hệ thống.`}
      />

      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rogym-text-dim)]"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            placeholder="Tìm theo tên, email hoặc mã hội viên"
          />
        </div>
        <StaffSelect value={status} onValueChange={(value) => updateParam('status', value)}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="pending_verification">Chờ xác thực</option>
          <option value="locked">Đã khóa</option>
        </StaffSelect>
        <button type="button" className="rogym-btn rogym-btn--primary" onClick={applySearch}>
          Tìm kiếm
        </button>
      </div>

      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : data.length === 0 ? (
        <StaffEmptyState
          title="Không tìm thấy hội viên"
          description="Thử thay đổi từ khóa hoặc bộ lọc."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-[var(--rogym-text-dim)]">
                <tr>
                  <th className="px-5 py-4">Hội viên</th>
                  <th className="px-5 py-4">Gói tập</th>
                  <th className="px-5 py-4">Hết hạn</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((member) => (
                  <tr
                    key={member.memberId}
                    className="border-t border-white/5 bg-[var(--rogym-bg-card)]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{member.fullName}</div>
                      <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">
                        {member.memberCode} · {member.email}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--rogym-text-secondary)]">
                      {member.activeSubscription?.packageName ?? 'Chưa có gói'}
                    </td>
                    <td className="px-5 py-4 text-[var(--rogym-text-secondary)]">
                      {formatDate(member.activeSubscription?.endDate)}
                    </td>
                    <td className="px-5 py-4">
                      <StaffStatusBadge
                        status={member.activeSubscription?.status ?? member.status}
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="rogym-text-link rogym-text-link--accent"
                        to={`/staff/members/${member.memberId}`}
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {data.map((member) => (
              <div key={member.memberId} className="rogym-card rogym-card--compact p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] text-[var(--rogym-teal)]">
                      <UserRound size={19} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{member.fullName}</div>
                      <div className="text-xs text-[var(--rogym-text-dim)]">{member.memberCode}</div>
                    </div>
                  </div>
                  <StaffStatusBadge status={member.activeSubscription?.status ?? member.status} />
                </div>
                <div className="mt-3 text-sm text-[var(--rogym-text-secondary)]">
                  {member.activeSubscription?.packageName ?? 'Chưa có gói active'}
                  {member.activeSubscription?.endDate && (
                    <span className="ml-2 text-xs text-[var(--rogym-text-dim)]">
                      · Hết {formatDate(member.activeSubscription.endDate)}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <Link
                    className="rogym-btn rogym-btn--outline-white w-full"
                    to={`/staff/members/${member.memberId}`}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Trước
          </button>
          <span className="text-sm text-[var(--rogym-text-secondary)]">
            Trang {page}/{totalPages}
          </span>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Sau
          </button>
        </div>
      )}
    </StaffPage>
  )
}
