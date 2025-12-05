import { KlynnLogo } from "@/components/klynn-logo"
import type React from "react"

interface HeaderProps {
  title: string
  action?: React.ReactNode
}

export function Header({ title, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white border-b shadow-sm shrink-0">
      <div className="flex items-center gap-4">
        <KlynnLogo className="h-6" />
        <span className="text-lg font-semibold text-gray-600">{title}</span>
      </div>
      {action && <div className="flex items-center">{action}</div>}
    </header>
  )
}
