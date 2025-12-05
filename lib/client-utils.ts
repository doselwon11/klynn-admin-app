// Client-side utility functions that don't need server actions

// Calculate distance between coordinates
export function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180
  const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[0] * Math.PI) / 180) *
      Math.cos((coord2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "+60123456789"

  // Clean the phone number
  const cleanPhone = phone.toString().replace(/[^\d]/g, "")

  console.log(`📱 Formatting phone: "${phone}" → cleaned: "${cleanPhone}"`)

  // Handle different database formats
  if (cleanPhone.startsWith("60")) {
    // Database already has country code (like "600173363747")
    const result = `+${cleanPhone}`
    console.log(`📱 Database has 60 prefix: "${cleanPhone}" → "${result}"`)
    return result
  } else if (cleanPhone.startsWith("0")) {
    // Remove leading 0 and add +60 (like "0173363747" → "+60173363747")
    const result = `+60${cleanPhone.substring(1)}`
    console.log(`📱 Database has 0 prefix: "${cleanPhone}" → "${result}"`)
    return result
  } else {
    // Add +60 to number (like "173363747" → "+60173363747")
    const result = `+60${cleanPhone}`
    console.log(`📱 Database no prefix: "${cleanPhone}" → "${result}"`)
    return result
  }
}

// Format phone number for WhatsApp (remove + and spaces)
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "")

  // If it starts with 60, use as is
  if (digits.startsWith("60")) {
    return digits
  }

  // If it starts with 0, replace with 60
  if (digits.startsWith("0")) {
    return "60" + digits.substring(1)
  }

  // If it starts with 1 and is Malaysian format, add 60
  if (digits.startsWith("1") && digits.length >= 9) {
    return "60" + digits
  }

  // Default: assume Malaysian number and add 60
  return digits
}

// Helper function to mask phone numbers for display
export function maskPhoneNumber(phone: string): string {
  if (!phone) return ""

  // Format: +60 17-336 3747
  const digits = phone.replace(/\D/g, "")

  if (digits.startsWith("60") && digits.length >= 10) {
    const countryCode = digits.substring(0, 2)
    const areaCode = digits.substring(2, 4)
    const firstPart = digits.substring(4, 7)
    const lastPart = digits.substring(7)

    return `+${countryCode} ${areaCode}-${firstPart} ${lastPart}`
  }

  return phone
}

// Generate order ID
export function generateOrderId(dateStr: string, index: number): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    const today = new Date()
    const yy = today.getFullYear().toString().slice(-2)
    const mm = (today.getMonth() + 1).toString().padStart(2, "0")
    return `KLN-${yy}${mm}XX-${(index + 1).toString().padStart(3, "0")}`
  }
  const yy = date.getFullYear().toString().slice(-2)
  const mm = (date.getMonth() + 1).toString().padStart(2, "0")
  const dd = date.getDate().toString().padStart(2, "0")
  const seq = (index + 1).toString().padStart(3, "0")
  return `KLN-${yy}${mm}${dd}-${seq}`
}

// Generate consistent colors for vendors
export function getVendorColor(vendorName: string): string {
  if (!vendorName) return "#94a3b8" // Default gray

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ]

  let hash = 0
  for (let i = 0; i < vendorName.length; i++) {
    hash = vendorName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Clean and parse coordinate value
export function parseCoordinate(value: any): number | undefined {
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

// Client-side utility functions for route optimization and calculations

export interface RouteDestination {
  location: [number, number]
  name: string
  type: "customer" | "vendor"
}

export interface OptimizedRouteStop extends RouteDestination {
  distance: number
  totalDistance: number
}

// Calculate optimized route for multiple stops - CLIENT SIDE FUNCTION
export function calculateOptimizedRoute(
  startLocation: [number, number],
  destinations: RouteDestination[],
): OptimizedRouteStop[] {
  console.log("🗺️ Calculating optimized route from:", startLocation)
  console.log("📍 Destinations:", destinations)

  // Simple nearest-neighbor algorithm for route optimization
  const route: OptimizedRouteStop[] = []
  let currentLocation = startLocation
  const remainingDestinations = [...destinations]

  while (remainingDestinations.length > 0) {
    // Find nearest destination
    let nearestIndex = 0
    let nearestDistance = calculateDistance(currentLocation, remainingDestinations[0].location)

    for (let i = 1; i < remainingDestinations.length; i++) {
      const distance = calculateDistance(currentLocation, remainingDestinations[i].location)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    // Add nearest destination to route
    const nearest = remainingDestinations[nearestIndex]
    route.push({
      ...nearest,
      distance: nearestDistance,
      totalDistance: route.reduce((sum, stop) => sum + stop.distance, 0) + nearestDistance,
    })

    // Update current location and remove from remaining
    currentLocation = nearest.location
    remainingDestinations.splice(nearestIndex, 1)
  }

  console.log("✅ Optimized route calculated:", route)
  return route
}

// Helper function to extract postcode from address
export function extractPostcode(address: string): string {
  // Malaysian postcode pattern: 5 digits
  const postcodeMatch = address.match(/\b\d{5}\b/)
  return postcodeMatch ? postcodeMatch[0] : ""
}

// Helper function to determine if location is in Langkawi
export function isLangkawiLocation(postcode: string): boolean {
  const langkawiPostcodes = ["07000", "07100", "07200", "07300"]
  return langkawiPostcodes.includes(postcode)
}

// Helper function to determine if location is in KL area
export function isKLLocation(postcode: string): boolean {
  const klPostcodes = [
    "50000",
    "50050",
    "50088",
    "50100",
    "50150",
    "50200",
    "50250",
    "50300",
    "50350",
    "50400",
    "50450",
    "50460",
    "50470",
    "50480",
    "50490",
    "50500",
    "50550",
    "50560",
    "50570",
    "50576",
    "50580",
    "50582",
    "50586",
    "50588",
    "50590",
    "50594",
    "50700",
    "50706",
    "50708",
    "50710",
    "50712",
    "50714",
    "50716",
    "50718",
    "50720",
    "50722",
    "50724",
    "50726",
    "50728",
    "50730",
    "50732",
    "50734",
    "50736",
    "50738",
    "50740",
    "50742",
    "50744",
    "50746",
    "50748",
    "50750",
    "50752",
    "50754",
    "50756",
    "50758",
    "50760",
    "50762",
    "50764",
    "50766",
    "50768",
    "50770",
    "50772",
    "50774",
    "50776",
    "50778",
    "50780",
    "50782",
    "50784",
    "50786",
    "50788",
    "50790",
    "50792",
    "50794",
    "50796",
    "50798",
    "50800",
    "50802",
    "50804",
    "50806",
    "50808",
    "50810",
    "50812",
    "50814",
    "50816",
    "50818",
    "50820",
    "50822",
    "50824",
    "50826",
    "50828",
    "50830",
    "50832",
    "50834",
    "50836",
    "50838",
    "50840",
    "50842",
    "50844",
    "50846",
    "50848",
    "50850",
    "50852",
    "50854",
    "50856",
    "50858",
    "50860",
    "50862",
    "50864",
    "50866",
    "50868",
    "50870",
    "50872",
    "50874",
    "50876",
    "50878",
    "50880",
    "50882",
    "50884",
    "50886",
    "50888",
    "50890",
    "50892",
    "50894",
    "50896",
    "50898",
    "50900",
    "50902",
    "50904",
    "50906",
    "50908",
    "50910",
    "50912",
    "50914",
    "50916",
    "50918",
    "50920",
    "50922",
    "50924",
    "50926",
    "50928",
    "50930",
    "50932",
    "50934",
    "50936",
    "50938",
    "50940",
    "50942",
    "50944",
    "50946",
    "50948",
    "50950",
    "50952",
    "50954",
    "50956",
    "50958",
    "50960",
    "50962",
    "50964",
    "50966",
    "50968",
    "50970",
    "50972",
    "50974",
    "50976",
    "50978",
    "50980",
    "50982",
    "50984",
    "50986",
    "50988",
    "50990",
    "50992",
    "50994",
    "50996",
    "50998",
  ]

  return klPostcodes.includes(postcode)
}
