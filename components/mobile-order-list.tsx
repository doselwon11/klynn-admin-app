"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Search,
  PackageX,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Clock,
  Copy,
  Navigation,
  MessageCircle,
  Printer,
  Truck,
  Loader2,
  DollarSign,
  Users,
  MapPinned,
  IdCard,
  CreditCard,
  Bike,
  FileText,
  Edit,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Order } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/hooks/use-user"
import { updateOrderStatusWithNotification } from "@/lib/operations"
import { maskPhoneNumber, formatPhoneForWhatsApp } from "@/lib/client-utils"
import { EditRiderFieldsDialog } from "./edit-rider-fields-dialog"

interface MobileOrderItemProps {
  order: Order
  onStatusChange: () => void
}

function MobileOrderItem({ order, onStatusChange }: MobileOrderItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isRiderDialogOpen, setIsRiderDialogOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useUser()

  const handleExportAWB = async () => {
    setIsGeneratingPdf(true)
    try {
      const { generatePdf } = await import("@/lib/pdf-generator")
      await generatePdf(order)
      toast({
        title: "✅ PDF Generated Successfully",
        description: `AWB label for Order ${order.id} has been downloaded.`,
      })
    } catch (error) {
      console.error("PDF generation error:", error)
      toast({
        title: "❌ PDF Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleConfirmPickup = async () => {
    setIsUpdatingStatus(true)

    try {
      console.log("🚚 Confirming pickup for order:", order.id, "Row:", order.rowNum)

      // Call the database update function with proper error handling
      const result = await updateOrderStatusWithNotification(order.id, "picked-up")

      if (result.success) {
        toast({
          title: "✅ Pickup Confirmed",
          description: `Order ${order.id} status updated to picked-up in database.`,
        })

        // Trigger immediate refresh
        onStatusChange()
      } else {
        throw new Error(result.message || "Failed to update database")
      }
    } catch (error) {
      console.error("❌ Pickup confirmation error:", error)
      toast({
        title: "❌ Update Failed",
        description: error instanceof Error ? error.message : "Could not update order status in database.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(order.pickupAddress || '')
    toast({
      title: "📍 Address Copied",
      description: "Pickup address copied to clipboard for navigation.",
    })
  }

  const handleNavigation = (app: string) => {
    const encodedAddress = encodeURIComponent(order.pickupAddress || '')
    let url = ""

    switch (app) {
      case "gmaps":
        url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
        break
      case "waze":
        url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`
        break
      case "apple":
        url = `http://maps.apple.com/?q=${encodedAddress}`
        break
      case "native":
        url = `geo:0,0?q=${encodedAddress}`
        break
      default:
        return
    }

    try {
      window.open(url, "_blank")
      toast({
        title: "🗺️ Navigation Opened",
        description: `Opening ${app === "gmaps" ? "Google Maps" : app === "waze" ? "Waze" : app === "apple" ? "Apple Maps" : "default map app"}...`,
      })
    } catch (error) {
      handleCopyAddress()
      toast({
        title: "📍 Address Copied Instead",
        description: "Could not open map app, address copied to clipboard.",
        variant: "destructive",
      })
    }
  }

  const handleChatCustomer = () => {
    const customerPhone = formatPhoneForWhatsApp(order.customer?.phone || '')
    const message = `Hi ${order.customer?.name || 'Customer'}, I'm from Klynn Laundry. Could you please send me your pickup location here? It will make it easier for me to come and pick it up.`
    const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`

    try {
      window.open(whatsappUrl, "_blank")
      toast({
        title: "💬 Chat Opened",
        description: `Opening WhatsApp chat with ${order.customer?.name || 'Customer'}...`,
      })
    } catch (error) {
      toast({
        title: "❌ Chat Failed",
        description: "Could not open WhatsApp. Please try again.",
        variant: "destructive",
      })
    }
  }

  const statusColors: { [key: string]: string } = {
    processing: "bg-gray-100 text-gray-800",
    approved: "bg-blue-100 text-blue-800",
    "picked-up": "bg-purple-100 text-purple-800",
    "at-laundry": "bg-indigo-100 text-indigo-800",
    "out-for-delivery": "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    cancel: "bg-red-100 text-red-800",
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <button className="w-full text-left p-3 flex items-center" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-gray-800">{order.id}</p>
              {order.assignedVendor && order.status !== "processing" && (
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: order.vendorColor }}
                    title={`Assigned to ${order.assignedVendor}`}
                  />
                  <span className="text-xs text-gray-500 truncate max-w-20">{order.assignedVendor}</span>
                </div>
              )}
              {order.status === "processing" && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600">Pending</span>
                </div>
              )}
            </div>
            <Badge className={cn("capitalize text-xs", statusColors[order.status] || "bg-gray-100")}>
              {order.status.replace("-", " ")}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 truncate">{order.customer?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500 truncate">{order.pickupAddress}</p>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 ml-2 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 ml-2 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 border-t pt-3">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="truncate">{order.customer?.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="truncate">{maskPhoneNumber(order.customer?.phone || '')}</span>
            </div>

            {/* Enhanced Address Section */}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block mb-2 text-sm break-words">{order.pickupAddress}</span>

                {/* Mobile Navigation Controls - Fixed Layout */}
                {(user?.role === "rider" || user?.role === "superhost") && (
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyAddress()
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          Navigate
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNavigation("gmaps")
                          }}
                          className="cursor-pointer text-xs"
                        >
                          Google Maps
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNavigation("waze")
                          }}
                          className="cursor-pointer text-xs"
                        >
                          Waze
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNavigation("apple")
                          }}
                          className="cursor-pointer text-xs"
                        >
                          Apple Maps
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleChatCustomer()
                      }}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Chat
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="truncate">{order.pickupDate}</span>
            </div>

            {order.assignedVendor && order.status !== "processing" && (
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0"
                    style={{ backgroundColor: order.vendorColor }}
                  />
                  <span className="truncate">
                    Assigned to <strong>{order.assignedVendor}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Order Details Section - Show additional fields for superhost on mobile */}
            {user?.role === "superhost" && (
              <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-800">Order & Rider Details</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                    onClick={() => setIsRiderDialogOpen(true)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit Rider
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {/* Price */}
                  {order.price && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-green-600" />
                      <span className="text-gray-500">Price:</span>
                      <span className="font-medium text-green-600">RM {order.price.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Order Type */}
                  {order.orderType && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium">{order.orderType}</span>
                    </div>
                  )}

                  {/* SA Rider */}
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">SA:</span>
                    <span className="font-medium truncate">{order.saRiderName || "-"}</span>
                  </div>

                  {/* RD Rider */}
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">RD:</span>
                    <span className="font-medium truncate">{order.rdRiderName || "-"}</span>
                  </div>

                  {/* Region */}
                  <div className="flex items-center gap-1">
                    <MapPinned className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">Region:</span>
                    <span className="font-medium truncate">{order.region || "-"}</span>
                  </div>

                  {/* Payout */}
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">Payout:</span>
                    <span className="font-medium text-green-600">
                      {order.riderPayout ? `RM ${order.riderPayout.toFixed(2)}` : "-"}
                    </span>
                  </div>

                  {/* Identity */}
                  {order.identity && (
                    <div className="col-span-2 flex items-center gap-1">
                      <IdCard className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">Identity:</span>
                      <span className="font-medium">{order.identity}</span>
                    </div>
                  )}

                  {/* Claim Status */}
                  {order.claimStatus && (
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-gray-500">Claim:</span>
                      <Badge variant="outline" className="text-xs h-4">{order.claimStatus}</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Rider View for Approved Orders */}
            {user?.role === "rider" && order.status === "approved" && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800">Ready for Pickup</span>
                </div>

                {order.assignedVendor ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: order.vendorColor }}
                      />
                      <span className="text-xs font-medium text-gray-800">
                        Deliver to: <strong>{order.assignedVendor}</strong>
                      </span>
                    </div>
                    <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                      💡 Use navigation above, then generate AWB and confirm pickup
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                    ⏳ Vendor assignment in progress...
                  </div>
                )}
              </div>
            )}

            {/* Processing order notice */}
            {order.status === "processing" && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                <Clock className="w-3 h-3 inline mr-1" />
                Order is being processed. Vendor will be assigned automatically once approved.
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed Layout */}
          {user?.role === "rider" && order.status === "approved" && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white h-9 text-xs"
                  onClick={handleExportAWB}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Printer className="w-3 h-3 mr-1" />
                  )}
                  <span className="truncate">{isGeneratingPdf ? "Generating..." : "Export AWB"}</span>
                </Button>
                <Button
                  size="sm"
                  className="bg-klynn-blue hover:bg-klynn-blue/90 h-9 text-xs"
                  onClick={handleConfirmPickup}
                  disabled={isUpdatingStatus || !order.assignedVendor}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Truck className="w-3 h-3 mr-1" />
                  )}
                  <span className="truncate">{isUpdatingStatus ? "Updating..." : "Confirm Pickup"}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Rider Fields Dialog for Superhost */}
      {user?.role === "superhost" && (
        <EditRiderFieldsDialog
          isOpen={isRiderDialogOpen}
          setIsOpen={setIsRiderDialogOpen}
          order={order}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  )
}

interface MobileOrderListProps {
  orders: Order[]
  onStatusChange?: () => void
}

export function MobileOrderList({ orders, onStatusChange = () => {} }: MobileOrderListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const { user } = useUser()

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.phone?.includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.assignedVendor && order.assignedVendor.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [orders, searchTerm])

  return (
    <div className="p-3 space-y-3 pb-20">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search orders..."
          className="pl-9 bg-white text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {user?.role === "rider" && (
        <div className="text-xs text-gray-600 bg-green-50 p-2 rounded-lg">
          <p className="font-semibold">🚚 Mobile Rider Navigation</p>
          <p>• Tap orders to expand • Use Copy/Navigate for directions • Generate AWB before pickup</p>
        </div>
      )}

      {filteredOrders.length > 0 ? (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <MobileOrderItem key={order.id} order={order} onStatusChange={onStatusChange} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <PackageX className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No orders found</h3>
          <p className="text-sm">No orders match the current search criteria.</p>
        </div>
      )}
    </div>
  )
}
