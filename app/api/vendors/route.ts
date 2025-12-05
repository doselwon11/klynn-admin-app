import { NextResponse } from "next/server"
import Papa from "papaparse"

export const dynamic = "force-dynamic"

interface Vendor {
  name: string
  area: string
  service: string
  ratePerKg: number
  phone: string
  postcode: string
  latitude?: number
  longitude?: number
  coordinates?: [number, number]
}

const VENDOR_SHEET_ID = "1V_rOaoAHYTH987iRL4eGV-PDdxZPA9r27o5zgTfxxqU"
const VENDOR_SHEET_NAME = "Sheet1"
const VENDOR_SHEET_URL = `https://docs.google.com/spreadsheets/d/${VENDOR_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${VENDOR_SHEET_NAME}`

// Clean and parse coordinate value
function parseCoordinate(value: any): number | undefined {
  if (!value) return undefined

  // Convert to string and clean up
  let cleanValue = value.toString().trim()

  // Remove any non-numeric characters except decimal point and minus sign
  cleanValue = cleanValue.replace(/[^\d.-]/g, "")

  // Handle cases like "6.2030.1" - take the first valid decimal number
  const match = cleanValue.match(/^-?\d+\.?\d*/)
  if (match) {
    const num = Number.parseFloat(match[0])
    return isNaN(num) ? undefined : num
  }

  return undefined
}

export async function GET() {
  try {
    const timestamp = new Date().getTime()
    const response = await fetch(`${VENDOR_SHEET_URL}&cachebust=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch vendor sheet: ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log("📊 Vendor CSV data:", csvText.substring(0, 500))

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length) {
      console.error("Vendor parsing errors:", parsed.errors)
    }

    const vendors = parsed.data as any[]
    console.log("📋 Sample vendor row:", vendors[0])
    console.log("📋 Available vendor columns:", Object.keys(vendors[0] || {}))

    const mappedVendors: Vendor[] = vendors
      .map((row) => {
        // Parse coordinates
        const latValue = row.latitude || row.Latitude || row.lat || row.Lat || null
        const lngValue = row.longitude || row.Longitude || row.lng || row.Lng || row.long || row.Long || null

        const lat = parseCoordinate(latValue)
        const lng = parseCoordinate(lngValue)

        let coordinates: [number, number] | undefined
        if (lat !== undefined && lng !== undefined) {
          // Validate coordinates are reasonable
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            coordinates = [lat, lng]
            console.log(`✅ Vendor ${row.name}: Valid coordinates ${lat}, ${lng}`)
          } else {
            console.log(`⚠️ Vendor ${row.name}: Invalid coordinate range ${lat}, ${lng}`)
          }
        } else {
          console.log(`❌ Vendor ${row.name}: Missing coordinates`)
        }

        return {
          name: row.name || "",
          area: row.area || "",
          service: row.service || "",
          ratePerKg: Number.parseFloat(row.rate) || 0,
          phone: row.phone || "",
          postcode: row.postcode || "",
          latitude: lat,
          longitude: lng,
          coordinates,
        }
      })
      .filter((vendor) => vendor.name) // Only include vendors with names

    console.log(`✅ Successfully processed ${mappedVendors.length} vendors`)
    console.log(`📍 Vendors with GPS coordinates: ${mappedVendors.filter((v) => v.coordinates).length}`)

    return NextResponse.json({ vendors: mappedVendors })
  } catch (error) {
    console.error("Error fetching vendors from Klynn Database:", error)
    return NextResponse.json({ message: "Failed to fetch vendors" }, { status: 500 })
  }
}
