"use client"

import { useEffect, useRef } from "react"

const REFRESH_EVENT = "glowmetrics:refresh-all"

/**
 * Imperatively trigger every data hook in the app to refetch.
 * Wire a button to this when the user needs manual control.
 */
export function triggerGlobalRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REFRESH_EVENT))
  }
}

/**
 * Subscribe a hook's refetch function to the global refresh event.
 * Any component/button that calls triggerGlobalRefresh() will invoke
 * `refetch` here.
 */
export function useGlobalRefresh(refetch: () => void | Promise<void>) {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    const handler = () => { void refetchRef.current() }
    window.addEventListener(REFRESH_EVENT, handler)
    return () => window.removeEventListener(REFRESH_EVENT, handler)
  }, [])
}

/**
 * Re-fires `refetch` when the browser tab/window becomes visible again.
 *
 * Context: Next.js App Router can keep client components mounted across
 * navigations, so useEffect([]) only fires once ever. Combined with flaky
 * Supabase session state during HMR/token-refresh, we sometimes end up with
 * stale state (loading=true forever, or outdated data) that never recovers.
 *
 * Listening on visibilitychange + focus guarantees that any time the user
 * looks at the app after being away, fresh data is fetched. It's the same
 * pattern used by SWR/React Query.
 */
export function useVisibilityRefetch(refetch: () => void | Promise<void>) {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        void refetchRef.current()
      }
    }
    document.addEventListener("visibilitychange", handler)
    window.addEventListener("focus", handler)
    return () => {
      document.removeEventListener("visibilitychange", handler)
      window.removeEventListener("focus", handler)
    }
  }, [])
}

/**
 * If `loading` stays true longer than `timeoutMs`, force it to false.
 * Ensures users never see a permanently-stuck skeleton — they'll see
 * empty state instead and can manually retry.
 */
export function useLoadingTimeout(loading: boolean, onTimeout: () => void, timeoutMs = 10000) {
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => {
      console.warn(`[loading-timeout] forcing loading=false after ${timeoutMs}ms`)
      onTimeoutRef.current()
    }, timeoutMs)
    return () => clearTimeout(t)
  }, [loading, timeoutMs])
}
