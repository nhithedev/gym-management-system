import { useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gymBg from '@/assets/gym-bg.jpg'

type SplitMode = 'chars' | 'words' | 'lines'

type SplitResult = {
  targets: HTMLElement[]
  revert: () => void
}

gsap.registerPlugin(ScrollTrigger)

function splitText(element: HTMLElement, mode: SplitMode): SplitResult {
  const originalHtml = element.innerHTML
  const text = element.textContent ?? ''
  const targets: HTMLElement[] = []

  const createAnimatedSpan = (content: string, className: string) => {
    const outer = document.createElement('span')
    outer.className = 'inline-block overflow-visible align-middle h-[1.35em] leading-none'

    const inner = document.createElement('span')
    inner.className = className
    inner.style.display = 'block'
    inner.style.lineHeight = '1'
    inner.textContent = content

    outer.appendChild(inner)
    element.appendChild(outer)
    targets.push(inner)
  }

  element.textContent = ''

  if (mode === 'lines') {
    text.split(/\n+/).forEach((line) => {
      const lineWrapper = document.createElement('span')
      lineWrapper.className = 'block overflow-hidden'

      const lineInner = document.createElement('span')
      lineInner.className = 'inline-block opacity-0 will-change-transform'
      lineInner.textContent = line || ' '

      lineWrapper.appendChild(lineInner)
      element.appendChild(lineWrapper)
      targets.push(lineInner)
    })
  } else if (mode === 'words') {
    text
      .split(/(\s+)/)
      .filter((part) => part.length > 0)
      .forEach((part) => {
        if (/^\s+$/.test(part)) {
          element.appendChild(document.createTextNode(part))
          return
        }

        createAnimatedSpan(part, 'inline-block opacity-0 will-change-transform')
      })
  } else {
    Array.from(text).forEach((character) => {
      createAnimatedSpan(character === ' ' ? '\u00A0' : character, 'inline-block opacity-0 will-change-transform')
    })
  }

  return {
    targets,
    revert: () => {
      element.innerHTML = originalHtml
    },
  }
}

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) {
      return
    }

    const splitEntries = Array.from(root.querySelectorAll<HTMLElement>('[data-split]')).map((element) => {
      const mode = element.dataset.split as SplitMode
      return {
        element,
        ...splitText(element, mode),
      }
    })

    const ctx = gsap.context(() => {
      splitEntries.forEach(({ element, targets }) => {
        if (targets.length === 0) {
          return
        }

        const animationMode = element.dataset.animate ?? 'reveal'
        const fromVars =
          animationMode === 'letters'
            ? { y: 80, opacity: 0, rotateX: -85 }
            : animationMode === 'lines'
              ? { y: 60, opacity: 0, rotateX: -80 }
              : { y: 40, opacity: 0 }

        const toVars =
          animationMode === 'letters'
            ? {
                y: 0,
                opacity: 1,
                rotateX: 0,
                duration: 0.9,
                ease: 'power3.out',
                stagger: { amount: 0.8 },
                scrollTrigger: {
                  trigger: element,
                  start: 'top 80%',
                  toggleActions: 'play none none reverse',
                },
              }
            : animationMode === 'lines'
              ? {
                  y: 0,
                  opacity: 1,
                  rotateX: 0,
                  duration: 1,
                  ease: 'power3.out',
                  stagger: { amount: 0.45 },
                  scrollTrigger: {
                    trigger: element,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse',
                  },
                }
              : {
                  y: 0,
                  opacity: 1,
                  duration: 0.8,
                  ease: 'power3.out',
                  stagger: { amount: 0.45 },
                  scrollTrigger: {
                    trigger: element,
                    start: 'top 82%',
                    toggleActions: 'play none none reverse',
                  },
                }

        gsap.set(targets, fromVars)
        gsap.to(targets, toVars)
      })

      gsap.fromTo(
        '[data-float-card]',
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power2.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: '[data-float-card]',
            start: 'top 88%',
          },
        }
      )
    }, root)

    return () => {
      splitEntries.forEach(({ revert }) => revert())
      ctx.revert()
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-gradient-to-b from-surface via-surface to-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <button
            onClick={() => {
              navigate('/')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-2 transition hover:opacity-80"
          >
            <p className="text-lg font-bold text-primary">ITSS</p>
          </button>

          <nav className="hidden items-center gap-8 text-sm text-on-surface-variant md:flex">
            <a href="#experience" className="transition hover:text-primary">
              Trải nghiệm
            </a>
            <a href="#training" className="transition hover:text-primary">
              Quản lý
            </a>
            <a href="#identity" className="transition hover:text-primary">
              Tập luyện
            </a>
          </nav>

          <Link to="/login" className="btn-secondary">
            Open App
          </Link>
        </div>
      </header>

      <div ref={rootRef} className="min-h-screen overflow-x-hidden bg-surface text-on-surface">
        <div className="pointer-events-none fixed inset-0 opacity-20">
          <div className="absolute -left-24 top-[-8rem] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <main className="relative z-10">
        <section className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden py-12 lg:py-20">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
            style={{ backgroundImage: `url(${gymBg})` }}
          />

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-7xl flex-col items-end justify-between px-4 sm:px-6 lg:px-8">
            <div className="w-full" />

            <div className="flex w-full flex-col gap-8">
              <h1
                data-split="words"
                data-animate="words"
                className="max-w-6xl text-5xl font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-primary sm:text-7xl lg:text-8xl"
              >
                Nâng tầm không gian. Nâng cấp thân hình. Thiết lập chuẩn mực.
              </h1>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/login" className="btn-primary">
                  Enter App
                </Link>
                <a href="#experience" className="btn-secondary">
                  Explore Sections
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="min-h-[calc(100vh-4.5rem)] bg-surface-container-high">
          <div className="mx-auto flex max-w-7xl flex-col justify-between px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.35em] text-on-surface-variant">
              <span className="h-px flex-1 bg-outline-variant/30" />
              Trải nghiệm
            </div>

            <div className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <h2
                data-split="words"
                data-animate="words"
                className="max-w-xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-primary sm:text-6xl"
              >
                Tính toán chi tiết. Tự tin mỗi ngày. Kiểm soát từng lần.
              </h2>

              <p data-split="words" data-animate="words" className="max-w-2xl text-lg leading-8 text-on-surface/70">
                Nơi mỗi thành viên cảm thấy được chào đón và hỗ trợ để đạt được mục tiêu của riêng mình.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {['Thành viên', 'Luyện tập', 'Báo cáo'].map((item) => (
                <div
                  key={item}
                  data-float-card
                  className="rounded-[1.75rem] border border-outline-variant bg-surface-container p-6 shadow-lg shadow-black/5"
                >
                  <p className="text-sm uppercase tracking-[0.32em] text-primary">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="training" className="min-h-[calc(100vh-4.5rem)] border-y border-outline-variant bg-surface">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-28 lg:items-center">
            <div>
              <h2
                data-split="words"
                data-animate="words"
                className="max-w-lg text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-primary sm:text-6xl"
              >
                Quản lý toàn diện.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Thành viên', description: '1.240 đang hoạt động' },
                { title: 'Lớp học', description: '48 buổi/tuần' },
                { title: 'Huấn luyện viên', description: '12 người' },
                { title: 'Giữ chân', description: '92% ổn định' },
              ].map((card) => (
                <div
                  key={card.title}
                  data-float-card
                  className="rounded-[1.5rem] border border-outline-variant bg-surface-container-high p-6 backdrop-blur-md"
                >
                  <p className="text-sm uppercase tracking-[0.28em] text-on-surface-variant">{card.title}</p>
                  <p className="mt-4 text-sm leading-7 text-on-surface">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="identity" className="min-h-[calc(100vh-4.5rem)] bg-surface-container-high">
          <div className="mx-auto flex max-w-7xl flex-col justify-between px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.35em] text-on-surface-variant">
              <span className="h-px flex-1 bg-outline-variant/30" />
              Tập luyện
            </div>

            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
              <h2
                data-split="words"
                data-animate="words"
                className="text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-primary sm:text-6xl"
              >
                ITSS Gym Management System.
              </h2>

              <p data-split="words" data-animate="words" className="max-w-2xl text-lg leading-8 text-on-surface/70">
                Hệ thống quản lý phòng tập hiện đại, giúp huấn luyện viên và thành viên yêu thích tập luyện hơn.
              </p>
            </div>
          </div>
        </section>
      </main>
      </div>
    </div>
  )
}