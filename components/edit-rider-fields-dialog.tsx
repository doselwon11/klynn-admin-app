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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Order } from "@/lib/data"
import { useState, useEffect } from "react"
import { useToast } from "./ui/use-toast"
import { updateRiderFieldsClient } from "@/lib/operations-client"
import { Loader2, User, MapPin, CreditCard, IdCard } from "lucide-react"

const regions = [
  "Klang Valley",
  "Selangor",
  "Kuala Lumpur",
  "Penang",
  "Johor",
  "Perak",
  "Kedah",
  "Kelantan",
  "Terengganu",
  "Pahang",
  "Negeri Sembilan",
  "Melaka",
  "Sabah",
  "Sarawak",
  "Other"
]

const identities = [
  "Full-time Rider",
  "Part-time Rider",
  "Contract Rider",
  "Freelance Rider",
  "Internal Staff",
  "Other"
]

export function EditRiderFieldsDialog({
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
  const [saRiderName, setSaRiderName] = useState(order.saRiderName || "")
  const [rdRiderName, setRdRiderName] = useState(order.rdRiderName || "")
  const [region, setRegion] = useState(order.region || "")
  const [identity, setIdentity] = useState(order.identity || "")
  const [riderPayout, setRiderPayout] = useState(order.riderPayout?.toString() || "")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Reset form when order changes
  useEffect(() => {
    setSaRiderName(order.saRiderName || "")
    setRdRiderName(order.rdRiderName || "")
    setRegion(order.region || "")
    setIdentity(order.identity || "")
    setRiderPayout(order.riderPayout?.toString() || "")
  }, [order])

  const handleSave = async () => {
    setIsSaving(true)
    
    const result = await updateRiderFieldsClient(order.id, {
      saRiderName,
      rdRiderName,
      region,
      identity,
      riderPayout,
    })

    if (result.success) {
      toast({ 
        title: "✅ Rider Fields Updated", 
        description: `Rider information for ${order.id} has been updated.` 
      })
      onStatusChange()
      setIsOpen(false)
    } else {
      toast({ 
        title: "❌ Update Failed", 
        description: result.message, 
        variant: "destructive" 
      })
    }
    setIsSaving(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Rider Fields - {order.id}</DialogTitle>
          <DialogDescription>
            Update rider assignment and payout information for this order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* SA Rider Name */}
          <div className="space-y-2">
            <Label htmlFor="saRiderName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              SA Rider Name (Pickup)
            </Label>
            <Input
              id="saRiderName"
              value={saRiderName}
              onChange={(e) => setSaRiderName(e.target.value)}
              placeholder="Enter SA rider name"
            />
          </div>

          {/* RD Rider Name */}
          <div className="space-y-2">
            <Label htmlFor="rdRiderName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              RD Rider Name (Delivery)
            </Label>
            <Input
              id="rdRiderName"
              value={rdRiderName}
              onChange={(e) => setRdRiderName(e.target.value)}
              placeholder="Enter RD rider name"
            />
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="region" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Region
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Identity */}
          <div className="space-y-2">
            <Label htmlFor="identity" className="flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              Identity
            </Label>
            <Select value={identity} onValueChange={setIdentity}>
              <SelectTrigger>
                <SelectValue placeholder="Select identity type" />
              </SelectTrigger>
              <SelectContent>
                {identities.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rider Payout */}
          <div className="space-y-2">
            <Label htmlFor="riderPayout" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Rider Payout (RM)
            </Label>
            <Input
              id="riderPayout"
              type="number"
              step="0.01"
              min="0"
              value={riderPayout}
              onChange={(e) => setRiderPayout(e.target.value)}
              placeholder="Enter payout amount"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
