"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Package, CheckCircle, Clock, Search, TrendingUp } from "lucide-react"
import type { Order } from "@/lib/data"
import { OrderList } from "./order-list"

interface VendorHistoryProps {
  orders: Order[]
  onRefresh: () => void
}

export function VendorHistory({ orders, onRefresh }: VendorHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Calculate vendor-specific metrics
  const metrics = useMemo(() => {
    const processed = orders.filter((order) => ["at-laundry", "out-for-delivery", "delivered"].includes(order.status))
    const completed = orders.filter((order) => order.status === "delivered")
    const inProgress = orders.filter((order) => ["at-laundry", "out-for-delivery"].includes(order.status))

    const today = new Date()
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weeklyProcessed = processed.filter((order) => new Date(order.pickupDate) >= thisWeek)

    return {
      totalProcessed: processed.length,
      completed: completed.length,
      inProgress: inProgress.length,
      weeklyProcessed: weeklyProcessed.length,
      completionRate: processed.length > 0 ? ((completed.length / processed.length) * 100).toFixed(1) : "0",
    }
  }, [orders])

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer.phone.includes(searchTerm) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (dateFilter !== "all") {
      const today = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "week":
          filterDate.setDate(today.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(today.getMonth() - 1)
          break
      }

      filtered = filtered.filter((order) => new Date(order.pickupDate) >= filterDate)
    }

    return filtered.sort((a, b) => new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime())
  }, [orders, searchTerm, dateFilter])

  return (
    <div className="p-4 space-y-6">
      {/* Vendor Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Processed</p>
                <p className="text-2xl font-bold">{metrics.totalProcessed}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.weeklyProcessed}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Completion Rate</p>
              <p className="text-2xl font-bold text-green-800">{metrics.completionRate}%</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Average Daily</p>
              <p className="text-2xl font-bold text-blue-800">{Math.round(metrics.weeklyProcessed / 7)}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Weekly Total</p>
              <p className="text-2xl font-bold text-purple-800">{metrics.weeklyProcessed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Your History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

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
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Processing History ({filteredOrders.length} orders)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <OrderList orders={filteredOrders} isHistory={true} onStatusChange={onRefresh} />
        </CardContent>
      </Card>
    </div>
  )
}
