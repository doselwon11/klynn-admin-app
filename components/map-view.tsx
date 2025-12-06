"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OrderPopup } from "@/components/order-popup"
import { MobileRouteOptimizer } from "@/components/mobile-route-optimizer"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { openMapsNavigation } from "@/lib/navigation-utils"
import {
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  AlertCircle,
  Users,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Settings,
  X,
} from "lucide-react"
import type { Order } from "@/lib/data"
import type { Vendor } from "@/lib/vendors"

interface MapViewProps {
  orders: Order[]
  selectedArea: string
  onOrderUpdate: () => void
}

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

// Area-specific rider assignments - Updated with Selangor
const AREA_RIDERS = {
  kl: {
    name: "Kuala Lumpur Team",
    riders: ["Ahmad (KL-001)", "Siti (KL-002)", "Rahman (KL-003)"],
    color: "#3b82f6",
    center: [3.139, 101.6869],
  },
  selangor: {
    name: "Selangor Team",
    riders: ["Farid (SEL-001)", "Aishah (SEL-002)", "Razak (SEL-003)"],
    color: "#10b981",
    center: [3.2, 101.5],
  },
  langkawi: {
    name: "Langkawi Team",
    riders: ["Hassan (LK-001)", "Aminah (LK-002)"],
    color: "#f59e0b",
    center: [6.3833, 99.8667],
  },
  penang: {
    name: "Penang Team",
    riders: ["Lim (PG-001)", "Fatimah (PG-002)"],
    color: "#8b5cf6",
    center: [5.4164, 100.3327],
  },
  johor: {
    name: "Johor Team",
    riders: ["Ali (JB-001)", "Nurul (JB-002)"],
    color: "#e11d48",
    center: [1.4927, 103.7414],
  },
}

export function MapView({ orders, selectedArea, onOrderUpdate }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderPopup, setShowOrderPopup] = useState(false)
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false)
  const [mapStyle, setMapStyle] = useState<string>("streets")
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [showVendors, setShowVendors] = useState(true)
  const [showCustomers, setShowCustomers] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showMapControls, setShowMapControls] = useState(true)
  const [showBottomSheet, setShowBottomSheet] = useState(false)

  // Load vendors
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const response = await fetch("/api/vendors")
        if (response.ok) {
          const data = await response.json()
          setVendors(data.vendors || [])
        }
      } catch (error) {
        console.error("Failed to load vendors:", error)
      }
    }
    loadVendors()
  }, [])

  // Initialize Leaflet map
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === "undefined" || !mapRef.current) return

      try {
        // Dynamically import Leaflet
        const L = (await import("leaflet")).default

        // Import Leaflet CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          document.head.appendChild(link)
        }

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        })

        // Initialize map centered on Malaysia with proper zoom
        const map = L.map(mapRef.current).setView([4.2105, 101.9758], 7)

        // Add tile layers
        const tileLayers = {
          streets: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }),
          satellite: L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
              attribution:
                "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
              maxZoom: 19,
            },
          ),
          terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
            attribution:
              'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            maxZoom: 17,
          }),
        }

        // Add default layer
        tileLayers.streets.addTo(map)

        // Store map reference
        leafletMapRef.current = { map, tileLayers, L }
        setIsMapLoaded(true)

        console.log("✅ Leaflet map initialized successfully")
      } catch (error) {
        console.error("❌ Failed to initialize Leaflet map:", error)
      }
    }

    initMap()

    // Cleanup
    return () => {
      if (leafletMapRef.current?.map) {
        leafletMapRef.current.map.remove()
        leafletMapRef.current = null
      }
    }
  }, [])

  // Resize map when sidebar visibility changes
  useEffect(() => {
    if (leafletMapRef.current?.map) {
      // Small delay to allow CSS transition to complete
      setTimeout(() => {
        leafletMapRef.current.map.invalidateSize()
      }, 300)
    }
  }, [showSidebar])

  // Update markers when orders change
  useEffect(() => {
    if (!leafletMapRef.current || !isMapLoaded) return

    const { map, L } = leafletMapRef.current

    // Clear existing markers
    markersRef.current.forEach((marker) => map.removeLayer(marker))
    markersRef.current = []

    // Add customer markers
    if (showCustomers) {
      orders.forEach((order, index) => {
        if (!order.coordinates || order.coordinates.length < 2) return

        const [lat, lng] = order.coordinates
        const statusColor = getStatusColor(order.status)
        const orderArea = getOrderArea(order)
        const areaInfo = AREA_RIDERS[orderArea as keyof typeof AREA_RIDERS]

        // Create custom marker HTML
        const markerHtml = `
          <div style="position: relative;">
            <div style="
              width: 40px;
              height: 40px;
              background: ${statusColor};
              border: 4px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            ${
              areaInfo
                ? `
              <div style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: 16px;
                height: 16px;
                background: ${areaInfo.color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              "></div>
            `
                : ""
            }
          </div>
        `

        // Create marker
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: markerHtml,
            className: "custom-marker",
            iconSize: [40, 40],
            iconAnchor: [20, 40],
          }),
        })

        // Add popup with enhanced functionality using native navigation
        const popupContent = `
          <div style="min-width: 250px; font-family: system-ui;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
              ${order.customer?.name || 'Unknown'}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
              ${order.pickupAddress}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="
                background: ${statusColor}20;
                color: ${statusColor};
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
                border: 1px solid ${statusColor}40;
              ">${order.status}</span>
              ${
                areaInfo
                  ? `
                <span style="
                  background: ${areaInfo.color}20;
                  color: ${areaInfo.color};
                  padding: 2px 8px;
                  border-radius: 12px;
                  font-size: 11px;
                  font-weight: 500;
                  border: 1px solid ${areaInfo.color}40;
                ">${areaInfo.name}</span>
              `
                  : ""
              }
            </div>
            ${
              order.assignedVendor
                ? `
              <div style="font-size: 11px; color: #10b981; margin-bottom: 8px; font-weight: 500;">
                🏭 Assigned to: ${order.assignedVendor}
              </div>
            `
                : ""
            }
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 12px;">
              GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px;">
              <button onclick="window.open('tel:${order.customer?.phone}', '_self')" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-weight: 500;
              ">📞 Call</button>
              <button onclick="window.open('https://wa.me/${order.customer?.phone?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${order.customer?.name || 'Customer'}, this is Klynn Partners. We're on our way to collect your laundry order ${order.id}. Thank you!`)}', '_blank')" style="
                background: #10b981;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-weight: 500;
              ">💬 WhatsApp</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              <button onclick="window.mapNavigateToCustomer && window.mapNavigateToCustomer(${lat}, ${lng}, '${order.customer?.name || 'Customer'}')" style="
                background: #8b5cf6;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-weight: 500;
              ">🧭 Navigate</button>
              <button onclick="window.mapOrderManage && window.mapOrderManage('${order.id}')" style="
                background: #f59e0b;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                font-weight: 500;
              ">⚙️ Manage</button>
            </div>
          </div>
        `

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: "custom-popup",
        })

        // Add click handler for navigation and manage buttons
        marker.on("click", () => {
          // Set up global functions for popup buttons
          ;(window as any).mapNavigateToCustomer = (lat: number, lng: number, customerName: string) => {
            openMapsNavigation(lat, lng, customerName)
          }
          ;(window as any).mapOrderManage = (orderId: string) => {
            const orderToManage = orders.find((o) => o.id === orderId)
            if (orderToManage) {
              setSelectedOrder(orderToManage)
              setShowOrderPopup(true)
            }
          }
        })

        marker.addTo(map)
        markersRef.current.push(marker)
      })
    }

    // Add vendor markers
    if (showVendors) {
      vendors.forEach((vendor, index) => {
        if (!vendor.coordinates || vendor.coordinates.length < 2) return

        const [lat, lng] = vendor.coordinates
        const vendorColor = "#10b981" // Green for vendors

        const vendorMarkerHtml = `
          <div style="position: relative;">
            <div style="
              width: 36px;
              height: 36px;
              background: ${vendorColor};
              border: 3px solid white;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
        `

        const vendorMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: vendorMarkerHtml,
            className: "custom-marker",
            iconSize: [36, 36],
            iconAnchor: [18, 36],
          }),
        })

        const vendorPopupContent = `
          <div style="min-width: 220px; font-family: system-ui;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
              🏭 ${vendor.name}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
              📍 ${vendor.area}
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="
                background: ${vendorColor}20;
                color: ${vendorColor};
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
                border: 1px solid ${vendorColor}40;
              ">${vendor.service}</span>
            </div>
            ${
              vendor.phone
                ? `
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
                📞 ${vendor.phone}
              </div>
            `
                : ""
            }
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 12px;">
              GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
            ${
              vendor.phone
                ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <button onclick="window.open('tel:${vendor.phone}', '_self')" style="
                  background: ${vendorColor};
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 6px;
                  font-size: 11px;
                  cursor: pointer;
                  font-weight: 500;
                ">📞 Call</button>
                <button onclick="window.mapNavigateToVendor && window.mapNavigateToVendor(${lat}, ${lng}, '${vendor.name}')" style="
                  background: #6b7280;
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 6px;
                  font-size: 11px;
                  cursor: pointer;
                  font-weight: 500;
                ">🧭 To Vendor</button>
              </div>
            `
                : ""
            }
          </div>
        `

        vendorMarker.bindPopup(vendorPopupContent, {
          maxWidth: 250,
          className: "custom-popup vendor-popup",
        })

        // Add click handler for vendor navigation
        vendorMarker.on("click", () => {
          ;(window as any).mapNavigateToVendor = (lat: number, lng: number, vendorName: string) => {
            openMapsNavigation(lat, lng, vendorName)
          }
        })

        vendorMarker.addTo(map)
        markersRef.current.push(vendorMarker)
      })
    }

    // Fit map to markers if we have orders
    if (orders.length > 0 && markersRef.current.length > 0) {
      const group = new L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds().pad(0.1))
    }
  }, [orders, vendors, isMapLoaded, showCustomers, showVendors])

  // Handle map style change
  const handleMapStyleChange = (style: string) => {
    if (!leafletMapRef.current) return

    const { map, tileLayers } = leafletMapRef.current

    // Remove current layer
    map.eachLayer((layer: any) => {
      if (layer._url) {
        map.removeLayer(layer)
      }
    })

    // Add new layer
    tileLayers[style as keyof typeof tileLayers].addTo(map)
    setMapStyle(style)
  }

  // Determine which area an order belongs to based on coordinates - Updated with Selangor
  const getOrderArea = (order: Order): string => {
    if (!order.coordinates) return "unknown"
    const [lat, lng] = order.coordinates

    if (lat >= 3.0 && lat <= 3.3 && lng >= 101.5 && lng <= 101.8) return "kl"
    if (lat >= 3.0 && lat <= 3.5 && lng >= 101.3 && lng <= 101.8) return "selangor" // Selangor area
    if (lat >= 6.2 && lat <= 6.5 && lng >= 99.6 && lng <= 100.0) return "langkawi"
    if (lat >= 5.2 && lat <= 5.6 && lng >= 100.1 && lng <= 100.5) return "penang"
    if (lat >= 1.3 && lat <= 1.7 && lng >= 103.5 && lng <= 104.0) return "johor"
    if (!(lat >= 1.0 && lat <= 7.5 && lng >= 99.0 && lng <= 120.0)) return "international"
    return "malaysia"
  }

  const handleCall = (phone: string) => window.open(`tel:${phone}`, "_self")

  const handleWhatsApp = (phone: string, customerName: string, orderId: string) => {
    const message = `Hi ${customerName}, this is Klynn Partners. We're on our way to collect your laundry order ${orderId}. Thank you!`
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleNavigate = (order: Order) => {
    if (order.coordinates && order.coordinates.length >= 2) {
      const [lat, lng] = order.coordinates
      openMapsNavigation(lat, lng, order.customer?.name || 'Customer')
    }
  }

  const handleNavigateToVendor = (order: Order) => {
    const vendor = vendors.find((v) => v.name === order.assignedVendor)
    if (vendor && vendor.coordinates && vendor.coordinates.length >= 2) {
      const [lat, lng] = vendor.coordinates
      openMapsNavigation(lat, lng, vendor.name)
    }
  }

  // Filter orders with valid coordinates
  const ordersWithValidCoordinates = orders.filter(
    (order) =>
      order.coordinates &&
      Array.isArray(order.coordinates) &&
      order.coordinates.length >= 2 &&
      typeof order.coordinates[0] === "number" &&
      typeof order.coordinates[1] === "number" &&
      !isNaN(order.coordinates[0]) &&
      !isNaN(order.coordinates[1]),
  )

  // Group orders by area for rider assignment
  const ordersByArea = ordersWithValidCoordinates.reduce(
    (acc, order) => {
      const area = getOrderArea(order)
      if (!acc[area]) acc[area] = []
      acc[area].push(order)
      return acc
    },
    {} as Record<string, Order[]>,
  )

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
      {/* Real Leaflet Map - Fixed height issues */}
      <div
        className={`flex-1 relative overflow-hidden transition-all duration-300 ${showSidebar ? "" : "md:mr-0"}`}
        style={{ height: "100%", minHeight: "400px" }}
      >
        {/* Map Container - Fixed height */}
        <div ref={mapRef} className="absolute inset-0 z-10" style={{ height: "100%", width: "100%" }} />

        {/* Loading Overlay */}
        {!isMapLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading Real Malaysia Map...</p>
              <p className="text-gray-500 text-sm mt-1">Powered by OpenStreetMap & Leaflet</p>
            </div>
          </div>
        )}

        {/* Mobile Floating Action Toolbar - Positioned to avoid zoom controls */}
        <div className="absolute bottom-6 right-4 flex flex-col gap-3 z-30 md:hidden">
          {/* Route Optimizer FAB */}
          <Button
            onClick={() => setShowRouteOptimizer(true)}
            disabled={ordersWithValidCoordinates.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full w-14 h-14 shadow-xl border-2 border-white"
            title="Optimize Route"
          >
            <Navigation className="w-6 h-6" />
          </Button>

          {/* Controls FAB */}
          <Button
            onClick={() => setShowBottomSheet(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-xl border-2 border-white"
            title="Map Controls & Info"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>

        {/* Desktop Controls (Hidden on Mobile) */}
        <div className="hidden md:block">
          {showMapControls && (
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
              {/* Map Style Selector */}
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
                <div className="flex flex-col gap-1">
                  <Button
                    variant={mapStyle === "streets" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMapStyleChange("streets")}
                    className="text-xs h-8 justify-start"
                  >
                    <Layers className="w-3 h-3 mr-2" />
                    Streets
                  </Button>
                  <Button
                    variant={mapStyle === "satellite" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMapStyleChange("satellite")}
                    className="text-xs h-8 justify-start"
                  >
                    <Layers className="w-3 h-3 mr-2" />
                    Satellite
                  </Button>
                  <Button
                    variant={mapStyle === "terrain" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMapStyleChange("terrain")}
                    className="text-xs h-8 justify-start"
                  >
                    <Layers className="w-3 h-3 mr-2" />
                    Terrain
                  </Button>
                </div>
              </div>

              {/* Layer Controls */}
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
                <div className="flex flex-col gap-1">
                  <Button
                    variant={showCustomers ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCustomers(!showCustomers)}
                    className="text-xs h-8 justify-start"
                  >
                    <MapPin className="w-3 h-3 mr-2" />
                    Customers
                  </Button>
                  <Button
                    variant={showVendors ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowVendors(!showVendors)}
                    className="text-xs h-8 justify-start"
                  >
                    <Users className="w-3 h-3 mr-2" />
                    Vendors
                  </Button>
                </div>
              </div>

              {/* Route Optimizer Button */}
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRouteOptimizer(true)}
                  className="text-xs h-8 justify-start w-full"
                  disabled={ordersWithValidCoordinates.length === 0}
                >
                  <Navigation className="w-3 h-3 mr-2" />
                  Optimize Route
                </Button>
              </div>
            </div>
          )}

          {/* Desktop Map Controls Toggle Button */}
          <div className="absolute top-4 right-4 z-40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMapControls(!showMapControls)}
              className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-gray-100 hover:bg-white mb-2"
              title={showMapControls ? "Hide map controls" : "Show map controls"}
            >
              {showMapControls ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Show
                </>
              )}
            </Button>
          </div>

          {/* Desktop Sidebar Toggle Button */}
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="bg-white/95 backdrop-blur-sm shadow-lg border-2 border-gray-100 hover:bg-white rounded-l-lg rounded-r-none h-12 px-2"
              title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            >
              {showSidebar ? <ChevronRight className="w-4 h-4 mr-2" /> : <ChevronLeft className="w-4 h-4 mr-2" />}
            </Button>
          </div>
        </div>

        {/* No GPS Orders Message */}
        {ordersWithValidCoordinates.length === 0 && isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20">
            <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 mx-4">
              <AlertCircle className="w-20 h-20 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">No GPS Data Available</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Add latitude and longitude columns to your Google Sheet to see orders on this real Malaysia map.
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">Quick Setup:</p>
                <p>1. Add "latitude" and "longitude" columns</p>
                <p>2. Fill in GPS coordinates</p>
                <p>3. Refresh this page</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet for Controls and Info */}
      <Sheet open={showBottomSheet} onOpenChange={setShowBottomSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Malaysia Operations
              </SheetTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowBottomSheet(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 pb-6 overflow-y-auto max-h-[calc(85vh-120px)]">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">{ordersWithValidCoordinates.length}</div>
                <div className="text-xs text-green-600">GPS Orders</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{vendors.length}</div>
                <div className="text-xs text-blue-600">Vendors</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700 capitalize">{mapStyle}</div>
                <div className="text-xs text-purple-600">Map Style</div>
              </div>
            </div>

            {/* Map Style Controls */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Map Style
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={mapStyle === "streets" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMapStyleChange("streets")}
                  className="h-12 flex flex-col gap-1"
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-xs">Streets</span>
                </Button>
                <Button
                  variant={mapStyle === "satellite" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMapStyleChange("satellite")}
                  className="h-12 flex flex-col gap-1"
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-xs">Satellite</span>
                </Button>
                <Button
                  variant={mapStyle === "terrain" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMapStyleChange("terrain")}
                  className="h-12 flex flex-col gap-1"
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-xs">Terrain</span>
                </Button>
              </div>
            </div>

            {/* Layer Visibility */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Show on Map
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={showCustomers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCustomers(!showCustomers)}
                  className="h-12 flex flex-col gap-1"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">Customers</span>
                </Button>
                <Button
                  variant={showVendors ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowVendors(!showVendors)}
                  className="h-12 flex flex-col gap-1"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Vendors</span>
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setShowRouteOptimizer(true)
                    setShowBottomSheet(false)
                  }}
                  disabled={ordersWithValidCoordinates.length === 0}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Optimize Route ({ordersWithValidCoordinates.length} orders)
                </Button>
              </div>
            </div>

            {/* Area Teams Summary */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Area Teams
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(ordersByArea).map(([area, areaOrders]) => {
                  const areaInfo = AREA_RIDERS[area as keyof typeof AREA_RIDERS]
                  return (
                    <div key={area} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: areaInfo?.color || "#6b7280" }}
                        />
                        <div>
                          <div className="text-sm font-medium">{areaInfo?.name || area.toUpperCase()}</div>
                          <div className="text-xs text-gray-500">{areaInfo?.riders.length || 0} riders available</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {areaOrders.length} orders
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Map Info */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1">Real map data from OpenStreetMap</p>
              <p>Click markers for actions: Call, WhatsApp, Navigate, Manage</p>
              <p className="mt-1 text-green-600 font-medium">📱 Navigation opens native maps app on mobile</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Enhanced Scrolling */}
      <div
        className={`hidden md:block w-full md:w-96 bg-white border-t md:border-t-0 md:border-l transition-all duration-300 ${
          showSidebar ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ height: "100%" }}
      >
        <div className="h-full flex flex-col">
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center text-gray-900">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Area Teams & Orders
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)} className="md:hidden">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {Object.entries(ordersByArea).map(([area, areaOrders]) => {
              const areaInfo = AREA_RIDERS[area as keyof typeof AREA_RIDERS]

              return (
                <Card key={area} className="shadow-lg border-2 hover:shadow-xl transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div
                          className="w-5 h-5 rounded-full mr-3 shadow-lg"
                          style={{
                            backgroundColor: areaInfo?.color || "#6b7280",
                            boxShadow: `0 0 10px ${areaInfo?.color || "#6b7280"}40`,
                          }}
                        />
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{areaInfo?.name || area.toUpperCase()}</h4>
                          <p className="text-xs text-gray-500">
                            {areaOrders.length} order{areaOrders.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-medium">
                        {areaInfo?.riders.length || 0} riders
                      </Badge>
                    </div>

                    {/* Enhanced Assigned Riders */}
                    {areaInfo && (
                      <div className="mb-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                        <div className="font-medium text-gray-700 mb-2 text-xs">Available Riders:</div>
                        <div className="space-y-1">
                          {areaInfo.riders.map((rider, idx) => (
                            <div key={idx} className="flex items-center text-gray-600 text-xs">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 shadow-sm"></div>
                              <span className="font-medium">{rider}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Enhanced Orders in this area - Scrollable */}
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {areaOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg cursor-pointer hover:from-gray-100 hover:to-gray-50 transition-all duration-200 border-2 border-transparent hover:border-gray-200 shadow-sm hover:shadow-md"
                          onClick={() => {
                            setSelectedOrder(order)
                            setShowOrderPopup(true)
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-gray-900">{order.customer?.name || 'Unknown'}</span>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium"
                              style={{
                                borderColor: getStatusColor(order.status),
                                color: getStatusColor(order.status),
                                backgroundColor: `${getStatusColor(order.status)}10`,
                              }}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-3 leading-relaxed">{order.pickupAddress}</p>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7 bg-transparent hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCall(order.customer?.phone || '')
                              }}
                            >
                              <Phone className="w-3 h-3 mr-1" />
                              Call
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7 bg-transparent hover:bg-green-50 border-green-200 hover:border-green-300 transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleWhatsApp(order.customer?.phone || '', order.customer?.name || 'Customer', order.id)
                              }}
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7 bg-transparent hover:bg-purple-50 border-purple-200 hover:border-purple-300 transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNavigate(order)
                              }}
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Navigate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {ordersWithValidCoordinates.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No GPS orders found</p>
                <p className="text-xs mt-2">Add coordinates to your Google Sheet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Popup */}
      {selectedOrder && (
        <OrderPopup
          order={selectedOrder}
          isOpen={showOrderPopup}
          onClose={() => {
            setShowOrderPopup(false)
            setSelectedOrder(null)
          }}
          onUpdate={onOrderUpdate}
        />
      )}

      {/* Route Optimizer */}
      {showRouteOptimizer && (
        <MobileRouteOptimizer
          orders={ordersWithValidCoordinates}
          vendors={vendors}
          onClose={() => setShowRouteOptimizer(false)}
          selectedArea={selectedArea}
        />
      )}

      {/* Custom CSS for Leaflet */}
      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
          border: 2px solid #f3f4f6 !important;
        }
        
        .custom-popup .leaflet-popup-tip {
          background: white !important;
          border: 2px solid #f3f4f6 !important;
          border-top: none !important;
          border-right: none !important;
        }
        
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.95) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid #e5e7eb !important;
          color: #374151 !important;
          font-weight: bold !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: white !important;
          color: #1f2937 !important;
        }

        /* Mobile-specific styles - Ensure zoom controls don't overlap with FABs */
        @media (max-width: 768px) {
          .leaflet-control-zoom {
            margin-right: 10px !important;
            margin-bottom: 100px !important;
          }
        }

        /* Ensure proper scrolling for mobile bottom sheet */
        .mobile-bottom-sheet {
          overscroll-behavior: contain;
        }

        /* Smooth scrolling for area teams */
        .area-teams-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  )
}
