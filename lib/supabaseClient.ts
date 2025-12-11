import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Use service role ONLY on server-side API routes
const key =
  typeof window === "undefined"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(url, key!)
