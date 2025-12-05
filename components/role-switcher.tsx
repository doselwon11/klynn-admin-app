"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { useToast } from "./ui/use-toast"
import type { UserRole } from "@/context/user-provider"
import { Shield, Truck, Building2, AlertTriangle } from "lucide-react"

interface RoleSwitcherProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const roleConfig = {
  superhost: {
    name: "Superhost",
    icon: Shield,
    color: "bg-red-100 text-red-800",
    description: "Full access to all operations and analytics",
  },
  vendor: {
    name: "Vendor",
    icon: Building2,
    color: "bg-blue-100 text-blue-800",
    description: "Process orders and manage laundry operations",
  },
  rider: {
    name: "Rider",
    icon: Truck,
    color: "bg-green-100 text-green-800",
    description: "Handle pickups and deliveries",
  },
}

export function RoleSwitcher({ isOpen, setIsOpen }: RoleSwitcherProps) {
  const { user, switchRole } = useUser()
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!user) return null

  const currentRole = user.role
  const originalRole = user.originalRole || user.role

  // This component should only be accessible to original superhosts
  if (originalRole !== "superhost") {
    return null
  }

  const handleRoleSelect = (role: UserRole) => {
    if (role === currentRole) {
      setIsOpen(false)
      return
    }

    setSelectedRole(role)
    handleRoleSwitch(role)
  }

  const handleRoleSwitch = (role: UserRole) => {
    setIsLoading(true)

    setTimeout(() => {
      switchRole(role)
      toast({
        title: "Role Switched",
        description: `You are now operating as ${roleConfig[role].name}.`,
      })

      setIsOpen(false)
      setSelectedRole(null)
      setIsLoading(false)

      // Refresh the page to update the UI
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }, 500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Superhost Role Management
          </DialogTitle>
          <DialogDescription>
            Switch between roles to test different user experiences and access levels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Superhost Privilege Notice */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Superhost Privileges</p>
                <p className="text-xs text-red-600 mt-1">
                  You can switch to any role instantly. This feature is only available to original superhost accounts.
                </p>
              </div>
            </div>
          </div>

          {/* Current Role Display */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Current Role:</p>
            <div className="flex items-center gap-3">
              {(() => {
                const CurrentIcon = roleConfig[currentRole].icon
                return <CurrentIcon className="h-5 w-5" />
              })()}
              <div>
                <Badge className={roleConfig[currentRole].color}>{roleConfig[currentRole].name}</Badge>
                <p className="text-xs text-gray-500 mt-1">{roleConfig[currentRole].description}</p>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Switch to:</p>
            {(Object.keys(roleConfig) as UserRole[]).map((role) => {
              const config = roleConfig[role]
              const Icon = config.icon
              const isCurrentRole = role === currentRole
              const isDisabled = isCurrentRole

              return (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  disabled={isDisabled || isLoading}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    isCurrentRole
                      ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                      : "bg-white border-gray-200 hover:border-klynn-blue hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}>{config.name}</Badge>
                        {isCurrentRole && <Badge variant="outline">Current</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
