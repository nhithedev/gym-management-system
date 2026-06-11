import { useState } from 'react'
import { Search, CheckCircle2, User, CreditCard, XCircle, AlertCircle } from 'lucide-react'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { attendanceService } from '@/services/attendance.service'
import { StaffPage, StaffPageHeader } from '../components/StaffUI'
import { formatDate, formatDateTime } from '@/lib/date'

const G = '#06c384'
const T = '#42e09e'

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Còn hiệu lực',  color: G },
  pending:   { label: 'Chờ kích hoạt', color: '#f59e0b' },
  expired:   { label: 'Hết hạn',       color: '#ef4444' },
  cancelled: { label: 'Đã huỷ',        color: '#6b7280' },
}

interface CheckInRecord {
  memberId: string
  fullName: string
  attendanceId: string
  startTime: string
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif", background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label}
    </span>
  )
}

export default function CheckInPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TrainerStudentSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [checkedIn, setCheckedIn] = useState<CheckInRecord[]>([])
  const [checkInErrors, setCheckInErrors] = useState<Record<string, string>>({})

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchDone(false)
    setResults([])
    try {
      const res = await memberService.list({ search: query.trim(), pageSize: 10 })
      setResults(res.data)
      setSearchDone(true)
    } catch {
      setResults([])
      setSearchDone(true)
    } finally {
      setSearching(false)
    }
  }

  async function handleCheckIn(member: TrainerStudentSummary) {
    setCheckingIn(member.memberId)
    setCheckInErrors(prev => { const next = { ...prev }; delete next[member.memberId]; return next })
    try {
      const result = await attendanceService.manualCheckin(member.memberCode)
      setCheckedIn(prev => [...prev, {
        memberId: member.memberId,
        fullName: member.fullName,
        attendanceId: result.attendanceId,
        startTime: result.startTime,
      }])
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { code?: string; message?: string } } }).response?.data
      const msg =
        apiErr?.code === 'MEMBER_NO_ACTIVE_SUBSCRIPTION' ? 'Hội viên không có gói tập hợp lệ.' :
        apiErr?.code === 'ATTENDANCE_ALREADY_OPEN' ? 'Hội viên đã check-in, chưa checkout.' :
        apiErr?.message ?? 'Không thể check-in. Vui lòng thử lại.'
      setCheckInErrors(prev => ({ ...prev, [member.memberId]: msg }))
    } finally {
      setCheckingIn(null)
    }
  }

  function isAlreadyCheckedIn(memberId: string) {
    return checkedIn.some(r => r.memberId === memberId)
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Nhân viên"
        title="Check-in hội viên"
        description="Tìm hội viên và xác nhận vào tập."
      />

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--rogym-text-muted)]" />
          <input
            className="input-base pl-9"
            placeholder="Nhập tên hoặc email hội viên..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" disabled={searching} className="rogym-btn rogym-btn--primary px-6">
          {searching ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </form>

      {/* Results */}
      {searchDone && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <XCircle size={36} className="text-[var(--rogym-text-dim)]" />
          <p className="text-sm text-[var(--rogym-text-secondary)]">Không tìm thấy hội viên nào với từ khoá {'"'}<strong className="text-white">{query}</strong>{'"'}.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map(m => {
            const alreadyDone = isAlreadyCheckedIn(m.memberId)
            const sub = m.activeSubscription
            const subValid = sub?.status === 'active'
            const isLoading = checkingIn === m.memberId
            const errMsg = checkInErrors[m.memberId]
            return (
              <div
                key={m.memberId}
                className="rogym-card rogym-card--compact p-5 flex flex-col gap-3"
                style={alreadyDone ? { borderColor: `${G}55`, background: `${G}08` } : {}}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: `${G}1a`, border: `2px solid ${G}33` }}>
                    <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: G }}>
                      {m.fullName.split(' ').slice(-1)[0]?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{m.fullName}</p>
                      <Badge label={m.memberCode} color="#6b7280" />
                      <Badge
                        label={m.status === 'active' ? 'Hoạt động' : m.status}
                        color={m.status === 'active' ? G : '#6b7280'}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-[var(--rogym-text-muted)]">
                        <User size={11} /> {m.email}
                      </span>
                      {sub ? (
                        <span className="flex items-center gap-1 text-xs">
                          <CreditCard size={11} style={{ color: T }} />
                          <span style={{ color: T }}>{sub.packageName}</span>
                          <span className="mx-1 text-[var(--rogym-text-dim)]">·</span>
                          <Badge
                            label={SUB_STATUS[sub.status]?.label ?? sub.status}
                            color={SUB_STATUS[sub.status]?.color ?? '#6b7280'}
                          />
                          <span className="ml-1 text-[var(--rogym-text-muted)]">đến {formatDate(sub.endDate)}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--rogym-text-dim)]">Chưa có gói tập</span>
                      )}
                    </div>
                  </div>

                  {/* Check-in button */}
                  {alreadyDone ? (
                    <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: G }}>
                      <CheckCircle2 size={18} /> Đã check-in
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(m)}
                      disabled={!subValid || isLoading}
                      className="rogym-btn rogym-btn--primary px-4 py-2 text-sm disabled:opacity-40 shrink-0"
                      title={!subValid ? 'Hội viên không có gói tập hợp lệ' : 'Xác nhận vào tập'}
                    >
                      {isLoading ? 'Đang xử lý...' : 'Check-in'}
                    </button>
                  )}
                </div>

                {/* Error */}
                {errMsg && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">{errMsg}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Today's check-in summary */}
      {checkedIn.length > 0 && (
        <div className="rogym-card rogym-card--compact p-4 flex flex-col gap-2" style={{ borderColor: `${G}33`, background: `${G}08` }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color: G }} />
            <p className="text-sm font-semibold" style={{ color: G }}>
              Đã check-in <strong>{checkedIn.length}</strong> hội viên trong phiên này
            </p>
          </div>
          <div className="flex flex-col gap-1 pl-6">
            {checkedIn.map(r => (
              <p key={r.attendanceId} className="text-xs text-[var(--rogym-text-muted)]">
                {r.fullName} — {formatDateTime(r.startTime)}
              </p>
            ))}
          </div>
        </div>
      )}
    </StaffPage>
  )
}
