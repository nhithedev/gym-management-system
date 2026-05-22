import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BadgeDollarSign,
  Calendar,
  //Dumbbell,
  LogOut,
  MessageSquare,
  Package,
  ClipboardCheck,
  //Settings,
  User,
  TrendingUp,
  Users,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore, type AuthUser, type Role } from '@/stores/authStore'
type SidebarProps = {
  user: AuthUser
  collapsed: boolean
  onToggleCollapsed: () => void
}
type SidebarItem = {
  label: string
  to: string
}

type SidebarSection = {
  id: string
  title: string
  icon: LucideIcon
  items: SidebarItem[]
}

const navByRole: Record<Role, SidebarSection[]> = {
  member: [
    {
      id: 'member-packages-accordion',
      title: 'Gói tập',
      icon: Package,
      items: [
        { label: 'Gói hiện tại', to: '/member/current-package' },
        { label: 'Mua gói mới', to: '/member/buy-package' },
        { label: 'Gia hạn gói', to: '/member/renew-package' },
        { label: 'Lịch sử gói', to: '/member/package-history' },
      ],
    },
    {
      id: 'member-training-accordion',
      title: 'Lịch sử tập luyện',
      icon: Calendar,
      items: [
        { label: 'Attendance History', to: '/member/attendance' },
        { label: 'Session History', to: '/member/sessions' },
      ],
    },
    {
      id: 'member-progress-accordion',
      title: 'Tiến độ',
      icon: BarChart3,
      items: [
        { label: 'Biểu đồ tiến độ', to: '/member/progress-chart' },
        { label: 'Nhật ký tiến độ', to: '/member/progress-log' },
      ],
    },
    {
      id: 'member-feedback-accordion',
      title: 'Phản hồi',
      icon: MessageSquare,
      items: [
        { label: 'Gửi phản hồi', to: '/member/send-feedback' },
        { label: 'Phản hồi của tôi', to: '/member/my-feedback' },
      ],
    },
  ],
  staff: [
    {
      id: 'staff-users-accordion',
      title: 'Vận hành',
      icon: Users,
      items: [
        { label: 'Hội viên', to: '/staff#members' },
        { label: 'Phòng tập', to: '/staff#rooms' },
        { label: 'Thiết bị', to: '/staff#equipment' },
      ],
    },
    {
      id: 'staff-projects-accordion',
      title: 'Hỗ trợ',
      icon: MessageSquare,
      items: [{ label: 'Phản hồi', to: '/staff#feedback' }],
    },
  ],
  trainer: [
    {
      id: 'trainer-users-accordion',
      title: 'Học viên',
      icon: Users,
      items: [{ label: 'Danh sách học viên', to: '/trainer/students' }],
    },
    {
      id: 'trainer-account-accordion',
      title: 'Lịch dạy',
      icon: Calendar,
      items: [
        { label: 'Lịch theo lịch biểu', to: '/trainer/calendar' },
        { label: 'Danh sách buổi tập', to: '/trainer/sessions' },
        { label: 'Tạo buổi tập mới', to: '/trainer/create-session' },
      ],
    },
    {
      id: 'trainer-progress-accordion',
      title: 'Tiến độ',
      icon: TrendingUp,
      items: [
        { label: 'Danh sách tiến độ', to: '/trainer/progress-list' },
        { label: 'Thêm bản ghi tiến độ', to: '/trainer/add-progress' },
      ],
    },
    {
      id: 'trainer-attendance-accordion',
      title: 'Điểm danh',
      icon: ClipboardCheck,
      items: [{ label: 'Lịch sử điểm danh', to: '/trainer/attendance' }],
    },
  ],
  owner: [
    {
      id: 'owner-users-accordion',
      title: 'Quản trị',
      icon: UserCog,
      items: [
        { label: 'Người dùng', to: '/owner/users' },
        { label: 'Groups & Quyền', to: '/owner/groups' },
        { label: 'Danh mục quyền', to: '/owner/permissions' },
      ],
    },
    {
      id: 'owner-catalog-accordion',
      title: 'Danh mục',
      icon: Package,
      items: [
        { label: 'Gói tập', to: '/owner/packages' },
      ],
    },
    {
      id: 'owner-projects-accordion',
      title: 'Kinh doanh',
      icon: BadgeDollarSign,
      items: [
        { label: 'Doanh thu', to: '/owner#finance' },
        { label: 'Báo cáo', to: '/owner#reports' },
      ],
    },
  ],
}

const roleLabel: Record<Role, string> = {
  member: 'Hội viên',
  staff: 'Nhân viên quản lý',
  trainer: 'Huấn luyện viên',
  owner: 'Chủ phòng tập',
}

const profilePathByRole: Record<Role, string> = {
  member: '/member/profile',
  staff: '/staff/profile',
  trainer: '/trainer/profile',
  owner: '/owner/profile',
}

export default function Sidebar({ user, collapsed, onToggleCollapsed }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const role = user.roles[0]
  const sections = navByRole[role]
  const activeHash = useMemo(() => location.hash || '#overview', [location.hash])
  const activePath = useMemo(() => location.pathname, [location.pathname])
  const isMember = role === 'member'
  const isTrainer = role === 'trainer'

  const handleLogout = async () => {
    await authService.logout().catch(() => {})
    clearAuth()
    navigate('/login', { replace: true })
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? true),
    }))
  }

  const isActive = (to: string) => {
    if (to.includes('#')) {
      const [path, hash] = to.split('#')
      if (path === '') return activeHash === `#${hash}`
      return activePath === path && activeHash === `#${hash}`
    }
    return activePath === to || activePath.startsWith(`${to}/`)
  }

  const isSectionActive = (section: SidebarSection) => {
    return section.items.some((item) => isActive(item.to))
  }

  const navigateTo = (to: string) => {
    if (to.includes('#')) {
      const [path, hash] = to.split('#')
      if (path === '' || path === activePath) {
        window.location.hash = hash
      } else {
        navigate(`${path}#${hash}`)
      }
    } else {
      navigate(to)
    }
    setMobileOpen(false)
  }

  const handleSectionIconClick = (section: SidebarSection) => {
    const activeChild = section.items.find((item) => isActive(item.to))
    const target = activeChild?.to ?? section.items[0]?.to
    if (target) navigateTo(target)
  }

  const brandHref = role === 'member' || role === 'trainer' ? `/${role}` : `/${role}`

  return (
    <>
      <div className="lg:hidden py-16 text-center">
        <button
          type="button"
          className="py-2 px-3 inline-flex justify-center items-center gap-x-2 text-start bg-surface-container text-on-surface border border-outline-variant text-sm font-medium rounded-lg shadow-2xs hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high"
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          aria-controls="hs-sidebar-footer"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen(true)}
        >
          Open
        </button>
      </div>

      <div
  id="hs-sidebar-footer"
  className={`hs-overlay [--auto-close:lg] lg:block lg:fixed lg:translate-x-0 lg:left-0 lg:top-0 lg:bottom-0 lg:z-50 ${
    collapsed ? 'lg:w-16' : 'lg:w-64'
  } hs-overlay-open:translate-x-0 -translate-x-full transition-all duration-300 transform h-full hidden fixed top-0 inset-s-0 bottom-0 z-60 bg-surface text-on-surface border-e border-outline-variant ${mobileOpen ? 'translate-x-0 block' : ''}`}
  role="dialog"
  tabIndex={-1}
  aria-label="Sidebar"
>
        <div className="relative flex flex-col h-full max-h-full">
          <header
  className={`p-3 border-b border-outline-variant ${
    collapsed ? 'flex flex-col items-center gap-3' : 'flex justify-between items-center gap-x-2'
  }`}
>
  {collapsed ? (
    <>
      <a
        className="flex items-center justify-center size-9 font-semibold text-sm text-primary rounded-xl focus:outline-hidden focus:opacity-80"
        href={brandHref}
        aria-label="Brand"
      >
        G
      </a>

      <button
        type="button"
        className="hidden lg:flex justify-center items-center size-9 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-2xl focus:outline-hidden focus:bg-surface-container-high"
        aria-label="Toggle sidebar"
        onClick={onToggleCollapsed}
      >
        <PanelLeftOpen className="size-4" />
        <span className="sr-only">Navigation Toggle</span>
      </button>

      <div className="lg:hidden">
        <button
          type="button"
          className="flex justify-center items-center gap-x-3 size-8 bg-surface text-on-surface border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container rounded-full focus:outline-hidden focus:bg-surface-container-high"
          aria-controls="hs-sidebar-footer"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <svg
            className="shrink-0 size-4"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>
  ) : (
    <>
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <a
          className="flex-none font-semibold text-xl text-primary focus:outline-hidden focus:opacity-80"
          href={brandHref}
          aria-label="Brand"
        >
          Gym ITSS
        </a>

        <p className="text-xs text-on-surface-variant truncate">{roleLabel[role]}</p>
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden lg:block">
          <button
            type="button"
            className="flex justify-center items-center size-9 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-xl focus:outline-hidden focus:bg-surface-container-high"
            aria-label="Toggle sidebar"
            onClick={onToggleCollapsed}
          >
            <PanelLeftClose className="size-4" />
            <span className="sr-only">Navigation Toggle</span>
          </button>
        </div>

        <div className="lg:hidden -me-2">
          <button
            type="button"
            className="flex justify-center items-center gap-x-3 size-6 bg-surface text-on-surface border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container rounded-full focus:outline-hidden focus:bg-surface-container-high"
            aria-controls="hs-sidebar-footer"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <svg
              className="shrink-0 size-4"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    </>
  )}
</header>
<nav className="app-scrollbar h-full overflow-y-auto">
  <div
    className="hs-accordion-group flex w-full flex-col flex-wrap px-2 pb-0"
    data-hs-accordion-always-open
  >
    <ul className="space-y-1 py-2">
                {isMember ? (
                  <li>
                    <button
                      type="button"
                      title="Dashboard"
                      className={`flex w-full items-center ${
                        collapsed ? 'justify-center' : 'gap-x-3.5'
                      } py-2 px-2.5 text-sm ${
                        activePath === '/member'
                          ? 'bg-surface-container-high text-on-surface'
                          : 'bg-transparent text-on-surface-variant'
                      } rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`}
                      onClick={() => {
                        navigate('/member')
                        setMobileOpen(false)
                      }}
                    >
                      <BarChart3 className="size-4 shrink-0" />
                      {!collapsed && <span>Dashboard</span>}
                    </button>
                  </li>
                ) : isTrainer ? (
                  <li>
                    <button
                      type="button"
                      title="Dashboard"
                      className={`flex w-full items-center ${
                        collapsed ? 'justify-center' : 'gap-x-3.5'
                      } py-2 px-2.5 text-sm ${
                        activePath === '/trainer'
                          ? 'bg-surface-container-high text-on-surface'
                          : 'bg-transparent text-on-surface-variant'
                      } rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`}
                      onClick={() => {
                        navigate('/trainer')
                        setMobileOpen(false)
                      }}
                    >
                      <BarChart3 className="size-4 shrink-0" />
                      {!collapsed && <span>Dashboard</span>}
                    </button>
                  </li>
                ) : (
                  <li>
                    <button
                      type="button"
                      title="Dashboard"
                      className={`flex items-center w-full ${
                        collapsed ? 'justify-center' : 'gap-x-3.5'
                      } py-2 px-2.5 text-sm ${
                        activePath === `/${role}` && (activeHash === '#overview' || activeHash === '#')
                          ? 'bg-surface-container-high text-on-surface'
                          : 'bg-transparent text-on-surface-variant'
                      } rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`}
                      onClick={() => navigateTo(`/${role}`)}
                    >
                      <BarChart3 className="size-4 shrink-0" />
                      {!collapsed && <span>Dashboard</span>}
                    </button>
                  </li>
                )}

                {sections.map((section) => {
                  const sectionActive = isSectionActive(section)
                  const sectionOpen = openSections[section.id] ?? true

                  if (collapsed) {
                    return (
                      <li key={section.id}>
                        <button
                          type="button"
                          title={section.title}
                          className={`flex w-full items-center justify-center py-2 px-2.5 text-sm rounded-lg transition ${
                            sectionActive
                              ? 'bg-surface-container-high text-on-surface'
                              : 'text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                          onClick={() => handleSectionIconClick(section)}
                        >
                          <section.icon className="size-5 shrink-0" />
                          <span className="sr-only">{section.title}</span>
                        </button>
                      </li>
                    )
                  }

                  return (
                    <li className="hs-accordion" id={section.id} key={section.id}>
                      <button
                        type="button"
                        className={`hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high ${
                          sectionActive
                            ? 'bg-surface-container-high text-on-surface'
                            : 'text-on-surface-variant'
                        }`}
                        aria-expanded={sectionOpen}
                        aria-controls={`${section.id}-collapse-1`}
                        onClick={() => toggleSection(section.id)}
                      >
                        <section.icon className="size-4 shrink-0" />
                        <span className="truncate">{section.title}</span>

                        <svg
                          className={`ms-auto size-4 shrink-0 transition-transform duration-200 ${
                            sectionOpen ? 'rotate-180' : ''
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>

                      <div
                        id={`${section.id}-collapse-1`}
                        className={`w-full overflow-hidden transition-[height] duration-300 ${
                          sectionOpen ? 'block' : 'hidden'
                        }`}
                        role="region"
                        aria-labelledby={section.id}
                      >
                        <ul className="pt-1 ps-7 space-y-1">
                          {section.items.map((item) => {
                            const itemActive = isActive(item.to)
                            return (
                              <li key={item.to}>
                                <button
                                  type="button"
                                  className={`flex w-full items-center gap-x-2 py-2 px-2.5 text-sm rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high ${
                                    itemActive
                                      ? 'bg-surface-container-high text-on-surface'
                                      : 'text-on-surface-variant'
                                  }`}
                                  onClick={() => navigateTo(item.to)}
                                >
                                  <span
                                    className={`block h-1.5 w-1.5 rounded-full transition-opacity ${
                                      itemActive ? 'opacity-100 bg-current' : 'opacity-0'
                                    }`}
                                  />
                                  <span className="truncate">{item.label}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          <footer className="mt-auto p-2 border-t border-outline-variant">
            <div className="hs-dropdown [--strategy:absolute] [--auto-close:inside] relative w-full inline-flex">
              <button
                id="hs-sidebar-footer-example-with-dropdown"
                type="button"
                className={`w-full inline-flex shrink-0 items-center ${
                  collapsed ? 'justify-center' : 'gap-x-2'
                } p-2 text-start text-sm text-on-surface rounded-md hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="Dropdown"
                onClick={() => setAccountOpen((value) => !value)}
              >
                <img
                  className="shrink-0 size-5 rounded-full"
                  src="https://images.unsplash.com/photo-1734122415415-88cb1d7d5dc0?q=80&w=320&h=320&auto=format&fit=facearea&facepad=3&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Avatar"
                />
                {!collapsed && (
                  <>
                    <span className="truncate">{user.fullName}</span>
                    <svg
                      className="shrink-0 size-3.5 ms-auto"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m7 15 5 5 5-5" />
                      <path d="m7 9 5-5 5 5" />
                    </svg>
                  </>
                )}
              </button>

              {accountOpen ? (
                <div
                  className="absolute bottom-full left-2 right-2 z-20 mb-2 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-high shadow-2xl shadow-black/10"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="hs-sidebar-footer-example-with-dropdown"
                >
                  <div className="p-2">
                    <button
                      type="button"
                      className="flex w-full items-center gap-x-3 rounded-xl px-3 py-3 text-left text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                      onClick={() => {
                        navigate(profilePathByRole[role])
                        setAccountOpen(false)
                        setMobileOpen(false)
                      }}
                    >
                      <User className="size-4" />
                      <span className="flex-1">Hồ sơ</span>
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center gap-x-3 rounded-xl px-3 py-3 text-left text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-4" />
                      <span className="flex-1">Đăng xuất</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}