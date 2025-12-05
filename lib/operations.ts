"use server"

import { revalidatePath } from "next/cache"

const WEBHOOK_URL = "https://hook.eu2.make.com/t0eyqd1xvfndnfaxruhap6tyomejj3zk"
const RIDER_NOTIFICATION_WEBHOOK_URL = "https://hook.eu2.make.com/5gxj6pckmvuuedu2e9kafj5w1hb16sjn"

export interface UpdateStatusOperation {
  operation: "update"
  rowNum: string
  status: string
}

export interface UpdatePriceOperation {
  operation: "price"
  rowNum: string
  final_price: string
}

export interface AssignVendorOperation {
  operation: "assign_vendor"
  rowNum: string
  vendor: string
}

export interface AddVendorOperation {
  operation: "add_vendor"
  rowNum: string
  name: string
  area: string
  service: string
  "rate/kg": string
  phone: string
  postcode: string
}

export interface AutoAssignVendorOperation {
  operation: "auto_assign_vendor"
  rowNum: string
  vendor: string
  postcode: string
}

export interface UpdateRiderFieldsOperation {
  operation: "update_rider_fields"
  rowNum: string
  SA_rider_name?: string
  RD_rider_name?: string
  Region?: string
  Identity?: string
  rider_payout?: string
}

// Interface for rider notification data
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

type WebhookOperation =
  | UpdateStatusOperation
  | UpdatePriceOperation
  | AssignVendorOperation
  | AddVendorOperation
  | AutoAssignVendorOperation
  | UpdateRiderFieldsOperation

export async function sendWebhookOperation(operation: WebhookOperation) {
  try {
    console.log(`🔄 Sending webhook operation:`, operation)

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operation),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`❌ Webhook failed: ${response.status} ${errorBody}`)
      throw new Error(`Webhook failed: ${response.status}`)
    }

    const responseData = await response.text()
    console.log(`✅ Webhook success:`, responseData)

    revalidatePath("/orders")
    revalidatePath("/history")
    revalidatePath("/map")

    return { success: true, message: "Operation completed successfully" }
  } catch (error) {
    console.error("❌ Error sending webhook operation:", error)
    return { success: false, message: "Failed to complete operation." }
  }
}

// Function to send rider notification when order is approved
export async function sendRiderNotification(orderData: RiderNotificationData) {
  try {
    console.log(`📱 Sending rider notification for order:`, orderData)

    const response = await fetch(RIDER_NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`❌ Rider notification webhook failed: ${response.status} ${errorBody}`)
      // Don't throw - we don't want to fail the main operation if notification fails
      return { success: false, message: "Notification failed but order updated" }
    }

    const responseData = await response.text()
    console.log(`✅ Rider notification sent successfully:`, responseData)

    return { success: true, message: "Rider notification sent" }
  } catch (error) {
    console.error("❌ Error sending rider notification:", error)
    // Don't throw - we don't want to fail the main operation if notification fails
    return { success: false, message: "Notification failed but order updated" }
  }
}

export async function updateOrderStatus(rowNum: number, newStatus: string) {
  // Validate inputs
  if (!rowNum || isNaN(rowNum) || rowNum < 1) {
    console.error("❌ Invalid row number for status update:", rowNum)
    return { success: false, message: "Invalid row number" }
  }

  if (!newStatus || newStatus.trim() === "") {
    console.error("❌ Invalid status:", newStatus)
    return { success: false, message: "Invalid status" }
  }

  console.log(`📊 Updating status for row ${rowNum} to: ${newStatus}`)

  return sendWebhookOperation({
    operation: "update",
    rowNum: rowNum.toString(),
    status: newStatus.trim(),
  })
}

// Extended version that also sends rider notification when status becomes "approved"
export async function updateOrderStatusWithNotification(
  rowNum: number, 
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
  // Validate inputs
  if (!rowNum || isNaN(rowNum) || rowNum < 1) {
    console.error("❌ Invalid row number for status update:", rowNum)
    return { success: false, message: "Invalid row number" }
  }

  if (!newStatus || newStatus.trim() === "") {
    console.error("❌ Invalid status:", newStatus)
    return { success: false, message: "Invalid status" }
  }

  console.log(`📊 Updating status for row ${rowNum} to: ${newStatus}`)

  // First, update the status
  const result = await sendWebhookOperation({
    operation: "update",
    rowNum: rowNum.toString(),
    status: newStatus.trim(),
  })

  // If status update succeeded and new status is "approved", send rider notification
  if (result.success && newStatus.trim().toLowerCase() === "approved" && orderData) {
    console.log(`📱 Order approved - sending rider notification...`)
    
    // Extract postcode from pickup address if not provided separately
    let postcode = orderData.postcode || ""
    if (!postcode && orderData.pickupAddress) {
      const postcodeMatch = orderData.pickupAddress.match(/\d{5}/)
      postcode = postcodeMatch ? postcodeMatch[0] : ""
    }

    // Use riderFee first (from Google Sheet), fallback to riderPayout
    const riderPayoutValue = orderData.riderFee ?? orderData.riderPayout ?? 0

    const notificationData: RiderNotificationData = {
      action: "approve_payment",
      "pickup-address": orderData.pickupAddress || "",
      postcode: postcode,
      "delivery-type": orderData.deliveryType || "Standard",
      order_type: orderData.orderType || "Regular",
      rider_payout: riderPayoutValue > 0 ? riderPayoutValue.toFixed(2) : "0.00",
      date: orderData.date || new Date().toISOString().split("T")[0],
    }

    const notificationResult = await sendRiderNotification(notificationData)
    
    if (notificationResult.success) {
      return { 
        success: true, 
        message: "Status updated and rider notification sent successfully" 
      }
    } else {
      return { 
        success: true, 
        message: "Status updated but rider notification may have failed" 
      }
    }
  }

  return result
}

export async function updateOrderPrice(rowNum: number, finalPrice: string) {
  // Validate inputs
  if (!rowNum || isNaN(rowNum) || rowNum < 1) {
    console.error("❌ Invalid row number for price update:", rowNum)
    return { success: false, message: "Invalid row number" }
  }

  if (!finalPrice || finalPrice.trim() === "") {
    console.error("❌ Invalid price:", finalPrice)
    return { success: false, message: "Invalid price" }
  }

  console.log(`💰 Updating price for row ${rowNum} to: ${finalPrice}`)

  return sendWebhookOperation({
    operation: "price",
    rowNum: rowNum.toString(),
    final_price: finalPrice.trim(),
  })
}

export async function assignVendor(rowNum: number, vendorName: string) {
  // Validate inputs
  if (!rowNum || isNaN(rowNum) || rowNum < 1) {
    console.error("❌ Invalid row number for vendor assignment:", rowNum)
    return { success: false, message: "Invalid row number" }
  }

  if (!vendorName || vendorName.trim() === "") {
    console.error("❌ Invalid vendor name:", vendorName)
    return { success: false, message: "Invalid vendor name" }
  }

  const cleanVendorNameValue = vendorName.trim()
  console.log(`🏭 Assigning vendor "${cleanVendorNameValue}" to row ${rowNum}`)

  return sendWebhookOperation({
    operation: "assign_vendor",
    rowNum: rowNum.toString(),
    vendor: cleanVendorNameValue,
  })
}

export async function autoAssignVendor(rowNum: number, vendorName: string, customerPostcode: string) {
  // Validate inputs
  if (!rowNum || isNaN(rowNum) || rowNum < 1) {
    console.error("❌ Invalid row number for auto assignment:", rowNum)
    return { success: false, message: "Invalid row number" }
  }

  if (!vendorName || vendorName.trim() === "") {
    console.error("❌ Invalid vendor name for auto assignment:", vendorName)
    return { success: false, message: "Invalid vendor name" }
  }

  if (!customerPostcode || customerPostcode.trim() === "") {
    console.error("❌ Invalid postcode for auto assignment:", customerPostcode)
    return { success: false, message: "Invalid postcode" }
  }

  const cleanVendorNameValue = vendorName.trim()
  const cleanPostcode = customerPostcode.trim()

  console.log(`🤖 Auto-assigning vendor "${cleanVendorNameValue}" to row ${rowNum} (postcode: ${cleanPostcode})`)

  return sendWebhookOperation({
    operation: "auto_assign_vendor",
    rowNum: rowNum.toString(),
    vendor: cleanVendorNameValue,
    postcode: cleanPostcode,
  })
}

export async function addNewVendor(
  rowNum: number,
  vendorData: {
    name: string
    area: string
    service: string
    ratePerKg: string
    phone: string
    postcode: string
  },
) {
  // Validate inputs
  if (!rowNum || isNaN(rowNum) || rowNum < 1) {
    console.error("❌ Invalid row number for adding vendor:", rowNum)
    return { success: false, message: "Invalid row number" }
  }

  // Validate vendor data
  const requiredFields = ["name", "area", "service", "ratePerKg", "phone", "postcode"]
  for (const field of requiredFields) {
    if (!vendorData[field as keyof typeof vendorData] || vendorData[field as keyof typeof vendorData].trim() === "") {
      console.error(`❌ Missing or invalid vendor ${field}:`, vendorData[field as keyof typeof vendorData])
      return { success: false, message: `Invalid vendor ${field}` }
    }
  }

  console.log(`➕ Adding new vendor "${vendorData.name}" for row ${rowNum}`)

  return sendWebhookOperation({
    operation: "add_vendor",
    rowNum: rowNum.toString(),
    name: vendorData.name.trim(),
    area: vendorData.area.trim(),
    service: vendorData.service.trim(),
    "rate/kg": vendorData.ratePerKg.trim(),
    phone: vendorData.phone.trim(),
    postcode: vendorData.postcode.trim(),
  })
}

export async function updateOrderInSheet(
  rowNumber: number,
  updates: { status?: string; vendor?: string; price?: string },
): Promise<UpdateResult> {
  try {
    console.log("Updating order in sheet:", { rowNumber, updates })

    // Simulate API call for now
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real implementation, this would update the Google Sheet
    // using the Google Sheets API with the GOOGLE_SHEETS_CONFIG

    return {
      success: true,
      message: "Order updated successfully",
    }
  } catch (error) {
    console.error("Failed to update order:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update order",
    }
  }
}

export async function fetchOrdersFromSheet(): Promise<any[]> {
  try {
    // In a real implementation, this would fetch from Google Sheets
    // using the GOOGLE_SHEETS_CONFIG

    // For now, return empty array to use sample data
    return []
  } catch (error) {
    console.error("Failed to fetch orders:", error)
    return []
  }
}

export async function updateRiderFields(
  rowNum: number,
  fields: {
    saRiderName?: string
    rdRiderName?: string
    region?: string
    identity?: string
    riderPayout?: string
  }
) {
  // Validate inputs
  if (!rowNum || isNaN(rowNum) || rowNum < 1) {
    console.error("❌ Invalid row number for rider fields update:", rowNum)
    return { success: false, message: "Invalid row number" }
  }

  // Check if at least one field is provided
  const hasFields = Object.values(fields).some(v => v !== undefined && v !== "")
  if (!hasFields) {
    console.error("❌ No fields provided for update")
    return { success: false, message: "No fields to update" }
  }

  console.log(`🏍️ Updating rider fields for row ${rowNum}:`, fields)

  const operation: UpdateRiderFieldsOperation = {
    operation: "update_rider_fields",
    rowNum: rowNum.toString(),
  }

  if (fields.saRiderName !== undefined) {
    operation.SA_rider_name = fields.saRiderName.trim()
  }
  if (fields.rdRiderName !== undefined) {
    operation.RD_rider_name = fields.rdRiderName.trim()
  }
  if (fields.region !== undefined) {
    operation.Region = fields.region.trim()
  }
  if (fields.identity !== undefined) {
    operation.Identity = fields.identity.trim()
  }
  if (fields.riderPayout !== undefined) {
    operation.rider_payout = fields.riderPayout.trim()
  }

  return sendWebhookOperation(operation)
}
