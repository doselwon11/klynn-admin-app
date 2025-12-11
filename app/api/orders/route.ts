import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getOrders } from "@/lib/data"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  try {
    // Fetch raw orders using supabaseAdmin (bypass RLS)
    let query = supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (status && status.trim()) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("supabaseAdmin error:", error)
      return NextResponse.json({ orders: [] }, { status: 500 })
    }

    // Transform rows → UI format
    const orders = await getOrders(status)

    return NextResponse.json({ orders })
  } catch (err) {
    console.error("API error:", err)
    return NextResponse.json({ orders: [] }, { status: 500 })
  }
}