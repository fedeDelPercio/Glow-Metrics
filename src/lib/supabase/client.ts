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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Disable navigator.locks-based synchronization. Supabase JS v2 uses
          // navigator.locks.request() to serialize auth state across tabs, but
          // a stale lock from a previous page (tab closed mid-op, SW, iframe)
          // leaves every auth call hanging forever — queries "silently never
          // fire". Replacing it with a no-op is safe for single-tab use and
          // unblocks all calls.
          lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
        },
      }
    )
  }
  return globalThis.__supabase_browser_client__
}
