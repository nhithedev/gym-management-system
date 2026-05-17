import { ReactNode } from 'react'

interface MemberLayoutProps {
  children: ReactNode;
}

export default function MemberLayout({ children }: MemberLayoutProps) {
  return <>{children}</>
}
