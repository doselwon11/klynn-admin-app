"use client"

import { useState, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Printer,
  Search,
  PackageX,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Truck,
  Loader2,
  Settings,
  Building2,
  Clock,
  FileText,
  Copy,
  Navigation,
  MessageCircle,
  DollarSign,
  Users,
  MapPinned,
  IdCard,
  CreditCard,
  Bike,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { Order } from "@/lib/data"
import { maskPhoneNumber, cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/hooks/use-user"
import { EditStatusDialog } from "./edit-status-dialog"
import { EditRiderFieldsDialog } from "./edit-rider-fields-dialog"
import { SuperhostOrderActions } from "./superhost-order-actions"
import { AutoVendorAssignment } from "./auto-vendor-assignment"
import { VendorFilter } from "./vendor-filter"
import { QuotationGenerator } from "./quotation-generator"
import { updateOrderStatusWithNotification } from "@/lib/operations"

function OrderItem({
  order,
  isHistory,
  onStatusChange,
}: {
  order: Order
  isHistory?: boolean
  onStatusChange: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRiderDialogOpen, setIsRiderDialogOpen] = useState(false)
  const [showSuperhostActions, setShowSuperhostActions] = useState(false)
  const [showQuotationGenerator, setShowQuotationGenerator] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
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
        // Google Maps - works on all platforms
        url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
        break
      case "waze":
        // Waze - works on mobile and desktop
        url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`
        break
      case "apple":
        // Apple Maps - works on iOS/macOS
        url = `http://maps.apple.com/?q=${encodedAddress}`
        break
      case "native":
        // Generic geo: URL - opens default map app
        url = `geo:0,0?q=${encodedAddress}`
        break
      default:
        return
    }

    // Try to open the URL
    try {
      window.open(url, "_blank")
      toast({
        title: "🗺️ Navigation Opened",
        description: `Opening ${app === "gmaps" ? "Google Maps" : app === "waze" ? "Waze" : app === "apple" ? "Apple Maps" : "default map app"}...`,
      })
    } catch (error) {
      // Fallback to copying address if URL opening fails
      handleCopyAddress()
      toast({
        title: "📍 Address Copied Instead",
        description: "Could not open map app, address copied to clipboard.",
        variant: "destructive",
      })
    }
  }

  const handleChatCustomer = () => {
    const customerPhone = order.customer?.phone || ''

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
    cancel: "bg-red-100 text-red-800", // Support both variants
  }

  return (
    <>
      <div className="bg-white border rounded-lg shadow-sm">
        <button className="w-full text-left p-3 flex items-center" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-gray-800">{order.id}</p>
                {/* Vendor color indicator - only show for approved+ orders */}
                {order.assignedVendor && order.status !== "processing" && (
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: order.vendorColor }}
                      title={`Assigned to ${order.assignedVendor}`}
                    />
                    <span className="text-xs text-gray-500">{order.assignedVendor}</span>
                  </div>
                )}
                {/* Processing status indicator */}
                {order.status === "processing" && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-600">Awaiting approval</span>
                  </div>
                )}
              </div>
              <Badge className={cn("capitalize text-xs", statusColors[order.status] || "bg-gray-100")}>
                {order.status.replace("-", " ")}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{order.customer?.name || 'Unknown'}</p>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500 ml-2" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 ml-2" />
          )}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 border-t pt-3">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <span>{order.customer?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{maskPhoneNumber(order.customer?.phone || '')}</span>
              </div>

              {/* Enhanced Pickup Address Section - Available for both riders and superhosts */}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="block mb-2">{order.pickupAddress}</span>

                  {/* Navigation Controls - Available for both riders and superhosts */}
                  {(user?.role === "rider" || user?.role === "superhost") && (
                    <div className="flex flex-wrap gap-2">
                      {/* Copy Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyAddress()
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>

                      {/* Navigation Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Navigate
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNavigation("gmaps")
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                                <span className="text-white text-xs font-bold">G</span>
                              </div>
                              <span>Google Maps</span>
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNavigation("waze")
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                                <span className="text-white text-xs font-bold">W</span>
                              </div>
                              <span>Waze</span>
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNavigation("apple")
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-800 rounded-sm flex items-center justify-center">
                                <span className="text-white text-xs font-bold">🍎</span>
                              </div>
                              <span>Apple Maps</span>
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNavigation("native")
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-gray-600" />
                              <span>Default Map App</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Chat Button - Available for riders and superhosts */}
                      {(user?.role === "rider" || user?.role === "superhost") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleChatCustomer()
                          }}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{order.pickupDate}</span>
              </div>

              {/* Vendor assignment info - only show for approved+ orders */}
              {order.assignedVendor && order.status !== "processing" && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: order.vendorColor }}
                    />
                    <span>
                      Assigned to <strong>{order.assignedVendor}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Order Details Section - Show additional fields for superhost */}
              {user?.role === "superhost" && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-800">Order Details</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Order Type */}
                    {order.orderType && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Order Type:</span>
                        <span className="font-medium">{order.orderType}</span>
                      </div>
                    )}
                    
                    {/* Delivery Type */}
                    {order.deliveryType && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Delivery:</span>
                        <span className="font-medium">{order.deliveryType}</span>
                      </div>
                    )}
                    
                    {/* Price */}
                    {order.price && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="text-gray-500">Price:</span>
                        <span className="font-medium text-green-600">RM {order.price.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Extra Distance Fare */}
                    {order.extraDistanceFare !== undefined && order.extraDistanceFare > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Extra Distance:</span>
                        <span className="font-medium text-orange-600">RM {order.extraDistanceFare.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Rider Fee */}
                    {order.riderFee !== undefined && order.riderFee > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Rider Fee:</span>
                        <span className="font-medium">RM {order.riderFee.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Claim Status */}
                    {order.claimStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Claim:</span>
                        <Badge variant="outline" className="text-xs">{order.claimStatus}</Badge>
                      </div>
                    )}
                  </div>

                  {/* Rider Information Section */}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-800">Rider Information</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                        onClick={() => setIsRiderDialogOpen(true)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* SA Rider Name */}
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">SA Rider:</span>
                        <span className="font-medium">{order.saRiderName || "-"}</span>
                      </div>

                      {/* RD Rider Name */}
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">RD Rider:</span>
                        <span className="font-medium">{order.rdRiderName || "-"}</span>
                      </div>

                      {/* Rider ID */}
                      {order.riderId && (
                        <div className="flex items-center gap-2">
                          <IdCard className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-500">Rider ID:</span>
                          <span className="font-medium">{order.riderId}</span>
                        </div>
                      )}

                      {/* Region */}
                      <div className="flex items-center gap-2">
                        <MapPinned className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Region:</span>
                        <span className="font-medium">{order.region || "-"}</span>
                      </div>

                      {/* Identity */}
                      <div className="flex items-center gap-2">
                        <IdCard className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Identity:</span>
                        <span className="font-medium">{order.identity || "-"}</span>
                      </div>

                      {/* Rider Payout */}
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Payout:</span>
                        <span className="font-medium text-green-600">
                          {order.riderPayout ? `RM ${order.riderPayout.toFixed(2)}` : "-"}
                        </span>
                      </div>

                      {/* Combined Rider Name */}
                      {order.riderNamedCombined && (
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="text-gray-500">Combined:</span>
                          <span className="font-medium">{order.riderNamedCombined}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Rider View for Approved Orders */}
              {user?.role === "rider" && order.status === "approved" && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Ready for Pickup</span>
                  </div>

                  {order.assignedVendor ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: order.vendorColor }}
                        />
                        <span className="text-sm font-medium text-gray-800">
                          Deliver to: <strong>{order.assignedVendor}</strong>
                        </span>
                      </div>
                      <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        💡 Use navigation buttons above to get directions, then generate AWB and confirm pickup
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">
                      ⏳ Vendor assignment in progress...
                    </div>
                  )}
                </div>
              )}

              {/* Superhost Navigation Info */}
              {user?.role === "superhost" && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Superhost Navigation</span>
                  </div>
                  <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                    🗺️ Use navigation buttons above for site visits, inspections, or emergency pickups
                  </div>
                </div>
              )}
            </div>

            {/* Auto vendor assignment - only for approved orders */}
            {!isHistory && order.status === "approved" && (
              <div className="mt-3">
                <AutoVendorAssignment order={order} onUpdate={onStatusChange} />
              </div>
            )}

            {/* Processing order notice */}
            {!isHistory && order.status === "processing" && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                <Clock className="w-3 h-3 inline mr-1" />
                Order is being processed. Vendor will be assigned automatically once approved.
              </div>
            )}

            {/* Superhost Advanced Actions */}
            {user?.role === "superhost" && !isHistory && (
              <div className="mt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 bg-red-50 border-red-200 hover:bg-red-100"
                  onClick={() => setShowSuperhostActions(!showSuperhostActions)}
                >
                  <Settings className="w-4 h-4" />
                  {showSuperhostActions ? "Hide" : "Show"} Advanced Operations
                </Button>

                {showSuperhostActions && (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <SuperhostOrderActions order={order} onUpdate={onStatusChange} />
                  </div>
                )}
              </div>
            )}

            {!isHistory && (
              <div className="mt-4 space-y-2">
                {/* Superhost Quotation Button */}
                {user?.role === "superhost" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-klynn-blue/10 border-klynn-blue/20 hover:bg-klynn-blue/20"
                    onClick={() => setShowQuotationGenerator(true)}
                  >
                    <FileText className="w-4 h-4" />
                    Generate Quotation
                  </Button>
                )}

                <div className="flex gap-2">
                  {user?.role === "rider" && order.status === "approved" && (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 bg-white"
                        onClick={handleExportAWB}
                        disabled={isGeneratingPdf}
                      >
                        {isGeneratingPdf ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4 mr-2" />
                        )}
                        {isGeneratingPdf ? "Generating..." : "Export AWB"}
                      </Button>
                      <Button
                        className="flex-1 bg-klynn-blue hover:bg-klynn-blue/90"
                        onClick={handleConfirmPickup}
                        disabled={isUpdatingStatus || !order.assignedVendor}
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Truck className="w-4 h-4 mr-2" />
                        )}
                        {isUpdatingStatus ? "Updating..." : "Confirm Pickup"}
                      </Button>
                    </>
                  )}
                  {user?.role === "superhost" && !showSuperhostActions && (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        className="flex-1 bg-white"
                        onClick={handleExportAWB}
                        disabled={isGeneratingPdf}
                      >
                        {isGeneratingPdf ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4 mr-2" />
                        )}
                        {isGeneratingPdf ? "Generating..." : "Export AWB"}
                      </Button>
                      <Button className="flex-1" onClick={() => setIsDialogOpen(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Quick Edit Status
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {user?.role === "superhost" && (
        <>
          <EditStatusDialog
            isOpen={isDialogOpen}
            setIsOpen={setIsDialogOpen}
            order={order}
            onStatusChange={onStatusChange}
          />
          <EditRiderFieldsDialog
            isOpen={isRiderDialogOpen}
            setIsOpen={setIsRiderDialogOpen}
            order={order}
            onStatusChange={onStatusChange}
          />
          <QuotationGenerator isOpen={showQuotationGenerator} setIsOpen={setShowQuotationGenerator} order={order} />
        </>
      )}
    </>
  )
}

export function OrderList({
  orders,
  isHistory = false,
  onStatusChange = () => {},
}: {
  orders: Order[]
  isHistory?: boolean
  onStatusChange?: () => void
}) {
  // Add a key based on orders data to force re-render when data changes
  const ordersKey = useMemo(() => {
    return `${orders.length}-${orders.map((o) => `${o.id}-${o.status}-${o.assignedVendor || "none"}`).join("-")}`
  }, [orders])

  const [searchTerm, setSearchTerm] = useState("")
  const [filteredByVendor, setFilteredByVendor] = useState<Order[]>(orders)
  const { user } = useUser()

  // Use useCallback to prevent unnecessary re-renders
  const handleVendorFilterChange = useCallback((filteredOrders: Order[]) => {
    setFilteredByVendor(filteredOrders)
  }, [])

  const finalFilteredOrders = useMemo(() => {
    return filteredByVendor.filter(
      (order) =>
        order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.phone?.includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.assignedVendor && order.assignedVendor.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [filteredByVendor, searchTerm])

  // Filter orders for vendor filter (only approved+ orders have vendor assignments)
  const ordersWithVendors = useMemo(() => {
    return orders.filter((order) => order.status !== "processing")
  }, [orders])

  return (
    <div key={ordersKey} className="p-4 space-y-4 pb-20">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search by name, phone, order ID, or vendor..."
          className="pl-10 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Vendor Filter for Riders - only show if there are orders with vendors */}
      {user?.role === "rider" && !isHistory && ordersWithVendors.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <VendorFilter
            orders={ordersWithVendors}
            onFilterChange={handleVendorFilterChange}
            user={user}
            isHistory={isHistory}
          />
        </div>
      )}

      {user?.role === "superhost" && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p className="font-semibold">Superhost View: Showing all {orders.length} orders from Klynn Database</p>
          <p>
            Vendors are automatically assigned to orders when they reach "approved" status. Processing orders cannot
            have vendor assignments.
          </p>
          <p className="text-klynn-blue font-medium mt-1">
            💼 New: Generate professional quotations for any order using the "Generate Quotation" button
          </p>
          <p className="text-red-600 font-medium mt-1">
            🗺️ Navigation: Use Copy/Navigate buttons for site visits, inspections, or emergency pickups
          </p>
        </div>
      )}

      {user?.role === "rider" && !isHistory && (
        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
          <p className="font-semibold">🚚 Enhanced Rider Navigation</p>
          <div className="space-y-1 text-xs mt-1">
            <p>
              • <strong>Copy Address:</strong> One-tap copy for manual navigation
            </p>
            <p>
              • <strong>Navigate Button:</strong> Direct links to Google Maps, Waze, Apple Maps
            </p>
            <p>
              • <strong>Default Map App:</strong> Opens your phone's default navigation app
            </p>
            <p>
              • <strong>Color Coding:</strong> Vendor assignments with visual indicators
            </p>
          </div>
        </div>
      )}

      {finalFilteredOrders.length > 0 ? (
        <div className="space-y-2">
          {finalFilteredOrders.map((order) => (
            <OrderItem key={order.id} order={order} isHistory={isHistory} onStatusChange={onStatusChange} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <PackageX className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No orders found.</h3>
          <p>There are no orders matching the current criteria.</p>
        </div>
      )}
    </div>
  )
}
