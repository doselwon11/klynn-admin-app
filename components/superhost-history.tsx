"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  Search,
  Filter,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Package,
} from "lucide-react"
import type { Order } from "@/lib/data"
import { OrderList } from "./order-list"

interface SuperhostHistoryProps {
  orders: Order[]
  onRefresh: () => void
}

export function SuperhostHistory({ orders, onRefresh }: SuperhostHistoryProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const statusCounts = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const today = new Date()
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const weeklyOrders = orders.filter((order) => order.pickupDate && new Date(order.pickupDate) >= thisWeek)
    const monthlyOrders = orders.filter((order) => order.pickupDate && new Date(order.pickupDate) >= thisMonth)

    const completedOrders = orders.filter((order) => order.status === "delivered")
    const cancelledOrders = orders.filter((order) => order.status === "cancelled" || order.status === "cancel")

    return {
      total: orders.length,
      completed: completedOrders.length,
      cancelled: cancelledOrders.length,
      inProgress: orders.length - completedOrders.length - cancelledOrders.length,
      weeklyTotal: weeklyOrders.length,
      monthlyTotal: monthlyOrders.length,
      completionRate: orders.length > 0 ? ((completedOrders.length / orders.length) * 100).toFixed(1) : "0",
      cancellationRate: orders.length > 0 ? ((cancelledOrders.length / orders.length) * 100).toFixed(1) : "0",
      statusBreakdown: statusCounts,
    }
  }, [orders])

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders

    if (selectedStatus !== "all") {
      if (selectedStatus === "cancelled") {
        filtered = filtered.filter((order) => order.status === "cancelled" || order.status === "cancel")
      } else {
        filtered = filtered.filter((order) => order.status === selectedStatus)
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer?.phone?.includes(searchTerm) ||
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
        case "quarter":
          filterDate.setMonth(today.getMonth() - 3)
          break
      }

      if (dateFilter !== "all") {
        filtered = filtered.filter((order) => order.pickupDate && new Date(order.pickupDate) >= filterDate)
      }
    }

    return filtered.sort((a, b) => {
      if (!a.pickupDate || !b.pickupDate) return 0
      return new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime()
    })
  }, [orders, selectedStatus, searchTerm, dateFilter])

  const clearFilters = () => {
    setSelectedStatus("all")
    setSearchTerm("")
    setDateFilter("all")
  }

  const hasActiveFilters = selectedStatus !== "all" || searchTerm !== "" || dateFilter !== "all"

  return (
    <div className="p-4 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Analytics Overview</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{analytics.total}</p>
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
                    <p className="text-2xl font-bold text-green-600">{analytics.completed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600">{analytics.cancelled}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-orange-600">{analytics.inProgress}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-lg font-bold text-green-600">{analytics.completionRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cancellation Rate</span>
                  <span className="text-lg font-bold text-red-600">{analytics.cancellationRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Weekly Orders</span>
                  <span className="text-lg font-bold">{analytics.weeklyTotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Orders</span>
                  <span className="text-lg font-bold">{analytics.monthlyTotal}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <Badge variant="outline" className="capitalize">
                        {status.replace("-", " ")}
                      </Badge>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Orders
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="picked-up">Picked Up</SelectItem>
                    <SelectItem value="at-laundry">At Laundry</SelectItem>
                    <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last 3 Months</SelectItem>
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
          <OrderList orders={filteredOrders} isHistory={true} onStatusChange={onRefresh} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Generate detailed reports for analysis and record keeping.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start bg-transparent">
                  <Calendar className="h-4 w-4 mr-2" />
                  Monthly Summary Report
                </Button>
                <Button variant="outline" className="justify-start bg-transparent">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance Analytics
                </Button>
                <Button variant="outline" className="justify-start bg-transparent">
                  <Package className="h-4 w-4 mr-2" />
                  Order Status Report
                </Button>
                <Button variant="outline" className="justify-start bg-transparent">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trend Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
