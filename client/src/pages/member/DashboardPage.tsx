import { useEffect, useState } from 'react'
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Dumbbell, CheckSquare, Scale, Activity,
  Calendar, CalendarX, AlertCircle, ClipboardList,
  MessageSquareOff, CalendarCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService, { type Subscription } from '@/services/subscription.service'
import packageService from '@/services/package.service'
import { trainingService, type TrainingSession } from '@/services/training.service'
import { memberService, type MemberProgress } from '@/services/member.service'
import { feedbackService, type Feedback } from '@/services/feedback.service'
import api from '@/services/api'

const G = '#06c384'
const T = '#42e09e'
const BG_CARD = '#0f1c16'

/* ── Date helpers ── */
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

/* ── Small reusable pieces ── */
function Skeleton({ h = 100 }: { h?: number }) {
  return <div className="animate-pulse rounded-2xl" style={{ height: h, background: `${BG_CARD}99` }} />
}

function ErrorWidget({ message = 'Không thể tải dữ liệu' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 py-4 px-3 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <AlertCircle size={16} className="text-red-400 shrink-0" />
      <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#f87171' }}>{message}</span>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "'Be Vietnam Pro',sans-serif",
      background: `${color}22`,
      color: color,
      border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  )
}

const SUB_STATUS_COLOR: Record<string, string> = {
  active: G,
  pending: '#f59e0b',
  expired: '#ef4444',
  cancelled: '#6b7280',
}
const SUB_STATUS_LABEL: Record<string, string> = {
  active: 'Đang hoạt động',
  pending: 'Chờ kích hoạt',
  expired: 'Đã hết hạn',
  cancelled: 'Đã huỷ',
}
const SESSION_STATUS_COLOR: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: G,
  cancelled: '#ef4444',
}
const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
}
const FEEDBACK_TYPE_COLOR: Record<string, string> = {
  staff: '#8b5cf6',
  equipment: '#f59e0b',
  service: '#3b82f6',
}
const FEEDBACK_TYPE_LABEL: Record<string, string> = {
  staff: 'Nhân viên',
  equipment: 'Thiết bị',
  service: 'Dịch vụ',
}

/* ── Subscription widget ── */
function SubscriptionCard({
  subscription,
  packageName,
  durationDays,
  loading,
  error,
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
      <div className="flex flex-col gap-3 p-6" style={{ background: BG_CARD, borderRadius: 40, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: '#fff' }}>Gói tập</span>
          <Badge label="Chưa có gói" color="#6b7280" />
        </div>
        <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: '#bbcabf' }}>
          Bạn chưa có gói tập nào. Hãy chọn gói phù hợp để bắt đầu.
        </p>
        <button
          onClick={() => navigate('/member/subscription/setup')}
          className="self-start px-5 py-2 rounded-full text-sm font-semibold transition-all"
          style={{ background: G, color: '#000', fontFamily: "'Be Vietnam Pro',sans-serif" }}
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
  const color = SUB_STATUS_COLOR[subscription.status] ?? '#6b7280'

  return (
    <div className="p-6 flex flex-col gap-4" style={{ background: BG_CARD, borderRadius: 40, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: '#fff', letterSpacing: '0.04em' }}>
          {packageName || subscription.packageName || 'Gói tập'}
        </span>
        <Badge label={SUB_STATUS_LABEL[subscription.status] ?? subscription.status} color={color} />
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: isExpired ? '#ef4444' : G, borderRadius: 999, transition: 'width 0.6s ease' }} />
        </div>
        <div className="flex justify-between" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: '#bbcabf' }}>
          <span>{daysUsed}/{totalDays} ngày đã dùng</span>
          <span style={{ color: isExpired ? '#f87171' : T, fontWeight: 600 }}>
            {isExpired ? 'Đã hết hạn' : `Còn ${daysLeft} ngày`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap" style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#bbcabf' }}>
        <span>Bắt đầu: <b style={{ color: '#fff' }}>{fmtDate(subscription.startDate)}</b></span>
        <span>Hết hạn: <b style={{ color: isExpired ? '#f87171' : '#fff' }}>{fmtDate(subscription.endDate)}</b></span>
      </div>

      {(isExpired || subscription.status === 'expired') && (
        <button
          onClick={() => navigate('/member/subscription/renew')}
          className="self-start px-5 py-2 rounded-full text-sm font-semibold"
          style={{ background: G, color: '#000', fontFamily: "'Be Vietnam Pro',sans-serif" }}
        >
          Gia hạn ngay
        </button>
      )}
    </div>
  )
}

/* ── Stats row ── */
function StatCard({ icon: Icon, label, value, unit }: { icon: React.ElementType; label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col gap-2 p-4" style={{ background: BG_CARD, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2">
        <Icon size={16} color={T} />
        <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: '#bbcabf' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontFamily: "'Be Vietnam Pro',sans-serif", color: '#bbcabf', marginLeft: 4 }}>{unit}</span>}
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
    <div className="p-5 flex flex-col gap-3" style={{ background: BG_CARD, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', letterSpacing: '0.04em' }}>Lịch tập sắp tới</span>
        <button
          onClick={() => navigate('/member/sessions')}
          style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: T, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          Xem tất cả →
        </button>
      </div>
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <CalendarX size={32} style={{ color: '#bbcabf' }} />
          <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#bbcabf' }}>Chưa có lịch tập nào sắp tới</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <div key={s.sessionId} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2.5">
                <Calendar size={14} color={T} />
                <div>
                  <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#fff', fontWeight: 600 }}>
                    {fmtDatetime(s.startTime)}
                  </p>
                  {s.trainerName && (
                    <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 11, color: '#bbcabf' }}>
                      HLV: {s.trainerName}{s.roomName ? ` · ${s.roomName}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <Badge label={SESSION_STATUS_LABEL[s.status] ?? s.status} color={SESSION_STATUS_COLOR[s.status] ?? '#6b7280'} />
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
    <div className="p-5 flex flex-col gap-3" style={{ background: BG_CARD, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', letterSpacing: '0.04em' }}>Kế hoạch tập</span>
        <button
          onClick={() => navigate('/member/workout/plan')}
          style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: T, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          Chi tiết →
        </button>
      </div>
      {plan ? (
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: '#fff', fontWeight: 600 }}>{plan.name}</p>
            <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: '#bbcabf', marginTop: 2 }}>Đang hoạt động</p>
          </div>
          <button
            onClick={() => navigate('/member/workout/plan')}
            className="px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: G, color: '#000', fontFamily: "'Be Vietnam Pro',sans-serif" }}
          >
            Bắt đầu hôm nay
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} color="#bbcabf" />
            <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#bbcabf' }}>Chưa có kế hoạch tập</span>
          </div>
          <button
            onClick={() => navigate('/member/workout/builder')}
            className="px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: G, color: '#000', fontFamily: "'Be Vietnam Pro',sans-serif" }}
          >
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
    <div className="p-5 flex flex-col gap-3" style={{ background: BG_CARD, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: '#fff', letterSpacing: '0.04em' }}>Phản hồi gần đây</span>
        <button
          onClick={() => navigate('/member/feedback')}
          style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: T, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          Xem tất cả →
        </button>
      </div>
      {feedbacks.length === 0 ? (
        <div className="flex items-center gap-2 py-2">
          <MessageSquareOff size={16} color="#bbcabf" />
          <span style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 13, color: '#bbcabf' }}>Chưa có phản hồi nào</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {feedbacks.map((fb) => (
            <div key={fb.feedbackId} className="flex items-start gap-3 py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={FEEDBACK_TYPE_LABEL[fb.feedbackType] ?? fb.feedbackType} color={FEEDBACK_TYPE_COLOR[fb.feedbackType] ?? '#6b7280'} />
                  <Badge
                    label={fb.status === 'open' ? 'Mở' : fb.status === 'in_progress' ? 'Đang xử lý' : fb.status === 'resolved' ? 'Đã giải quyết' : 'Từ chối'}
                    color={fb.status === 'resolved' ? G : fb.status === 'rejected' ? '#6b7280' : fb.status === 'in_progress' ? '#f59e0b' : '#3b82f6'}
                  />
                </div>
                <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 12, color: '#bbcabf', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                  {fb.content}
                </p>
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
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [progress, setProgress] = useState<MemberProgress | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<{ name: string } | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0)

  const [loadingSub, setLoadingSub] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true)

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
    subscriptionService
      .getByMember(memberId)
      .then(async (subs) => {
        const active = subs.find((s) => s.status === 'active') ?? subs[0] ?? null
        setSubscription(active)
        setHasActiveSub(subs.some(s => s.status === 'active' || s.status === 'pending'))
        if (active?.packageId) {
          try {
            const pkg = await packageService.get(active.packageId)
            setPackageName(pkg.name)
            setDurationDays(pkg.durationDays)
          } catch {
            /* use packageName from subscription if available */
          }
        }
        setLoadingSub(false)
      })
      .catch((err) => {
        if (err?.response?.status === 401) { clearAuth(); navigate('/login') }
        setErrorSub(true)
        setLoadingSub(false)
      })

    /* Upcoming sessions */
    trainingService
      .getSessions({ status: 'scheduled', pageSize: 3 })
      .then(({ data }) => {
        setSessions(data)
        setLoadingSessions(false)
      })
      .catch(() => { setErrorSessions(true); setLoadingSessions(false) })

    /* Progress */
    memberService
      .getProgress(memberId, { limit: 1 })
      .then((list) => {
        setProgress(list[0] ?? null)
        setLoadingProgress(false)
      })
      .catch(() => { setLoadingProgress(false) })

    /* Stats — attendance this month */
    trainingService
      .getAttendance({ memberId, month: todayYYYYMM() })
      .then(({ total }) => { setSessionsThisMonth(total) })
      .catch(() => {})

    /* Active workout plan assignment */
    api
      .get(`/workout-plans/members/${memberId}/assignments`, { params: { status: 'active', limit: 1 } })
      .then((res: { data: { data?: { plan?: { name: string }; notes?: string }[] } }) => {
        const list = res.data?.data ?? []
        const latest = list[0] ?? null
        setWorkoutPlan(latest?.plan ?? (latest ? { name: latest.notes ?? 'Kế hoạch tập' } : null))
        setLoadingPlan(false)
      })
      .catch(() => { setWorkoutPlan(null); setLoadingPlan(false); setErrorPlan(true) })

    /* Recent feedbacks */
    feedbackService
      .list({ pageSize: 2, sort: 'created_at:desc' })
      .then(({ data }) => {
        setFeedbacks(data)
        setLoadingFeedbacks(false)
      })
      .catch(() => { setErrorFeedbacks(true); setLoadingFeedbacks(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.memberId])

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Toast */}
      {paymentSuccessToast && (
        <div
          className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg"
          style={{ background: '#06c38422', border: '1px solid #06c38466', color: G, fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14 }}
        >
          <CalendarCheck size={18} /> Thanh toán thành công! Gói tập đã được kích hoạt.
        </div>
      )}

      {/* Welcome banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, color: '#fff', letterSpacing: '0.04em', lineHeight: 1.1 }}>
            Xin chào, {user?.fullName ?? 'bạn'}
          </h1>
          <p style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 14, color: '#bbcabf', marginTop: 4, textTransform: 'capitalize' }}>
            {todayFull()}
          </p>
        </div>
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{ width: 52, height: 52, background: `${G}22`, border: `2px solid ${G}44` }}
        >
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: G }}>
            {(user?.fullName ?? 'M')[0].toUpperCase()}
          </span>
        </div>
      </div>

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
          <>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={88} />)}
          </>
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
        <div className="md:col-span-1">
          <SessionsWidget sessions={sessions} loading={loadingSessions} error={errorSessions} />
        </div>
        <div className="md:col-span-1 flex flex-col gap-4">
          <WorkoutWidget plan={workoutPlan} loading={loadingPlan} error={errorPlan} />
        </div>
        <div className="md:col-span-1">
          <FeedbackWidget feedbacks={feedbacks} loading={loadingFeedbacks} error={errorFeedbacks} />
        </div>
      </div>
    </div>
  )
}
