import Image from "next/image"
import { cn } from "@/lib/utils"

export function KlynnLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-24 h-8", className)}>
      <Image src="/klynn-logo.png" alt="KLYNN Logo" fill style={{ objectFit: "contain" }} priority />
    </div>
  )
}
