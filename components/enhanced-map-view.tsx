"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Layers, Building2, Truck, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Order, Vendor } from "@/lib/data"
import { RoleBasedOrderPopup } from "./role-based-order-popup"
import { calculateOptimizedRoute, type RouteDestination } from "@/lib/client-utils"

interface EnhancedMapViewProps {
  orders: Order[]
  vendors: Vendor[]
  userRole: string
  onOrderUpdate?: () => void
}

export function EnhancedMapView({ orders, vendors, userRole, onOrderUpdate }: EnhancedMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [mapFilter, setMapFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showRoute, setShowRoute] = useState(false)
  const [routeLayer, setRouteLayer] = useState<any>(null)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      try {
        // Dynamic import of Leaflet
        const L = (await import("leaflet")).default

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        // Initialize map centered on KL
        if (!mapRef.current) return
        const map = L.map(mapRef.current).setView([3.139, 101.6869], 11)

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        mapInstanceRef.current = map
      } catch (error) {
        console.error("Failed to initialize map:", error)
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when orders/vendors change
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const updateMarkers = async () => {
      try {
        const L = (await import("leaflet")).default

        // Clear existing markers
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        // Filter orders based on search and filter
        const filteredOrders = orders.filter((order) => {
          const matchesSearch =
            !searchTerm ||
            order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.assignedVendor && order.assignedVendor.toLowerCase().includes(searchTerm.toLowerCase()))

          const matchesFilter =
            mapFilter === "all" ||
            (mapFilter === "processing" && order.status === "processing") ||
            (mapFilter === "approved" && order.status === "approved") ||
            (mapFilter === "picked-up" && order.status === "picked-up") ||
            (mapFilter === "delivered" && order.status === "delivered")

          return matchesSearch && matchesFilter
        })

        // Add order markers
        filteredOrders.forEach((order, index) => {
          // Mock coordinates based on order ID for demo
          const lat = 3.139 + (Math.random() - 0.5) * 0.2
          const lng = 101.6869 + (Math.random() - 0.5) * 0.2

          // Create custom icon based on status
          const iconColor = getStatusColor(order.status)
          const customIcon = L.divIcon({
            html: `<div style="background-color: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                     <span style="color: white; font-size: 10px; font-weight: bold;">${index + 1}</span>
                   </div>`,
            className: "custom-marker",
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current)

          // Add popup with order info
          const popupContent = `
            <div class="p-2">
              <h3 class="font-bold text-sm">${order.id}</h3>
              <p class="text-xs text-gray-600">${order.customer?.name || 'Unknown'}</p>
              <p class="text-xs text-gray-500">${order.pickupAddress}</p>
              <div class="mt-2">
                <span class="inline-block px-2 py-1 text-xs rounded" style="background-color: ${iconColor}20; color: ${iconColor};">
                  ${order.status.replace("-", " ")}
                </span>
              </div>
              ${
                order.assignedVendor
                  ? `<p class="text-xs mt-1"><strong>Vendor:</strong> ${order.assignedVendor}</p>`
                  : ""
              }
            </div>
          `

          marker.bindPopup(popupContent)

          // Add click handler for detailed view
          marker.on("click", () => {
            setSelectedOrder(order)
            setIsPopupOpen(true)
          })

          markersRef.current.push(marker)
        })

        // Add vendor markers if showing all or if user is superhost
        if ((mapFilter === "all" || mapFilter === "vendors") && userRole === "superhost") {
          vendors.forEach((vendor) => {
            // Mock coordinates for vendors
            const lat = 3.139 + (Math.random() - 0.5) * 0.3
            const lng = 101.6869 + (Math.random() - 0.5) * 0.3

            const vendorIcon = L.divIcon({
              html: `<div style="background-color: #8B5CF6; width: 24px; height: 24px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                       <span style="color: white; font-size: 10px;">🏭</span>
                     </div>`,
              className: "vendor-marker",
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })

            const marker = L.marker([lat, lng], { icon: vendorIcon }).addTo(mapInstanceRef.current)

            const popupContent = `
              <div class="p-2">
                <h3 class="font-bold text-sm">${vendor.name}</h3>
                <p class="text-xs text-gray-600">Vendor</p>
                <p class="text-xs text-gray-500">${vendor.name}</p>
              </div>
            `

            marker.bindPopup(popupContent)
            markersRef.current.push(marker)
          })
        }
      } catch (error) {
        console.error("Failed to update markers:", error)
      }
    }

    updateMarkers()
  }, [orders, vendors, mapFilter, searchTerm, userRole])

  // Optimize route function
  const optimizeRoute = async () => {
    if (!mapInstanceRef.current || orders.length === 0) return

    try {
      const L = (await import("leaflet")).default

      // Clear existing route
      if (routeLayer) {
        mapInstanceRef.current.removeLayer(routeLayer)
      }

      // Get approved orders for route optimization
      const approvedOrders = orders.filter((order) => order.status === "approved")

      if (approvedOrders.length === 0) {
        alert("No approved orders available for route optimization")
        return
      }

      // Convert to destinations
      const destinations: RouteDestination[] = approvedOrders.map((order) => ({
        location: [3.139 + Math.random() * 0.1, 101.6869 + Math.random() * 0.1] as [number, number],
        name: `${order.customer?.name || 'Unknown'} - ${order.id}`,
        type: "customer" as const,
      }))

      // Calculate optimized route
      const startLocation: [number, number] = [3.139, 101.6869]
      const optimizedRoute = calculateOptimizedRoute(startLocation, destinations)

      // Create route polyline
      const routeCoords = [startLocation, ...optimizedRoute.map((stop) => stop.location)]
      const polyline = L.polyline(routeCoords, {
        color: "#3B82F6",
        weight: 4,
        opacity: 0.8,
      }).addTo(mapInstanceRef.current)

      setRouteLayer(polyline)
      setShowRoute(true)

      // Fit map to show entire route
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] })
    } catch (error) {
      console.error("Route optimization failed:", error)
    }
  }

  const clearRoute = () => {
    if (routeLayer && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayer)
      setRouteLayer(null)
      setShowRoute(false)
    }
  }

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      processing: "#6B7280",
      approved: "#3B82F6",
      "picked-up": "#8B5CF6",
      "at-laundry": "#6366F1",
      "out-for-delivery": "#F59E0B",
      delivered: "#10B981",
      cancelled: "#EF4444",
    }
    return colors[status] || "#6B7280"
  }

  const getFilteredOrdersCount = () => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.assignedVendor && order.assignedVendor.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesFilter =
        mapFilter === "all" ||
        (mapFilter === "processing" && order.status === "processing") ||
        (mapFilter === "approved" && order.status === "approved") ||
        (mapFilter === "picked-up" && order.status === "picked-up") ||
        (mapFilter === "delivered" && order.status === "delivered")

      return matchesSearch && matchesFilter
    }).length
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map Controls */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5" />
            Interactive Map View
            <Badge variant="outline" className="ml-auto">
              {getFilteredOrdersCount()} orders
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search and Filter Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search orders or vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={mapFilter} onValueChange={setMapFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="picked-up">Picked Up</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                {userRole === "superhost" && <SelectItem value="vendors">Vendors Only</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {userRole === "rider" && (
              <>
                <Button onClick={optimizeRoute} size="sm" className="flex-1">
                  <Navigation className="w-4 h-4 mr-2" />
                  Optimize Route
                </Button>
                {showRoute && (
                  <Button onClick={clearRoute} variant="outline" size="sm">
                    Clear Route
                  </Button>
                )}
              </>
            )}
            {userRole === "superhost" && (
              <div className="flex gap-2 w-full">
                <Button onClick={optimizeRoute} size="sm" className="flex-1">
                  <Truck className="w-4 h-4 mr-2" />
                  Plan Routes
                </Button>
                <Button
                  onClick={() => setMapFilter(mapFilter === "vendors" ? "all" : "vendors")}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  {mapFilter === "vendors" ? "Show Orders" : "Show Vendors"}
                </Button>
              </div>
            )}
          </div>

          {/* Status Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span>Processing</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Picked Up</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Delivered</span>
            </div>
            {userRole === "superhost" && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-600"></div>
                <span>Vendors</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full rounded-lg border" style={{ minHeight: "400px" }} />

        {/* Loading overlay */}
        {!mapInstanceRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center">
              <Layers className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-pulse" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Popup */}
      {selectedOrder && (
        <RoleBasedOrderPopup
          order={selectedOrder}
          isOpen={isPopupOpen}
          onClose={() => {
            setIsPopupOpen(false)
            setSelectedOrder(null)
          }}
          onUpdate={onOrderUpdate || (() => {})}
        />
      )}
    </div>
  )
}
