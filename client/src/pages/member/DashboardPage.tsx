import { useEffect, useState } from 'react'
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Dumbbell, CheckSquare, Scale, Activity,
  Calendar, CalendarX, AlertCircle, ClipboardList,
  MessageSquareOff, CalendarCheck, User, Phone, Mail,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService from '@/services/package.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import { memberService, type MemberProgress, type MemberProfile } from '@/services/member.service'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import api from '@/services/api'
import { MemberPage, MemberPageHeader } from './components/MemberUI'

const T = '#42e09e'

function todayYYYYMM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function todayFull() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function Skeleton({ h = 100 }: { h?: number }) {
  return <div className={`rogym-dashboard-skeleton rogym-dashboard-skeleton--${h} animate-pulse rounded-2xl`} />
}

function ErrorWidget({ message = 'Không thể tải dữ liệu' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 py-4 px-3 rounded-2xl rogym-sx-6a3fe515" >
      <AlertCircle size={16} className="text-red-400 shrink-0" />
      <span className="text-[13px] text-red-300 rogym-sx-3278ee06" >{message}</span>
    </div>
  )
}

function Badge({ label, tone = 'muted' }: { label: string; tone?: string }) {
  return (
    <span className="rogym-tone-badge" data-tone={tone}>
      {label}
    </span>
  )
}

const SUB_STATUS_TONE: Record<string, string> = {
  active: 'success', pending: 'warning', expired: 'danger', cancelled: 'muted',
}
const SUB_STATUS_LABEL: Record<string, string> = {
  active: 'Đang hoạt động', pending: 'Chờ kích hoạt', expired: 'Đã hết hạn', cancelled: 'Đã huỷ',
}
const SESSION_STATUS_TONE: Record<string, string> = {
  scheduled: 'info', in_progress: 'warning', completed: 'success', cancelled: 'danger',
}
const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Đã lên lịch', in_progress: 'Đang diễn ra', completed: 'Hoàn thành', cancelled: 'Đã huỷ',
}
const FEEDBACK_TYPE_TONE: Record<string, string> = {
  staff: 'purple', equipment: 'warning', service: 'info',
}
const FEEDBACK_TYPE_LABEL: Record<string, string> = {
  staff: 'Nhân viên', equipment: 'Thiết bị', service: 'Dịch vụ',
}

/* ── PT Info Card ── */
function PtInfoCard({
  trainerName,
  trainerPhone,
  trainerEmail,
  activePlanIncludesPt,
  loading,
  onChooseTrainer,
  onRemoveTrainer,
}: {
  trainerName: string | null
  trainerPhone?: string | null
  trainerEmail?: string | null
  activePlanIncludesPt: boolean | null
  loading: boolean
  onChooseTrainer: () => void
  onRemoveTrainer: () => void
}) {
  if (loading) return <Skeleton h={200} />

  if (activePlanIncludesPt === false) {
    return (
      <div className="rogym-card rogym-card--compact p-5 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-[var(--rogym-text-dim)]">
          <User size={24} />
        </div>
        <p className="text-sm font-medium text-white">Huấn luyện viên</p>
        <p className="text-xs text-[var(--rogym-text-secondary)]">Gói của bạn không bao gồm PT</p>
      </div>
    )
  }

  if (!trainerName) {
    return (
      <div className="rogym-card rogym-card--compact p-5 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-[var(--rogym-text-dim)]">
          <User size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Huấn luyện viên</p>
          <p className="mt-1 text-xs text-[var(--rogym-text-secondary)]">Chưa có huấn luyện viên phụ trách</p>
        </div>
        <button className="rogym-btn rogym-btn--outline-white w-full text-sm" onClick={onChooseTrainer}>
          Chọn huấn luyện viên
        </button>
      </div>
    )
  }

  const initials = trainerName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()

  return (
    <div className="rogym-card rogym-card--compact p-5 flex flex-col gap-4">
      <div className="rogym-eyebrow">Huấn luyện viên</div>
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <div className="flex items-center justify-center rounded-full shrink-0 rogym-sx-20f77b4b">
          <span className="rogym-sx-2e7dd58d">{initials}</span>
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-white">{trainerName}</h3>
          <p className="mt-1 text-xs text-[var(--rogym-text-secondary)]">PT đã chọn đi kèm gói</p>
        </div>
      </div>

      {/* Contact info */}
      {(trainerPhone || trainerEmail) && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          {trainerPhone && (
            <div className="flex items-center gap-2.5 text-sm text-[var(--rogym-text-secondary)]">
              <Phone size={14} className="shrink-0 rogym-sx-f27dac31" />
              <span>{trainerPhone}</span>
            </div>
          )}
          {trainerEmail && (
            <div className="flex items-center gap-2.5 text-sm text-[var(--rogym-text-secondary)]">
              <Mail size={14} className="shrink-0 rogym-sx-f27dac31" />
              <span className="truncate">{trainerEmail}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
        <button className="rogym-btn rogym-btn--outline-white w-full text-sm" onClick={onChooseTrainer}>
          Đổi PT
        </button>
        <button className="rogym-btn rogym-btn--danger w-full text-sm" onClick={onRemoveTrainer}>
          Hủy PT này
        </button>
      </div>
    </div>
  )
}

/* ── Subscription card ── */
function SubscriptionCard({
  subscription, packageName, durationDays, loading, error,
}: {
  subscription: Subscription | null
  packageName: string
  durationDays: number
  loading: boolean
  error: boolean
}) {
  const navigate = useNavigate()
  if (loading) return <Skeleton h={140} />
  if (error) return <ErrorWidget />

  if (!subscription) {
    return (
      <div className="rogym-card rogym-card--compact p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">Gói tập</span>
          <Badge label="Chưa có gói" />
        </div>
        <p className="text-sm text-[var(--rogym-text-secondary)]">
          Bạn chưa có gói tập nào. Hãy chọn gói phù hợp để bắt đầu.
        </p>
        <button
          onClick={() => navigate('/member/subscription/setup')}
          className="rogym-btn rogym-btn--primary self-start"
        >
          Chọn gói tập
        </button>
      </div>
    )
  }

  const endMs = new Date(subscription.endDate).getTime()
  const isExpired = subscription.status === 'expired' || Date.now() > endMs
  const daysLeft = subscription.daysLeft ?? Math.max(0, Math.ceil((endMs - Date.now()) / 86400000))
  const totalDays = durationDays || 1
  const daysUsed = Math.max(0, totalDays - daysLeft)
  const pct = Math.min(100, Math.max(0, Math.round((daysUsed / totalDays) * 100)))
  return (
    <div className="rogym-card rogym-card--compact p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="rogym-sx-3c31803f">
          {packageName || subscription.packageName || 'Gói tập'}
        </span>
        <Badge label={SUB_STATUS_LABEL[subscription.status] ?? subscription.status} tone={SUB_STATUS_TONE[subscription.status]} />
      </div>

      <div className="flex flex-col gap-1.5">
        <progress
          className={`rogym-progress ${isExpired ? 'is-danger' : ''}`}
          max={100}
          value={pct}
          aria-label={`${pct}% thời hạn gói đã sử dụng`}
        />
        <div className="flex justify-between text-xs text-[var(--rogym-text-secondary)]">
          <span>{daysUsed}/{totalDays} ngày đã dùng</span>
          <span className={`rogym-status-text ${isExpired ? 'is-danger' : ''}`}>
            {isExpired ? 'Đã hết hạn' : `Còn ${daysLeft} ngày`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-sm text-[var(--rogym-text-secondary)]">
        <span>Bắt đầu: <b className="text-white">{fmtDate(subscription.startDate)}</b></span>
        <span>Hết hạn: <b className={isExpired ? 'text-red-400' : 'text-white'}>{fmtDate(subscription.endDate)}</b></span>
      </div>

      {isExpired && (
        <button onClick={() => navigate('/member/subscription/renew')} className="rogym-btn rogym-btn--primary self-start">
          Gia hạn ngay
        </button>
      )}
    </div>
  )
}

/* ── Stats row ── */
function StatCard({ icon: Icon, label, value, unit }: { icon: React.ElementType; label: string; value: string | number; unit?: string }) {
  return (
    <div className="rogym-card rogym-card--compact flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} color={T} />
        <span className="text-xs text-[var(--rogym-text-secondary)]">{label}</span>
      </div>
      <div className="rogym-sx-b170d9f3">
        {value}
        {unit && <span className="text-sm text-[var(--rogym-text-secondary)] ml-1">{unit}</span>}
      </div>
    </div>
  )
}

/* ── Upcoming sessions widget ── */
function SessionsWidget({ sessions, loading, error }: { sessions: TrainingSession[]; loading: boolean; error: boolean }) {
  const navigate = useNavigate()
  if (loading) return <Skeleton h={120} />
  if (error) return <ErrorWidget />

  return (
    <div className="rogym-card rogym-card--compact p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-white">Lịch tập sắp tới</span>
        <button
          onClick={() => navigate('/member/workout/sessions')}
          className="rogym-text-link rogym-text-link--accent text-xs"
        >
          Xem tất cả →
        </button>
      </div>
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <CalendarX size={32} className="text-[var(--rogym-text-secondary)]" />
          <span className="text-sm text-[var(--rogym-text-secondary)]">Chưa có lịch tập nào sắp tới</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <div key={s.sessionId} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <Calendar size={14} color={T} />
                <div>
                  <p className="text-sm font-semibold text-white">{fmtDatetime(s.startTime)}</p>
                  {s.trainerName && (
                    <p className="text-xs text-[var(--rogym-text-secondary)]">
                      HLV: {s.trainerName}{s.roomName ? ` · ${s.roomName}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <Badge label={SESSION_STATUS_LABEL[s.status] ?? s.status} tone={SESSION_STATUS_TONE[s.status]} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Workout plan widget ── */
function WorkoutWidget({ plan, loading, error }: { plan: { name: string } | null; loading: boolean; error: boolean }) {
  const navigate = useNavigate()
  if (loading) return <Skeleton h={100} />
  if (error) return <ErrorWidget />

  return (
    <div className="rogym-card rogym-card--compact p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-white">Kế hoạch tập</span>
        <button onClick={() => navigate('/member/workout/plan')} className="rogym-text-link rogym-text-link--accent text-xs">
          Chi tiết →
        </button>
      </div>
      {plan ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{plan.name}</p>
            <p className="text-xs text-[var(--rogym-text-secondary)] mt-0.5">Đang hoạt động</p>
          </div>
          <button onClick={() => navigate('/member/workout/plan')} className="rogym-btn rogym-btn--primary text-xs px-4 py-1.5">
            Bắt đầu hôm nay
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-[var(--rogym-text-secondary)]" />
            <span className="text-sm text-[var(--rogym-text-secondary)]">Chưa có kế hoạch tập</span>
          </div>
          <button onClick={() => navigate('/member/workout/builder')} className="rogym-btn rogym-btn--primary text-xs px-4 py-1.5">
            Tạo ngay
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Feedback widget ── */
function FeedbackWidget({ feedbacks, loading, error }: { feedbacks: Feedback[]; loading: boolean; error: boolean }) {
  const navigate = useNavigate()
  if (loading) return <Skeleton h={100} />
  if (error) return <ErrorWidget />

  return (
    <div className="rogym-card rogym-card--compact p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-white">Phản hồi gần đây</span>
        <button onClick={() => navigate('/member/feedback')} className="rogym-text-link rogym-text-link--accent text-xs">
          Xem tất cả →
        </button>
      </div>
      {feedbacks.length === 0 ? (
        <div className="flex items-center gap-2 py-2">
          <MessageSquareOff size={16} className="text-[var(--rogym-text-secondary)]" />
          <span className="text-sm text-[var(--rogym-text-secondary)]">Chưa có phản hồi nào</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {feedbacks.map((fb) => (
            <div key={fb.feedbackId} className="flex items-start gap-3 py-2.5 px-3 rounded-xl bg-white/[0.04]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={FEEDBACK_TYPE_LABEL[fb.feedbackType] ?? fb.feedbackType} tone={FEEDBACK_TYPE_TONE[fb.feedbackType]} />
                  <Badge
                    label={fb.status === 'open' ? 'Mở' : fb.status === 'in_progress' ? 'Đang xử lý' : fb.status === 'resolved' ? 'Đã giải quyết' : 'Từ chối'}
                    tone={fb.status === 'resolved' ? 'success' : fb.status === 'rejected' ? 'muted' : fb.status === 'in_progress' ? 'warning' : 'info'}
                  />
                </div>
                <p className="text-xs text-[var(--rogym-text-secondary)] line-clamp-1">{fb.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main page ── */
export default function MemberDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const setHasActiveSub = useSubscriptionStore(s => s.setHasActiveSub)

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [packageName, setPackageName] = useState('')
  const [durationDays, setDurationDays] = useState(0)
  const [activePlanIncludesPt, setActivePlanIncludesPt] = useState<boolean | null>(null)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [progress, setProgress] = useState<MemberProgress | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<{ name: string } | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0)
  const [profile, setProfile] = useState<MemberProfile | null>(null)

  const [loadingSub, setLoadingSub] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [errorSub, setErrorSub] = useState(false)
  const [errorSessions, setErrorSessions] = useState(false)
  const [errorPlan, setErrorPlan] = useState(false)
  const [errorFeedbacks, setErrorFeedbacks] = useState(false)

  const [paymentSuccessToast, setPaymentSuccessToast] = useState(false)

  useEffect(() => {
    if ((location.state as { paymentSuccess?: boolean } | null)?.paymentSuccess) {
      setPaymentSuccessToast(true)
      setTimeout(() => setPaymentSuccessToast(false), 4000)
    }
  }, [location.state])

  useEffect(() => {
    const memberId = user?.memberId
    if (!memberId) {
      navigate('/login', { replace: true })
      return
    }

    /* Subscription */
    subscriptionService.getByMember(memberId)
      .then(async (subs) => {
        const now = new Date()
        const validActive = subs.find(
          (s) =>
            s.status === 'active' &&
            new Date(s.startDate) <= now &&
            new Date(s.endDate) >= now,
        )
        const active = validActive ?? subs.find((s) => s.status === 'active') ?? subs[0] ?? null
        setSubscription(active)
        setHasActiveSub(validActive != null)
        if (active?.packageId) {
          try {
            const pkg = await packageService.get(active.packageId)
            setPackageName(pkg.name)
            setDurationDays(pkg.durationDays)
            setActivePlanIncludesPt(pkg.includesPt ?? false)
          } catch { /* use packageName from subscription */ }
        }
        setLoadingSub(false)
      })
      .catch((err) => {
        if (err?.response?.status === 401) { clearAuth(); navigate('/login') }
        setErrorSub(true)
        setLoadingSub(false)
      })

    /* Upcoming sessions */
    trainingService.getSessions({ status: 'scheduled', pageSize: 3 })
      .then(({ data }) => { setSessions(data); setLoadingSessions(false) })
      .catch(() => { setErrorSessions(true); setLoadingSessions(false) })

    /* Progress */
    memberService.getProgress(memberId, { limit: 1 })
      .then((list) => { setProgress(list[0] ?? null); setLoadingProgress(false) })
      .catch(() => { setLoadingProgress(false) })

    /* Stats — attendance this month */
    trainingService.getAttendance({ memberId, month: todayYYYYMM() })
      .then(({ total }) => { setSessionsThisMonth(total) })
      .catch(() => {})

    /* Active workout plan */
    api.get(`/workout-plans/members/${memberId}/assignments`, { params: { status: 'active', limit: 1 } })
      .then((res: { data: { data?: { plan?: { name: string }; notes?: string }[] } }) => {
        const list = res.data?.data ?? []
        const latest = list[0] ?? null
        setWorkoutPlan(latest?.plan ?? (latest ? { name: latest.notes ?? 'Kế hoạch tập' } : null))
        setLoadingPlan(false)
      })
      .catch(() => { setWorkoutPlan(null); setLoadingPlan(false); setErrorPlan(true) })

    /* Recent feedbacks */
    feedbackService.list({ pageSize: 2, sort: 'created_at:desc' })
      .then(({ data }) => { setFeedbacks(data); setLoadingFeedbacks(false) })
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status !== 403) setErrorFeedbacks(true)
        setLoadingFeedbacks(false)
      })

    /* Profile (for trainer name + includesPt) */
    memberService.getProfile(memberId)
      .then((p) => {
        setProfile(p)
        const now = new Date()
        const activeSub =
          p.subscriptions?.find(
            s => s.status === 'active' && new Date(s.startDate) <= now && new Date(s.endDate) >= now,
          ) ??
          p.subscriptions?.find(s => s.status === 'active') ??
          p.subscriptions?.[0]
        if (activeSub !== undefined) {
          setActivePlanIncludesPt(activeSub.includesPt)
        }
        setLoadingProfile(false)
      })
      .catch(() => { setLoadingProfile(false) })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.memberId])

  return (
    <MemberPage>
      {/* Toast */}
      {paymentSuccessToast && (
        <div
          className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg rogym-sx-46b298d7"
          
        >
          <CalendarCheck size={18} /> Thanh toán thành công! Gói tập đã được kích hoạt.
        </div>
      )}

      <MemberPageHeader
        eyebrow="Member workspace"
        title={`Xin chào, ${user?.fullName ?? 'bạn'}`}
        description={todayFull()}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        {/* ── LEFT: main content ── */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Subscription card */}
          <SubscriptionCard
            subscription={subscription}
            packageName={packageName}
            durationDays={durationDays}
            loading={loadingSub}
            error={errorSub}
          />

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {loadingProgress ? (
              <>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={88} />)}</>
            ) : (
              <>
                <StatCard icon={Dumbbell} label="Buổi tập tháng này" value={sessionsThisMonth} unit="buổi" />
                <StatCard icon={CheckSquare} label="Check-in tháng này" value={sessionsThisMonth} unit="lần" />
                <StatCard icon={Scale} label="Cân nặng hiện tại" value={progress?.weight ?? '—'} unit={progress ? 'kg' : ''} />
                <StatCard icon={Activity} label="BMI" value={progress?.bmi ?? '—'} />
              </>
            )}
          </div>

          {/* Bottom 3 widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SessionsWidget sessions={sessions} loading={loadingSessions} error={errorSessions} />
            <WorkoutWidget plan={workoutPlan} loading={loadingPlan} error={errorPlan} />
            <FeedbackWidget feedbacks={feedbacks} loading={loadingFeedbacks} error={errorFeedbacks} />
          </div>
        </div>

        {/* ── RIGHT: PT info card (sticky) ── */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <PtInfoCard
            trainerName={profile?.trainerName ?? null}
            trainerPhone={profile?.primaryTrainer?.phone}
            trainerEmail={profile?.primaryTrainer?.email}
            activePlanIncludesPt={activePlanIncludesPt}
            loading={loadingProfile}
            onChooseTrainer={() => navigate('/member/choose-trainer')}
            onRemoveTrainer={async () => {
              await memberService.selfAssignTrainer(null)
              if (user?.memberId) memberService.getProfile(user.memberId).then(setProfile)
            }}
          />
        </aside>
      </div>
    </MemberPage>
  )
}
