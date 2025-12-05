"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import { Icon, divIcon } from "leaflet"
import { OrderPopup } from "./order-popup"
import type { Order } from "@/lib/data"
import "leaflet/dist/leaflet.css"

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

interface InteractiveMapProps {
  orders: Order[]
  center: [number, number]
  zoom: number
  isLoading: boolean
  onOrderUpdate: () => void
}

// Component to update map view when center/zoom changes
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  return null
}

// Generate coordinates for orders that don't have them
function generateCoordinatesFromPostcode(address: string): [number, number] | null {
  const postcode = address.match(/\d{5}/)?.[0]
  if (!postcode) return null

  // Approximate coordinates based on postcode ranges
  const firstDigit = postcode[0]
  const secondDigit = postcode[1]

  switch (firstDigit) {
    case "0": // Langkawi area
      if (postcode.startsWith("07")) {
        return [6.35 + (Math.random() - 0.5) * 0.1, 99.8 + (Math.random() - 0.5) * 0.1]
      }
      break
    case "1": // Kedah/Perlis
      return [6.12 + (Math.random() - 0.5) * 0.2, 100.36 + (Math.random() - 0.5) * 0.2]
    case "2": // Penang
      return [5.4164 + (Math.random() - 0.5) * 0.1, 100.3327 + (Math.random() - 0.5) * 0.1]
    case "3": // Perak
      return [4.5921 + (Math.random() - 0.5) * 0.3, 101.0901 + (Math.random() - 0.5) * 0.3]
    case "4": // Selangor
      return [3.0738 + (Math.random() - 0.5) * 0.2, 101.5183 + (Math.random() - 0.5) * 0.2]
    case "5": // KL/Selangor
      return [3.139 + (Math.random() - 0.5) * 0.1, 101.6869 + (Math.random() - 0.5) * 0.1]
    case "6": // KL
      return [3.139 + (Math.random() - 0.5) * 0.05, 101.6869 + (Math.random() - 0.5) * 0.05]
    default:
      return [3.139, 101.6869] // Default to KL
  }

  return null
}

// Create custom markers based on order status
function createOrderMarker(order: Order) {
  const statusColors = {
    processing: "#6b7280", // gray
    approved: "#3b82f6", // blue
    "picked-up": "#8b5cf6", // purple
    "at-laundry": "#6366f1", // indigo
    "out-for-delivery": "#f59e0b", // amber
    delivered: "#10b981", // emerald
    cancelled: "#ef4444", // red
  }

  const color = statusColors[order.status as keyof typeof statusColors] || "#6b7280"

  return divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      ">
        ${
          order.status === "approved"
            ? "📍"
            : order.status === "picked-up"
              ? "🚚"
              : order.status === "at-laundry"
                ? "🏭"
                : order.status === "out-for-delivery"
                  ? "🚛"
                  : order.status === "delivered"
                    ? "✅"
                    : "📦"
        }
      </div>
    `,
    className: "custom-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function InteractiveMap({ orders, center, zoom, isLoading, onOrderUpdate }: InteractiveMapProps) {
  const mapRef = useRef<any>(null)

  // Process orders to add coordinates
  const ordersWithCoords = orders
    .map((order) => {
      // Try to get coordinates from order data or generate from postcode
      const coords = generateCoordinatesFromPostcode(order.pickupAddress)
      return {
        ...order,
        coordinates: coords,
      }
    })
    .filter((order) => order.coordinates !== null)

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-klynn-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <MapContainer ref={mapRef} center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater center={center} zoom={zoom} />

      {ordersWithCoords.map((order) => (
        <Marker key={order.id} position={order.coordinates as [number, number]} icon={createOrderMarker(order)}>
          <Popup maxWidth={300} className="custom-popup">
            <OrderPopup order={order} onUpdate={onOrderUpdate} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
