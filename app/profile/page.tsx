"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, MapPin, LogOut, ArrowUpDown, Shield, Building2, Truck, Info, RefreshCw, Download } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { RoleSwitcher } from "@/components/role-switcher"
import { useToast } from "@/components/ui/use-toast"

export default function ProfilePage() {
  const { user, logout } = useUser()
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const roleConfig = {
    superhost: { name: "Superhost", icon: Shield, color: "bg-red-100 text-red-800" },
    vendor: { name: "Vendor", icon: Building2, color: "bg-blue-100 text-blue-800" },
    rider: { name: "Rider", icon: Truck, color: "bg-green-100 text-green-800" },
  }

  const currentRoleConfig = user?.role ? roleConfig[user.role] : null
  const originalRole = user?.originalRole || user?.role
  const hasRoleSwitched = user?.role !== originalRole

  // Only show role management for users who originally logged in as superhost
  const canManageRoles = originalRole === "superhost"

  const handleAppUpdate = async () => {
    setIsUpdating(true)

    try {
      toast({
        title: "🔄 Updating KlynnPartners App...",
        description: "Clearing cache and fetching latest version...",
      })

      // Clear all caches for fresh content
      if ("caches" in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
      }

      // Clear localStorage except user data
      const userData = localStorage.getItem("klynnUser")
      localStorage.clear()
      if (userData) {
        localStorage.setItem("klynnUser", userData)
      }

      // Clear sessionStorage
      sessionStorage.clear()

      toast({
        title: "✅ App Updated Successfully",
        description: "Reloading with latest bug fixes and improvements...",
      })

      // Force reload from server (bypass all caches)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("App update failed:", error)
      toast({
        title: "❌ Update Failed",
        description: "Could not update app. Please refresh manually.",
        variant: "destructive",
      })
      setIsUpdating(false)
    }
  }

  const getAppVersion = () => {
    // Get current date as version indicator
    const buildTime = new Date().toISOString().split("T")[0]
    return `v2024.${buildTime.replace(/-/g, "")}`
  }

  return (
    <>
      {canManageRoles && <RoleSwitcher isOpen={showRoleSwitcher} setIsOpen={setShowRoleSwitcher} />}

      <div className="flex flex-col h-full">
        <Header title="Profile" />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span>{user?.name || "Klynn User"}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  {currentRoleConfig && (
                    <>
                      <currentRoleConfig.icon className="w-4 h-4" />
                      <Badge className={currentRoleConfig.color}>{currentRoleConfig.name}</Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Show role switching status only for superhosts */}
              {canManageRoles && hasRoleSwitched && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Role Switch Active:</strong> You originally logged in as{" "}
                        <Badge variant="outline" className="ml-1">
                          {originalRole ? roleConfig[originalRole].name : "Unknown"}
                        </Badge>
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Currently operating with {currentRoleConfig?.name} permissions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show access level info for non-superhosts */}
              {!canManageRoles && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">
                        <strong>Access Level:</strong> {currentRoleConfig?.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        You have {currentRoleConfig?.name.toLowerCase()} permissions for Klynn operations.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* App Update Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-klynn-blue" />
                Update KlynnPartners App
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Current Version</p>
                  <p className="text-xs text-gray-600">{getAppVersion()}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  PWA
                </Badge>
              </div>

              <div className="p-3 bg-klynn-blue/10 border border-klynn-blue/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-klynn-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-klynn-blue">Get Latest Updates</p>
                    <p className="text-xs text-klynn-blue/80 mt-1">
                      Update to get the latest bug fixes, performance improvements, and new features for Klynn
                      operations.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAppUpdate}
                disabled={isUpdating}
                className="w-full justify-start gap-3 bg-klynn-blue hover:bg-klynn-blue/90"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Updating App...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Update App Now</span>
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <strong>What this update does:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Clears cached data for fresh content</li>
                  <li>Downloads latest app improvements</li>
                  <li>Preserves your login session</li>
                  <li>Ensures optimal Klynn operations</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Role Management - Only for Original Superhosts */}
          {canManageRoles && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Superhost Role Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Superhost Privileges:</strong> You can switch between roles to test different user
                    experiences and access levels.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 bg-white border-red-200 hover:bg-red-50"
                  onClick={() => setShowRoleSwitcher(true)}
                >
                  <ArrowUpDown className="w-5 h-5" />
                  <span>Switch Role</span>
                </Button>

                {hasRoleSwitched && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRoleSwitcher(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Return to Superhost Role
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full justify-start gap-3" onClick={logout}>
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
