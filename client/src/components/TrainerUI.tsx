import { Children, isValidElement, type ReactNode } from 'react'
import { Check, ChevronDown, AlertCircle, LoaderCircle, Search, X } from 'lucide-react'
import { Select as RadixSelect } from 'radix-ui'
import { cn } from '@/lib/utils'
import { statusLabel, statusTone, type StatusTone } from '@/lib/status'
import type { TrainerStudentSummary } from '@/services/member.service'

export function TrainerPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] space-y-6', className)}>{children}</div>
}

export function TrainerPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--rogym-border-section)] pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <div className="rogym-eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--rogym-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

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
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] text-[var(--rogym-teal)]">
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm font-medium text-[var(--rogym-text-secondary)]">{label}</div>
      {hint && <div className="mt-2 text-xs text-[var(--rogym-text-dim)]">{hint}</div>}
    </div>
  )
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'border-[rgba(6,195,132,0.3)] bg-[rgba(6,195,132,0.12)] text-[#42e09e]',
  accent: 'border-[rgba(66,224,158,0.35)] bg-[rgba(66,224,158,0.12)] text-[#42e09e]',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  danger: 'border-red-400/30 bg-red-400/10 text-red-300',
  muted: 'border-white/10 bg-white/5 text-[var(--rogym-text-dim)]',
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

export function TrainerSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/5"
        />
      ))}
    </div>
  )
}

export function TrainerEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rogym-card rogym-card--compact flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-[var(--rogym-text-dim)]">
        <Search size={20} />
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm text-[var(--rogym-text-secondary)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function TrainerErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rogym-card rogym-card--compact flex items-center gap-4 border-red-400/20 p-5">
      <AlertCircle className="shrink-0 text-red-300" size={22} />
      <div className="flex-1 text-sm text-red-200">{message}</div>
      {onRetry && (
        <button
          type="button"
          className="rogym-btn rogym-btn--outline-white px-4 py-2 text-xs"
          onClick={onRetry}
        >
          Thử lại
        </button>
      )}
    </div>
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

const EMPTY_SELECT_VALUE = '__rogym_empty__'

type TrainerSelectOptionProps = {
  children?: ReactNode
  disabled?: boolean
  value?: string | number
}

export function TrainerSelect({
  children,
  className,
  value,
  onValueChange,
  disabled,
  required,
  name,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  name?: string
  ariaLabel?: string
}) {
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<TrainerSelectOptionProps>(child)) return []
    return [
      {
        disabled: child.props.disabled,
        label: child.props.children,
        value: String(child.props.value ?? ''),
      },
    ]
  })
  const emptyOption = options.find((option) => option.value === '')
  const selectedValue = value || (required ? '' : EMPTY_SELECT_VALUE)

  return (
    <RadixSelect.Root
      value={selectedValue}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)
      }
      disabled={disabled}
      required={required}
      name={name}
    >
      <RadixSelect.Trigger
        className={cn('rogym-select', className)}
        aria-label={ariaLabel}
        data-no-sweep
      >
        <RadixSelect.Value placeholder={emptyOption?.label} />
        <RadixSelect.Icon className="rogym-select__icon">
          <ChevronDown size={17} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="rogym-select__content"
          position="popper"
          sideOffset={8}
          align="start"
        >
          <RadixSelect.Viewport className="rogym-select__viewport">
            {options
              .filter((option) => !required || option.value !== '')
              .map((option) => {
                const optionValue = option.value || EMPTY_SELECT_VALUE
                return (
                  <RadixSelect.Item
                    key={optionValue}
                    className="rogym-select__item"
                    value={optionValue}
                    disabled={option.disabled}
                  >
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator className="rogym-select__indicator">
                      <Check size={15} />
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                )
              })}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

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
    <TrainerSelect
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <option value="">Chọn học viên</option>
      {students.map((student) => (
        <option key={student.memberId} value={student.memberId}>
          {student.memberCode} - {student.fullName}
        </option>
      ))}
    </TrainerSelect>
  )
}
