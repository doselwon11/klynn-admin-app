"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, Apple } from "lucide-react"
import { useUser } from "@/hooks/use-user"

interface NativeScannerInstructionsProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  deviceType: "ios" | "android" | "other"
}

export function NativeScannerInstructions({ isOpen, setIsOpen, deviceType }: NativeScannerInstructionsProps) {
  const { user } = useUser()

  const renderIOSInstructions = () => (
    <div className="text-center space-y-4">
      <Apple className="w-12 h-12 mx-auto text-gray-700" />
      <DialogTitle className="text-xl font-bold">iPhone Scanner Instructions</DialogTitle>
      <div className="text-left space-y-4 text-sm">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="font-semibold text-blue-800 mb-2">Method 1: Control Center (Recommended)</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">1.</div>
                <div>Swipe down from the top-right corner to open Control Center</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">2.</div>
                <div>
                  Tap the <strong>Code Scanner</strong> icon (QR code symbol)
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">3.</div>
                <div>Point at the Klynn AWB QR code</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <p className="font-semibold text-gray-800 mb-2">Method 2: Camera App</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">1.</div>
                <div>Open the Camera app</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">2.</div>
                <div>Point the camera at the QR code</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">3.</div>
                <div>Tap the notification that appears</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderAndroidInstructions = () => (
    <div className="text-center space-y-4">
      <Smartphone className="w-12 h-12 mx-auto text-green-500" />
      <DialogTitle className="text-xl font-bold">Android Scanner Instructions</DialogTitle>
      <div className="text-left space-y-4 text-sm">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <p className="font-semibold text-green-800 mb-2">Method 1: Camera App</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">1.</div>
                <div>Open your Camera app</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">2.</div>
                <div>Point at the QR code for 2-3 seconds</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">3.</div>
                <div>Tap the link notification that appears</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4">
            <p className="font-semibold text-gray-800 mb-2">Method 2: Google Lens</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">1.</div>
                <div>Open Google Lens app (or Google Assistant)</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">2.</div>
                <div>Point at the QR code</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="font-bold text-klynn-blue text-lg">3.</div>
                <div>Tap the result to open WhatsApp</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderRoleInstructions = () => (
    <Card className="bg-klynn-blue/10 border-klynn-blue/20 mt-4">
      <CardContent className="pt-4">
        <p className="font-semibold text-klynn-blue mb-2">As a {user?.role?.toUpperCase()}:</p>
        <div className="text-sm space-y-1">
          {user?.role === "rider" && (
            <>
              <p>
                • <strong>1st QR:</strong> Notifies HQ that you picked up the order
              </p>
              <p>
                • <strong>2nd QR:</strong> Notifies the customer that their bag was picked up
              </p>
            </>
          )}
          {user?.role === "vendor" && (
            <>
              <p>
                • <strong>1st QR only:</strong> Notifies HQ that you received the bag
              </p>
              <p>
                • <strong>Don't scan 2nd QR:</strong> That's for riders only
              </p>
            </>
          )}
          {user?.role === "superhost" && (
            <>
              <p>
                • <strong>1st QR:</strong> Opens WhatsApp to notify HQ
              </p>
              <p>
                • <strong>2nd QR:</strong> Opens WhatsApp to notify customer
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          {deviceType === "ios" ? renderIOSInstructions() : renderAndroidInstructions()}
          {renderRoleInstructions()}
        </DialogHeader>
        <Button onClick={() => setIsOpen(false)} className="mt-4 w-full bg-klynn-blue hover:bg-klynn-blue/90">
          Got it, let's scan!
        </Button>
      </DialogContent>
    </Dialog>
  )
}
