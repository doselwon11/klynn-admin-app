import QRCode from "qrcode"
import type { Order } from "./data"
import { maskPhoneNumber } from "./utils"

const generateQrCode = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 400,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
  } catch (err) {
    console.error("QR Code generation error:", err)
    return ""
  }
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

export const generatePdf = async (order: Order) => {
  try {
    const { jsPDF } = await import("jspdf")

    // A5 size: 210mm x 148mm (landscape orientation for better lanyard fit)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a5",
    })

    // Dimensions
    const pageWidth = 210
    const pageHeight = 148
    const centerLine = pageWidth / 2 // 105mm - vertical center line for folding

    // Colors
    const klynnBlue = [37, 94, 255] as const
    const darkGray = [64, 64, 64] as const
    const lightGray = [128, 128, 128] as const

    // White background
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, pageHeight, "F")

    // ===== LEFT SECTION: Customer Info & QR Codes - MOVED UP =====

    // Order ID - moved up significantly
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text(`Order: ${order.id}`, 15, 15)

    // Date - moved up
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
    doc.text(`Date: ${order.pickupDate}`, 15, 23)

    // Horizontal line - moved up
    doc.setLineWidth(0.5)
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2])
    doc.line(15, 30, centerLine - 15, 30)

    // Customer Details - moved up significantly
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text("CUSTOMER DETAILS", 15, 42)

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
    doc.text("Name:", 15, 52)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text(order.customer?.name || 'N/A', 15, 58)

    doc.setFont("helvetica", "normal")
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
    doc.text("Phone:", 15, 68)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text(maskPhoneNumber(order.customer?.phone || ''), 15, 74)

    // QR Codes section - moved up significantly to fit within page
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text("SCAN QR CODES", 15, 88)

    // Generate QR codes
    const qr1Message = `Order ${order.customer?.name || 'Customer'} ${order.id} picked up by rider.`
    const qr1Link = `https://wa.me/60173363747?text=${encodeURIComponent(qr1Message)}`

    const customerPhone = order.customer?.phone?.startsWith("60")
      ? order.customer.phone
      : `60${order.customer?.phone?.substring(1) || ''}`
    const qr2Message = `Hi ${order.customer?.name || 'Customer'}! Your bag has been picked up by Klynn. Sit tight while we KLYNN it.`
    const qr2Link = `https://wa.me/${customerPhone}?text=${encodeURIComponent(qr2Message)}`

    const qr1Image = await generateQrCode(qr1Link)
    const qr2Image = await generateQrCode(qr2Link)

    // QR Codes positioned to fit fully within page (y=95 + 25mm = 120mm, well within 148mm page height)
    if (qr1Image) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
      doc.text("1st QR", 15, 100)
      doc.addImage(qr1Image, "PNG", 15, 102, 25, 25) // Starts at y=102, ends at y=127
    }

    if (qr2Image) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
      doc.text("2nd QR", 50, 100)
      doc.addImage(qr2Image, "PNG", 50, 102, 25, 25) // Starts at y=102, ends at y=127
    }

    // ===== VERTICAL DIVIDER LINE (FOLD LINE) =====
    doc.setLineWidth(1)
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2])
    doc.setLineDashPattern([3, 3], 0)
    doc.line(centerLine, 5, centerLine, pageHeight - 5)
    doc.setLineDashPattern([], 0)

    // ===== RIGHT SECTION: Thank You Message =====

    const rightStart = centerLine + 15 // 15mm margin from fold line
    const rightCenter = centerLine + (pageWidth - centerLine) / 2 // Center of right section

    // Thank You header - Larger for A5
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("Thank You!", rightCenter, 40, { align: "center" })

    // Main message - properly wrapped and larger
    doc.setFontSize(13)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])

    const thankYouText =
      "Thank you for choosing Klynn. We truly appreciate your trust in us to take care of your laundry."
    const rightSectionWidth = pageWidth - centerLine - 20 // Available width minus margins
    const textLines = doc.splitTextToSize(thankYouText, rightSectionWidth)

    let yPos = 55
    textLines.forEach((line: string) => {
      doc.text(line, rightCenter, yPos, { align: "center" })
      yPos += 9
    })

    // Signature - Larger spacing
    yPos += 20
    doc.setFontSize(16)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text("— Haiqal", rightCenter, yPos, { align: "center" })

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
    doc.text("Founder & CEO of Klynn", rightCenter, yPos + 10, { align: "center" })

    // Contact info - Instagram only, larger
    yPos += 30
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
    doc.text("ig @klynn.global", rightCenter, yPos, { align: "center" })

    // ===== FOOTER =====

    // Fold line indicator text
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
    doc.text("← FOLD HERE →", rightCenter, pageHeight - 10, { align: "center" })

    // Footer timestamp
    const timestamp = new Date().toLocaleString()
    doc.text(`Generated: ${timestamp}`, 15, pageHeight - 5)

    // Save the PDF
    doc.save(`Klynn-AWB-${order.id}.pdf`)
    return true
  } catch (error) {
    console.error("PDF generation failed:", error)
    throw new Error("Failed to generate PDF. Please try again.")
  }
}
