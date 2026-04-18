"use client"

import { createContext, createElement, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/types/database"

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    setProfile(data as Profile | null)
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (session?.user) {
        try { await fetchProfile(session.user.id) } catch { /* profile optional */ }
      }
      if (!cancelled) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only clear on EXPLICIT sign out. Other events (TOKEN_REFRESHED,
        // USER_UPDATED) can momentarily arrive with null session during
        // transitions — clearing profile on those leaves dependent hooks
        // (useDashboardStats et al) permanently stuck with profile=null.
        if (event === "SIGNED_OUT") {
          setUser(null)
          setProfile(null)
          return
        }
        if (session?.user) {
          setUser(session.user)
          try { await fetchProfile(session.user.id) } catch { /* profile optional */ }
        }
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  return createElement(
    AuthContext.Provider,
    { value: { user, profile, loading, signInWithMagicLink, signOut, refreshProfile } },
    children
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // Fallback for routes that don't have the provider (e.g. /login).
    // Returns a no-auth stub so destructuring doesn't explode.
    return {
      user: null,
      profile: null,
      loading: false,
      signInWithMagicLink: async () => ({ error: new Error("AuthProvider missing") }),
      signOut: async () => {},
      refreshProfile: async () => {},
    } as AuthContextValue
  }
  return ctx
}
