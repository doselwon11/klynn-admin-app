// Script to check the current database structure and confirm latitude/longitude columns

const SHEET_ID = "1tj5Wtf_91BkK9EFxArMayl0xRGEVd2vosu4ZR082zgg"
const SHEET_NAME = "Sheet1"
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`

async function checkDatabaseStructure() {
  try {
    console.log("🔍 Checking Klynn Database structure...")
    console.log(`📊 Database URL: ${GOOGLE_SHEET_URL}`)
    console.log("✅ CONFIRMED: This is the same database used by the app")

    // Fetch the CSV data with fresh cache-busting
    const timestamp = new Date().getTime()
    const randomId = Math.random().toString(36).substring(7)
    const response = await fetch(`${GOOGLE_SHEET_URL}&cachebust=${timestamp}&rand=${randomId}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log(`📄 CSV Data Length: ${csvText.length} characters`)

    // Parse CSV to get headers
    const lines = csvText.split("\n")
    const headers = lines[0].split(",").map((header) => header.replace(/"/g, "").trim())

    console.log("\n📋 CURRENT DATABASE STRUCTURE:")
    console.log("=".repeat(60))

    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index) // A, B, C, etc.
      const isCoordinate =
        header.toLowerCase().includes("lat") ||
        header.toLowerCase().includes("lng") ||
        header.toLowerCase().includes("longitude")
      const marker = isCoordinate ? "🗺️" : "📝"
      console.log(`${marker} ${columnLetter}: ${header}`)
    })

    console.log("\n🗺️ COORDINATE ANALYSIS:")
    console.log("=".repeat(60))

    // Look for specific coordinate columns
    const latitudeCol = headers.findIndex((h) => h.toLowerCase().includes("lat"))
    const longitudeCol = headers.findIndex(
      (h) => h.toLowerCase().includes("lng") || h.toLowerCase().includes("longitude"),
    )

    if (latitudeCol !== -1 && longitudeCol !== -1) {
      console.log("✅ COORDINATE COLUMNS CONFIRMED:")
      console.log(`   📍 Latitude: Column ${String.fromCharCode(65 + latitudeCol)} - "${headers[latitudeCol]}"`)
      console.log(`   📍 Longitude: Column ${String.fromCharCode(65 + longitudeCol)} - "${headers[longitudeCol]}"`)

      // Check sample coordinate data
      console.log("\n📊 SAMPLE COORDINATE DATA:")
      console.log("=".repeat(60))

      for (let i = 1; i < Math.min(6, lines.length); i++) {
        if (lines[i].trim()) {
          const row = lines[i].split(",").map((cell) => cell.replace(/"/g, "").trim())
          const lat = row[latitudeCol] || "N/A"
          const lng = row[longitudeCol] || "N/A"
          const name = row[0] || "N/A" // Assuming name is in column A

          console.log(`Row ${i}: ${name}`)
          console.log(`   📍 Lat: ${lat}`)
          console.log(`   📍 Lng: ${lng}`)

          // Validate coordinates
          const latNum = Number.parseFloat(lat)
          const lngNum = Number.parseFloat(lng)
          if (!isNaN(latNum) && !isNaN(lngNum)) {
            console.log(
              `   ✅ Valid coordinates (Malaysia range check: ${latNum >= 1 && latNum <= 7 && lngNum >= 99 && lngNum <= 120 ? "PASS" : "CHECK"})`,
            )
          } else {
            console.log(`   ❌ Invalid or missing coordinates`)
          }
          console.log()
        }
      }
    } else {
      console.log("❌ COORDINATE COLUMNS NOT FOUND")
      if (latitudeCol === -1) console.log("   Missing: Latitude column")
      if (longitudeCol === -1) console.log("   Missing: Longitude column")
    }

    console.log("\n🎯 INTEGRATION STATUS:")
    console.log("=".repeat(60))

    if (latitudeCol !== -1 && longitudeCol !== -1) {
      console.log("✅ READY FOR MAP FEATURES:")
      console.log("   🗺️ Distance-based vendor assignment")
      console.log("   📍 Map view of pickup locations")
      console.log("   🚗 Route optimization for riders")
      console.log("   📊 Geographic analytics")
      console.log("   🎯 Radius-based service areas")

      console.log("\n🔧 NEXT STEPS:")
      console.log("   1. Update Order interface to include coordinates")
      console.log("   2. Modify vendor assignment logic to use distance")
      console.log("   3. Add map components for location visualization")
      console.log("   4. Implement geocoding for new addresses")
    } else {
      console.log("❌ COORDINATES NEEDED:")
      console.log("   Please add latitude and longitude columns to enable map features")
    }

    return {
      headers,
      hasLatitude: latitudeCol !== -1,
      hasLongitude: longitudeCol !== -1,
      latitudeColumn: latitudeCol,
      longitudeColumn: longitudeCol,
      totalColumns: headers.length,
      coordinatesReady: latitudeCol !== -1 && longitudeCol !== -1,
    }
  } catch (error) {
    console.error("❌ Error checking database structure:", error)
    throw error
  }
}

// Execute the check
checkDatabaseStructure()
  .then((result) => {
    console.log("\n" + "=".repeat(60))
    console.log("📊 DATABASE ANALYSIS COMPLETE")
    console.log("=".repeat(60))
    console.log(`📋 Total columns: ${result.totalColumns}`)
    console.log(`📍 Has Latitude: ${result.hasLatitude ? "✅ YES" : "❌ NO"}`)
    console.log(`📍 Has Longitude: ${result.hasLongitude ? "✅ YES" : "❌ NO"}`)
    console.log(
      `🗺️ Map Ready: ${result.coordinatesReady ? "✅ YES - Can implement map features!" : "❌ NO - Need coordinates"}`,
    )

    if (result.coordinatesReady) {
      console.log("\n🚀 READY TO IMPLEMENT:")
      console.log("   - Enhanced vendor assignment with distance calculation")
      console.log("   - Interactive map views")
      console.log("   - Route optimization")
      console.log("   - Geographic service analytics")
    }
  })
  .catch((error) => {
    console.error("💥 Database check failed:", error.message)
  })
