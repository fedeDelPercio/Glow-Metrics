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
          // Let the server (proxy.ts + root layout) own token refresh via
          // getUser(). With autoRefreshToken=true, the browser client races
          // the server on every navigation: both try to rotate the refresh
          // token, one invalidates the other, and the loser hangs — freezing
          // every subsequent REST query. Disabling autoRefresh makes the
          // browser client strictly read-only on the session; it picks up
          // fresh tokens from cookies as the server rotates them. See
          // DIAGNOSTIC.md.
          autoRefreshToken: false,
          // No-op lock: serialization is unnecessary when the browser client
          // doesn't refresh, and navigator.locks has historically deadlocked.
          lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
        },
      }
    )
  }
  return globalThis.__supabase_browser_client__
}
