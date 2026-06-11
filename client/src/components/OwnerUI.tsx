import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export {
  Page as OwnerPage,
  PageEmptyState as OwnerEmptyState,
  PageErrorState as OwnerErrorState,
  PageHeader as OwnerPageHeader,
  PageSkeleton as OwnerSkeleton,
} from '@/components/shared/PageUI'

export function OwnerStatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="rogym-card rogym-card--compact p-5">
      <div
        className={cn(
          'mb-4 flex h-10 w-10 items-center justify-center rounded-xl',
          accent ? 'bg-[rgba(66,224,158,0.12)] text-[var(--rogym-teal)]' : 'bg-white/5 text-[var(--rogym-text-secondary)]'
        )}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm font-medium text-[var(--rogym-text-secondary)]">{label}</div>
      {hint && <div className="mt-2 text-xs text-[var(--rogym-text-dim)]">{hint}</div>}
    </div>
  )
}

export function OwnerBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'Be Vietnam Pro', sans-serif",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  )
}
