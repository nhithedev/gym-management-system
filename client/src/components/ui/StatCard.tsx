import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: string
  accent?: boolean
  to?: string
}

export function StatCard({ icon, label, value, hint, accent = true, to }: StatCardProps) {
  return (
    <div className="rogym-card rogym-card--compact p-5 flex flex-col">
      <div
        className={cn(
          'mb-4 flex h-10 w-10 items-center justify-center rounded-xl',
          accent
            ? 'bg-[rgba(66,224,158,0.12)] rogym-text-accent'
            : 'bg-white/5 rogym-text-secondary'
        )}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm font-medium rogym-text-secondary">{label}</div>
      {hint && <div className="mt-2 text-xs rogym-text-dim">{hint}</div>}
      {to && (
        <div className="mt-auto pt-4">
          <Link to={to} className="rogym-text-link rogym-text-link--accent text-xs">
            Xem chi tiết →
          </Link>
        </div>
      )}
    </div>
  )
}
