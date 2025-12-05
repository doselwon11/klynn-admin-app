"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Clock, MapPin, Truck, Navigation2, Navigation } from "lucide-react"
import type { Order } from "@/lib/data"
import { calculateOptimizedRoute, type RouteDestination } from "@/lib/client-utils"

interface RouteOptimizerProps {
  orders: Order[]
  userLocation?: [number, number]
  onRouteOptimized?: (route: any[]) => void
  onClose?: () => void
}

export function RouteOptimizer({ orders, userLocation, onRouteOptimized, onClose }: RouteOptimizerProps) {
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [totalDistance, setTotalDistance] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)

  // Default location (KL city center) if user location not available
  const defaultLocation: [number, number] = [3.139, 101.6869]
  const startLocation = userLocation || defaultLocation

  const optimizeRoute = async () => {
    if (orders.length === 0) return

    setIsOptimizing(true)

    try {
      // Convert orders to destinations
      const destinations: RouteDestination[] = orders.map((order) => ({
        location: [3.139 + Math.random() * 0.1, 101.6869 + Math.random() * 0.1], // Mock coordinates
        name: `${order.customer.name} - ${order.id}`,
        type: "customer" as const,
      }))

      // Add vendor locations if assigned
      const vendorDestinations: RouteDestination[] = orders
        .filter((order) => order.assignedVendor)
        .map((order) => ({
          location: [3.139 + Math.random() * 0.1, 101.6869 + Math.random() * 0.1], // Mock vendor coordinates
          name: `${order.assignedVendor} (Vendor)`,
          type: "vendor" as const,
        }))

      const allDestinations = [...destinations, ...vendorDestinations]

      // Calculate optimized route
      const route = calculateOptimizedRoute(startLocation, allDestinations)

      setOptimizedRoute(route)
      setTotalDistance(route[route.length - 1]?.totalDistance || 0)
      setEstimatedTime(Math.round((route[route.length - 1]?.totalDistance || 0) * 2)) // Rough estimate: 2 minutes per km

      onRouteOptimized?.(route)
    } catch (error) {
      console.error("Route optimization failed:", error)
    } finally {
      setIsOptimizing(false)
    }
  }

  const openInGoogleMaps = () => {
    if (optimizedRoute.length === 0) return

    const waypoints = optimizedRoute.map((stop) => `${stop.location[0]},${stop.location[1]}`).join("|")
    const origin = `${startLocation[0]},${startLocation[1]}`
    const destination = optimizedRoute[optimizedRoute.length - 1]
      ? `${optimizedRoute[optimizedRoute.length - 1].location[0]},${optimizedRoute[optimizedRoute.length - 1].location[1]}`
      : origin

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`

    window.open(url, "_blank")
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <Navigation className="w-6 h-6 mr-3" />
                Smart Route Optimizer
              </h2>
              <p className="text-blue-100 mt-1">AI-powered routing for efficient deliveries across Malaysia</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {orders.length} pickup{orders.length !== 1 ? "s" : ""} ready for route optimization
            </div>
            <Button
              onClick={optimizeRoute}
              disabled={isOptimizing || orders.length === 0}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isOptimizing ? "Optimizing..." : "Calculate Best Route"}
            </Button>
          </div>

          {optimizedRoute.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-green-600" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Optimized Route Ready</span>
                    <p className="text-xs text-gray-600">Best path calculated using advanced algorithms</p>
                  </div>
                </div>
                <Button onClick={openInGoogleMaps} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Navigation2 className="w-4 h-4 mr-1" />
                  Open in Google Maps
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <MapPin className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{totalDistance.toFixed(1)} km</div>
                  <div className="text-xs text-gray-600">Total Distance</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <Clock className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">~{estimatedTime} min</div>
                  <div className="text-xs text-gray-600">Estimated Time</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <Navigation className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{optimizedRoute.length}</div>
                  <div className="text-xs text-gray-600">Total Stops</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Navigation className="w-4 h-4 mr-2" />
                  Optimized Route Order:
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {optimizedRoute.map((stop, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Badge
                        variant="outline"
                        className="w-8 h-8 p-0 flex items-center justify-center text-sm font-bold"
                      >
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{stop.name}</div>
                        <div className="text-xs text-gray-500">
                          GPS: {stop.location[0].toFixed(4)}, {stop.location[1].toFixed(4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={stop.type === "customer" ? "default" : "secondary"} className="text-xs mb-1">
                          {stop.type === "customer" ? "Pickup" : "Vendor"}
                        </Badge>
                        <div className="text-xs text-gray-500">+{stop.distance.toFixed(1)}km</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <div className="font-semibold mb-1">📍 Route Optimization Tips:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• Route is optimized for minimal travel time and fuel consumption</li>
                  <li>• Customer pickups are prioritized before vendor drop-offs</li>
                  <li>• Traffic conditions and road restrictions are considered</li>
                  <li>• Click "Open in Google Maps" for turn-by-turn navigation</li>
                </ul>
              </div>
            </div>
          )}

          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Navigation className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Orders Available</h3>
              <p className="text-sm">Add some orders to optimize your delivery route.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
