"use client"

import { createContext, createElement, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/types/database"
import { diag, withDiagTimeout } from "@/lib/diag"

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: unknown }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  initialUser?: User | null
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string) => {
    const res = await withDiagTimeout(
      "auth",
      "fetch_profile",
      supabase.from("profiles").select("*").eq("id", userId).single(),
      5000,
    )
    if (res.ok) setProfile(res.value.data as Profile | null)
  }, [supabase])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    diag.log("auth", "provider_mount", { hasInitialUser: !!initialUser })

    // Kick off the profile fetch if we already know who the user is.
    // No getSession() call — that's the historical source of hangs.
    if (initialUser) {
      void fetchProfile(initialUser.id)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      diag.log("auth", "state_change", { event, hasSession: !!session })

      if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        return
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (session?.user) {
          setUser(session.user)
          try { await fetchProfile(session.user.id) } catch { /* profile optional */ }
        }
        return
      }

      // TOKEN_REFRESHED / INITIAL_SESSION: sync user ref, leave profile alone.
      if (session?.user) setUser(session.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile, initialUser])

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }

  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
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
    { value: { user, profile, loading, signInWithMagicLink, signInWithPassword, signOut, refreshProfile } },
    children
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // Fallback for routes that don't have the provider (e.g. /login).
    return {
      user: null,
      profile: null,
      loading: false,
      signInWithMagicLink: async () => ({ error: new Error("AuthProvider missing") }),
      signInWithPassword: async () => ({ error: new Error("AuthProvider missing") }),
      signOut: async () => {},
      refreshProfile: async () => {},
    } as AuthContextValue
  }
  return ctx
}
