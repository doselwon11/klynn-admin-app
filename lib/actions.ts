"use server"

import { revalidatePath } from "next/cache"

const WEBHOOK_URL = "https://hook.eu2.make.com/t0eyqd1xvfndnfaxruhap6tyomejj3zk"

export async function updateOrderStatus(rowNum: number, newStatus: string) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowNum: rowNum.toString(), status: newStatus }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Klynn Database webhook failed: ${response.status} ${errorBody}`)
      throw new Error(`Klynn Database webhook failed: ${response.status}`)
    }

    revalidatePath("/orders")
    revalidatePath("/history")
    return { success: true, message: "Status updated successfully in Klynn Database" }
  } catch (error) {
    console.error("Error updating order status in Klynn Database:", error)
    return { success: false, message: "Failed to update status in Klynn Database." }
  }
}
