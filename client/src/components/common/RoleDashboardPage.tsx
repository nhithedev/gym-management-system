type DashboardMetric = {
  label: string
  value: string
  note: string
}

type DashboardCard = {
  title: string
  description: string
  tag: string
}

type DashboardSection = {
  id: string
  eyebrow: string
  title: string
  description: string
  cards: DashboardCard[]
}

type RoleDashboardPageProps = {
  roleLabel: string
  title: string
  description: string
  metrics: DashboardMetric[]
  sections: DashboardSection[]
}

export default function RoleDashboardPage({
  roleLabel,
  title,
  description,
  metrics,
  sections,
}: RoleDashboardPageProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-16 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-surface-container-high/60 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-8 pb-8">
        <section className="rounded-[2rem] border border-outline-variant/70 bg-gradient-to-br from-surface-container-high via-surface-container to-surface p-6 shadow-xl shadow-black/5 sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-primary">{roleLabel}</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-primary sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-on-surface/75 sm:text-base">
            {description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[1.5rem] border border-outline-variant/70 bg-surface/80 p-5 shadow-lg shadow-black/5 backdrop-blur-sm"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-primary">{metric.value}</p>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{metric.note}</p>
              </div>
            ))}
          </div>
        </section>

        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-[2rem] border border-outline-variant/70 bg-surface-container-high p-6 shadow-lg shadow-black/5 sm:p-8"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">{section.eyebrow}</p>
                <h2 className="mt-3 text-3xl font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-primary sm:text-4xl">
                  {section.title}
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-on-surface/70">{section.description}</p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.cards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[1.5rem] border border-outline-variant/70 bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{card.tag}</p>
                  <h3 className="mt-4 text-lg font-semibold text-on-surface">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-on-surface/70">{card.description}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}