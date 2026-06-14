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
      className="rogym-tone-badge is-compact"
      style={{ '--rogym-tone': color } as React.CSSProperties}
    >
      {label}
    </span>
  )
}
