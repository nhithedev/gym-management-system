import { type ReactNode } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import { Select } from '@/components/Select'
import { cn } from '@/lib/utils'
import { statusLabel, statusTone, type StatusTone } from '@/lib/status'
import type { TrainerStudentSummary } from '@/services/member.service'

export {
  Page as TrainerPage,
  PageEmptyState as TrainerEmptyState,
  PageErrorState as TrainerErrorState,
  PageHeader as TrainerPageHeader,
  PageSkeleton as TrainerSkeleton,
} from '@/components/shared/PageUI'

export function TrainerStatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="rogym-card rogym-card--compact p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm font-medium rogym-text-secondary">{label}</div>
      {hint && <div className="mt-2 text-xs rogym-text-dim">{hint}</div>}
    </div>
  )
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'border-[rgba(6,195,132,0.3)] bg-[rgba(6,195,132,0.12)] text-[#42e09e]',
  accent: 'border-[rgba(66,224,158,0.35)] bg-[rgba(66,224,158,0.12)] text-[#42e09e]',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  danger: 'border-red-400/30 bg-red-400/10 text-red-300',
  muted: 'border-white/10 bg-white/5 rogym-text-dim',
}

export function TrainerStatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  const resolvedTone = tone ?? statusTone(status)
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        TONE_CLASSES[resolvedTone]
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

export function TrainerModal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function SubmitButton({
  loading,
  children,
  disabled,
  form,
}: {
  loading?: boolean
  children: ReactNode
  disabled?: boolean
  form?: string
}) {
  return (
    <button
      type="submit"
      form={form}
      className="rogym-btn rogym-btn--primary"
      disabled={disabled || loading}
    >
      {loading && <LoaderCircle size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export { Select as TrainerSelect } from '@/components/Select'

export function StudentCombobox({
  students,
  value,
  onChange,
  disabled,
}: {
  students: TrainerStudentSummary[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <option value="">Chọn học viên</option>
      {students.map((student) => (
        <option key={student.memberId} value={student.memberId}>
          {student.memberCode} - {student.fullName}
        </option>
      ))}
    </Select>
  )
}
