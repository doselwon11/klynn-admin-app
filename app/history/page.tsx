"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { SuperhostHistory } from "@/components/superhost-history"
import { VendorHistory } from "@/components/vendor-history"
import { RiderHistory } from "@/components/rider-history"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, PackageX } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function HistoryPage() {
  const { user } = useUser()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const { toast } = useToast()

  const getHistoryQuery = () => {
    switch (user?.role) {
      case "rider":
        return "picked-up,delivered" // Orders rider has handled
      case "vendor":
        return "at-laundry,out-for-delivery,delivered" // Orders vendor has processed
      case "superhost":
        return "" // All orders for analysis
      default:
        return "delivered"
    }
  }

  const fetchOrders = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true)

      const timestamp = new Date().getTime()
      const statusQuery = getHistoryQuery()
      const url = statusQuery ? `/api/orders?status=${statusQuery}&t=${timestamp}` : `/api/orders?t=${timestamp}`

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (!response.ok) throw new Error("Failed to fetch orders")
      const data = await response.json()
      setOrders(data.orders || [])
      setError(null)
      setLastRefresh(timestamp)
    } catch (err) {
      setError(err)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // Initial load only
  useEffect(() => {
    if (user?.role) {
      fetchOrders(true)
    }
  }, [user?.role]) // Only when user role changes

  const getPageTitle = () => {
    switch (user?.role) {
      case "superhost":
        return "Order Analytics & History"
      case "rider":
        return "My Delivery History"
      case "vendor":
        return "Processing History"
      default:
        return "Order History"
    }
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchOrders(false)
      toast({
        title: "✅ History Refreshed",
        description: "Latest data fetched from Klynn Database.",
      })
    } catch (error) {
      toast({
        title: "❌ Refresh Failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Action-based refresh
  const handleActionRefresh = async () => {
    console.log("Action-triggered refresh in history")
    await fetchOrders(false)
  }

  const formatLastUpdate = (timestamp: number) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - timestamp) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-2">
          <Skeleton className="h-10 w-full" />
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
            <AlertDescription>Failed to load history. Please try again.</AlertDescription>
          </Alert>
        </div>
      )
    }

    if (!orders || orders.length === 0) {
      return (
        <div className="text-center py-16 text-gray-500">
          <PackageX className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-xl font-semibold">No history found.</h3>
          <p>No completed orders to display yet.</p>
        </div>
      )
    }

    // Render role-specific history component
    switch (user?.role) {
      case "superhost":
        return <SuperhostHistory orders={orders} onRefresh={handleActionRefresh} />
      case "vendor":
        return <VendorHistory orders={orders} onRefresh={handleActionRefresh} />
      case "rider":
        return <RiderHistory orders={orders} onRefresh={handleActionRefresh} />
      default:
        return <SuperhostHistory orders={orders} onRefresh={handleActionRefresh} />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={getPageTitle()}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-white flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <div className="flex flex-col items-start">
                <span className="text-xs leading-none">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
                {lastRefresh > 0 && (
                  <span className="text-xs text-gray-500 leading-none">{formatLastUpdate(lastRefresh)}</span>
                )}
              </div>
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  )
}
