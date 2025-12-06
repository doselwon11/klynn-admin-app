import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabaseClient"

// ------------------------------
//  WEBHOOKS (unchanged)
// ------------------------------

const WEBHOOK_URL = "https://hook.eu2.make.com/t0eyqd1xvfndnfaxruhap6tyomejj3zk"
const RIDER_NOTIFICATION_WEBHOOK_URL = "https://hook.eu2.make.com/5gxj6pckmvuuedu2e9kafj5w1hb16sjn"

export interface RiderNotificationData {
  action: "approve_payment"
  "pickup-address": string
  postcode: string
  "delivery-type": string
  order_type: string
  rider_payout: string
  date: string
}

interface UpdateResult {
  success: boolean
  message: string
}

// ------------------------------
//  GENERIC SUPABASE UPDATE
// ------------------------------

async function updateSupabaseOrder(id: string, updates: Record<string, any>): Promise<UpdateResult> {
  const { error } = await supabase.from("orders").update(updates).eq("id", id)

  if (error) {
    console.error("❌ Supabase update error:", error)
    return { success: false, message: "Failed to update Supabase" }
  }

  return { success: true, message: "Updated successfully" }
}

// ------------------------------
//  UPDATE STATUS
// ------------------------------

export async function updateOrderStatusWithNotification(
  orderId: string,
  newStatus: string,
  orderData?: {
    pickupAddress: string
    postcode: string
    deliveryType: string
    orderType: string
    riderFee: number | undefined
    riderPayout: number | undefined
    date: string
  }
) {
  if (!orderId) return { success: false, message: "Missing orderId" }
  if (!newStatus) return { success: false, message: "Missing newStatus" }

  // Update Supabase
  const updateResult = await updateSupabaseOrder(orderId, { status: newStatus })

  if (!updateResult.success) return updateResult

  // If approved → send Telegram notification
  if (newStatus.toLowerCase() === "approved" && orderData) {
    const payout = orderData.riderFee ?? orderData.riderPayout ?? 0

    const payload: RiderNotificationData = {
      action: "approve_payment",
      "pickup-address": orderData.pickupAddress,
      postcode: orderData.postcode || "",
      "delivery-type": orderData.deliveryType,
      order_type: orderData.orderType,
      rider_payout: payout.toFixed(2),
      date: orderData.date,
    }

    await fetch(RIDER_NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  }

  revalidatePath("/orders")
  revalidatePath("/history")
  revalidatePath("/map")

  return { success: true, message: "Order status updated" }
}

// ------------------------------
//  UPDATE RIDER FIELDS
// ------------------------------

export async function updateRiderFields(
  orderId: string,
  fields: {
    saRiderName?: string
    rdRiderName?: string
    region?: string
    identity?: string
    riderPayout?: string
  }
) {
  if (!orderId) return { success: false, message: "Missing orderId" }

  const updates: Record<string, any> = {}

  if (fields.saRiderName) updates.sa_rider_name = fields.saRiderName.trim()
  if (fields.rdRiderName) updates.rd_rider_name = fields.rdRiderName.trim()
  if (fields.region) updates.region = fields.region.trim()
  if (fields.identity) updates.identity = fields.identity.trim()
  if (fields.riderPayout)
    updates.rider_payout = parseFloat(fields.riderPayout) || 0

  return updateSupabaseOrder(orderId, updates)
}

// ------------------------------
//  UPDATE PRICE
// ------------------------------

export async function updateOrderPrice(orderId: string, price: string) {
  if (!orderId) return { success: false, message: "Missing orderId" }
  if (!price) return { success: false, message: "Missing price" }

  return updateSupabaseOrder(orderId, { final_price: parseFloat(price) })
}

// ------------------------------
//  ASSIGN VENDOR
// ------------------------------

export async function assignVendor(orderId: string, vendorName: string) {
  if (!orderId) return { success: false, message: "Missing orderId" }
  if (!vendorName) return { success: false, message: "Missing vendor name" }

  return updateSupabaseOrder(orderId, { vendor: vendorName.trim() })
}

// ------------------------------
//  AUTO ASSIGN VENDOR
// ------------------------------

export async function autoAssignVendor(orderId: string, vendor: string, postcode: string) {
  if (!orderId) return { success: false, message: "Missing orderId" }
  if (!vendor || !postcode) return { success: false, message: "Missing vendor or postcode" }

  return updateSupabaseOrder(orderId, {
    vendor,
    postcode,
  })
}

// ------------------------------
//  ADD NEW VENDOR
// ------------------------------

export async function addNewVendor(orderId: string, vendorData: any) {
  if (!orderId) return { success: false, message: "Missing orderId" }

  return updateSupabaseOrder(orderId, {
    vendor: vendorData.name,
    postcode: vendorData.postcode,
  })
}
