"use client"

import type React from "react"
import { useState } from "react"
import { useUser } from "@/hooks/use-user"
import type { UserRole } from "@/context/user-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KlynnLogo } from "./klynn-logo"
import { useToast } from "./ui/use-toast"

const passwords: Record<string, { role: UserRole; name: string }> = {
  klynnFAST: { role: "rider", name: "Klynn Rider" },
  klynn4all: { role: "vendor", name: "Wangsa Maju Vendor" },
  IMRANHENSEM: { role: "superhost", name: "Imran (Superhost)" },
}

export function LoginForm() {
  const { login } = useUser()
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      const userData = passwords[password]
      if (userData) {
        login(userData.name, userData.role)
        toast({ title: `Welcome, ${userData.name}!` })
      } else {
        toast({ title: "Login Failed", description: "Incorrect password.", variant: "destructive" })
      }
      setIsLoading(false)
    }, 500)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <KlynnLogo className="h-10 mb-8" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>KlynnPartners Login</CardTitle>
          <CardDescription>Enter your assigned passcode to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-klynn-blue hover:bg-klynn-blue/90" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
