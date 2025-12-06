"use client"

import { useState } from "react"
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
import { useToast } from "./ui/use-toast"
import { updateOrderStatusWithNotification } from "@/lib/operations"
import { Loader2 } from "lucide-react"

interface ScannedOrderData {
  id: string
  rowNum: number
  // Optional fields for rider notification
  pickupAddress?: string
  postcode?: string
  deliveryType?: string
  orderType?: string
  riderFee?: number
  riderPayout?: number
  date?: string
}

interface ScanUpdateDialogProps {
  scannedOrder: ScannedOrderData | null
  onClose: () => void
  onStatusChange: () => void
}

const statuses = ["approved", "picked-up", "at-laundry", "out-for-delivery", "delivered"]

export function ScanUpdateDialog({ scannedOrder, onClose, onStatusChange }: ScanUpdateDialogProps) {
  const [newStatus, setNewStatus] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!scannedOrder || !newStatus) {
      toast({ title: "Please select a status.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    
    // Prepare order data for notification if status is approved
    const orderData = newStatus === "approved" && scannedOrder.pickupAddress ? {
      pickupAddress: scannedOrder.pickupAddress,
      postcode: scannedOrder.postcode || scannedOrder.pickupAddress.match(/\d{5}/)?.[0] || "",
      deliveryType: scannedOrder.deliveryType || "Standard",
      orderType: scannedOrder.orderType || "Regular",
      riderFee: scannedOrder.riderFee,
      riderPayout: scannedOrder.riderPayout,
      date: scannedOrder.date || new Date().toISOString().split("T")[0],
    } : undefined
    
    const result = await updateOrderStatusWithNotification(scannedOrder.id, newStatus, orderData)
    
    if (result.success) {
      if (newStatus === "approved" && orderData) {
        toast({ 
          title: "✅ Status Updated & Riders Notified", 
          description: `Order ${scannedOrder.id} is now ${newStatus}. Riders notified via Telegram.` 
        })
      } else {
        toast({ title: "✅ Status Updated", description: `Order ${scannedOrder.id} is now ${newStatus}.` })
      }
      onStatusChange()
      onClose()
    } else {
      toast({ title: "❌ Update Failed", description: result.message, variant: "destructive" })
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={!!scannedOrder} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Status for {scannedOrder?.id}</DialogTitle>
          <DialogDescription>A QR code was scanned. Select the new status for this order.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select a new status" />
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
          {newStatus === "approved" && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              📱 Riders will be notified via Telegram when status is approved
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
