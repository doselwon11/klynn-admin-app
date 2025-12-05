import type { Order } from "./data"

interface LineItem {
  id: string
  itemName: string
  quantity: number
  rate: number
  amount: number
}

interface QuotationData {
  quotationNo: string
  date: string
  billTo: {
    name: string
    phone: string
    email: string
  }
  shipTo: {
    address: string
    postcode: string
  }
  lineItems: LineItem[]
  subtotal: number
  discount: number
  tax: number
  pickupCharge: number
  deliveryCharge: number
  total: number
  amountPaid: number
  balanceDue: number
  notes: string
  terms: string
}

export const generateQuotationPDF = async (quotationData: QuotationData, order: Order) => {
  try {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Colors
    const klynnBlue = [37, 94, 255] as const
    const darkGray = [64, 64, 64] as const
    const lightGray = [128, 128, 128] as const

    // Company Header - Text only (no logo)
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("KLYNN", 20, 25)

    // Title and Quotation Number
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text("QUOTATION", 140, 20)

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2])
    doc.text(`Quotation #: ${quotationData.quotationNo}`, 140, 27)
    doc.text(`Date: ${new Date(quotationData.date).toLocaleDateString()}`, 140, 34)

    // Company Information
    doc.setFontSize(10)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text("AUQ VENTURES", 20, 35)
    doc.text("Professional Laundry Services", 20, 41)
    doc.text("Phone: +60 17-336 3747", 20, 47)

    // Horizontal line
    doc.setLineWidth(0.5)
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2])
    doc.line(20, 55, 190, 55)

    // Bill To and Ship To
    let yPos = 70

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("BILL TO:", 20, yPos)
    doc.text("SHIP TO:", 110, yPos)

    yPos += 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])

    // Bill To details
    doc.text(quotationData.billTo.name, 20, yPos)
    doc.text(quotationData.billTo.phone, 20, yPos + 6)
    if (quotationData.billTo.email) {
      doc.text(quotationData.billTo.email, 20, yPos + 12)
    }

    // Ship To details
    const shipToLines = doc.splitTextToSize(quotationData.shipTo.address, 70)
    doc.text(shipToLines, 110, yPos)
    doc.text(quotationData.shipTo.postcode, 110, yPos + shipToLines.length * 6)

    yPos += 25

    // Order Information Section
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("ORDER INFORMATION", 20, yPos)

    yPos += 8
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])

    // Order info in a box
    doc.setFillColor(248, 249, 250)
    doc.rect(20, yPos - 4, 170, 24, "F")
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(20, yPos - 4, 170, 24)

    // Order ID and Date
    doc.text(`Order ID: ${order.id}`, 22, yPos)
    doc.text(`Order Date: ${order.pickupDate}`, 100, yPos)
    yPos += 5

    // Service and Delivery Type
    doc.text(`Service: ${order.service || "N/A"}`, 22, yPos)
    doc.text(`Delivery Type: ${order.deliveryType || "Standard"}`, 100, yPos)
    yPos += 5

    // Order Type and Vendor
    doc.text(`Order Type: ${order.orderType || "Regular"}`, 22, yPos)
    doc.text(`Vendor: ${order.assignedVendor || "Not Assigned"}`, 100, yPos)
    yPos += 5

    // Region
    doc.text(`Region: ${order.region || "N/A"}`, 22, yPos)
    doc.text(`Status: ${order.status}`, 100, yPos)

    yPos += 15

    // Line Items Table
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("SERVICE DETAILS", 20, yPos)

    yPos += 10

    // Table headers
    doc.setFillColor(245, 245, 245)
    doc.rect(20, yPos - 6, 170, 10, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text("DESCRIPTION", 22, yPos)
    doc.text("QTY", 125, yPos)
    doc.text("RATE", 145, yPos)
    doc.text("AMOUNT", 170, yPos)

    yPos += 12

    // Table rows
    doc.setFont("helvetica", "normal")
    quotationData.lineItems.forEach((item, index) => {
      if (yPos > 250) {
        doc.addPage()
        yPos = 30
      }

      // Alternate row background
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(20, yPos - 4, 170, 8, "F")
      }

      const itemLines = doc.splitTextToSize(item.itemName, 95)
      doc.text(itemLines, 22, yPos)
      doc.text(item.quantity.toString(), 127, yPos)
      doc.text(item.rate.toFixed(2), 147, yPos)
      doc.text(item.amount.toFixed(2), 172, yPos)

      yPos += Math.max(8, itemLines.length * 4 + 4)
    })

    // Calculations
    yPos += 15
    const calcStartX = 125
    const calcValueX = 172

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    doc.text("Subtotal:", calcStartX, yPos)
    doc.text(`RM ${quotationData.subtotal.toFixed(2)}`, calcValueX, yPos)

    yPos += 6
    doc.text("Discount:", calcStartX, yPos)
    doc.text(`-RM ${quotationData.discount.toFixed(2)}`, calcValueX, yPos)

    yPos += 6
    doc.text(`Tax (${quotationData.tax}%):`, calcStartX, yPos)
    const taxAmount = (quotationData.subtotal - quotationData.discount) * (quotationData.tax / 100)
    doc.text(`RM ${taxAmount.toFixed(2)}`, calcValueX, yPos)

    yPos += 6
    doc.text("Pickup Charge:", calcStartX, yPos)
    doc.text(`RM ${(quotationData.pickupCharge || 0).toFixed(2)}`, calcValueX, yPos)

    yPos += 6
    doc.text("Delivery Charge:", calcStartX, yPos)
    doc.text(`RM ${(quotationData.deliveryCharge || 0).toFixed(2)}`, calcValueX, yPos)

    // Total
    yPos += 10
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("TOTAL:", calcStartX, yPos)
    doc.text(`RM ${quotationData.total.toFixed(2)}`, calcValueX, yPos)

    yPos += 10
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
    doc.text("Amount Paid:", calcStartX, yPos)
    doc.text(`RM ${quotationData.amountPaid.toFixed(2)}`, calcValueX, yPos)

    yPos += 6
    doc.setFont("helvetica", "bold")
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("Balance Due:", calcStartX, yPos)
    doc.text(`RM ${quotationData.balanceDue.toFixed(2)}`, calcValueX, yPos)

    // Check if we need a new page for additional content
    const remainingSpace = 280 - yPos
    const hasNotes = quotationData.notes && quotationData.notes.trim() !== ""
    const hasCustomTerms =
      quotationData.terms && quotationData.terms.trim() !== "" && quotationData.terms !== defaultTerms

    // Estimate space needed
    let spaceNeeded = 40 // Bank details always shown
    if (hasNotes) spaceNeeded += 25
    if (hasCustomTerms) spaceNeeded += 30
    else spaceNeeded += 20 // Default terms

    if (remainingSpace < spaceNeeded) {
      doc.addPage()
      yPos = 30
    } else {
      yPos += 20
    }

    // Bank Details Section (Always shown)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("PAYMENT DETAILS", 20, yPos)

    yPos += 8
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])

    // Bank details in a box
    doc.setFillColor(248, 249, 250)
    doc.rect(20, yPos - 4, 170, 22, "F")
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(20, yPos - 4, 170, 22)

    doc.text("Payment should be made by crossed cheque / cash / bank transfer payable to:", 22, yPos)
    yPos += 6
    doc.setFont("helvetica", "bold")
    doc.text("AUQ VENTURES", 22, yPos)
    yPos += 5
    doc.setFont("helvetica", "normal")
    doc.text("Account Number: 552077470526  |  Bank: MAYBANK  |  SWIFT: MBBEMYKL", 22, yPos)

    yPos += 15

    // Notes section (Only if notes exist and are not empty)
    if (hasNotes) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
      doc.text("NOTES", 20, yPos)

      yPos += 8
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])
      const notesLines = doc.splitTextToSize(quotationData.notes, 170)
      doc.text(notesLines, 20, yPos)
      yPos += notesLines.length * 5 + 10
    }

    // Terms & Conditions (Smart logic)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(klynnBlue[0], klynnBlue[1], klynnBlue[2])
    doc.text("TERMS & CONDITIONS", 20, yPos)

    yPos += 8
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2])

    let termsToShow = ""

    if (hasCustomTerms) {
      // Use custom terms if they're different from default
      termsToShow = quotationData.terms
    } else {
      // Use concise default terms
      termsToShow = `• Payment due within 7 days of quotation date
• Prices are subject to change without notice
• Special care items may incur additional charges
• Klynn reserves the right to refuse service for heavily soiled items
• This quotation is valid for 30 days from the date of issue`
    }

    const termsLines = doc.splitTextToSize(termsToShow, 170)
    doc.text(termsLines, 20, yPos)

    // Footer with better formatting
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...lightGray)
      doc.text(`Generated: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 20, 285)
      doc.text("Thank you for choosing Klynn!", 140, 285)
    }

    // Save with shorter filename
    doc.save(`Klynn-${quotationData.quotationNo}.pdf`)
    return true
  } catch (error) {
    console.error("Quotation PDF generation failed:", error)
    throw new Error("Failed to generate quotation PDF. Please try again.")
  }
}

// Default terms for comparison
const defaultTerms = `Payment should be made by crossed cheque / cash / bank transfer payable to "AUQ VENTURES"

NAME: AUQ VENTURES
ACC NUMBER: 552077470526
BANK: MAYBANK
SWIFT CODE: MBBEMYKL

Terms & Conditions:
• Payment due within 7 days of quotation date
• Prices are subject to change without notice
• Special care items may incur additional charges
• Klynn reserves the right to refuse service for heavily soiled items`
