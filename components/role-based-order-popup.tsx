"use client"

import { useState, useEffect, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Phone, MessageCircle, Navigation, Zap, Loader2, Shield, AlertTriangle } from "lucide-react"
import { UserContext } from "@/context/user-provider"
import type { Order } from "@/lib/data"
import type { Vendor } from "@/lib/vendors"
import { getVendors, findOptimalVendor, calculateDistance } from "@/lib/vendors"
import { updateOrderStatusWithNotification, assignVendor } from "@/lib/operations"

interface RoleBasedOrderPopupProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

// Role-based status options
const getStatusOptionsByRole = (userRole: string) => {
  switch (userRole) {
    case "superhost":
      return [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "picked-up", label: "Picked Up" },
        { value: "processing", label: "Processing" },
        { value: "at-laundry", label: "At Laundry" },
        { value: "out-for-delivery", label: "Out for Delivery" },
        { value: "delivered", label: "Delivered" },
        { value: "cancelled", label: "Cancelled" },
      ]

    case "rider":
      return [
        { value: "picked-up", label: "Picked Up" },
        { value: "out-for-delivery", label: "Out for Delivery" },
        { value: "delivered", label: "Delivered" },
      ]

    case "vendor":
      return [
        { value: "approved", label: "Approved" },
        { value: "processing", label: "Processing" },
        { value: "at-laundry", label: "At Laundry" },
        { value: "ready-for-pickup", label: "Ready for Pickup" },
      ]

    default:
      return []
  }
}

export function RoleBasedOrderPopup({ order, isOpen, onClose, onUpdate }: RoleBasedOrderPopupProps) {
  const userContext = useContext(UserContext)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>(order.assignedVendor || "Unassigned")
  const [selectedStatus, setSelectedStatus] = useState<string>(order.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [suggestedVendor, setSuggestedVendor] = useState<Vendor | null>(null)
  const [isLoadingVendors, setIsLoadingVendors] = useState(true)

  const [statusOptions, setStatusOptions] = useState<any[]>([])
  const [canAssignVendors, setCanAssignVendors] = useState(false)
  const [canUpdateStatus, setCanUpdateStatus] = useState(false)

  if (!userContext?.user) {
    return null
  }

  const { user } = userContext

  // Check if user has permission to view this order
  const hasOrderAccess = () => {
    switch (user.role) {
      case "superhost":
        return true
      case "rider":
        const deliveryStatuses = ["picked-up", "out-for-delivery", "delivered"]
        return deliveryStatuses.includes(order.status.toLowerCase()) || order.riderId === user.name || order.saRiderName === user.name || order.rdRiderName === user.name
      case "vendor":
        return order.assignedVendor === user.name
      default:
        return false
    }
  }

  // Load vendors (only for superhost)
  useEffect(() => {
    const loadVendors = async () => {
      if (user.role !== "superhost") {
        setIsLoadingVendors(false)
        return
      }

      try {
        setIsLoadingVendors(true)
        const vendorList = await getVendors()
        setVendors(vendorList)

        // Find optimal vendor suggestion
        if (order.coordinates && order.pickupAddress) {
          const postcode = order.pickupAddress.match(/\d{5}/)?.[0] || ""
          const optimal = findOptimalVendor(postcode, order.coordinates, order.service || "Standard Wash", vendorList)
          setSuggestedVendor(optimal)
        }
      } catch (error) {
        console.error("Failed to load vendors:", error)
      } finally {
        setIsLoadingVendors(false)
      }
    }

    if (isOpen) {
      loadVendors()
    }
  }, [order, isOpen])

  useEffect(() => {
    setStatusOptions(getStatusOptionsByRole(user.role))
    setCanAssignVendors(user.role === "superhost")
    setCanUpdateStatus(getStatusOptionsByRole(user.role).length > 0)
  }, [user.role])

  const handleAutoAssign = () => {
    if (suggestedVendor && canAssignVendors) {
      setSelectedVendor(suggestedVendor.name)
    }
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      const updates = []

      // Validate row number
      if (!order.rowNum || isNaN(order.rowNum)) {
        console.error("❌ Invalid row number:", order.rowNum)
        alert("Error: Invalid order row number. Cannot update database.")
        return
      }

      console.log(`🔄 ${user.role} updating order ${order.id} (Row ${order.rowNum})`)

      // Update vendor assignment if changed (superhost only)
      if (canAssignVendors && selectedVendor && selectedVendor !== order.assignedVendor) {
        console.log(`🏭 Assigning vendor: ${selectedVendor} to row ${order.rowNum}`)
        const vendorResult = await assignVendor(order.id, selectedVendor)
        updates.push(vendorResult)
        console.log(`🏭 Vendor assignment result:`, vendorResult)
      }

      // Update status if changed and user has permission
      if (canUpdateStatus && selectedStatus !== order.status) {
        console.log(`📊 Updating status: ${selectedStatus} for row ${order.rowNum}`)
        const statusResult = await updateOrderStatusWithNotification(order.id, selectedStatus)
        updates.push(statusResult)
        console.log(`📊 Status update result:`, statusResult)
      }

      // Check if all updates were successful
      const allSuccessful = updates.every((result) => result.success)

      if (allSuccessful && updates.length > 0) {
        console.log(`✅ Successfully updated order ${order.id}`)
        setTimeout(() => {
          onUpdate()
          onClose()
        }, 1000)
      } else if (updates.length === 0) {
        console.log(`ℹ️ No changes to update for order ${order.id}`)
        onClose()
      } else {
        console.error("❌ Some updates failed:", updates)
        alert("Some updates failed. Please try again.")
      }
    } catch (error) {
      console.error("Failed to update order:", error)
      alert("Failed to update order. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCall = () => {
    window.open(`tel:${order.customer?.phone}`, "_self")
  }

  const handleWhatsApp = () => {
    const message = `Hi ${order.customer?.name || 'Customer'}, this is Klynn Partners (${user.name}). We're updating you on your laundry order ${order.id}. Thank you!`
    const whatsappUrl = `https://wa.me/${order.customer?.phone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleNavigate = () => {
    if (order.coordinates) {
      const [lat, lng] = order.coordinates
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank")
    }
  }

  if (!isOpen) return null

  // Check access permission
  if (!hasOrderAccess()) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">You don't have permission to view this order.</p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header with Role Badge */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                📋 Order #{order.id}
                <Badge className="bg-white/20 text-white text-xs">{user.role.toUpperCase()}</Badge>
              </CardTitle>
              <p className="text-blue-100 text-sm">Row {order.rowNum}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 overflow-y-auto">
          {/* Customer Info */}
          <div className="mb-4">
            <h3 className="font-bold text-lg text-gray-900 mb-1">{order.customer?.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{order.customer?.phone}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{order.pickupAddress}</p>
            {order.coordinates && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                📍 {order.coordinates[0].toFixed(6)}, {order.coordinates[1].toFixed(6)}
              </p>
            )}
          </div>

          {/* Service & Date */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-700 font-medium">Service</div>
              <div className="text-sm font-bold text-blue-900">{order.service || "Standard Wash"}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-green-700 font-medium">Date</div>
              <div className="text-sm font-bold text-green-900">{order.pickupDate}</div>
            </div>
          </div>

          {/* Current Assignment Display */}
          {order.assignedVendor && (
            <div className="mb-4 bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-medium">Current Assignment</div>
              <div className="text-sm font-bold text-gray-900">🏭 {order.assignedVendor}</div>
            </div>
          )}

          {/* Vendor Assignment (Superhost Only) */}
          {canAssignVendors && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-900">🏭 Assign Vendor</label>
                {suggestedVendor && selectedVendor !== suggestedVendor.name && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoAssign}
                    className="h-7 text-xs bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    disabled={isLoadingVendors}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Auto-Assign
                  </Button>
                )}
              </div>

              {/* Loading State */}
              {isLoadingVendors && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 text-gray-400 mr-2 animate-spin" />
                    <span className="text-sm text-gray-600">Loading vendors...</span>
                  </div>
                </div>
              )}

              {/* Suggested Vendor */}
              {suggestedVendor && !isLoadingVendors && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center mb-2">
                    <Zap className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-sm font-semibold text-yellow-800">Smart Suggestion</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <strong>{suggestedVendor.name}</strong> - {suggestedVendor.area}
                    {order.coordinates && suggestedVendor.coordinates && (
                      <div className="text-xs mt-1">
                        📍 {calculateDistance(order.coordinates, suggestedVendor.coordinates).toFixed(1)} km away
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Select value={selectedVendor} onValueChange={setSelectedVendor} disabled={isLoadingVendors}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vendor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unassigned">No Vendor (Unassign)</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.name} value={vendor.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{vendor.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{vendor.area}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Update */}
          {canUpdateStatus && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-900 mb-2 block">📊 Update Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* No Permission Warning */}
          {!canUpdateStatus && !canAssignVendors && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-sm text-orange-800">
                  Limited access: You can view order details but cannot make changes.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={handleCall} className="h-10 bg-transparent">
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
              <Button variant="outline" onClick={handleWhatsApp} className="h-10 bg-transparent">
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={handleNavigate}
                className="h-10 bg-transparent"
                disabled={!order.coordinates}
              >
                <Navigation className="w-4 h-4 mr-1" />
                Navigate
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Close
              </Button>
              {(canUpdateStatus || canAssignVendors) && (
                <Button
                  onClick={handleUpdate}
                  disabled={isUpdating || isLoadingVendors}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Order"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
