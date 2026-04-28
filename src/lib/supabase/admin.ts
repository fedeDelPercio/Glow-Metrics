import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Service-role client. ONLY for use in Server Actions or Route Handlers
// that intentionally bypass RLS — namely the public booking flow, which
// needs to read services and write appointments without an authenticated
// session. Never import this from a "use client" module.
//
// Every call site must validate input itself, since RLS is no longer
// enforcing tenant isolation.

let _admin: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseAdmin() {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase admin client misconfigured")
  _admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _admin
}
