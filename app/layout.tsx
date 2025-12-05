"use client"

import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { UserProvider } from "@/context/user-provider"
import { AppContent } from "@/components/app-content"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KlynnPartners" />
      </head>

      <body className={cn("min-h-screen bg-gray-50 font-sans antialiased", inter.className)}>
        <UserProvider>
          <AppContent>{children}</AppContent>
        </UserProvider>
        <Toaster />
      </body>
    </html>
  )
}