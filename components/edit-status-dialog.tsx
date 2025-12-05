"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Order } from "@/lib/data"
import { useState } from "react"
import { useToast } from "./ui/use-toast"
import { updateOrderStatusWithNotification } from "@/lib/operations"

const statuses = ["processing", "approved", "picked-up", "at-laundry", "out-for-delivery", "delivered", "cancelled"]

export function EditStatusDialog({
  isOpen,
  setIsOpen,
  order,
  onStatusChange,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  order: Order
  onStatusChange: () => void
}) {
  const [newStatus, setNewStatus] = useState(order.status)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setIsSaving(true)
    
    // Use the new function that also sends rider notification when status becomes "approved"
    const result = await updateOrderStatusWithNotification(order.rowNum, newStatus, {
      pickupAddress: order.pickupAddress,
      postcode: order.postcode || "",
      deliveryType: order.deliveryType || order.service || "Standard",
      orderType: order.orderType || "Regular",
      riderFee: order.riderFee,
      riderPayout: order.riderPayout,
      date: order.pickupDate,
    })
    
    if (result.success) {
      // Show appropriate message based on whether notification was sent
      if (newStatus.toLowerCase() === "approved") {
        toast({ 
          title: "✅ Status Updated & Riders Notified", 
          description: `Order ${order.id} is now ${newStatus}. Riders have been notified via Telegram.` 
        })
      } else {
        toast({ 
          title: "✅ Status Updated", 
          description: `Order ${order.id} is now ${newStatus}.` 
        })
      }
      onStatusChange()
      setIsOpen(false)
    } else {
      toast({ title: "❌ Update Failed", description: result.message, variant: "destructive" })
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Edit Status for {order.id}</DialogTitle>
          <DialogDescription>
            Change the order status. When set to "approved", riders will be notified via Telegram.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status.replace("-", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Show notification info when selecting approved */}
          {newStatus === "approved" && order.status !== "approved" && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              📱 Riders will be notified via Telegram with pickup details
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
