import { NextResponse, type NextRequest } from "next/server"
import { getOrders } from "@/lib/data"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  try {
    const orders = await getOrders(status)

    const response = NextResponse.json({ orders })

    // Add strong cache prevention headers
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    response.headers.set("Surrogate-Control", "no-store")
    response.headers.set("Vary", "*")

    return response
  } catch (error) {
    console.error("API Error fetching orders from Klynn Database:", error)
    return NextResponse.json({ message: "Failed to fetch orders" }, { status: 500 })
  }
}
