"use client"

import { useEffect, useState, useRef } from "react"
import { getVendors, findOptimalVendor } from "@/lib/vendors"
import { autoAssignVendor } from "@/lib/operations"
import type { Order } from "@/lib/data"
import { useToast } from "./ui/use-toast"
import { Zap, CheckCircle, Clock, MapPin } from "lucide-react"

interface AutoVendorAssignmentProps {
  order: Order
  onUpdate: () => void
}

export function AutoVendorAssignment({ order, onUpdate }: AutoVendorAssignmentProps) {
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [assignmentAttempted, setAssignmentAttempted] = useState(false)
  const { toast } = useToast()

  // Track the previous order status to detect transitions
  const prevStatusRef = useRef<string>(order.status)
  const prevVendorRef = useRef<string | undefined>(order.assignedVendor)

  useEffect(() => {
    const currentStatus = order.status
    const currentVendor = order.assignedVendor
    const previousStatus = prevStatusRef.current
    const previousVendor = prevVendorRef.current

    // Reset assignment attempted flag if vendor was manually removed
    if (previousVendor && !currentVendor) {
      setAssignmentAttempted(false)
    }

    // Only auto-assign if:
    // 1. Order just transitioned TO "approved" status (from any other status)
    // 2. Order doesn't have a vendor assigned
    // 3. We haven't already attempted assignment for this order
    const justApproved = currentStatus === "approved" && previousStatus !== "approved"
    const needsVendor = !currentVendor
    const notAttempted = !assignmentAttempted

    if (justApproved && needsVendor && notAttempted) {
      console.log(
        `🎯 Enhanced auto-assignment triggered: Order ${order.id} transitioned from ${previousStatus} to ${currentStatus}`,
      )
      performEnhancedAutoAssignment()
    }

    // Update refs for next comparison
    prevStatusRef.current = currentStatus
    prevVendorRef.current = currentVendor
  }, [order.status, order.assignedVendor, assignmentAttempted])

  const performEnhancedAutoAssignment = async () => {
    // Mark as attempted immediately to prevent duplicate calls
    setAssignmentAttempted(true)
    setIsAutoAssigning(true)

    try {
      const vendors = await getVendors()
      if (vendors.length === 0) {
        console.log("No vendors available for auto-assignment")
        return
      }

      // Extract postcode from pickup address
      const customerPostcode = order.pickupAddress.match(/\d{5}/)?.[0] || ""
      const serviceType = order.service || "standard"

      console.log(`🎯 Enhanced assignment for Order ${order.id}:`)
      console.log(`   📍 Postcode: ${customerPostcode}`)
      console.log(`   🛍️ Service: ${serviceType}`)
      console.log(`   📍 GPS: ${order.coordinates ? `${order.coordinates[0]}, ${order.coordinates[1]}` : "None"}`)

      // Use enhanced vendor selection logic
      const suggestedVendor = findOptimalVendor(customerPostcode, order.coordinates, serviceType, vendors)

      if (!suggestedVendor) {
        console.log("No suitable vendor found for enhanced auto-assignment")
        return
      }

      console.log(`✅ Enhanced assignment result: ${suggestedVendor.name} (${suggestedVendor.area})`)

      // Send auto-assignment to webhook
      const result = await autoAssignVendor(order.rowNum, suggestedVendor.name, customerPostcode)

      if (result.success) {
        // Determine assignment reason for user feedback
        let assignmentReason = "(GPS-based proximity)"

        if (customerPostcode.startsWith("07")) {
          if (serviceType.toLowerCase().includes("kg")) {
            assignmentReason = "(Langkawi kg rule - Season Laundry)"
          } else {
            assignmentReason = "(Langkawi non-kg rule - Theresa)"
          }
        } else if (customerPostcode.match(/^(5[0-9]|6[0-9]|4[0-9])/)) {
          if (!serviceType.toLowerCase().includes("kg")) {
            assignmentReason = "(KL non-kg rule - Ampang Utama)"
          } else {
            assignmentReason = "(KL distance-based)"
          }
        }

        toast({
          title: "🎯 Smart Auto-Assignment Complete",
          description: `${suggestedVendor.name} (${suggestedVendor.area}) assigned ${assignmentReason}`,
        })
        onUpdate() // Only refresh after successful assignment
      } else {
        // If assignment failed, allow retry
        setAssignmentAttempted(false)
        toast({
          title: "❌ Auto-Assignment Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Enhanced auto-assignment failed:", error)
      // If assignment failed, allow retry
      setAssignmentAttempted(false)
      toast({
        title: "❌ Auto-Assignment Error",
        description: "Failed to auto-assign vendor. Please assign manually.",
        variant: "destructive",
      })
    } finally {
      setIsAutoAssigning(false)
    }
  }

  // Show blocked message for processing orders
  if (order.status === "processing") {
    return (
      <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
        <Clock className="h-3 w-3" />
        <span>Smart vendor assignment pending order approval</span>
      </div>
    )
  }

  // Show assignment in progress
  if (isAutoAssigning) {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
        <Zap className="h-3 w-3 animate-pulse" />
        <span>Smart auto-assigning vendor...</span>
      </div>
    )
  }

  // Show successful assignment (only if we have a vendor and order is approved)
  if (order.assignedVendor && order.status === "approved" && assignmentAttempted) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
        <CheckCircle className="h-3 w-3" />
        <span>Smart vendor auto-assigned</span>
        {order.coordinates && <MapPin className="h-3 w-3 ml-1" title="GPS-based assignment" />}
      </div>
    )
  }

  // Show nothing if order already has vendor or is not in the right state
  return null
}
