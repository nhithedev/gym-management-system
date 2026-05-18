type SectionHeaderProps = {
  title: string
  description?: string
  variant?: 'page' | 'section'
}

export default function SectionHeader({
  title,
  description,
  variant = 'page',
}: SectionHeaderProps) {
  const TitleTag = variant === 'page' ? 'h1' : 'h2'
  const titleClassName =
    variant === 'page'
      ? 'member-page-title mb-2'
      : 'member-card-title text-2xl mb-2'

  const descriptionClassName =
    variant === 'page'
      ? 'text-xs uppercase tracking-[0.32em] text-[#d0c5af]/70 leading-6'
      : 'text-xs uppercase tracking-[0.24em] text-[#d0c5af]/70 leading-6'

  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <TitleTag className={titleClassName}>{title}</TitleTag>
      </div>

      {description ? (
        <div className="flex items-start gap-4 lg:max-w-md lg:justify-end lg:text-right">
          <span
            className="mt-3 h-px w-14 shrink-0 bg-outline-variant/95"
            aria-hidden="true"
          />
          <p className={descriptionClassName}>{description}</p>
        </div>
      ) : null}
    </div>
  )
}