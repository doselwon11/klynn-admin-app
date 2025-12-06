"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { BarChart3, Filter, Search, Calendar, TrendingUp, Package, Clock, X } from "lucide-react"
import type { Order } from "@/lib/data"
import { OrderList } from "./order-list"

interface SuperhostDashboardProps {
  orders: Order[]
  onStatusChange: () => void
}

export function SuperhostDashboard({ orders, onStatusChange }: SuperhostDashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Calculate statistics
  const stats = useMemo(() => {
    const statusCounts = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const today = new Date().toISOString().split("T")[0]
    const todayOrders = orders.filter((order) => order.pickupDate === today)

    return {
      total: orders.length,
      processing: statusCounts.processing || 0,
      approved: statusCounts.approved || 0,
      pickedUp: statusCounts["picked-up"] || 0,
      atLaundry: statusCounts["at-laundry"] || 0,
      outForDelivery: statusCounts["out-for-delivery"] || 0,
      delivered: statusCounts.delivered || 0,
      cancelled: (statusCounts.cancelled || 0) + (statusCounts.cancel || 0),
      todayOrders: todayOrders.length,
      pendingPickup: statusCounts.approved || 0,
      inProgress:
        (statusCounts["picked-up"] || 0) + (statusCounts["at-laundry"] || 0) + (statusCounts["out-for-delivery"] || 0),
    }
  }, [orders])

  // Filter orders based on selected criteria
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Status filter
    if (selectedStatus !== "all") {
      if (selectedStatus === "cancelled") {
        filtered = filtered.filter((order) => order.status === "cancelled" || order.status === "cancel")
      } else {
        filtered = filtered.filter((order) => order.status === selectedStatus)
      }
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer?.phone?.includes(searchTerm) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.pickupAddress?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter((order) => order.pickupDate && new Date(order.pickupDate) >= filterDate)
          break
        case "yesterday":
          filterDate.setDate(today.getDate() - 1)
          filterDate.setHours(0, 0, 0, 0)
          const yesterdayEnd = new Date(filterDate)
          yesterdayEnd.setHours(23, 59, 59, 999)
          filtered = filtered.filter((order) => {
            if (!order.pickupDate) return false
            const orderDate = new Date(order.pickupDate)
            return orderDate >= filterDate && orderDate <= yesterdayEnd
          })
          break
        case "week":
          filterDate.setDate(today.getDate() - 7)
          filtered = filtered.filter((order) => order.pickupDate && new Date(order.pickupDate) >= filterDate)
          break
        case "month":
          filterDate.setMonth(today.getMonth() - 1)
          filtered = filtered.filter((order) => order.pickupDate && new Date(order.pickupDate) >= filterDate)
          break
      }
    }

    return filtered
  }, [orders, selectedStatus, searchTerm, dateFilter])

  const clearFilters = () => {
    setSelectedStatus("all")
    setSearchTerm("")
    setDateFilter("all")
  }

  const hasActiveFilters = selectedStatus !== "all" || searchTerm !== "" || dateFilter !== "all"

  const handleStatusChange = () => {
    // Force immediate re-render
    onStatusChange()
    // Also trigger a small delay refresh to ensure data consistency
    setTimeout(() => {
      onStatusChange()
    }, 500)
  }

  return (
    <div className="p-4 space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Orders</p>
                <p className="text-2xl font-bold">{stats.todayOrders}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Pickup</p>
                <p className="text-2xl font-bold">{stats.pendingPickup}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-xl font-bold text-gray-800">{stats.processing}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Approved</p>
              <p className="text-xl font-bold text-blue-800">{stats.approved}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Picked Up</p>
              <p className="text-xl font-bold text-purple-800">{stats.pickedUp}</p>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-600">At Laundry</p>
              <p className="text-xl font-bold text-indigo-800">{stats.atLaundry}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600">Out for Delivery</p>
              <p className="text-xl font-bold text-orange-800">{stats.outForDelivery}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Delivered</p>
              <p className="text-xl font-bold text-green-800">{stats.delivered}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Cancelled</p>
              <p className="text-xl font-bold text-red-800">{stats.cancelled}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses ({stats.total})</SelectItem>
                  <SelectItem value="processing">Processing ({stats.processing})</SelectItem>
                  <SelectItem value="approved">Approved ({stats.approved})</SelectItem>
                  <SelectItem value="picked-up">Picked Up ({stats.pickedUp})</SelectItem>
                  <SelectItem value="at-laundry">At Laundry ({stats.atLaundry})</SelectItem>
                  <SelectItem value="out-for-delivery">Out for Delivery ({stats.outForDelivery})</SelectItem>
                  <SelectItem value="delivered">Delivered ({stats.delivered})</SelectItem>
                  <SelectItem value="cancelled">Cancelled ({stats.cancelled})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedStatus !== "all" && (
                <Badge variant="secondary" className="capitalize">
                  Status: {selectedStatus.replace("-", " ")}
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="secondary" className="capitalize">
                  Date: {dateFilter}
                </Badge>
              )}
              {searchTerm && <Badge variant="secondary">Search: "{searchTerm}"</Badge>}
              <Badge variant="outline">
                {filteredOrders.length} of {stats.total} orders
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Orders ({filteredOrders.length})
            {hasActiveFilters && <span className="text-sm font-normal text-gray-500 ml-2">filtered</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <OrderList
            key={`orders-${orders.length}-${orders.map((o) => o.status).join("-")}`}
            orders={filteredOrders}
            onStatusChange={handleStatusChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}
