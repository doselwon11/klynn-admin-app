"use client"

import { Header } from "@/components/header"
import { QrScanner } from "@/components/qr-scanner"
import { useUser } from "@/hooks/use-user"

export default function ScanPage() {
  const { user } = useUser()

  return (
    <div className="flex flex-col h-screen">
      <Header title="Scan QR Code" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <QrScanner key={user?.role} />
      </div>
    </div>
  )
}
