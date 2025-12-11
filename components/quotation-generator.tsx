"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "./ui/use-toast"
import type { Order } from "@/lib/data"
import {
  Plus,
  Trash2,
  Download,
  Save,
  Calculator,
  FileText,
  Loader2,
  X,
  Copy,
  Settings,
  CreditCard,
  FileCheck,
} from "lucide-react"

interface LineItem {
  id: string
  itemName: string
  quantity: number
  rate: number
  amount: number
}

interface QuotationData {
  quotationNo: string
  date: string
  billTo: {
    name: string
    phone: string
    email: string
  }
  shipTo: {
    address: string
    postcode: string
  }
  lineItems: LineItem[]
  subtotal: number
  discount: number
  tax: number
  pickupCharge: number
  deliveryCharge: number
  total: number
  amountPaid: number
  balanceDue: number
  notes: string
  terms: string
}

interface QuotationGeneratorProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  order: Order
}

// Updated service items with new pricing
const defaultServiceItems = [
  "Shoe Cleaning",
  "Mattress Cleaning",
  "Dry Clean (Jacket)",
  "Jacket & Pants (Set)",
  "Wash-Dry-Fold (5kg)",
  "Wash-Dry-Fold (10kg)",
  "Wash-Dry-Fold (15kg)",
  "Express Service (24hrs)",
  "Premium Care Package",
  "Stain Removal Treatment",
  "Pickup Service",
  "Delivery Service",
  "Bulk Laundry Package",
  "Custom Service",
]

// Simplified default terms - bank details moved to separate section
const defaultTerms = `• Payment due within 7 days of quotation date
• Prices are subject to change without notice
• Special care items may incur additional charges
• Klynn reserves the right to refuse service for heavily soiled items
• This quotation is valid for 30 days from the date of issue`

// Updated service mapping with new pricing structure
const getServiceFromOrderData = (serviceData: string): LineItem[] => {
  const service = serviceData?.toLowerCase().trim() || ""

  // Updated service map with new pricing
  const serviceMap: { [key: string]: LineItem } = {
    shoe: {
      id: "1",
      itemName: "Shoe Cleaning",
      quantity: 1,
      rate: 20.0,
      amount: 20.0,
    },
    mattress: {
      id: "2",
      itemName: "Mattress Cleaning",
      quantity: 1,
      rate: 20.0,
      amount: 20.0,
    },
    dry_clean: {
      id: "3",
      itemName: "Dry Clean (Jacket)",
      quantity: 1,
      rate: 20.0,
      amount: 20.0,
    },
    jacket_set: {
      id: "4",
      itemName: "Jacket & Pants (Set)",
      quantity: 1,
      rate: 30.0,
      amount: 30.0,
    },
    "5kg": {
      id: "5",
      itemName: "Wash-Dry-Fold (5kg)",
      quantity: 1,
      rate: 39.0,
      amount: 39.0,
    },
    "10kg": {
      id: "6",
      itemName: "Wash-Dry-Fold (10kg)",
      quantity: 1,
      rate: 70.0,
      amount: 70.0,
    },
    "15kg": {
      id: "7",
      itemName: "Wash-Dry-Fold (15kg)",
      quantity: 1,
      rate: 125.0,
      amount: 125.0,
    },
  }

  const items: LineItem[] = []

  // Check for specific service types
  if (service.includes("shoe")) {
    items.push(serviceMap["shoe"])
  }
  if (service.includes("mattress")) {
    items.push(serviceMap["mattress"])
  }
  if (service.includes("dry") && service.includes("clean")) {
    items.push(serviceMap["dry_clean"])
  }
  if (service.includes("jacket") && service.includes("pants")) {
    items.push(serviceMap["jacket_set"])
  }

  // Check for kg packages
  if (service.includes("5kg") || service.includes("5 kg")) {
    items.push(serviceMap["5kg"])
  }
  if (service.includes("10kg") || service.includes("10 kg")) {
    items.push(serviceMap["10kg"])
  }
  if (service.includes("15kg") || service.includes("15 kg")) {
    items.push(serviceMap["15kg"])
  }

  // If no specific matches, try to infer from general terms
  if (items.length === 0) {
    if (service.includes("wash") || service.includes("fold") || service.includes("kg")) {
      // Default to 10kg package if it's a wash service
      items.push(serviceMap["10kg"])
    } else {
      // Default to shoe cleaning for other services
      items.push(serviceMap["shoe"])
    }
  }

  return items
}

export function QuotationGenerator({ isOpen, setIsOpen, order }: QuotationGeneratorProps) {
  const [quotationData, setQuotationData] = useState<QuotationData>({
    quotationNo: "",
    date: new Date().toISOString().split("T")[0],
    billTo: {
      name: "",
      phone: "",
      email: "",
    },
    shipTo: {
      address: "",
      postcode: "",
    },
    lineItems: [],
    subtotal: 0,
    discount: 0,
    tax: 6, // Default 6% SST
    pickupCharge: 5, // Updated to RM5
    deliveryCharge: 5, // Updated to RM5
    total: 0,
    amountPaid: 0,
    balanceDue: 0,
    notes: "",
    terms: defaultTerms,
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { toast } = useToast()
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)

  // Generate quotation number
  const generateQuotationNumber = () => {
    const today = new Date()
    const mm = (today.getMonth() + 1).toString().padStart(2, "0")
    const dd = today.getDate().toString().padStart(2, "0")
    const seq = today.getHours().toString() + today.getMinutes().toString().padStart(2, "0")
    return `QTN${mm}${dd}-${seq}`
  }

  // Initialize quotation data when dialog opens
  useEffect(() => {
    if (isOpen && order) {
      const quotationNo = generateQuotationNumber()

      // Extract postcode from pickup address
      const postcodeMatch = order.pickupAddress?.match(/\d{5}/)
      const postcode = postcodeMatch ? postcodeMatch[0] : ""
      const address = (order.pickupAddress || '').replace(`, ${postcode}`, "").trim()

      // Auto-generate service items based on order service data
      const autoServiceItems = getServiceFromOrderData(order.service || "")

      setQuotationData((prev) => ({
        ...prev,
        quotationNo,
        billTo: {
          name: order.customer?.name || '',
          phone: order.customer?.phone || '',
          email: "",
        },
        shipTo: {
          address: address,
          postcode: postcode,
        },
        pickupCharge: 5.0, // RM5
        deliveryCharge: 5.0, // RM5
        lineItems: autoServiceItems,
        notes: "", // Start with empty notes
        terms: defaultTerms, // Use simplified terms
      }))

      // Show toast indicating auto-population
      if (order.service) {
        toast({
          title: "🤖 Auto-Populated Services",
          description: `Services auto-filled based on order data: ${order.service}`,
        })
      }
    }
  }, [isOpen, order, toast])

  // Update calculations to include pickup and delivery charges
  const calculations = useMemo(() => {
    const subtotal = quotationData.lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = (subtotal - quotationData.discount) * (quotationData.tax / 100)
    const total =
      subtotal -
      quotationData.discount +
      (quotationData.pickupCharge || 0) +
      (quotationData.deliveryCharge || 0) +
      taxAmount
    const balanceDue = total - quotationData.amountPaid

    return {
      subtotal,
      taxAmount,
      total,
      balanceDue,
    }
  }, [
    quotationData.lineItems,
    quotationData.discount,
    quotationData.tax,
    quotationData.pickupCharge,
    quotationData.deliveryCharge,
    quotationData.amountPaid,
  ])

  // Update calculations in state
  useEffect(() => {
    setQuotationData((prev) => ({
      ...prev,
      subtotal: calculations.subtotal,
      total: calculations.total,
      balanceDue: calculations.balanceDue,
    }))
  }, [calculations])

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      itemName: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    }
    setQuotationData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }))
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setQuotationData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          // Auto-calculate amount when quantity or rate changes
          if (field === "quantity" || field === "rate") {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate
          }
          // Auto-set rates for known services
          if (field === "itemName") {
            const serviceName = value as string
            let rate = 0
            switch (serviceName) {
              case "Shoe Cleaning":
              case "Mattress Cleaning":
              case "Dry Clean (Jacket)":
                rate = 20
                break
              case "Jacket & Pants (Set)":
                rate = 30
                break
              case "Wash-Dry-Fold (5kg)":
                rate = 39
                break
              case "Wash-Dry-Fold (10kg)":
                rate = 70
                break
              case "Wash-Dry-Fold (15kg)":
                rate = 125
                break
              default:
                rate = updatedItem.rate
            }
            updatedItem.rate = rate
            updatedItem.amount = updatedItem.quantity * rate
          }
          return updatedItem
        }
        return item
      }),
    }))
  }

  const removeLineItem = (id: string) => {
    setQuotationData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }))
  }

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      const { generateQuotationPDF } = await import("@/lib/quotation-pdf-generator")
      await generateQuotationPDF(quotationData, order)

      toast({
        title: "✅ Quotation Generated",
        description: `Quotation ${quotationData.quotationNo} has been downloaded successfully.`,
      })
    } catch (error) {
      console.error("PDF generation error:", error)
      toast({
        title: "❌ Generation Failed",
        description: "Could not generate quotation PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveQuotation = async () => {
    setIsSaving(true)
    try {
      // Save quotation data to localStorage for now
      // In production, this would save to a database
      const savedQuotations = JSON.parse(localStorage.getItem("klynn-quotations") || "[]")
      const quotationWithOrder = {
        ...quotationData,
        orderId: order.id,
        createdAt: new Date().toISOString(),
      }
      savedQuotations.push(quotationWithOrder)
      localStorage.setItem("klynn-quotations", JSON.stringify(savedQuotations))

      toast({
        title: "✅ Quotation Saved",
        description: "Quotation has been saved for future reference.",
      })
    } catch (error) {
      toast({
        title: "❌ Save Failed",
        description: "Could not save quotation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const copyQuotationNumber = () => {
    navigator.clipboard.writeText(quotationData.quotationNo)
    toast({
      title: "📋 Copied",
      description: "Quotation number copied to clipboard.",
    })
  }

  const handleAutoUpdatePrice = async () => {
    setIsUpdatingPrice(true)
    try {
      const { updateOrderPrice } = await import("@/lib/operations")
      const result = await updateOrderPrice(order.id, calculations.total.toFixed(2))

      if (result.success) {
        toast({
          title: "✅ Price Updated",
          description: `Order ${order.id} final price updated to RM${calculations.total.toFixed(2)}`,
        })
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
        description: "Could not update order price.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-klynn-blue" />
            <div>
              <DialogTitle className="text-xl">Generate Quotation</DialogTitle>
              <p className="text-sm text-gray-600">
                Create professional quotation for Order {order.id}
                {order.service && (
                  <span className="ml-2 text-klynn-blue font-medium">• Auto-filled from: {order.service}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information Card */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Order ID</span>
                  <span className="font-medium">{order.id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Order Date</span>
                  <span className="font-medium">{order.pickupDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Service</span>
                  <span className="font-medium">{order.service || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Delivery Type</span>
                  <span className="font-medium">{order.deliveryType || "Standard"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Order Type</span>
                  <span className="font-medium">{order.orderType || "Regular"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Region</span>
                  <span className="font-medium">{order.region || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Vendor</span>
                  <span className="font-medium">{order.assignedVendor || "Not Assigned"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Status</span>
                  <Badge variant="outline" className="capitalize">{order.status.replace("-", " ")}</Badge>
                </div>
                {order.price && (
                  <div>
                    <span className="text-gray-500 block">Current Price</span>
                    <span className="font-medium text-green-600">RM {order.price.toFixed(2)}</span>
                  </div>
                )}
                {order.extraDistanceFare != null && order.extraDistanceFare > 0 && (
                  <div>
                    <span className="text-gray-500 block">Extra Distance</span>
                    <span className="font-medium text-orange-600">RM {order.extraDistanceFare!.toFixed(2)}</span>
                  </div>
                )}
                {order.saRiderName && (
                  <div>
                    <span className="text-gray-500 block">SA Rider</span>
                    <span className="font-medium">{order.saRiderName}</span>
                  </div>
                )}
                {order.rdRiderName && (
                  <div>
                    <span className="text-gray-500 block">RD Rider</span>
                    <span className="font-medium">{order.rdRiderName}</span>
                  </div>
                )}
                {order.riderPayout != null && order.riderPayout > 0 && (
                  <div>
                    <span className="text-gray-500 block">Rider Payout</span>
                    <span className="font-medium text-blue-600">RM {order.riderPayout!.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Auto-Population Notice */}
          {order.service && (
            <div className="p-3 bg-klynn-blue/10 border border-klynn-blue/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-klynn-blue" />
                <span className="text-sm font-medium text-klynn-blue">Smart Auto-Population</span>
              </div>
              <p className="text-xs text-klynn-blue/80 mt-1">
                Services automatically populated based on order data: <strong>{order.service}</strong>
                <br />
                Updated pricing: Shoe/Mattress/Dry Clean=RM20, Jacket Set=RM30, 5kg=RM39, 10kg=RM70, 15kg=RM125 |
                Pickup/Delivery=RM5 each
              </p>
            </div>
          )}

          {/* Pricing Reference Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-green-600" />
                Klynn Pricing Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Individual Services (per piece)</h4>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>Shoe Cleaning:</span>
                      <span className="font-mono">RM20</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mattress Cleaning:</span>
                      <span className="font-mono">RM20</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dry Clean (Jacket):</span>
                      <span className="font-mono">RM20</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jacket & Pants (Set):</span>
                      <span className="font-mono">RM30</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Kgs Package (per bag)</h4>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>5kg Package:</span>
                      <span className="font-mono">RM39</span>
                    </div>
                    <div className="flex justify-between">
                      <span>10kg Package:</span>
                      <span className="font-mono">RM70</span>
                    </div>
                    <div className="flex justify-between">
                      <span>15kg Package:</span>
                      <span className="font-mono">RM125</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span>Pickup:</span>
                        <span className="font-mono">RM5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery:</span>
                        <span className="font-mono">RM5</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF Content Preview */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">PDF Content Structure</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                ✓ <strong>Header:</strong> Clean text-based header with "KLYNN" branding
              </p>
              <p>
                ✓ <strong>Payment Details:</strong> Bank account info in highlighted box
              </p>
              <p>
                ✓ <strong>Notes:</strong> Only shown if you add custom notes
              </p>
              <p>
                ✓ <strong>Terms:</strong> Concise standard terms (no redundant bank details)
              </p>
            </div>
          </div>

          {/* Quotation Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span>Quotation Details</span>
                <Badge variant="outline" className="font-mono text-sm">
                  {quotationData.quotationNo}
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-2" onClick={copyQuotationNumber}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quotation-date" className="text-sm font-medium">
                  Date
                </Label>
                <Input
                  id="quotation-date"
                  type="date"
                  value={quotationData.date}
                  onChange={(e) => setQuotationData((prev) => ({ ...prev, date: e.target.value }))}
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <Label htmlFor="quotation-no" className="text-sm font-medium">
                  Quotation Number
                </Label>
                <Input
                  id="quotation-no"
                  value={quotationData.quotationNo}
                  onChange={(e) => setQuotationData((prev) => ({ ...prev, quotationNo: e.target.value }))}
                  className="font-mono mt-1 h-11"
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Bill To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bill-name" className="text-sm font-medium">
                    Customer Name
                  </Label>
                  <Input
                    id="bill-name"
                    value={quotationData.billTo.name}
                    onChange={(e) =>
                      setQuotationData((prev) => ({
                        ...prev,
                        billTo: { ...prev.billTo, name: e.target.value },
                      }))
                    }
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="bill-phone" className="text-sm font-medium">
                    Phone
                  </Label>
                  <Input
                    id="bill-phone"
                    value={quotationData.billTo.phone}
                    onChange={(e) =>
                      setQuotationData((prev) => ({
                        ...prev,
                        billTo: { ...prev.billTo, phone: e.target.value },
                      }))
                    }
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="bill-email" className="text-sm font-medium">
                    Email (Optional)
                  </Label>
                  <Input
                    id="bill-email"
                    type="email"
                    value={quotationData.billTo.email}
                    onChange={(e) =>
                      setQuotationData((prev) => ({
                        ...prev,
                        billTo: { ...prev.billTo, email: e.target.value },
                      }))
                    }
                    className="mt-1 h-11"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ship To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ship-address" className="text-sm font-medium">
                    Address
                  </Label>
                  <Textarea
                    id="ship-address"
                    value={quotationData.shipTo.address}
                    onChange={(e) =>
                      setQuotationData((prev) => ({
                        ...prev,
                        shipTo: { ...prev.shipTo, address: e.target.value },
                      }))
                    }
                    rows={3}
                    className="mt-1 min-h-[80px] text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="ship-postcode" className="text-sm font-medium">
                    Postcode
                  </Label>
                  <Input
                    id="ship-postcode"
                    value={quotationData.shipTo.postcode}
                    onChange={(e) =>
                      setQuotationData((prev) => ({
                        ...prev,
                        shipTo: { ...prev.shipTo, postcode: e.target.value },
                      }))
                    }
                    className="mt-1 h-11"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line Items - Mobile Optimized */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg">Service Items</CardTitle>
                <Button onClick={addLineItem} size="default" className="w-full sm:w-auto h-11">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotationData.lineItems.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                    {/* Mobile-first layout - stack everything vertically */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Item #{index + 1}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={quotationData.lineItems.length === 1}
                        className="h-9 w-9 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Service Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Service Item</Label>
                      <Select
                        value={item.itemName}
                        onValueChange={(value) => updateLineItem(item.id, "itemName", value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultServiceItems.map((service) => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Or type custom service..."
                        value={item.itemName}
                        onChange={(e) => updateLineItem(item.id, "itemName", e.target.value)}
                        className="h-11 text-base"
                      />
                    </div>

                    {/* Quantity, Rate, Amount - Mobile Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, "quantity", Number(e.target.value))}
                          className="mt-1 h-11 text-base text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Rate (RM)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={(e) => updateLineItem(item.id, "rate", Number(e.target.value))}
                          className="mt-1 h-11 text-base text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Amount (RM)</Label>
                        <Input
                          type="number"
                          value={item.amount.toFixed(2)}
                          readOnly
                          className="mt-1 h-11 text-base text-center bg-gray-100 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Calculations - Mobile Optimized */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="discount" className="text-sm font-medium">
                      Discount (RM)
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quotationData.discount}
                      onChange={(e) => setQuotationData((prev) => ({ ...prev, discount: Number(e.target.value) }))}
                      className="mt-1 h-11 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax" className="text-sm font-medium">
                      Tax (%)
                    </Label>
                    <Input
                      id="tax"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={quotationData.tax}
                      onChange={(e) => setQuotationData((prev) => ({ ...prev, tax: Number(e.target.value) }))}
                      className="mt-1 h-11 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickup" className="text-sm font-medium">
                      Pickup Charge (RM)
                    </Label>
                    <Input
                      id="pickup"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quotationData.pickupCharge || 0}
                      onChange={(e) => setQuotationData((prev) => ({ ...prev, pickupCharge: Number(e.target.value) }))}
                      className="mt-1 h-11 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery" className="text-sm font-medium">
                      Delivery Charge (RM)
                    </Label>
                    <Input
                      id="delivery"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quotationData.deliveryCharge || 0}
                      onChange={(e) =>
                        setQuotationData((prev) => ({ ...prev, deliveryCharge: Number(e.target.value) }))
                      }
                      className="mt-1 h-11 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount-paid" className="text-sm font-medium">
                      Amount Paid (RM)
                    </Label>
                    <Input
                      id="amount-paid"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quotationData.amountPaid}
                      onChange={(e) => setQuotationData((prev) => ({ ...prev, amountPaid: Number(e.target.value) }))}
                      className="mt-1 h-11 text-base"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex justify-between text-base">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold">RM {calculations.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold text-red-600">
                        -RM {quotationData.discount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span>Tax ({quotationData.tax}%):</span>
                      <span className="font-mono font-semibold">RM {calculations.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span>Pickup Charge:</span>
                      <span className="font-mono font-semibold">RM {(quotationData.pickupCharge || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span>Delivery Charge:</span>
                      <span className="font-mono font-semibold">
                        RM {(quotationData.deliveryCharge || 0).toFixed(2)}
                      </span>
                    </div>
                    <hr className="my-3" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="font-mono text-klynn-blue">RM {calculations.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span>Amount Paid:</span>
                      <span className="font-mono font-semibold">RM {quotationData.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base">
                      <span>Balance Due:</span>
                      <span className="font-mono text-orange-600">RM {calculations.balanceDue.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Auto-update price button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base bg-transparent"
                    onClick={handleAutoUpdatePrice}
                    disabled={isUpdatingPrice}
                  >
                    {isUpdatingPrice ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    Update Order Final Price
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes and Terms - Improved Logic */}
          {showSettings && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bank Details Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Payment Details</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Bank account details are automatically included in all quotations in a highlighted section.
                    <br />
                    <strong>AUQ VENTURES</strong> • Account: 552077470526 • MAYBANK • SWIFT: MBBEMYKL
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Custom Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={quotationData.notes}
                    onChange={(e) => setQuotationData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Add any special notes or instructions for this quotation..."
                    className="mt-1 text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Notes will only appear in PDF if you add content here. Leave empty for standard quotation.
                  </p>
                </div>

                <div>
                  <Label htmlFor="terms" className="text-sm font-medium">
                    Terms & Conditions
                  </Label>
                  <Textarea
                    id="terms"
                    value={quotationData.terms}
                    onChange={(e) => setQuotationData((prev) => ({ ...prev, terms: e.target.value }))}
                    rows={6}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard terms are used by default. Modify only if you need custom terms for this quotation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto h-11">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveQuotation}
            disabled={isSaving}
            className="w-full sm:w-auto h-11 bg-transparent"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || quotationData.lineItems.length === 0}
            className="bg-klynn-blue hover:bg-klynn-blue/90 w-full sm:w-auto h-11"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
