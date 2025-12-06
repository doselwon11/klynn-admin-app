"use client"

export async function updateOrderStatusClient(orderId: string, newStatus: string, data?: any) {
  const res = await fetch("/api/update-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      newStatus,
      data,
    }),
  })

  return res.json()
}

export async function updateRiderFieldsClient(orderId: string, fields: any) {
  const res = await fetch("/api/update-rider-fields", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      fields,
    }),
  })

  return res.json()
}