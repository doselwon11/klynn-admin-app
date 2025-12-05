"use client"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { OrderList } from "@/components/order-list"
import { SuperhostDashboard } from "@/components/superhost-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, Truck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function OrdersPage() {
  const { user } = useUser()
  const { toast } = useToast()

  // ALL HOOKS MUST COME FIRST
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine order filter per user role
  const orderStatusQuery = useMemo(() => {
    if (user?.role === "rider") return "approved"
    if (user?.role === "vendor") return "picked-up"
    if (user?.role === "superhost") return ""
    return ""
  }, [user?.role])

  // Fetch orders
  const fetchOrders = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true)

      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)

      const url = orderStatusQuery
        ? `/api/orders?status=${orderStatusQuery}&t=${timestamp}&r=${randomId}`
        : `/api/orders?t=${timestamp}&r=${randomId}`

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })

      if (!response.ok) throw new Error("Failed to fetch orders")
      const data = await response.json()

      // Force rerender: clear then set
      setOrders([])
      setTimeout(() => setOrders(data.orders || []), 10)

      setError(null)
      setLastRefresh(timestamp)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // Initial load when role is ready
  useEffect(() => {
    if (user?.role) {
      fetchOrders(true)
    }
  }, [orderStatusQuery])

  // Refresh button
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchOrders(false)
      toast({
        title: "✅ Data Refreshed",
        description: "Latest orders fetched from Klynn Database.",
      })
    } catch {
      toast({
        title: "❌ Refresh Failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Refresh after status change
  const handleActionRefresh = async () => {
    setOrders([])
    await fetchOrders(false)
    setTimeout(fetchOrders, 1000)
  }

  const getPageTitle = () => {
    switch (user?.role) {
      case "superhost":
        return "Operations Dashboard"
      case "rider":
        return `Ready for Pickup (${orders.length})`
      case "vendor":
        return "Orders to Process"
      default:
        return "Orders"
    }
  }

  const formatLastUpdate = (timestamp: number) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const diffMinutes = Math.floor((Date.now() - timestamp) / 60000)
    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // 👉 SAFE: HYDRATION GUARD GOES AFTER ALL HOOKS
  if (!mounted) return null

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load orders. Please try refreshing.</AlertDescription>
          </Alert>
        </div>
      )
    }

    if (user?.role === "superhost") {
      return <SuperhostDashboard orders={orders} onStatusChange={handleActionRefresh} />
    }

    return (
      <div>
        {user?.role === "rider" && (
          <div className="px-4 pb-2">
            <div className="bg-klynn-blue/10 border border-klynn-blue/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-klynn-blue" />
                <span className="text-sm font-semibold text-klynn-blue">Pickup Instructions</span>
              </div>
              <div className="text-xs text-klynn-blue/80 space-y-1">
                <p>1. <strong>Generate AWB label</strong> for each order</p>
                <p>2. <strong>Confirm pickup</strong> to notify vendor</p>
                <p>3. <strong>Use color coding</strong> to organize delivery route</p>
                <p>4. <strong>Filter by vendor</strong> to batch deliveries</p>
              </div>
            </div>
          </div>
        )}
        <OrderList orders={orders} onStatusChange={handleActionRefresh} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={getPageTitle()}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-white flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <div className="flex flex-col items-start">
              <span className="text-xs leading-none">
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </span>
              {lastRefresh > 0 && (
                <span className="text-xs text-gray-500 leading-none">
                  {formatLastUpdate(lastRefresh)}
                </span>
              )}
            </div>
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  )
}
