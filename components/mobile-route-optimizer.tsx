"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Navigation, Clock, Truck, X, Phone, MessageCircle } from "lucide-react"
import type { Order } from "@/lib/data"
import type { Vendor } from "@/lib/vendors"

interface MobileRouteOptimizerProps {
  orders: Order[]
  vendors: Vendor[]
  onClose: () => void
  selectedArea: string
}

interface RouteStop {
  id: string
  type: "pickup" | "vendor"
  order?: Order
  vendor?: Vendor
  coordinates: [number, number]
  estimatedTime: number
  distance: number
}

export function MobileRouteOptimizer({ orders, vendors, onClose, selectedArea }: MobileRouteOptimizerProps) {
  const [optimizedRoute, setOptimizedRoute] = useState<RouteStop[]>([])
  const [totalDistance, setTotalDistance] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Filter orders with valid coordinates
  const validOrders = orders.filter(
    (order) =>
      order.coordinates &&
      Array.isArray(order.coordinates) &&
      order.coordinates.length >= 2 &&
      typeof order.coordinates[0] === "number" &&
      typeof order.coordinates[1] === "number" &&
      !isNaN(order.coordinates[0]) &&
      !isNaN(order.coordinates[1]),
  )

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180
    const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1[0] * Math.PI) / 180) *
        Math.cos((coord2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Simple route optimization using nearest neighbor algorithm
  const optimizeRoute = () => {
    setIsOptimizing(true)

    setTimeout(() => {
      const stops: RouteStop[] = []
      let currentPosition: [number, number] = [3.139, 101.6869] // Default to KL center
      let totalDist = 0
      let totalTimeEst = 0

      // Create pickup stops
      const pickupStops = validOrders.map((order) => ({
        id: `pickup-${order.id}`,
        type: "pickup" as const,
        order,
        coordinates: order.coordinates as [number, number],
        estimatedTime: 0,
        distance: 0,
      }))

      // Add vendor stops for orders with assigned vendors
      const vendorStops = validOrders
        .filter((order) => order.assignedVendor)
        .map((order) => {
          const vendor = vendors.find((v) => v.name === order.assignedVendor)
          if (vendor && vendor.coordinates) {
            return {
              id: `vendor-${order.id}`,
              type: "vendor" as const,
              order,
              vendor,
              coordinates: vendor.coordinates as [number, number],
              estimatedTime: 0,
              distance: 0,
            }
          }
          return null
        })
        .filter(Boolean) as RouteStop[]

      // Combine all stops
      const allStops = [...pickupStops, ...vendorStops]
      const unvisited = [...allStops]
      const route: RouteStop[] = []

      // Nearest neighbor optimization
      while (unvisited.length > 0) {
        let nearestIndex = 0
        let nearestDistance = Number.POSITIVE_INFINITY

        unvisited.forEach((stop, index) => {
          const distance = calculateDistance(currentPosition, stop.coordinates)
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = index
          }
        })

        const nearestStop = unvisited[nearestIndex]
        nearestStop.distance = nearestDistance
        nearestStop.estimatedTime = totalTimeEst + nearestDistance * 2 // Rough estimate: 2 minutes per km

        route.push(nearestStop)
        unvisited.splice(nearestIndex, 1)

        currentPosition = nearestStop.coordinates
        totalDist += nearestDistance
        totalTimeEst += nearestDistance * 2 + 10 // Add 10 minutes per stop
      }

      setOptimizedRoute(route)
      setTotalDistance(totalDist)
      setTotalTime(totalTimeEst)
      setIsOptimizing(false)
    }, 1500)
  }

  useEffect(() => {
    if (validOrders.length > 0) {
      optimizeRoute()
    }
  }, [validOrders, vendors])

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "pending":
        return "#f59e0b"
      case "approved":
        return "#3b82f6"
      case "picked-up":
        return "#8b5cf6"
      case "processing":
        return "#06b6d4"
      case "at-laundry":
        return "#06b6d4"
      case "out-for-delivery":
        return "#10b981"
      case "delivered":
        return "#22c55e"
      case "cancelled":
        return "#ef4444"
      default:
        return "#6b7280"
    }
  }

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, "_self")
  }

  const handleWhatsApp = (phone: string, name: string, orderId?: string) => {
    const message = orderId
      ? `Hi ${name}, this is Klynn Partners. We're on our way to collect your laundry order ${orderId}. Thank you!`
      : `Hi ${name}, this is Klynn Partners. We're contacting you regarding our laundry services. Thank you!`
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleNavigate = (coordinates: [number, number]) => {
    const [lat, lng] = coordinates
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    window.open(googleMapsUrl, "_blank")
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center text-lg font-bold">
              <Navigation className="w-5 h-5 mr-2 text-blue-600" />
              Route Optimizer
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Route Summary */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-b">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{optimizedRoute.length}</div>
                <div className="text-xs text-gray-600">Stops</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalDistance.toFixed(1)}km</div>
                <div className="text-xs text-gray-600">Distance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{Math.round(totalTime)}min</div>
                <div className="text-xs text-gray-600">Est. Time</div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isOptimizing && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Optimizing Route...</p>
                <p className="text-gray-500 text-sm mt-1">Finding the best path</p>
              </div>
            </div>
          )}

          {/* Route Steps */}
          {!isOptimizing && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {optimizedRoute.map((stop, index) => (
                  <Card key={stop.id} className="shadow-md border-2 hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Step Number */}
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>

                        {/* Stop Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {stop.type === "pickup" ? (
                              <MapPin className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Truck className="w-4 h-4 text-green-600" />
                            )}
                            <span className="font-bold text-sm">
                              {stop.type === "pickup" ? "Pickup" : "Vendor Drop-off"}
                            </span>
                            {stop.order && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{
                                  borderColor: getStatusColor(stop.order.status),
                                  color: getStatusColor(stop.order.status),
                                  backgroundColor: `${getStatusColor(stop.order.status)}10`,
                                }}
                              >
                                {stop.order.status}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1 mb-3">
                            <p className="font-medium text-gray-900">
                              {stop.type === "pickup" ? stop.order?.customer.name : stop.vendor?.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {stop.type === "pickup" ? stop.order?.pickupAddress : stop.vendor?.area}
                            </p>
                            {stop.order?.assignedVendor && stop.type === "pickup" && (
                              <p className="text-xs text-green-600 font-medium">→ To: {stop.order.assignedVendor}</p>
                            )}
                          </div>

                          {/* Distance and Time */}
                          <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Navigation className="w-3 h-3" />
                              <span>{stop.distance.toFixed(1)}km</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{Math.round(stop.estimatedTime)}min</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-1">
                            {((stop.type === "pickup" && stop.order?.customer.phone) ||
                              (stop.type === "vendor" && stop.vendor?.phone)) && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 text-xs h-7 bg-transparent"
                                  onClick={() => {
                                    const phone =
                                      stop.type === "pickup" ? stop.order!.customer.phone : stop.vendor!.phone!
                                    handleCall(phone)
                                  }}
                                >
                                  <Phone className="w-3 h-3 mr-1" />
                                  Call
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 text-xs h-7 bg-transparent"
                                  onClick={() => {
                                    const phone =
                                      stop.type === "pickup" ? stop.order!.customer.phone : stop.vendor!.phone!
                                    const name = stop.type === "pickup" ? stop.order!.customer.name : stop.vendor!.name
                                    handleWhatsApp(phone, name, stop.order?.id)
                                  }}
                                >
                                  <MessageCircle className="w-3 h-3 mr-1" />
                                  WhatsApp
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7 bg-transparent"
                              onClick={() => handleNavigate(stop.coordinates)}
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Navigate
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {optimizedRoute.length === 0 && !isOptimizing && (
                  <div className="text-center py-12 text-gray-500">
                    <Navigation className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No route to optimize</p>
                    <p className="text-xs mt-2">Add GPS coordinates to orders</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Action Buttons */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={optimizeRoute}
                disabled={isOptimizing || validOrders.length === 0}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Re-optimize
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (optimizedRoute.length > 0) {
                    const firstStop = optimizedRoute[0]
                    handleNavigate(firstStop.coordinates)
                  }
                }}
                disabled={optimizedRoute.length === 0}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Start Route
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
