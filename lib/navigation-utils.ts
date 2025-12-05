// Utility functions for native map navigation

export const openNativeNavigation = (latitude: number, longitude: number, label?: string) => {
  const lat = latitude.toString()
  const lng = longitude.toString()
  const destination = `${lat},${lng}`

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  if (isMobile) {
    // Try native apps first on mobile
    if (isIOS) {
      // Try Google Maps app first, then Apple Maps as fallback
      const googleMapsIOS = `comgooglemaps://?daddr=${destination}&directionsmode=driving`
      const appleMaps = `maps://?daddr=${destination}&dirflg=d`

      // Try Google Maps first
      const googleMapsLink = document.createElement("a")
      googleMapsLink.href = googleMapsIOS
      googleMapsLink.click()

      // Fallback to Apple Maps after a short delay if Google Maps didn't open
      setTimeout(() => {
        const appleMapsLink = document.createElement("a")
        appleMapsLink.href = appleMaps
        appleMapsLink.click()
      }, 500)

      // Final fallback to web version
      setTimeout(() => {
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
        window.open(webUrl, "_blank")
      }, 1500)
    } else if (isAndroid) {
      // Try Google Maps app, then generic geo intent
      const googleMapsAndroid = `google.navigation:q=${destination}&mode=d`
      const geoIntent = `geo:${destination}?q=${destination}${label ? `(${label})` : ""}`

      // Try Google Maps navigation first
      try {
        window.location.href = googleMapsAndroid
      } catch (e) {
        // Fallback to geo intent
        try {
          window.location.href = geoIntent
        } catch (e2) {
          // Final fallback to web version
          const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
          window.open(webUrl, "_blank")
        }
      }
    } else {
      // Other mobile devices - use web version
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
      window.open(webUrl, "_blank")
    }
  } else {
    // Desktop - use web version
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    window.open(webUrl, "_blank")
  }
}

export const openNativeNavigationWithFallback = (latitude: number, longitude: number, label?: string) => {
  const lat = latitude.toString()
  const lng = longitude.toString()
  const destination = `${lat},${lng}`

  // Detect device type
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobile = isIOS || isAndroid || /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (isMobile) {
    let attempted = false

    if (isIOS) {
      // iOS - Try Google Maps app first
      const googleMapsURL = `comgooglemaps://?daddr=${destination}&directionsmode=driving`
      const appleMapsURL = `maps://?daddr=${destination}&dirflg=d`

      // Create invisible iframe to test if app opens
      const iframe = document.createElement("iframe")
      iframe.style.display = "none"
      iframe.src = googleMapsURL
      document.body.appendChild(iframe)

      // Remove iframe after attempt
      setTimeout(() => {
        document.body.removeChild(iframe)
        if (!attempted) {
          // Try Apple Maps
          window.location.href = appleMapsURL
          attempted = true
        }
      }, 1000)

      // Final web fallback
      setTimeout(() => {
        if (!attempted) {
          const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
          window.open(webUrl, "_blank")
        }
      }, 2000)
    } else if (isAndroid) {
      // Android - Try Google Maps navigation
      const intent = `intent://maps.google.com/maps?daddr=${destination}&directionsmode=driving#Intent;scheme=https;package=com.google.android.apps.maps;end`

      try {
        window.location.href = intent
        attempted = true
      } catch (e) {
        // Fallback to geo intent
        const geoIntent = `geo:${destination}?q=${destination}${label ? `(${label})` : ""}`
        try {
          window.location.href = geoIntent
          attempted = true
        } catch (e2) {
          // Web fallback
          const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
          window.open(webUrl, "_blank")
        }
      }
    }
  } else {
    // Desktop - use web version
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    window.open(webUrl, "_blank")
  }
}

// Simplified version that works reliably across platforms
export const openMapsNavigation = (latitude: number, longitude: number, label?: string) => {
  const destination = `${latitude},${longitude}`
  const encodedLabel = label ? encodeURIComponent(label) : ""

  // Check if it's mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (isMobile) {
    // For mobile, use a universal approach that works on both iOS and Android
    const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`

    // Try to open in app first, then fallback to web
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    if (isIOS) {
      // iOS: Try Google Maps app scheme
      const appUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`
      window.location.href = appUrl

      // Fallback to web after short delay
      setTimeout(() => {
        window.open(universalUrl, "_blank")
      }, 1000)
    } else if (isAndroid) {
      // Android: Use intent URL that opens in Google Maps app
      const intentUrl = `intent://maps.google.com/maps?daddr=${destination}&directionsmode=driving#Intent;scheme=https;package=com.google.android.apps.maps;end`
      window.location.href = intentUrl
    } else {
      // Other mobile devices
      window.open(universalUrl, "_blank")
    }
  } else {
    // Desktop: Open in web browser
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    window.open(webUrl, "_blank")
  }
}
