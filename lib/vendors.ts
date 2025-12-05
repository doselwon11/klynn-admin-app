export interface Vendor {
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

export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const timestamp = new Date().getTime()
    const response = await fetch(`/api/vendors?t=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch vendors: ${response.statusText}`)
    }

    const data = await response.json()
    return data.vendors || []
  } catch (error) {
    console.error("Error fetching vendors:", error)
    return []
  }
}

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
  const R = 6371 // Earth's radius in kilometers
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

// Simple postcode distance calculation (numerical proximity) - fallback method
export const findNearestVendor = (customerPostcode: string, vendors: Vendor[]): Vendor | null => {
  if (!customerPostcode || vendors.length === 0) return null

  const customerCode = Number.parseInt(customerPostcode.replace(/\D/g, ""))
  if (isNaN(customerCode)) return null

  let nearestVendor = vendors[0]
  let minDistance = Math.abs(Number.parseInt(nearestVendor.postcode.replace(/\D/g, "")) - customerCode)

  vendors.forEach((vendor) => {
    const vendorCode = Number.parseInt(vendor.postcode.replace(/\D/g, ""))
    if (!isNaN(vendorCode)) {
      const distance = Math.abs(vendorCode - customerCode)
      if (distance < minDistance) {
        minDistance = distance
        nearestVendor = vendor
      }
    }
  })

  return nearestVendor
}

// Enhanced vendor assignment with GPS-based logic
export const findOptimalVendor = (
  customerPostcode: string,
  customerCoordinates: [number, number] | undefined,
  serviceType: string,
  vendors: Vendor[],
): Vendor | null => {
  if (vendors.length === 0) return null

  console.log(`🎯 Finding optimal vendor for service: ${serviceType}, postcode: ${customerPostcode}`)

  // Check if customer is in Langkawi (postcode 07xxx)
  const isLangkawi = customerPostcode.startsWith("07")

  if (isLangkawi) {
    console.log("🏝️ Langkawi customer detected - applying Langkawi rules")

    // Check if it's a kg package service
    const isKgPackage =
      serviceType.toLowerCase().includes("kg") ||
      serviceType.toLowerCase().includes("wash") ||
      serviceType.toLowerCase().includes("fold")

    if (isKgPackage) {
      // Use Season Laundry - choose closest location (Cenang vs Taman Langkawi)
      const seasonVendors = vendors.filter((v) => v.name.toLowerCase().includes("season") && v.coordinates)

      if (seasonVendors.length > 0 && customerCoordinates) {
        // Find closest Season location
        let closestSeason = seasonVendors[0]
        let minDistance = Number.POSITIVE_INFINITY

        seasonVendors.forEach((vendor) => {
          if (vendor.coordinates) {
            const distance = calculateDistance(customerCoordinates, vendor.coordinates)
            if (distance < minDistance) {
              minDistance = distance
              closestSeason = vendor
            }
          }
        })

        console.log(`✅ Langkawi kg service: Assigned to ${closestSeason.name} (${closestSeason.area})`)
        return closestSeason
      } else if (seasonVendors.length > 0) {
        // Fallback to first Season if no customer coordinates
        console.log(`✅ Langkawi kg service: Assigned to ${seasonVendors[0].name} (fallback)`)
        return seasonVendors[0]
      }
    } else {
      // Non-kg services go to Theresa
      const theresa = vendors.find((v) => v.name.toLowerCase().includes("theresa"))
      if (theresa) {
        console.log(`✅ Langkawi non-kg service: Assigned to ${theresa.name}`)
        return theresa
      }
    }
  }

  // Check if customer is in KL area
  const isKL = customerPostcode.match(/^(5[0-9]|6[0-9]|4[0-9])/) // KL postcodes

  if (isKL) {
    console.log("🏙️ KL customer detected - applying KL rules")

    // Check if it's a non-kg service
    const isNonKgService =
      !serviceType.toLowerCase().includes("kg") ||
      serviceType.toLowerCase().includes("shoe") ||
      serviceType.toLowerCase().includes("mattress") ||
      serviceType.toLowerCase().includes("dry") ||
      serviceType.toLowerCase().includes("clean")

    if (isNonKgService) {
      // Use Ampang Utama for non-kg services
      const ampang = vendors.find((v) => v.name.toLowerCase().includes("ampang"))
      if (ampang) {
        console.log(`✅ KL non-kg service: Assigned to ${ampang.name}`)
        return ampang
      }
    }
  }

  // Fallback: Use GPS-based distance calculation if available
  if (customerCoordinates) {
    console.log("📍 Using GPS-based vendor selection")

    const vendorsWithCoords = vendors.filter((v) => v.coordinates)
    if (vendorsWithCoords.length > 0) {
      let nearestVendor = vendorsWithCoords[0]
      let minDistance = calculateDistance(customerCoordinates, nearestVendor.coordinates!)

      vendorsWithCoords.forEach((vendor) => {
        const distance = calculateDistance(customerCoordinates, vendor.coordinates!)
        if (distance < minDistance) {
          minDistance = distance
          nearestVendor = vendor
        }
      })

      console.log(`✅ GPS-based assignment: ${nearestVendor.name} (${minDistance.toFixed(2)}km away)`)
      return nearestVendor
    }
  }

  // Final fallback: Use postcode proximity
  console.log("📮 Using postcode-based vendor selection")
  return findNearestVendor(customerPostcode, vendors)
}

// Get vendors by area
export const getVendorsByArea = (vendors: Vendor[], area: string): Vendor[] => {
  return vendors.filter((vendor) => vendor.area.toLowerCase() === area.toLowerCase())
}

// Auto-assign vendor based on location and business rules
export const autoAssignVendor = (
  customerCoords: [number, number],
  vendors: Vendor[],
  orderType = "standard",
): Vendor | null => {
  const [lat, lng] = customerCoords

  // Determine area based on coordinates
  let area = ""
  if (lat >= 3.0 && lat <= 3.3 && lng >= 101.5 && lng <= 101.8) {
    area = "KL"
  } else if (lat >= 6.2 && lat <= 6.5 && lng >= 99.6 && lng <= 100.0) {
    area = "Langkawi"
  } else if (lat >= 5.2 && lat <= 5.6 && lng >= 100.1 && lng <= 100.5) {
    area = "Penang"
  } else if (lat >= 1.3 && lat <= 1.7 && lng >= 103.5 && lng <= 104.0) {
    area = "Johor"
  }

  // Apply business rules for specific areas
  if (area === "Langkawi") {
    // In Langkawi, prefer Season Laundry for all orders
    const seasonLaundry = vendors.find(
      (v) => v.name.toLowerCase().includes("season") && v.area.toLowerCase() === "langkawi",
    )
    if (seasonLaundry) return seasonLaundry
  }

  if (area === "KL") {
    // In KL, prefer Theresa for premium orders, others for standard
    if (orderType === "premium") {
      const theresa = vendors.find((v) => v.name.toLowerCase().includes("theresa") && v.area.toLowerCase() === "kl")
      if (theresa) return theresa
    }
  }

  // Fallback to nearest vendor in the area
  const postcodeFromCoords = `${Math.floor(lat * 1000)}${Math.floor(lng * 1000)}`
  return findNearestVendor(postcodeFromCoords, vendors)
}
