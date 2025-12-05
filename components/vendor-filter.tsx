"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Building2 } from "lucide-react"
import type { Order } from "@/lib/data"

interface VendorFilterProps {
  orders: Order[]
  onFilterChange: (filteredOrders: Order[]) => void
  user?: any
  isHistory?: boolean
}

export function VendorFilter({ orders, onFilterChange, user, isHistory }: VendorFilterProps) {
  const [selectedVendor, setSelectedVendor] = useState<string>("all")

  // Get unique vendors with their colors and order counts
  const vendorStats = useMemo(() => {
    const stats = new Map<string, { color: string; count: number }>()

    orders.forEach((order) => {
      const vendor = order.assignedVendor || "Unassigned"
      const existing = stats.get(vendor) || { color: order.vendorColor || "#94a3b8", count: 0 }
      stats.set(vendor, { ...existing, count: existing.count + 1 })
    })

    return Array.from(stats.entries())
      .map(([name, data]) => ({
        name,
        color: data.color,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count) // Sort by order count
  }, [orders])

  // Filter orders based on selected vendor
  const filteredOrders = useMemo(() => {
    if (selectedVendor === "all") return orders

    return orders.filter((order) => {
      const vendor = order.assignedVendor || "Unassigned"
      return vendor === selectedVendor
    })
  }, [orders, selectedVendor])

  // Update parent component when filter changes - using useEffect to avoid render-time state updates
  useEffect(() => {
    onFilterChange(filteredOrders)
  }, [filteredOrders, onFilterChange])

  const clearFilter = () => {
    setSelectedVendor("all")
  }

  return (
    <div className="space-y-3">
      {user?.role === "rider" && !isHistory && (
        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="font-semibold text-green-800 mb-1">🚚 Rider Dashboard</p>
          <div className="space-y-1 text-xs">
            <p>
              • <strong>Color dots</strong> show which vendor to deliver to
            </p>
            <p>
              • <strong>Only approved orders</strong> with vendors are shown
            </p>
            <p>
              • <strong>Generate AWB first</strong>, then confirm pickup
            </p>
            <p>
              • <strong>Filter by vendor</strong> to organize your route
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filter by Vendor</span>
        {selectedVendor !== "all" && (
          <Button variant="ghost" size="sm" onClick={clearFilter} className="h-6 px-2">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Select value={selectedVendor} onValueChange={setSelectedVendor}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All Vendors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span>All Vendors ({orders.length})</span>
            </div>
          </SelectItem>
          {vendorStats.map((vendor) => (
            <SelectItem key={vendor.name} value={vendor.name}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vendor.color }} />
                <span>
                  {vendor.name} ({vendor.count})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quick filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedVendor === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedVendor("all")}
          className="h-7"
        >
          All ({orders.length})
        </Button>
        {vendorStats.slice(0, 4).map((vendor) => (
          <Button
            key={vendor.name}
            variant={selectedVendor === vendor.name ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedVendor(vendor.name)}
            className="h-7"
          >
            <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: vendor.color }} />
            {vendor.name.length > 10 ? `${vendor.name.substring(0, 10)}...` : vendor.name} ({vendor.count})
          </Button>
        ))}
      </div>

      {selectedVendor !== "all" && (
        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
          Showing {filteredOrders.length} orders for <strong>{selectedVendor}</strong>
        </div>
      )}
    </div>
  )
}
