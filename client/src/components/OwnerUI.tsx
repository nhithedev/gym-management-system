import { StatCard } from '@/components/ui'

export {
  Page as OwnerPage,
  PageEmptyState as OwnerEmptyState,
  PageErrorState as OwnerErrorState,
  PageHeader as OwnerPageHeader,
  PageSkeleton as OwnerSkeleton,
} from '@/components/shared/PageUI'

export { Select as OwnerSelect } from '@/components/Select'

export const OwnerStatCard = StatCard

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
