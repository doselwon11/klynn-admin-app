import { supabase } from "@/lib/supabaseClient"

export interface Order {
  id: string
  rowNum?: number
  customer?: {
    name: string
    phone: string
  }
  pickupAddress?: string
  pickupDate?: string
  status: string
  service?: string
  assignedVendor?: string
  vendorColor?: string
  coordinates?: [number, number]
  latitude?: number
  longitude?: number
  price?: number
  rowNumber?: number

  // New fields
  orderType?: string
  extraDistanceFare?: number
  saRiderName?: string
  rdRiderName?: string
  riderId?: string
  riderFee?: number
  claimStatus?: string
  riderNamedCombined?: string
  region?: string
  identity?: string
  riderPayout?: number
  deliveryType?: string
  timeStamp?: string
  postcode?: string
}

/**
 * Fetch orders from Supabase
 */
/**
 * Fetch orders from Supabase
 */
export async function getOrders(statusFilter: string | null): Promise<Order[]> {
  console.log("🔄 Fetching orders from Supabase...")

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  // 🚀 FIX: Only apply filter if NOT empty string
  const hasStatusFilter =
    statusFilter !== null &&
    statusFilter !== undefined &&
    statusFilter.trim() !== ""

  if (hasStatusFilter) {
    query = query.eq("status", statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error("❌ Supabase getOrders() error:", error)
    return []
  }

  return data.map((row: any) => ({
    id: row.id,
    customer: {
      name: row.name ?? "Unknown",
      phone: row.phone ? row.phone.toString() : "N/A",
    },
    pickupAddress: row.pickup_address ?? "(No address provided)",
    pickupDate: row.pickup_date ?? null,
    status: row.status ?? "pending",
    service: row.service ?? "(No service)",
    assignedVendor: row.vendor ?? null,

    price: row.final_price ?? null,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    coordinates:
      row.latitude != null && row.longitude != null
        ? [row.latitude, row.longitude]
        : undefined,

    postcode: row.postcode,
    orderType: row.order_type,
    deliveryType: row.delivery_type ?? null,
    timeStamp: row.time_stamp,

    extraDistanceFare: row.extra_distance_fare,
    saRiderName: row.sa_rider_name,
    rdRiderName: row.rd_rider_name,
    riderFee: row.rider_fee,
    claimStatus: row.claim_status,
    riderNamedCombined: row.rider_named_combined,
    region: row.region,
    identity: row.identity,
    riderPayout:
      typeof row.rider_payout === "number"
        ? row.rider_payout
        : Number(row.rider_payout) || 0,


    createdAt: row.created_at,
  }))
}


/**
 * Update an order's status (Supabase)
 */
export async function updateOrderStatus(orderId: string, newStatus: string): Promise<boolean> {
  try {
    console.log(`🔄 Updating order ${orderId} → ${newStatus}`)

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)

    if (error) {
      console.error("❌ Supabase update error:", error)
      return false
    }

    console.log(`✅ Order ${orderId} updated successfully in Supabase`)
    return true
  } catch (err) {
    console.error(`❌ Unexpected update error:`, err)
    return false
  }
}

/**
 * This function remains for compatibility with old code
 */
export async function fetchOrdersFromSheet(): Promise<Order[]> {
  return getOrders(null) // Now fetches from Supabase
}
