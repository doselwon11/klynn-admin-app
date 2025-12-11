"use client"

import { useState, useContext, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { UserContext } from "@/context/user-provider"
import { updateOrderStatusWithNotification, updateOrderPrice } from "@/lib/operations"
import { getVendors, type Vendor } from "@/lib/vendors"
import { assignVendor } from "@/lib/operations"
import {
  MapPin,
  Phone,
  MessageCircle,
  Calendar,
  Package,
  Building2,
  DollarSign,
  Save,
  X,
  AlertCircle,
  Navigation,
} from "lucide-react"
import type { Order } from "@/lib/data"

interface OrderPopupProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

// Status options based on user role
const getStatusOptions = (userRole: string) => {
  const baseStatuses = [
    { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    { value: "approved", label: "Approved", color: "bg-blue-100 text-blue-800" },
    { value: "picked-up", label: "Picked Up", color: "bg-purple-100 text-purple-800" },
    { value: "processing", label: "Processing", color: "bg-cyan-100 text-cyan-800" },
    { value: "at-laundry", label: "At Laundry", color: "bg-cyan-100 text-cyan-800" },
    { value: "out-for-delivery", label: "Out for Delivery", color: "bg-green-100 text-green-800" },
    { value: "delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-800" },
    { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  ]

  switch (userRole) {
    case "rider":
      return baseStatuses.filter((s) => ["picked-up", "out-for-delivery", "delivered"].includes(s.value))
    case "vendor":
      return baseStatuses.filter((s) => ["processing", "at-laundry", "out-for-delivery"].includes(s.value))
    case "superhost":
    default:
      return baseStatuses
  }
}

// Format phone number for display (keep + for display)
const formatPhoneForDisplay = (phone: string): string => {
  return phone // Already formatted in data layer
}

// Format phone number for WhatsApp (remove + and spaces)
const formatPhoneForWhatsApp = (phone: string): string => {
  return phone.replace(/[^\d]/g, "")
}

export function OrderPopup({ order, isOpen, onClose, onUpdate }: OrderPopupProps) {
  const userContext = useContext(UserContext)
  const [isUpdating, setIsUpdating] = useState(false)
  const [formData, setFormData] = useState({
    status: "",
    vendor: "",
    price: "",
    notes: "",
  })
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoadingVendors, setIsLoadingVendors] = useState(false)

  const statusOptions = getStatusOptions(userContext?.user?.role || "")

  useEffect(() => {
    if (order) {
      setFormData({
        status: order.status || "",
        vendor: order.assignedVendor || "",
        price: order.price?.toString() || "",
        notes: "",
      })
    }
  }, [order])

  // Fetch vendors for superhost
  useEffect(() => {
    if (userContext?.user?.role === "superhost" && isOpen) {
      setIsLoadingVendors(true)
      getVendors()
        .then((vendorList) => {
          setVendors(vendorList)
          console.log("📋 Loaded vendors for dropdown:", vendorList.length)
        })
        .catch((error) => {
          console.error("❌ Failed to load vendors:", error)
        })
        .finally(() => {
          setIsLoadingVendors(false)
        })
    }
  }, [userContext?.user?.role, isOpen])

  if (!userContext?.user || !order) return null

  const { user } = userContext

  const handleUpdate = async () => {


    setIsUpdating(true)
    try {
      const updates: Record<string, string> = {}
      let hasVendorChange = false

      if (formData.status !== order.status) {
        updates.status = formData.status
      }

      if (user.role === "superhost") {
        // Handle vendor assignment separately using the dedicated operation
        if (formData.vendor !== (order.assignedVendor || "")) {
          hasVendorChange = true
        }

        if (formData.price !== (order.price?.toString() || "")) {
          updates.price = formData.price
        }
      }

      // Handle vendor assignment first if changed
      if (hasVendorChange) {
        console.log("🏭 Assigning vendor:", formData.vendor, "to order:", order.id)
        const vendorResult = await assignVendor(order.id, formData.vendor)
        if (!vendorResult.success) {
          alert(`Failed to assign vendor: ${vendorResult.message}`)
          setIsUpdating(false)
          return
        }
      }

      // Handle status update
      if (updates.status) {
        console.log("🔄 Updating status:", order.id, "New status:", updates.status)
        const statusResult = await updateOrderStatusWithNotification(order.id, updates.status)
        if (!statusResult.success) {
          alert(`Failed to update status: ${statusResult.message}`)
          setIsUpdating(false)
          return
        }
      }

      // Handle price update
      if (updates.price) {
        console.log("💰 Updating price:", order.id, "New price:", updates.price)
        const priceResult = await updateOrderPrice(order.id, updates.price)
        if (!priceResult.success) {
          alert(`Failed to update price: ${priceResult.message}`)
          setIsUpdating(false)
          return
        }
      }

      if (Object.keys(updates).length === 0 && !hasVendorChange) {
        alert("No changes to update")
        setIsUpdating(false)
        return
      }

      console.log("✅ Order updated successfully")
      onUpdate()
      onClose()
    } catch (error) {
      console.error("❌ Error updating order:", error)
      alert("Error updating order. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  // Create WhatsApp message
  const whatsappPhone = formatPhoneForWhatsApp(order.customer?.phone || '')
  const whatsappMessage = `Hi ${order.customer?.name || 'Customer'}, this is Klynn Partners regarding your laundry order ${order.id}. Thank you!`
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`

  // Get current status color
  const currentStatus = statusOptions.find((s) => s.value === order.status)
  const statusColor = currentStatus?.color || "bg-gray-100 text-gray-800"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Header */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{order.customer?.name || 'Unknown'}</h3>
              <Badge className={statusColor}>{order.status}</Badge>
            </div>
            <p className="text-sm text-gray-600 font-mono mb-1">{order.id}</p>
            <p className="text-sm text-gray-600">{formatPhoneForDisplay(order.customer?.phone || '')}</p>
          </div>

          {/* Order Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Pickup Address</p>
                <p className="text-sm text-gray-600">{order.pickupAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Pickup Date</p>
                <p className="text-sm text-gray-600">{order.pickupDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Service</p>
                <p className="text-sm text-gray-600">{order.service || "Standard Wash"}</p>
              </div>
            </div>

            {order.assignedVendor && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Assigned Vendor</p>
                  <p className="text-sm text-green-700 font-medium">{order.assignedVendor}</p>
                </div>
              </div>
            )}

            {order.price && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Price</p>
                  <p className="text-sm text-gray-600">RM {order.price.toFixed(2)}</p>
                </div>
              </div>
            )}

            {order.coordinates && (
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">GPS Coordinates</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {order.coordinates[0].toFixed(6)}, {order.coordinates[1].toFixed(6)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`tel:${order.customer?.phone}`, "_self")}
              className="text-sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(whatsappUrl, "_blank")}
              className="text-sm bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          {/* Update Form */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Update Order
            </h4>

            {/* Status Update */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color.split(" ")[0].replace("bg-", "bg-")}`} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Superhost-only fields */}
            {user.role === "superhost" && (
              <>
                <div>
                  <Label htmlFor="vendor" className="text-sm font-medium">
                    Assigned Vendor
                  </Label>
                  {isLoadingVendors ? (
                    <div className="mt-1 p-2 border rounded-md bg-gray-50 text-sm text-gray-500">
                      Loading vendors...
                    </div>
                  ) : (
                    <Select
                      value={formData.vendor}
                      onValueChange={(value) => setFormData({ ...formData, vendor: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No vendor assigned</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={`${vendor.name}-${vendor.area}`} value={vendor.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{vendor.name}</span>
                              <span className="text-xs text-gray-500">
                                {vendor.area} • RM{vendor.ratePerKg}/kg
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="price" className="text-sm font-medium">
                    Price (RM)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent" disabled={isUpdating}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="flex-1" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update
                </>
              )}
            </Button>
          </div>

          {/* Role-based info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium text-sm">
                {user.role === "superhost"
                  ? "Superhost Access"
                  : user.role === "rider"
                    ? "Rider Access"
                    : "Vendor Access"}
              </span>
            </div>
            <p className="text-xs text-blue-700">
              {user.role === "superhost"
                ? "Full access to all order fields and vendor assignment."
                : user.role === "rider"
                  ? "Can update delivery-related statuses only."
                  : "Can update processing-related statuses only."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
