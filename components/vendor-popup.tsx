"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Phone, MapPin, Navigation, Star, Clock } from "lucide-react"
import type { Vendor } from "@/lib/vendors"

interface VendorPopupProps {
  vendor: Vendor
  isOpen: boolean
  onClose: () => void
}

export function VendorPopup({ vendor, isOpen, onClose }: VendorPopupProps) {
  const handleCall = () => {
    if (vendor.phone) {
      window.open(`tel:${vendor.phone}`, "_self")
    }
  }

  const handleNavigate = () => {
    if (vendor.coordinates) {
      const [lat, lng] = vendor.coordinates
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank")
    }
  }

  const getVendorTypeInfo = (vendor: Vendor) => {
    if (vendor.name.toLowerCase().includes("season")) {
      return {
        type: "Wash & Fold Specialist",
        icon: "🧺",
        color: "bg-green-100 text-green-800 border-green-200",
        specialty: "Kg packages, wash-dry-fold services",
      }
    }
    if (vendor.name.toLowerCase().includes("theresa")) {
      return {
        type: "Full Service Laundry",
        icon: "👟",
        color: "bg-purple-100 text-purple-800 border-purple-200",
        specialty: "Shoes, mattress, dry cleaning",
      }
    }
    if (vendor.name.toLowerCase().includes("ampang")) {
      return {
        type: "Dry Cleaning Expert",
        icon: "👔",
        color: "bg-orange-100 text-orange-800 border-orange-200",
        specialty: "Dry cleaning, delicate items",
      }
    }
    return {
      type: "General Laundry",
      icon: "🏭",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      specialty: "All laundry services",
    }
  }

  const vendorInfo = getVendorTypeInfo(vendor)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
              <Building2 className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
              <p className="text-sm text-gray-600">{vendor.area}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vendor Type Card */}
          <Card className={`border-2 ${vendorInfo.color}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{vendorInfo.icon}</div>
                <div>
                  <h4 className="font-semibold">{vendorInfo.type}</h4>
                  <p className="text-sm opacity-80">{vendorInfo.specialty}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <div className="text-sm font-medium text-gray-900">Service</div>
                <div className="text-xs text-gray-600 capitalize">{vendor.service}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <MapPin className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-sm font-medium text-gray-900">Postcode</div>
                <div className="text-xs text-gray-600">{vendor.postcode || "N/A"}</div>
              </CardContent>
            </Card>
          </div>

          {/* GPS Coordinates */}
          {vendor.coordinates && (
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">GPS Location</span>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {vendor.coordinates[0].toFixed(6)}, {vendor.coordinates[1].toFixed(6)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact & Navigation */}
          <div className="flex gap-2">
            {vendor.phone && (
              <Button onClick={handleCall} className="flex-1 bg-transparent" variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Call Vendor
              </Button>
            )}
            {vendor.coordinates && (
              <Button onClick={handleNavigate} className="flex-1">
                <Navigation className="w-4 h-4 mr-2" />
                Navigate
              </Button>
            )}
          </div>

          {/* Assignment Rules Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Auto-Assignment Rules</span>
              </div>
              <div className="text-xs text-blue-800">
                {vendor.name.toLowerCase().includes("season") && (
                  <p>• Automatically assigned for kg packages in Langkawi</p>
                )}
                {vendor.name.toLowerCase().includes("theresa") && (
                  <p>• Automatically assigned for non-kg services in Langkawi (shoes, mattress, etc.)</p>
                )}
                {vendor.name.toLowerCase().includes("ampang") && (
                  <p>• Automatically assigned for non-kg services in KL area</p>
                )}
                {!vendor.name.toLowerCase().includes("season") &&
                  !vendor.name.toLowerCase().includes("theresa") &&
                  !vendor.name.toLowerCase().includes("ampang") && (
                    <p>• Distance-based assignment for general services</p>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
