"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Truck, CheckCircle, Clock, Search, Calendar, TrendingUp, MapPin } from "lucide-react"
import type { Order } from "@/lib/data"
import { OrderList } from "./order-list"

interface RiderHistoryProps {
  orders: Order[]
  onRefresh: () => void
}

export function RiderHistory({ orders, onRefresh }: RiderHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Calculate rider-specific metrics
  const metrics = useMemo(() => {
    const pickedUp = orders.filter((order) =>
      ["picked-up", "at-laundry", "out-for-delivery", "delivered"].includes(order.status),
    )
    const delivered = orders.filter((order) => order.status === "delivered")
    const inTransit = orders.filter((order) => ["picked-up", "at-laundry", "out-for-delivery"].includes(order.status))

    const today = new Date()
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weeklyPickups = pickedUp.filter((order) => order.pickupDate && new Date(order.pickupDate) >= thisWeek)

    return {
      totalPickups: pickedUp.length,
      delivered: delivered.length,
      inTransit: inTransit.length,
      weeklyPickups: weeklyPickups.length,
      deliveryRate: pickedUp.length > 0 ? ((delivered.length / pickedUp.length) * 100).toFixed(1) : "0",
    }
  }, [orders])

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer?.phone?.includes(searchTerm) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.pickupAddress?.toLowerCase().includes(searchTerm.toLowerCase()),
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

      filtered = filtered.filter((order) => order.pickupDate && new Date(order.pickupDate) >= filterDate)
    }

    return filtered.sort((a, b) => {
      const dateA = a.pickupDate ? new Date(a.pickupDate).getTime() : 0
      const dateB = b.pickupDate ? new Date(b.pickupDate).getTime() : 0
      return dateB - dateA
    })
  }, [orders, searchTerm, dateFilter])

  return (
    <div className="p-4 space-y-6">
      {/* Rider Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pickups</p>
                <p className="text-2xl font-bold">{metrics.totalPickups}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{metrics.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.inTransit}</p>
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
                <p className="text-2xl font-bold text-purple-600">{metrics.weeklyPickups}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Delivery Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Delivery Success Rate</p>
              <p className="text-2xl font-bold text-green-800">{metrics.deliveryRate}%</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Daily Average</p>
              <p className="text-2xl font-bold text-blue-800">{Math.round(metrics.weeklyPickups / 7)}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Weekly Pickups</p>
              <p className="text-2xl font-bold text-purple-800">{metrics.weeklyPickups}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start bg-transparent">
              <MapPin className="h-4 w-4 mr-2" />
              View Delivery Routes
            </Button>
            <Button variant="outline" className="justify-start bg-transparent">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Summary
            </Button>
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
                placeholder="Search by customer or location..."
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
          <CardTitle>Delivery History ({filteredOrders.length} orders)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <OrderList orders={filteredOrders} isHistory={true} onStatusChange={onRefresh} />
        </CardContent>
      </Card>
    </div>
  )
}
