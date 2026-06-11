import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { type StaffPosition,staffService, type StaffListItem } from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSelect,
  StaffSkeleton,
  StaffStatusBadge,
} from '@/components/StaffUI'

type Tab = 'members' | 'staff'

const POSITION_LABEL: Record<string, string> = {
  trainer: 'Huấn luyện viên',
  pt: 'Personal Trainer',
  staff: 'Nhân viên',
  owner: 'Chủ gym',
}

export default function MembersPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = (searchParams.get('tab') as Tab | null) ?? 'members'
  const page = Number(searchParams.get('page') ?? 1)
  // members tab uses 'status'; staff tab uses 'position' — separate to avoid Radix Select mismatch
  const memberStatus = searchParams.get('status') ?? ''
  const staffPosition = searchParams.get('position') ?? ''

  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const [members, setMembers] = useState<TrainerStudentSummary[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberTotalPages, setMemberTotalPages] = useState(1)

  const [staffList, setStaffList] = useState<StaffListItem[]>([])
  const [staffTotal, setStaffTotal] = useState(0)
  const [staffTotalPages, setStaffTotalPages] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSearch(searchParams.get('search') ?? '')

    if (tab === 'members') {
      memberService
        .list({
          page,
          pageSize: 15,
          search: searchParams.get('search') ?? undefined,
          status: memberStatus || undefined,
        })
        .then((result) => {
          setMembers(result.data)
          setMemberTotal(result.total)
          setMemberTotalPages(result.totalPages)
        })
        .catch((err) => setError(getApiError(err, 'Không thể tải danh sách hội viên.')))
        .finally(() => setLoading(false))
    } else {
      staffService
        .list({
          page,
          pageSize: 15,
          search: searchParams.get('search') ?? undefined,
          position: (['owner', 'staff', 'trainer', 'member'].includes(position as string) 
           ? position as StaffPosition 
           : undefined),
        })
        .then((result) => {
          setStaffList(result.data)
          setStaffTotal(result.total)
          setStaffTotalPages(result.totalPages)
        })
        .catch((err) => setError(getApiError(err, 'Không thể tải danh sách nhân viên.')))
        .finally(() => setLoading(false))
    }
  }, [tab, page, memberStatus, staffPosition, searchParams])

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

  function switchTab(t: Tab) {
    // reset all filters and search when switching tabs
    setSearch('')
    setSearchParams({ tab: t })
  }

  const totalForTab = tab === 'members' ? memberTotal : staffTotal
  const totalPagesForTab = tab === 'members' ? memberTotalPages : staffTotalPages

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Quản lý người dùng"
        title="Danh sách người dùng"
        description={`${totalForTab} ${tab === 'members' ? 'hội viên' : 'nhân viên & PT'} trong hệ thống.`}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-white/[0.025] p-1 w-fit">
        <button
          type="button"
          onClick={() => switchTab('members')}
          className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
            tab === 'members'
              ? 'bg-[var(--rogym-teal)] text-[var(--rogym-bg-base)] font-semibold'
              : 'text-[var(--rogym-text-secondary)] hover:text-white'
          }`}
        >
          Hội viên
        </button>
        <button
          type="button"
          onClick={() => switchTab('staff')}
          className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
            tab === 'staff'
              ? 'bg-[var(--rogym-teal)] text-[var(--rogym-bg-base)] font-semibold'
              : 'text-[var(--rogym-text-secondary)] hover:text-white'
          }`}
        >
          Nhân viên & PT
        </button>
      </div>

      {/* Filters */}
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rogym-text-dim)]"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder={
              tab === 'members'
                ? 'Tìm theo tên, email hoặc mã hội viên'
                : 'Tìm theo tên, email hoặc mã nhân viên'
            }
          />
        </div>
        {tab === 'members' ? (
          <StaffSelect value={memberStatus} onValueChange={(v) => updateParam('status', v)}>
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="pending_verification">Chờ xác thực</option>
            <option value="locked">Đã khóa</option>
          </StaffSelect>
        ) : (
          <StaffSelect value={staffPosition} onValueChange={(v) => updateParam('position', v)}>
            <option value="">Mọi chức vụ</option>
            <option value="trainer">Huấn luyện viên</option>
            <option value="pt">Personal Trainer</option>
            <option value="staff">Nhân viên</option>
          </StaffSelect>
        )}
        <button type="button" className="rogym-btn rogym-btn--primary" onClick={applySearch}>
          Tìm kiếm
        </button>
      </div>

      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : tab === 'members' ? (
        <MembersTab data={members} currentUserId={currentUser?.userId ?? ''} />
      ) : (
        <StaffTab data={staffList} currentUserId={currentUser?.userId ?? ''} />
      )}

      {totalPagesForTab > 1 && (
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
            Trang {page}/{totalPagesForTab}
          </span>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            disabled={page >= totalPagesForTab}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Sau
          </button>
        </div>
      )}
    </StaffPage>
  )
}

function MembersTab({
  data,
  currentUserId,
}: {
  data: TrainerStudentSummary[]
  currentUserId: string
}) {
  if (data.length === 0) {
    return (
      <StaffEmptyState
        title="Không tìm thấy hội viên"
        description="Thử thay đổi từ khóa hoặc bộ lọc."
      />
    )
  }
  return (
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
            {data.map((member) => {
              const isSelf = member.userId === currentUserId
              return (
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
                    {isSelf ? (
                      <span className="text-xs text-[var(--rogym-text-dim)]">Bạn</span>
                    ) : (
                      <Link
                        className="rogym-text-link rogym-text-link--accent"
                        to={`/staff/members/${member.memberId}`}
                      >
                        Chi tiết
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {data.map((member) => {
          const isSelf = member.userId === currentUserId
          return (
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
              {!isSelf && (
                <div className="mt-4">
                  <Link
                    className="rogym-btn rogym-btn--outline-white w-full"
                    to={`/staff/members/${member.memberId}`}
                  >
                    Xem chi tiết
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function StaffTab({
  data,
  currentUserId,
}: {
  data: StaffListItem[]
  currentUserId: string
}) {
  if (data.length === 0) {
    return (
      <StaffEmptyState
        title="Không tìm thấy nhân viên"
        description="Thử thay đổi từ khóa hoặc bộ lọc."
      />
    )
  }
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-[var(--rogym-text-dim)]">
            <tr>
              <th className="px-5 py-4">Nhân viên</th>
              <th className="px-5 py-4">Chức vụ</th>
              <th className="px-5 py-4">Liên hệ</th>
              <th className="px-5 py-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => {
              const isSelf = s.userId === currentUserId
              const isOwner = s.position === 'owner'
              return (
                <tr
                  key={s.staffId}
                  className="border-t border-white/5 bg-[var(--rogym-bg-card)]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{s.fullName}</span>
                      {isSelf && (
                        <span className="rogym-tone-badge" data-tone="muted">Bạn</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-[var(--rogym-text-dim)]">{s.staffCode}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="rogym-tone-badge"
                      data-tone={
                        isOwner
                          ? 'warning'
                          : s.position === 'trainer' || s.position === 'pt'
                            ? 'success'
                            : 'muted'
                      }
                    >
                      {POSITION_LABEL[s.position] ?? s.position}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--rogym-text-secondary)]">
                    <div>{s.email}</div>
                    {s.phone && (
                      <div className="text-xs text-[var(--rogym-text-dim)]">{s.phone}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <StaffStatusBadge status={s.status ?? 'active'} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {data.map((s) => {
          const isSelf = s.userId === currentUserId
          const isOwner = s.position === 'owner'
          return (
            <div key={s.staffId} className="rogym-card rogym-card--compact p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] text-[var(--rogym-teal)]">
                    <UserRound size={19} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{s.fullName}</span>
                      {isSelf && (
                        <span className="rogym-tone-badge" data-tone="muted">Bạn</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--rogym-text-dim)]">{s.staffCode}</div>
                  </div>
                </div>
                <span
                  className="rogym-tone-badge shrink-0"
                  data-tone={
                    isOwner
                      ? 'warning'
                      : s.position === 'trainer' || s.position === 'pt'
                        ? 'success'
                        : 'muted'
                  }
                >
                  {POSITION_LABEL[s.position] ?? s.position}
                </span>
              </div>
              <div className="mt-3 text-sm text-[var(--rogym-text-secondary)]">
                {s.email}
                {s.phone && (
                  <span className="ml-2 text-xs text-[var(--rogym-text-dim)]">· {s.phone}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
