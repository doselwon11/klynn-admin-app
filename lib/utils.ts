import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length < 7) {
    return phone
  }
  const start = phone.substring(0, 3)
  const end = phone.substring(phone.length - 4)
  return `${start}****${end}`
}
