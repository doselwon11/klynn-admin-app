"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { QrCode, HelpCircle, ArrowLeft } from "lucide-react"
import { NativeScannerInstructions } from "./native-scanner-instructions"
import { useUser } from "@/hooks/use-user"

export function QrScanner() {
  const [showInstructions, setShowInstructions] = useState(false)
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "other">("other")
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType("ios")
    } else if (/android/.test(userAgent)) {
      setDeviceType("android")
    } else {
      setDeviceType("other")
    }
  }, [])

  const getDeviceName = () => {
    switch (deviceType) {
      case "ios":
        return "iPhone"
      case "android":
        return "Android"
      default:
        return "Phone"
    }
  }

  const getRoleInstructions = () => {
    switch (user?.role) {
      case "rider":
        return "You can scan both QR codes on the AWB label"
      case "vendor":
        return "You can only scan the 1st QR code (HQ notification)"
      case "superhost":
        return "You can scan both QR codes for notifications"
      default:
        return "Scan the QR codes on Klynn AWB labels"
    }
  }

  return (
    <>
      <NativeScannerInstructions isOpen={showInstructions} setIsOpen={setShowInstructions} deviceType={deviceType} />

      <div className="w-full max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xl">QR Code Scanner</CardTitle>
            <CardDescription>
              Scan as {user?.role?.toUpperCase()} • {getRoleInstructions()}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-klynn-blue/20 bg-gradient-to-br from-blue-50 to-klynn-blue/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <QrCode className="w-20 h-20 mx-auto text-klynn-blue" />

              <div>
                <h3 className="font-bold text-xl mb-2 text-gray-800">Use Your {getDeviceName()}'s Scanner</h3>
                <p className="text-gray-600 mb-4">Your phone's built-in scanner works best with Klynn AWB labels.</p>
              </div>

              <Button
                onClick={() => setShowInstructions(true)}
                className="w-full bg-klynn-blue hover:bg-klynn-blue/90 text-white"
                size="lg"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Show Scanning Instructions
              </Button>

              <div className="bg-white/80 rounded-lg p-4 text-sm text-gray-600">
                <p className="font-semibold mb-2">Quick Steps:</p>
                <div className="text-left space-y-1">
                  <p>1. Open your phone's camera or QR scanner</p>
                  <p>2. Point at the Klynn AWB QR code</p>
                  <p>3. Tap the WhatsApp link that appears</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => router.push("/orders")} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    </>
  )
}
