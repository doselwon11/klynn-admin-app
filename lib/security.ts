// Security utilities for input validation and sanitization

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  // Remove potentially dangerous characters and HTML entities
  return input
    .replace(/[<>\"'&\x00-\x1f\x7f-\x9f]/g, '') // Remove HTML chars and control chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim()
}

/**
 * Sanitize HTML content (basic implementation)
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;')
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    throw new Error('Phone must be a string')
  }
  
  // Only allow digits, spaces, +, -, (, )
  return phone.replace(/[^\d\s\+\-\(\)]/g, '').trim()
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate URL format and allowed domains
 */
export function isValidUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const urlObj = new URL(url)
    
    // Only allow https and http protocols
    if (!['https:', 'http:'].includes(urlObj.protocol)) {
      return false
    }
    
    // Check allowed domains if specified
    if (allowedDomains && !allowedDomains.includes(urlObj.hostname)) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Validate numeric input
 */
export function validateNumber(input: any, min?: number, max?: number): boolean {
  const num = Number(input)
  
  if (isNaN(num) || !isFinite(num)) {
    return false
  }
  
  if (min !== undefined && num < min) {
    return false
  }
  
  if (max !== undefined && num > max) {
    return false
  }
  
  return true
}

/**
 * Validate string length
 */
export function validateStringLength(input: string, minLength = 0, maxLength = 1000): boolean {
  return typeof input === 'string' && 
         input.length >= minLength && 
         input.length <= maxLength
}

/**
 * Rate limiting utility (simple in-memory implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  maxRequests = 100, 
  windowMs = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetTime) {
    const newRecord = { count: 1, resetTime: now + windowMs }
    rateLimitStore.set(identifier, newRecord)
    return { allowed: true, remaining: maxRequests - 1, resetTime: newRecord.resetTime }
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }
  
  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime }
}

/**
 * Clean up old rate limit records
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)

/**
 * Validate order status
 */
export function isValidOrderStatus(status: string): boolean {
  const validStatuses = [
    'pending',
    'approved', 
    'picked-up',
    'processing',
    'at-laundry',
    'out-for-delivery',
    'delivered',
    'cancelled'
  ]
  
  return validStatuses.includes(status.toLowerCase())
}

/**
 * Validate postcode format (Malaysian 5-digit)
 */
export function isValidPostcode(postcode: string): boolean {
  const postcodeRegex = /^\d{5}$/
  return postcodeRegex.test(postcode)
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}