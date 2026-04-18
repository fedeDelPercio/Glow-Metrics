import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

// Module-level singleton. Defensive: @supabase/ssr already caches internally,
// but during Next.js Fast Refresh in dev, the module can re-execute and break
// that cache, producing multiple clients with divergent auth state → queries
// that silently never fire. Stash on globalThis so HMR re-imports reuse it.
declare global {
  // eslint-disable-next-line no-var
  var __supabase_browser_client__: ReturnType<typeof createBrowserClient<Database>> | undefined
}

export function createClient() {
  if (!globalThis.__supabase_browser_client__) {
    globalThis.__supabase_browser_client__ = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return globalThis.__supabase_browser_client__
}
