import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  const { orderId, newStatus } = await request.json();

  if (!orderId || !newStatus) {
    return NextResponse.json(
      { success: false, message: "Missing orderId or newStatus" },
      { status: 400 }
    );
  }

  // THIS USES THE SERVICE ROLE AND BYPASSES RLS
  const { error } = await supabaseServer
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    console.error("Failed updating order:", error);
    return NextResponse.json(
      { success: false, message: "❌ Supabase update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Order ${orderId} updated to ${newStatus}`,
  });
}