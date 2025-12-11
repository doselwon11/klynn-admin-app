import { supabase } from "@/lib/supabaseClient"

export interface Order {
  id: string

  // ROOT-LEVEL FIELDS (required by Admin UI)
  name: string
  phone: string

  // STRUCTURED CUSTOMER
  customer: {
    name: string
    phone: string
  }

  pickupAddress?: string
  pickupDate?: string
  status: string
  service?: string
  assignedVendor?: string

  latitude?: number
  longitude?: number
  coordinates?: [number, number] | null

  price?: number | null

  orderType?: string
  deliveryType?: string
  postcode?: string
  timeStamp?: string

  extraDistanceFare?: number | null
  saRiderName?: string | null
  rdRiderName?: string | null
  riderFee?: number | null
  claimStatus?: string | null
  riderNamedCombined?: string | null
  region?: string | null
  identity?: string | null
  riderPayout?: number | null

  vendor?: string | null
  uid?: string | null
  createdAt?: string
}

export async function getOrders(statusFilter: string | null): Promise<Order[]> {
  console.log("🔄 Fetching orders from Supabase...")

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter.trim() !== "") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Supabase getOrders() error:", error);
    return [];
  }

  return data.map((row: any) => {
    const name = row.name || "Unknown";
    const phone = row.phone ? row.phone.toString() : "Unknown";

    return {
      id: row.id,

      /** ROOT LEVEL FIELDS — REQUIRED BY UI */
      name,
      phone,

      /** CUSTOMER OBJECT — ALSO REQUIRED */
      customer: { name, phone },

      /** ADDRESS */
      pickupAddress: row.pickup_address || "",
      pickupDate: row.pickup_date || "",

      /** ORDER DETAILS */
      status: row.status || "pending",
      service: row.service || "",
      assignedVendor: row.vendor || null,

      /** LOCATION */
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      coordinates:
        row.latitude != null && row.longitude != null
          ? [row.latitude, row.longitude]
          : null,

      /** MISC FIELDS */
      postcode: row.postcode || null,
      orderType: row.order_type || null,
      deliveryType: row.delivery_type || null,
      timeStamp: row.time_stamp || null,

      extraDistanceFare: row.extra_distance_fare ?? null,
      saRiderName: row.sa_rider_name ?? null,
      rdRiderName: row.rd_rider_name ?? null,
      riderFee: row.rider_fee ?? null,
      claimStatus: row.claim_status ?? null,
      riderNamedCombined: row.rider_named_combined ?? null,
      region: row.region ?? null,
      identity: row.identity ?? null,
      riderPayout: row.rider_payout ? Number(row.rider_payout) : null,

      price: row.final_price ?? null,
      vendor: row.vendor ?? null,
      uid: row.uid ?? null,
      createdAt: row.created_at || null,
    };
  });
}

export async function updateOrderStatus(orderId: string, newStatus: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)

    if (error) {
      console.error("❌ Supabase update error:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("❌ Unexpected update error:", err)
    return false
  }
}

export async function fetchOrdersFromSheet(): Promise<Order[]> {
  return getOrders(null)
}

export interface Vendor {
  name: string
  color: string
}