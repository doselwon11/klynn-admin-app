"use client"

import type React from "react"
import { createContext, useState, useEffect, useCallback } from "react"

export type UserRole = "vendor" | "rider" | "superhost"
export interface User {
  name: string
  role: UserRole
  originalRole?: UserRole // Track the original login role
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  login: (name: string, role: UserRole) => void
  logout: () => void
  switchRole: (newRole: UserRole) => void
}

export const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, _setUser] = useState<User | null>(null)
  // On the server, we start in a "loading" state so the initial HTML
  // shows the splash screen. On the client (where `window` exists),
  // we default to "not loading" so the login form is immediately
  // interactive even if the hydration effect fails for some reason.
  const [isLoading, setIsLoading] = useState(() => typeof window === "undefined")

  useEffect(() => {
    console.log("[UserProvider] Initializing from localStorage...")
    try {
      const storedUser = localStorage.getItem("klynnUser")
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        // Validate the user object structure
        if (parsedUser && parsedUser.name && parsedUser.role) {
          _setUser(parsedUser)
        } else {
          // Invalid user data, clear it
          localStorage.removeItem("klynnUser")
        }
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error)
      localStorage.removeItem("klynnUser")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback((name: string, role: UserRole) => {
    const newUser = { name, role, originalRole: role }
    try {
      localStorage.setItem("klynnUser", JSON.stringify(newUser))
      _setUser(newUser)
    } catch (error) {
      console.error("Failed to save user to localStorage", error)
    }
  }, [])

  const switchRole = useCallback(
    (newRole: UserRole) => {
      if (!user) return

      const updatedUser = {
        ...user,
        role: newRole,
        // Keep the original role for reference
        originalRole: user.originalRole || user.role,
      }
      try {
        localStorage.setItem("klynnUser", JSON.stringify(updatedUser))
        _setUser(updatedUser)
      } catch (error) {
        console.error("Failed to update user role in localStorage", error)
      }
    },
    [user],
  )

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("klynnUser")
      _setUser(null)
      // Don't redirect here, let the component handle it
    } catch (error) {
      console.error("Failed to logout", error)
    }
  }, [])

  return <UserContext.Provider value={{ user, isLoading, login, logout, switchRole }}>{children}</UserContext.Provider>
}
