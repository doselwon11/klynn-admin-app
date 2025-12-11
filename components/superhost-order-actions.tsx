"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "./ui/use-toast"
import { updateOrderStatusWithNotification, updateOrderPrice, assignVendor, addNewVendor } from "@/lib/operations"
import { getVendors, findNearestVendor, type Vendor } from "@/lib/vendors"
import type { Order } from "@/lib/data"
import { Edit, DollarSign, Building2, Plus, Loader2, Zap, AlertCircle, RefreshCw, Lock, Info, Save } from "lucide-react"

interface SuperhostOrderActionsProps {
  order: Order
  onUpdate: () => void
}

const statuses = ["processing", "approved", "picked-up", "at-laundry", "out-for-delivery", "delivered", "cancelled"]

export function SuperhostOrderActions({ order, onUpdate }: SuperhostOrderActionsProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [suggestedVendor, setSuggestedVendor] = useState<Vendor | null>(null)
  const [isLoadingVendors, setIsLoadingVendors] = useState(false)
  const [vendorError, setVendorError] = useState<string | null>(null)
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  // Form states
  const [newStatus, setNewStatus] = useState(order.status)
  const [finalPrice, setFinalPrice] = useState("")
  const [selectedVendor, setSelectedVendor] = useState(order.assignedVendor || "")
  const [newVendor, setNewVendor] = useState({
    name: "",
    area: "",
    service: "wash-dry-fold",
    ratePerKg: "",
    phone: "",
    postcode: "",
  })

  // Form validation states
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Refs to track form state
  const initialVendorRef = useRef(newVendor)

  // Check if vendor assignment is allowed
  const canAssignVendor =
    order.status === "approved" ||
    order.status === "picked-up" ||
    order.status === "at-laundry" ||
    order.status === "out-for-delivery"

  useEffect(() => {
    loadVendors()
  }, [])

  useEffect(() => {
    // Update selected vendor when order changes
    setSelectedVendor(order.assignedVendor || "")
  }, [order.assignedVendor])

  // Track form changes
  useEffect(() => {
    const hasChanges = JSON.stringify(newVendor) !== JSON.stringify(initialVendorRef.current)
    setHasUnsavedChanges(hasChanges)
  }, [newVendor])

  const loadVendors = async () => {
    setIsLoadingVendors(true)
    setVendorError(null)
    try {
      const vendorList = await getVendors()

      if (vendorList.length === 0) {
        setVendorError("No vendors found in database")
        return
      }

      setVendors(vendorList)

      // Only suggest vendor if order doesn't have one and is in assignable state
      if (!order.assignedVendor && canAssignVendor) {
        const customerPostcode = order.pickupAddress?.match(/\d{5}/)?.[0] || ""

        let suggested: any = null

        // Check for Langkawi location first
        if (customerPostcode.startsWith("07")) {
          const serviceType = order.service?.toLowerCase() || ""
          const isKgsPackage =
            serviceType.includes("kg") || serviceType.includes("wash") || serviceType.includes("fold")

          if (!isKgsPackage) {
            // Non-kgs package services in Langkawi go to Theresa Laundry
            suggested = vendorList.find((v) => v.name.toLowerCase().includes("theresa"))
          }
        }

        // If no Langkawi assignment, use normal postcode proximity
        if (!suggested && customerPostcode) {
          suggested = findNearestVendor(customerPostcode, vendorList)
        }

        setSuggestedVendor(suggested)
        if (suggested && !selectedVendor) {
          setSelectedVendor(suggested.name)
        }
      }
    } catch (error) {
      console.error("Failed to load vendors:", error)
      setVendorError("Failed to load vendors from database")
      toast({
        title: "❌ Failed to Load Vendors",
        description: "Could not fetch vendor list from Klynn Database.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingVendors(false)
    }
  }

  const validateVendorForm = () => {
    const errors: Record<string, string> = {}

    if (!newVendor.name.trim()) errors.name = "Vendor name is required"
    if (!newVendor.area.trim()) errors.area = "Area is required"
    if (!newVendor.phone.trim()) errors.phone = "Phone number is required"
    if (!newVendor.postcode.trim()) errors.postcode = "Postcode is required"

    if (newVendor.ratePerKg && isNaN(Number(newVendor.ratePerKg))) {
      errors.ratePerKg = "Rate must be a valid number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleStatusUpdate = async () => {
    if (newStatus === order.status) return

    setIsUpdating("status")

    // Optimistic UI update - update immediately
    const optimisticOrder = { ...order, status: newStatus }

    try {
      // Show immediate success feedback
      toast({
        title: "✅ Status Updated",
        description: `Order ${order.id} status changed to ${newStatus}.`,
      })

      // Trigger immediate UI refresh
      onUpdate()

      // If changing to approved, use the notification function
      if (newStatus === "approved") {
        updateOrderStatusWithNotification(order.id, newStatus, {
          pickupAddress: order.pickupAddress || "",
          postcode: order.postcode || "",
          deliveryType: order.deliveryType || order.service || "Standard",
          orderType: order.orderType || "Regular",
          riderFee: order.riderFee ?? undefined,
          riderPayout: order.riderPayout ?? undefined,
          date: order.pickupDate || "",
        }).then((result: { success: boolean; message: string }) => {
          if (!result.success) {
            toast({
              title: "⚠️ Sync Warning",
              description: "Status updated locally but may need manual sync with database.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "📱 Riders Notified",
              description: "Telegram notification sent to riders with job details.",
            })
          }
        })
      } else {
        // For other statuses, use regular update
        updateOrderStatusWithNotification(order.id, newStatus).then((result: { success: boolean; message: string }) => {
          if (!result.success) {
            toast({
              title: "⚠️ Sync Warning",
              description: "Status updated locally but may need manual sync with database.",
              variant: "destructive",
            })
          }
        })
      }

      // Special message for approving orders
      if (newStatus === "approved" && order.status === "processing") {
        toast({
          title: "🤖 Auto-Assignment Triggered",
          description: "Vendor will be automatically assigned based on postcode proximity.",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Update Failed",
        description: "Could not update order status.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handlePriceUpdate = async () => {
    if (!finalPrice || Number.parseFloat(finalPrice) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating("price")
    try {
      const result = await updateOrderPrice(order.id, finalPrice)
      if (result.success) {
        toast({
          title: "✅ Price Updated",
          description: `Final price set to RM${finalPrice}. This will be shown to customer after refresh.`,
        })
        setFinalPrice("")
        onUpdate() // Trigger refresh
      } else {
        toast({
          title: "❌ Update Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Update Failed",
        description: "Could not update final price.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleVendorOverride = async () => {
    if (!canAssignVendor || !selectedVendor) return

    setIsUpdating("vendor")

    try {
      // Show immediate success feedback
      toast({
        title: "✅ Vendor Override Complete",
        description: `${selectedVendor} has been manually assigned to order ${order.id}.`,
      })

      // Trigger immediate UI refresh
      onUpdate()

      // Send to webhook asynchronously
      assignVendor(order.id, selectedVendor).then((result: { success: boolean; message: string }) => {
        if (!result.success) {
          toast({
            title: "⚠️ Sync Warning",
            description: "Vendor assigned locally but may need manual sync with database.",
            variant: "destructive",
          })
        }
      })
    } catch (error) {
      toast({
        title: "❌ Override Failed",
        description: "Could not override vendor assignment.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleAddNewVendor = async () => {
    if (!validateVendorForm()) {
      toast({
        title: "Form Validation Failed",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating("add-vendor")
    try {
      const result = await addNewVendor(order.id, newVendor)
      if (result.success) {
        toast({
          title: "✅ Vendor Added Successfully",
          description: `${newVendor.name} has been added to the vendor list and assigned to this order.`,
        })

        // Reset form
        setShowAddVendorDialog(false)
        setNewVendor({
          name: "",
          area: "",
          service: "wash-dry-fold",
          ratePerKg: "",
          phone: "",
          postcode: "",
        })
        setFormErrors({})
        setHasUnsavedChanges(false)
        initialVendorRef.current = {
          name: "",
          area: "",
          service: "wash-dry-fold",
          ratePerKg: "",
          phone: "",
          postcode: "",
        }

        // Reload vendors and trigger refresh
        await loadVendors()
        onUpdate()
      } else {
        toast({
          title: "❌ Failed to Add Vendor",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Failed to Add Vendor",
        description: "Could not add new vendor. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to close?")) {
        setShowAddVendorDialog(false)
        setHasUnsavedChanges(false)
        setFormErrors({})
      }
    } else {
      setShowAddVendorDialog(open)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Auto-Assignment Info */}
        {order.status === "processing" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Auto-Assignment Ready</p>
                <p className="text-xs text-blue-700 mt-1">
                  When you approve this order, a vendor will be automatically assigned based on postcode proximity.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Update */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Edit className="h-4 w-4" />
              Update Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating === "status" || newStatus === order.status}
                size="sm"
              >
                {isUpdating === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            {newStatus === "approved" && order.status === "processing" && (
              <p className="text-xs text-blue-600">💡 Approving will trigger automatic vendor assignment</p>
            )}
          </CardContent>
        </Card>

        {/* Price Update */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              Update Final Price
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter final price"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                />
              </div>
              <Button onClick={handlePriceUpdate} disabled={isUpdating === "price" || !finalPrice} size="sm">
                {isUpdating === "price" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              This price will be shown to customer after refresh. Price updates do not trigger vendor re-assignment.
            </p>
          </CardContent>
        </Card>

        {/* Vendor Override */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              {canAssignVendor ? "Manual Vendor Override" : "Vendor Assignment (Locked)"}
              {isLoadingVendors && <Loader2 className="h-3 w-3 animate-spin" />}
              {!canAssignVendor && <Lock className="h-3 w-3 text-orange-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Assignment Status Warning */}
            {!canAssignVendor && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-800 font-medium">Assignment Locked</span>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  Vendors can only be assigned to orders with "approved" status or higher. Current status:{" "}
                  <strong>{order.status}</strong>
                </p>
              </div>
            )}

            {/* Current Assignment Display */}
            {order.assignedVendor && (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: '#6b7280' }}
                  />
                  <span className="text-xs font-medium text-gray-800">Currently Assigned</span>
                </div>
                <div className="text-sm text-gray-700">
                  <strong>{order.assignedVendor}</strong>
                </div>
              </div>
            )}

            {vendorError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">{vendorError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadVendors}
                  className="mt-2 bg-transparent"
                  disabled={isLoadingVendors}
                >
                  {isLoadingVendors ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-2" />
                  )}
                  Retry Loading Vendors
                </Button>
              </div>
            ) : (
              <>
                {suggestedVendor && !order.assignedVendor && canAssignVendor && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-800">Suggested (Nearest Postcode)</span>
                    </div>
                    <div className="text-xs text-green-700">
                      <strong>{suggestedVendor.name}</strong> - {suggestedVendor.area} ({suggestedVendor.postcode})
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Select
                    value={selectedVendor}
                    onValueChange={setSelectedVendor}
                    disabled={isLoadingVendors || !canAssignVendor}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          !canAssignVendor
                            ? "Assignment locked - approve order first"
                            : isLoadingVendors
                              ? "Loading vendors..."
                              : "Select vendor to override"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.name} value={vendor.name}>
                          <div className="flex items-center gap-2">
                            <span>{vendor.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {vendor.area}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleVendorOverride}
                    disabled={isUpdating === "vendor" || !selectedVendor || isLoadingVendors || !canAssignVendor}
                    size="sm"
                  >
                    {isUpdating === "vendor" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Override"}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddVendorDialog(true)}
                  className="w-full"
                  disabled={isUpdating !== null || !canAssignVendor}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Vendor
                </Button>

                {canAssignVendor && (
                  <p className="text-xs text-gray-500">
                    💡 Manual override will replace any existing vendor assignment. Auto-assignment only happens once
                    when order is first approved.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add New Vendor Dialog */}
      <Dialog open={showAddVendorDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Add New Vendor
              {hasUnsavedChanges && <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />}
            </DialogTitle>
            <DialogDescription>
              Add a new vendor to the system and assign to this order. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor-name" className="text-sm font-medium">
                  Vendor Name *
                </Label>
                <Input
                  id="vendor-name"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="e.g. Jara Laundry"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="vendor-area" className="text-sm font-medium">
                  Area *
                </Label>
                <Input
                  id="vendor-area"
                  value={newVendor.area}
                  onChange={(e) => setNewVendor({ ...newVendor, area: e.target.value })}
                  placeholder="e.g. Wangsa Maju"
                  className={formErrors.area ? "border-red-500" : ""}
                />
                {formErrors.area && <p className="text-xs text-red-600 mt-1">{formErrors.area}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor-service" className="text-sm font-medium">
                  Service Type
                </Label>
                <Select
                  value={newVendor.service}
                  onValueChange={(value) => setNewVendor({ ...newVendor, service: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wash-dry-fold">Wash-Dry-Fold</SelectItem>
                    <SelectItem value="dry-clean">Dry Clean</SelectItem>
                    <SelectItem value="wash-iron">Wash & Iron</SelectItem>
                    <SelectItem value="full-service">Full Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vendor-rate" className="text-sm font-medium">
                  Rate/kg (RM)
                </Label>
                <Input
                  id="vendor-rate"
                  type="number"
                  step="0.01"
                  value={newVendor.ratePerKg}
                  onChange={(e) => setNewVendor({ ...newVendor, ratePerKg: e.target.value })}
                  placeholder="4.00"
                  className={formErrors.ratePerKg ? "border-red-500" : ""}
                />
                {formErrors.ratePerKg && <p className="text-xs text-red-600 mt-1">{formErrors.ratePerKg}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor-phone" className="text-sm font-medium">
                  Phone *
                </Label>
                <Input
                  id="vendor-phone"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  placeholder="+60167238684"
                  className={formErrors.phone ? "border-red-500" : ""}
                />
                {formErrors.phone && <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="vendor-postcode" className="text-sm font-medium">
                  Postcode *
                </Label>
                <Input
                  id="vendor-postcode"
                  value={newVendor.postcode}
                  onChange={(e) => setNewVendor({ ...newVendor, postcode: e.target.value })}
                  placeholder="53300"
                  className={formErrors.postcode ? "border-red-500" : ""}
                />
                {formErrors.postcode && <p className="text-xs text-red-600 mt-1">{formErrors.postcode}</p>}
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                <Save className="w-3 h-3 inline mr-1" />
                You have unsaved changes in this form.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={isUpdating === "add-vendor"}>
              Cancel
            </Button>
            <Button onClick={handleAddNewVendor} disabled={isUpdating === "add-vendor"}>
              {isUpdating === "add-vendor" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
