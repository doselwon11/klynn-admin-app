"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, MapPin, Phone, MessageCircle, Eye, Navigation, Calendar, Package, Building2 } from "lucide-react"
import { MapView } from "@/components/map-view"
import { RouteOptimizer } from "@/components/route-optimizer"
import { OrderPopup } from "@/components/order-popup"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useUser } from "@/hooks/use-user"
import { useToast } from "@/components/ui/use-toast"
import { getOrders } from "@/lib/data"
import { calculateDistance } from "@/lib/client-utils"
import { openMapsNavigation } from "@/lib/navigation-utils"
import type { Order } from "@/lib/data"
import type { Vendor } from "@/lib/vendors"

// Area definitions - Updated with Selangor
const MOBILE_AREAS = {
  all: { name: "All", icon: "🌍", center: [4.2105, 101.9758], zoom: 6 },
  kl: { name: "KL", icon: "🏙️", center: [3.139, 101.6869], zoom: 11 },
  selangor: { name: "Selangor", icon: "🏢", center: [3.2, 101.5], zoom: 10 },
  langkawi: { name: "Langkawi", icon: "🏝️", center: [6.35, 99.8], zoom: 12 },
  penang: { name: "Penang", icon: "🌉", center: [5.4164, 100.3327], zoom: 11 },
  johor: { name: "Johor", icon: "🌴", center: [1.4927, 103.7414], zoom: 11 },
}

type AreaKey = keyof typeof MOBILE_AREAS

export default function MapPage() {
  const { user } = useUser()
  const [orders, setOrders] = useState<Order[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [selectedArea, setSelectedArea] = useState<AreaKey>("all")
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderPopup, setShowOrderPopup] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [sortBy, setSortBy] = useState<"date" | "distance" | "status">("date")
  const { toast } = useToast()

  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true)

      console.log("🔄 Fetching orders and vendors...")

      // Fetch orders using the correct function
      const ordersData = await getOrders(null)
      console.log(`✅ Loaded ${ordersData.length} orders`)

      // Fetch vendors
      const timestamp = new Date().getTime()
      const randomId = Math.random().toString(36).substring(7)

      const vendorsResponse = await fetch(`/api/vendors?t=${timestamp}&r=${randomId}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      let vendorsData: Vendor[] = []
      if (vendorsResponse.ok) {
        const vendorResult = await vendorsResponse.json()
        vendorsData = vendorResult.vendors || []
        console.log(`✅ Loaded ${vendorsData.length} vendors`)
      } else {
        console.warn("⚠️ Failed to fetch vendors, using empty array")
      }

      setOrders([])
      setVendors([])
      setTimeout(() => {
        setOrders(ordersData)
        setVendors(vendorsData)
      }, 10)

      setError(null)
      setLastRefresh(Date.now())
    } catch (err) {
      console.error("❌ Error fetching data:", err)
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.log("Location access denied:", error)
          setUserLocation([3.139, 101.6869])
        },
      )
    } else {
      setUserLocation([3.139, 101.6869])
    }
  }, [])

  useEffect(() => {
    if (!orders.length) {
      setFilteredOrders([])
      return
    }

    let filtered = orders

    // Filter for rider - only show approved orders
    if (user?.role === "rider") {
      filtered = filtered.filter((order) => order.status === "approved")
    }

    // Area filter - Updated with Selangor
    if (selectedArea !== "all") {
      filtered = filtered.filter((order) => {
        if (!order.coordinates) return false
        const [lat, lng] = order.coordinates

        switch (selectedArea) {
          case "kl":
            return lat >= 3.0 && lat <= 3.3 && lng >= 101.5 && lng <= 101.8
          case "selangor":
            return lat >= 3.0 && lat <= 3.5 && lng >= 101.3 && lng <= 101.8
          case "langkawi":
            return lat >= 6.2 && lat <= 6.5 && lng >= 99.6 && lng <= 100.0
          case "penang":
            return lat >= 5.2 && lat <= 5.6 && lng >= 100.1 && lng <= 100.5
          case "johor":
            return lat >= 1.3 && lat <= 1.7 && lng >= 103.5 && lng <= 104.0
          default:
            return true
        }
      })
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime()
        case "distance":
          if (!userLocation || !a.coordinates || !b.coordinates) return 0
          const distanceA = calculateDistance(userLocation, a.coordinates)
          const distanceB = calculateDistance(userLocation, b.coordinates)
          return distanceA - distanceB
        case "status":
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    setFilteredOrders(filtered)
  }, [orders, selectedArea, sortBy, user?.role, userLocation])

  useEffect(() => {
    if (user?.role) {
      fetchData(true)
    }
  }, [user?.role])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchData(false)
      toast({
        title: "✅ Data Refreshed",
        description: "Latest orders loaded successfully.",
      })
    } catch (error) {
      toast({
        title: "❌ Refresh Failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleActionRefresh = async () => {
    console.log("Action-triggered refresh")
    setOrders([])
    setVendors([])
    await fetchData(false)
    setTimeout(async () => {
      await fetchData(false)
    }, 1000)
  }

  const formatDistance = (distance: number) => {
    if (distance < 1000) return `${distance.toFixed(0)} m`
    return `${(distance / 1000).toFixed(1)} km`
  }

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\+60)(\d{2})(\d{3})(\d{4})/, "$1$2$3$4")
  }

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, "_self")
  }

  const handleWhatsApp = (phone: string, customerName: string) => {
    const message = `Hi ${customerName}, I'm from Klynn Laundry. I'm on my way to collect your laundry. Thank you!`
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handlePickupRoute = (order: Order) => {
    if (order.coordinates) {
      const [lat, lng] = order.coordinates
      openMapsNavigation(lat, lng, order.customer.name)
    }
  }

  const handleToVendor = (order: Order) => {
    const vendor = vendors.find((v) => v.name === order.assignedVendor)
    if (vendor && vendor.coordinates) {
      const [lat, lng] = vendor.coordinates
      openMapsNavigation(lat, lng, vendor.name)
    }
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderPopup(true)
  }

  const handleOrderPopupClose = () => {
    setShowOrderPopup(false)
    setSelectedOrder(null)
  }

  const handleOrderUpdate = () => {
    handleActionRefresh()
  }

  // Calculate real distance from user to customer
  const calculateCustomerDistance = (order: Order): number => {
    if (!userLocation || !order.coordinates) return 0
    return calculateDistance(userLocation, order.coordinates) * 1000 // Convert to meters
  }

  // Calculate real distance from customer to vendor
  const calculateVendorDistance = (order: Order): number => {
    if (!order.coordinates || !order.assignedVendor) return 0
    const vendor = vendors.find((v) => v.name === order.assignedVendor)
    if (!vendor || !vendor.coordinates) return 0
    return calculateDistance(order.coordinates, vendor.coordinates)
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4 text-sm">Please log in to access the map.</p>
            <Button onClick={() => (window.location.href = "/")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>Failed to load data. Please check your connection and try refreshing.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Klynn Map</h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">RIDER</Badge>
                <span className="text-sm text-gray-600">Klynn Rider</span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Area Selection - Updated with Selangor */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {Object.entries(MOBILE_AREAS).map(([key, area]) => (
            <Button
              key={key}
              variant={selectedArea === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedArea(key as AreaKey)}
              className={`whitespace-nowrap ${
                selectedArea === key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="mr-1">{area.icon}</span>
              {area.name}
            </Button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 ${
                viewMode === "list" ? "bg-gray-900 text-white" : "bg-transparent text-gray-700 hover:bg-gray-200"
              }`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className={`px-4 py-2 ${
                viewMode === "map" ? "bg-gray-900 text-white" : "bg-transparent text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Map
            </Button>
          </div>
          <Button
            onClick={() => setShowRouteOptimizer(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
            disabled={filteredOrders.length === 0}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Route
          </Button>
        </div>
      </div>

      {/* Content - Fixed height for map view */}
      <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {viewMode === "map" ? (
          <MapView orders={filteredOrders} selectedArea={selectedArea} onOrderUpdate={handleActionRefresh} />
        ) : (
          <div className="p-4 space-y-4 h-full overflow-y-auto pb-20">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <h2 className="text-lg font-semibold text-gray-900">Confirmed Orders ({filteredOrders.length})</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600">
                📍 All
              </Button>
            </div>

            {/* Rider Mode Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm font-medium">Rider Mode: Showing confirmed orders only</span>
              </div>
            </div>

            {/* Sort Filters */}
            <div className="flex gap-2">
              <Button
                variant={sortBy === "date" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("date")}
                className={`${sortBy === "date" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Date
              </Button>
              <Button
                variant={sortBy === "distance" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("distance")}
                className={`${
                  sortBy === "distance" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Distance
              </Button>
              <Button
                variant={sortBy === "status" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("status")}
                className={`${
                  sortBy === "status" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Status
              </Button>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const customerDistance = calculateCustomerDistance(order)
                const vendorDistance = calculateVendorDistance(order)
                const vendor = vendors.find((v) => v.name === order.assignedVendor)

                return (
                  <Card key={order.id} className="bg-white shadow-sm border border-gray-200">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{order.customer.name}</h3>
                          <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">{order.status}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-blue-600">
                            {customerDistance > 0 ? formatDistance(customerDistance) : "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">away</div>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="space-y-2 mb-4">
                        <div className="text-sm font-medium text-gray-900">{order.id}</div>
                        <div className="text-sm text-gray-600">{formatPhoneNumber(order.customer.phone)}</div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-600 leading-relaxed">{order.pickupAddress}</div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>5kg</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{order.pickupDate}</span>
                          </div>
                        </div>
                        {order.assignedVendor && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 font-medium">{order.assignedVendor}</span>
                            <span className="text-gray-500">
                              • {vendorDistance > 0 ? `${vendorDistance.toFixed(1)}km` : "N/A"} to vendor
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Row 1 - Fixed alignment */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCall(order.customer.phone)}
                          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-9 text-xs"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWhatsApp(order.customer.phone, order.customer.name)}
                          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-9 text-xs"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 h-9 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>

                      {/* Action Buttons Row 2 - Updated with native navigation */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handlePickupRoute(order)}
                          className="bg-orange-500 hover:bg-orange-600 text-white py-3 h-10 text-sm"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Pickup Route
                        </Button>
                        <Button
                          onClick={() => handleToVendor(order)}
                          className="bg-green-600 hover:bg-green-700 text-white py-3 h-10 text-sm"
                          disabled={!order.assignedVendor}
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          To Vendor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-semibold">No confirmed orders</h3>
                  <p className="text-sm">No orders available for pickup in this area.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Route Optimizer Modal */}
      {showRouteOptimizer && (
        <RouteOptimizer
          orders={filteredOrders}
          userLocation={userLocation || undefined}
          onRouteOptimized={(route) => {
            console.log("Route optimized:", route)
            toast({
              title: "🗺️ Route Optimized",
              description: `Best route calculated for ${route.length} stops.`,
            })
          }}
        />
      )}

      {/* Order Details Popup */}
      <OrderPopup
        order={selectedOrder}
        isOpen={showOrderPopup}
        onClose={handleOrderPopupClose}
        onUpdate={handleOrderUpdate}
      />
    </div>
  )
}
