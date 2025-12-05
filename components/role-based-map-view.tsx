"use client"

import { useState } from "react"
import { EnhancedMapView } from "@/components/enhanced-map-view"
import { MobileOrderList } from "@/components/mobile-order-list"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Eye, EyeOff, Users, Building2, Truck } from "lucide-react"
import { UserContext } from "@/context/user-provider"
import { useContext } from "react"
import type { Order } from "@/lib/data"
import type { Vendor } from "@/lib/vendors"

interface RoleBasedMapViewProps {
  orders: Order[]
  vendors: Vendor[]
  selectedArea: string
  onOrderUpdate: () => void
  onRouteOptimize?: () => void
  viewMode: "list" | "map"
  userLocation?: [number, number] | null
}

// Role-based filtering functions
const filterOrdersByRole = (orders: Order[], userRole: string, userName: string): Order[] => {
  switch (userRole) {
    case "superhost":
      // Superhost sees all orders
      return orders

    case "rider":
      // Rider sees orders in delivery phase or assigned to them
      return orders.filter((order) => {
        const deliveryStatuses = ["picked-up", "out-for-delivery", "delivered"]
        const isInDeliveryPhase = deliveryStatuses.includes(order.status.toLowerCase())
        const isAssignedToRider = order.assignedRider === userName
        return isInDeliveryPhase || isAssignedToRider
      })

    case "vendor":
      // Vendor sees only orders assigned to their vendor
      return orders.filter((order) => {
        return order.assignedVendor === userName
      })

    default:
      return []
  }
}

const filterVendorsByRole = (vendors: Vendor[], userRole: string, userName: string): Vendor[] => {
  switch (userRole) {
    case "superhost":
      // Superhost sees all vendors
      return vendors

    case "rider":
      // Rider sees no vendors (they don't need vendor info)
      return []

    case "vendor":
      // Vendor sees only their own vendor info
      return vendors.filter((vendor) => vendor.name === userName)

    default:
      return []
  }
}

// Role-based permissions
const getRolePermissions = (userRole: string) => {
  switch (userRole) {
    case "superhost":
      return {
        canAssignVendors: true,
        canUpdateAllStatuses: true,
        canViewAllOrders: true,
        canOptimizeRoutes: true,
        canViewVendors: true,
        allowedStatuses: [
          "pending",
          "approved",
          "picked-up",
          "processing",
          "at-laundry",
          "out-for-delivery",
          "delivered",
          "cancelled",
        ],
      }

    case "rider":
      return {
        canAssignVendors: false,
        canUpdateAllStatuses: false,
        canViewAllOrders: false,
        canOptimizeRoutes: true, // For their own routes
        canViewVendors: false,
        allowedStatuses: ["picked-up", "out-for-delivery", "delivered"],
      }

    case "vendor":
      return {
        canAssignVendors: false,
        canUpdateAllStatuses: false,
        canViewAllOrders: false,
        canOptimizeRoutes: false,
        canViewVendors: false,
        allowedStatuses: ["approved", "processing", "at-laundry", "ready-for-pickup"],
      }

    default:
      return {
        canAssignVendors: false,
        canUpdateAllStatuses: false,
        canViewAllOrders: false,
        canOptimizeRoutes: false,
        canViewVendors: false,
        allowedStatuses: [],
      }
  }
}

export function RoleBasedMapView({
  orders,
  vendors,
  selectedArea,
  onOrderUpdate,
  onRouteOptimize,
  viewMode,
  userLocation,
}: RoleBasedMapViewProps) {
  const userContext = useContext(UserContext)
  const [showRoleInfo, setShowRoleInfo] = useState(false)

  if (!userContext?.user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">Please log in to access the map.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { user } = userContext
  const permissions = getRolePermissions(user.role)
  const filteredOrders = filterOrdersByRole(orders, user.role, user.name)
  const filteredVendors = filterVendorsByRole(vendors, user.role, user.name)

  // Role-specific styling
  const getRoleColor = (role: string) => {
    switch (role) {
      case "superhost":
        return "bg-purple-600"
      case "rider":
        return "bg-blue-600"
      case "vendor":
        return "bg-green-600"
      default:
        return "bg-gray-600"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superhost":
        return <Shield className="w-4 h-4" />
      case "rider":
        return <Truck className="w-4 h-4" />
      case "vendor":
        return <Building2 className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Role-based Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`${getRoleColor(user.role)} text-white px-3 py-1`}>
            {getRoleIcon(user.role)}
            <span className="ml-2 capitalize">{user.role}</span>
          </Badge>
          <div>
            <h2 className="font-semibold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-600">
              {filteredOrders.length} orders • {filteredVendors.length} vendors
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRoleInfo(!showRoleInfo)}
          className="flex items-center gap-2"
        >
          {showRoleInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showRoleInfo ? "Hide" : "Show"} Permissions
        </Button>
      </div>

      {/* Role Permissions Info */}
      {showRoleInfo && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">👁️ Viewing Access</h4>
                <div className="space-y-1">
                  <div
                    className={`flex items-center ${permissions.canViewAllOrders ? "text-green-700" : "text-red-700"}`}
                  >
                    {permissions.canViewAllOrders ? "✅" : "❌"} View all orders
                  </div>
                  <div
                    className={`flex items-center ${permissions.canViewVendors ? "text-green-700" : "text-red-700"}`}
                  >
                    {permissions.canViewVendors ? "✅" : "❌"} View vendors
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">⚙️ Management Access</h4>
                <div className="space-y-1">
                  <div
                    className={`flex items-center ${permissions.canAssignVendors ? "text-green-700" : "text-red-700"}`}
                  >
                    {permissions.canAssignVendors ? "✅" : "❌"} Assign vendors
                  </div>
                  <div
                    className={`flex items-center ${permissions.canOptimizeRoutes ? "text-green-700" : "text-red-700"}`}
                  >
                    {permissions.canOptimizeRoutes ? "✅" : "❌"} Route optimization
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">📊 Status Updates</h4>
                <div className="flex flex-wrap gap-1">
                  {permissions.allowedStatuses.map((status) => (
                    <Badge key={status} variant="outline" className="text-xs">
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "map" ? (
          <EnhancedMapView
            orders={filteredOrders}
            selectedArea={selectedArea}
            onOrderUpdate={onOrderUpdate}
            onRouteOptimize={permissions.canOptimizeRoutes ? onRouteOptimize : undefined}
            userRole={user.role}
            userPermissions={permissions}
          />
        ) : (
          <MobileOrderList
            orders={filteredOrders}
            vendors={filteredVendors}
            onOrderClick={() => {}} // Handle order click
            selectedArea={selectedArea}
            userLocation={userLocation}
            userRole={user.role}
            userPermissions={permissions}
          />
        )}
      </div>

      {/* Role-specific Footer Info */}
      <div className="bg-gray-50 border-t p-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>📍 Area: {selectedArea}</span>
            <span>📋 {filteredOrders.length} orders visible</span>
            {permissions.canViewVendors && <span>🏭 {filteredVendors.length} vendors</span>}
          </div>
          <div className="text-xs">
            Role: <span className="font-medium capitalize">{user.role}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
