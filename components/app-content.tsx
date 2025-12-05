"use client"

import type React from "react"
import { useUser } from "@/hooks/use-user"
import { BottomNav } from "./bottom-nav"
import { KlynnLogo } from "./klynn-logo"
import { LoginForm } from "./login-form"

export function AppContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <KlynnLogo className="h-10 animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="relative flex flex-col h-screen">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
