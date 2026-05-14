import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BadgeDollarSign,
  Calendar,
  Dumbbell,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  Users,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore, type AuthUser, type Role } from '@/stores/authStore'

type SidebarItem = {
  label: string
  to: string
  icon: LucideIcon
  badge?: string
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
      id: 'member-users-accordion',
      title: 'Dịch vụ',
      icon: Package,
      items: [
        { label: 'Gói tập', to: '#packages', icon: Package },
        { label: 'Lịch tập', to: '#schedule', icon: Calendar },
      ],
    },
    {
      id: 'member-account-accordion',
      title: 'Theo dõi',
      icon: BadgeDollarSign,
      items: [
        { label: 'Tiến độ', to: '#progress', icon: BadgeDollarSign },
        { label: 'Phản hồi', to: '#feedback', icon: MessageSquare },
      ],
    },
  ],
  staff: [
    {
      id: 'staff-users-accordion',
      title: 'Vận hành',
      icon: Users,
      items: [
        { label: 'Hội viên', to: '#members', icon: Users },
        { label: 'Phòng tập', to: '#rooms', icon: Settings },
        { label: 'Thiết bị', to: '#equipment', icon: Dumbbell },
      ],
    },
    {
      id: 'staff-projects-accordion',
      title: 'Hỗ trợ',
      icon: MessageSquare,
      items: [{ label: 'Phản hồi', to: '#feedback', icon: MessageSquare }],
    },
  ],
  trainer: [
    {
      id: 'trainer-users-accordion',
      title: 'Huấn luyện',
      icon: Users,
      items: [
        { label: 'Học viên', to: '#members', icon: Users },
        { label: 'Lịch dạy', to: '#schedule', icon: Calendar },
      ],
    },
    {
      id: 'trainer-account-accordion',
      title: 'Bài tập',
      icon: Dumbbell,
      items: [
        { label: 'Giáo án', to: '#programs', icon: Dumbbell },
        { label: 'Đánh giá', to: '#review', icon: BarChart3 },
      ],
    },
  ],
  owner: [
    {
      id: 'owner-users-accordion',
      title: 'Quản trị',
      icon: UserCog,
      items: [
        { label: 'Nhân sự', to: '#staff', icon: UserCog },
        { label: 'Phân quyền', to: '#permissions', icon: Settings },
      ],
    },
    {
      id: 'owner-projects-accordion',
      title: 'Kinh doanh',
      icon: BadgeDollarSign,
      items: [
        { label: 'Doanh thu', to: '#finance', icon: BadgeDollarSign },
        { label: 'Báo cáo', to: '#reports', icon: BarChart3 },
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

export default function Sidebar({ user }: { user: AuthUser }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const sections = navByRole[user.roles[0]]
  const activeHash = useMemo(() => location.hash || '#overview', [location.hash])

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

  return (
    <>
      {/* Navigation Toggle */}
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
      {/* End Navigation Toggle */}

      {/* Sidebar */}
      <div
        id="hs-sidebar-footer"
        className={`hs-overlay [--auto-close:lg] lg:block lg:fixed lg:translate-x-0 lg:left-0 lg:top-0 lg:bottom-0 lg:z-50 lg:w-64 hs-overlay-open:translate-x-0 -translate-x-full transition-all duration-300 transform h-full hidden fixed top-0 inset-s-0 bottom-0 z-60 bg-surface text-on-surface border-e border-outline-variant ${mobileOpen ? 'translate-x-0 block' : ''}`}
        role="dialog"
        tabIndex={-1}
        aria-label="Sidebar"
      >
        <div className="relative flex flex-col h-full max-h-full">
          {/* Header */}
          <header className="p-4 flex justify-between items-center gap-x-2 border-b border-outline-variant">
            <a className="flex-none font-semibold text-xl text-primary focus:outline-hidden focus:opacity-80" href="#overview" aria-label="Brand">
              Gym ITSS
            </a>
            <p className="text-xs text-on-surface-variant">{roleLabel[user.roles[0]]}</p>

            <div className="lg:hidden -me-2">
              {/* Close Button */}
              <button
                type="button"
                className="flex justify-center items-center gap-x-3 size-6 bg-surface text-on-surface border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-surface-container-high"
                aria-controls="hs-sidebar-footer"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                <span className="sr-only">Close</span>
              </button>
              {/* End Close Button */}
            </div>
          </header>
          {/* End Header */}

          {/* Body */}
          <nav className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-surface-container [&::-webkit-scrollbar-thumb]:bg-outline-variant">
            <div className="hs-accordion-group pb-0 px-2 w-full flex flex-col flex-wrap" data-hs-accordion-always-open>
              <ul className="space-y-1">
                <li>
                  <a className={`flex items-center gap-x-3.5 py-2 px-2.5 ${activeHash === '#overview' ? 'bg-surface-container-high text-on-surface' : 'bg-transparent text-on-surface-variant'} rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`} href="#overview" onClick={() => setMobileOpen(false)}>
                    <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Dashboard
                  </a>
                </li>

                {sections.map((section) => (
                  <li className="hs-accordion" id={section.id} key={section.id}>
                    <button
                      type="button"
                      className="hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-on-surface-variant rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high"
                      aria-expanded={openSections[section.id] ?? true}
                      aria-controls={`${section.id}-collapse-1`}
                      onClick={() => toggleSection(section.id)}
                    >
                      <section.icon className="size-4" />
                      {section.title}

                      <svg className="hs-accordion-active:block ms-auto hidden size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>

                      <svg className="hs-accordion-active:hidden ms-auto block size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>

                    <div
                      id={`${section.id}-collapse-1`}
                      className={`hs-accordion-content w-full overflow-hidden transition-[height] duration-300 ${openSections[section.id] ?? true ? '' : 'hidden'}`}
                      role="region"
                      aria-labelledby={section.id}
                    >
                      <ul className="pt-1 ps-7 space-y-1">
                        {section.items.map((item) => (
                          <li key={item.to}>
                            <a className={`flex items-center gap-x-3.5 py-2 px-2.5 text-sm ${activeHash === item.to ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'} rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`} href={item.to} onClick={() => setMobileOpen(false)}>
                              <item.icon className="size-4" />
                              {item.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}

                <li>
                  <a className={`w-full flex items-center gap-x-3.5 py-2 px-2.5 ${activeHash === '#schedule' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'} text-sm rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`} href="#schedule" onClick={() => setMobileOpen(false)}>
                    <Calendar className="size-4" />
                    Calendar <span className="ms-auto py-0.5 px-1.5 inline-flex items-center gap-x-1.5 text-xs bg-primary/10 text-primary rounded-full">New</span>
                  </a>
                </li>
                <li>
                  <a className={`w-full flex items-center gap-x-3.5 py-2 px-2.5 ${activeHash === '#reports' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'} text-sm rounded-lg hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high`} href="#reports" onClick={() => setMobileOpen(false)}>
                    <BarChart3 className="size-4" />
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
          </nav>
          {/* End Body */}

          {/* Footer */}
          <footer className="mt-auto p-2 border-t border-outline-variant">
            {/* Account Dropdown */}
            <div className="hs-dropdown [--strategy:absolute] [--auto-close:inside] relative w-full inline-flex">
              <button
                id="hs-sidebar-footer-example-with-dropdown"
                type="button"
                className="w-full inline-flex shrink-0 items-center gap-x-2 p-2 text-start text-sm text-on-surface rounded-md hover:bg-surface-container-high focus:outline-hidden focus:bg-surface-container-high"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="Dropdown"
                onClick={() => setAccountOpen((value) => !value)}
              >
                <img className="shrink-0 size-5 rounded-full" src="https://images.unsplash.com/photo-1734122415415-88cb1d7d5dc0?q=80&w=320&h=320&auto=format&fit=facearea&facepad=3&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Avatar" />
                {user.fullName}
                <svg className="shrink-0 size-3.5 ms-auto" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
              </button>

              {accountOpen ? (
                <div
                  className="absolute bottom-full left-2 right-2 z-20 mb-2 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-high shadow-2xl shadow-black/10"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="hs-sidebar-footer-example-with-dropdown"
                >
                  <div className="p-2">
                    <a
                      className="flex items-center gap-x-3 rounded-xl px-3 py-3 text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                      href="#overview"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Users className="size-4" />
                      <span className="flex-1">Tài khoản</span>
                    </a>
                    <a
                      className="flex items-center gap-x-3 rounded-xl px-3 py-3 text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                      href="#settings"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Settings className="size-4" />
                      <span className="flex-1">Cài đặt</span>
                    </a>
                    <a
                      className="flex items-center gap-x-3 rounded-xl px-3 py-3 text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                      href="#finance"
                      onClick={() => setAccountOpen(false)}
                    >
                      <BadgeDollarSign className="size-4" />
                      <span className="flex-1">Quản lý thanh toán</span>
                    </a>
                    <button
                      type="button"
                      className="flex w-full items-center gap-x-3 rounded-xl px-3 py-3 text-left text-sm text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-4" />
                      <span className="flex-1">Logout</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {/* End Account Dropdown */}
          </footer>
          {/* End Footer */}
        </div>
      </div>
      {/* End Sidebar */}
    </>
  )
}
