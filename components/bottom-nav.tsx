"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, History, MapPin, User } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "Orders",
      href: "/orders",
      icon: Home,
      active: pathname === "/orders" || pathname === "/",
    },
    {
      name: "History",
      href: "/history",
      icon: History,
      active: pathname === "/history",
    },
    {
      name: "Map",
      href: "/map",
      icon: MapPin,
      active: pathname === "/map",
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      active: pathname === "/profile",
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                item.active ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? "text-blue-600" : "text-gray-600"}`} />
              <span className={`text-xs font-medium ${item.active ? "text-blue-600" : "text-gray-600"}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
