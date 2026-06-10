import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Users, Wrench, Star } from 'lucide-react'
import { MemberPage, MemberPageHeader } from '../components/MemberUI'
import { feedbackService } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

const G = '#06c384'
const BG_CARD = '#0f1c16'

type FeedbackType = 'staff' | 'equipment' | 'service'
type Severity = 'low' | 'medium' | 'high'

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { value: 'staff',     label: 'Nhân viên', icon: <Users size={18} /> },
  { value: 'equipment', label: 'Thiết bị',  icon: <Wrench size={18} /> },
  { value: 'service',   label: 'Dịch vụ',   icon: <Star size={18} /> },
]

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'low',    label: 'Thấp',        color: '#22c55e' },
  { value: 'medium', label: 'Trung bình',  color: '#f59e0b' },
  { value: 'high',   label: 'Cao',         color: '#ef4444' },
]

export default function SendFeedbackPage() {
  const { user } = useAuthStore()
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('service')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) { setError('Vui lòng nhập nội dung phản hồi.'); return }
    if (!user?.memberId) return
    setSubmitting(true)
    setError(null)
    try {
      await feedbackService.create({
        memberId: String(user.memberId),
        feedbackType,
        content: content.trim(),
        severity,
      })
      setSuccess(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Phản hồi"
        title="Gửi phản hồi"
        description="Chia sẻ trải nghiệm của bạn về dịch vụ, nhân viên hoặc thiết bị"
        actions={
          <Link to="/member/feedback" className="rogym-btn rogym-btn--outline-white">
            Phản hồi của tôi
          </Link>
        }
      />

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {success ? (
          <div
            style={{ background: BG_CARD, border: '1px solid rgba(66,224,158,0.10)', borderRadius: 20, padding: '48px 32px' }}
            className="flex flex-col items-center text-center"
          >
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: `${G}22`, border: `2px solid ${G}55` }}
            >
              <CheckCircle2 size={32} style={{ color: G }} />
            </div>
            <h2 className="text-xl font-bold text-white">Phản hồi đã được gửi thành công</h2>
            <p className="mt-2 text-sm" style={{ color: '#bbcabf' }}>
              Chúng tôi sẽ xem xét và phản hồi bạn sớm nhất có thể.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                to="/member/feedback"
                className="rogym-btn rogym-btn--primary px-6 py-2.5 text-sm"
              >
                Xem phản hồi của tôi
              </Link>
              <button
                onClick={() => { setSuccess(false); setContent(''); setFeedbackType('service'); setSeverity('medium') }}
                className="rogym-btn rogym-btn--outline-white px-6 py-2.5 text-sm"
              >
                Gửi phản hồi khác
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ background: BG_CARD, border: '1px solid rgba(66,224,158,0.10)', borderRadius: 20, padding: '28px 28px' }}>
              {/* Type selector */}
              <div className="mb-6">
                <p className="mb-3 text-sm font-semibold text-white">Loại phản hồi</p>
                <div className="grid grid-cols-3 gap-3">
                  {TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFeedbackType(opt.value)}
                      className="flex flex-col items-center gap-2 rounded-xl py-4 text-xs font-medium transition-colors"
                      style={{
                        background: feedbackType === opt.value ? `${G}18` : 'transparent',
                        border: feedbackType === opt.value ? `1.5px solid ${G}` : '1px solid rgba(255,255,255,0.10)',
                        color: feedbackType === opt.value ? G : '#bbcabf',
                      }}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="mb-6">
                <p className="mb-3 text-sm font-semibold text-white">Mức độ nghiêm trọng</p>
                <div className="flex gap-3">
                  {SEVERITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeverity(opt.value)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors"
                      style={{
                        background: severity === opt.value ? `${opt.color}18` : 'transparent',
                        border: severity === opt.value ? `1.5px solid ${opt.color}` : '1px solid rgba(255,255,255,0.10)',
                        color: severity === opt.value ? opt.color : '#bbcabf',
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: opt.color, opacity: severity === opt.value ? 1 : 0.4 }}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="mb-2 text-sm font-semibold text-white">Nội dung phản hồi</p>
                <textarea
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  required
                  className="rogym-input w-full resize-none"
                  style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
                />
              </div>

              {error && (
                <p className="mb-4 text-sm" style={{ color: '#f87171' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rogym-btn rogym-btn--primary rogym-btn--wide w-full"
                style={{
                  background: submitting ? '#1a2d22' : G,
                  color: submitting ? '#4a6654' : '#00492f',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </MemberPage>
  )
}
