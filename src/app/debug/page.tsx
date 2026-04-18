"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Step = {
  name: string
  status: "pending" | "ok" | "timeout" | "error"
  result?: unknown
  error?: string
  durationMs?: number
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ])
}

export default function DebugPage() {
  const [steps, setSteps] = useState<Step[]>([])
  const [envUrl, setEnvUrl] = useState("")
  const [envKeyPrefix, setEnvKeyPrefix] = useState("")
  const [cookies, setCookies] = useState("")
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([])
  const [navigatorLocks, setNavigatorLocks] = useState("unknown")
  const [runKey, setRunKey] = useState(0)

  useEffect(() => {
    setEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(undefined)")
    setEnvKeyPrefix((process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").slice(0, 20) + "…")
    setCookies(typeof document !== "undefined" ? document.cookie : "")
    setLocalStorageKeys(
      typeof localStorage !== "undefined"
        ? Object.keys(localStorage).filter((k) => k.toLowerCase().includes("supa") || k.startsWith("sb-"))
        : []
    )
    setNavigatorLocks(typeof navigator !== "undefined" && "locks" in navigator ? "present" : "missing")

    const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    const supabase = createClient()

    const allSteps: Step[] = [
      { name: "fetch directo a Supabase REST (bypass del cliente)", status: "pending" },
      { name: "fetch directo a /auth/v1/user (bypass del cliente)", status: "pending" },
      { name: "auth.getSession()", status: "pending" },
      { name: "auth.getUser()", status: "pending" },
      { name: "from('services').select() — no filtro", status: "pending" },
    ]
    setSteps(allSteps)

    const update = (i: number, patch: Partial<Step>) => {
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
    }

    async function runStep(i: number, fn: () => Promise<unknown>) {
      const t0 = Date.now()
      try {
        const res = await withTimeout(fn(), 5000)
        update(i, { status: "ok", result: res, durationMs: Date.now() - t0 })
      } catch (e) {
        const msg = String(e)
        update(i, {
          status: msg.includes("timeout") ? "timeout" : "error",
          error: msg,
          durationMs: Date.now() - t0,
        })
      }
    }

    // 1. Direct fetch to Supabase REST (bypassing client entirely)
    void runStep(0, async () => {
      const r = await fetch(`${SUPA_URL}/rest/v1/services?select=id&limit=1`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      })
      return { status: r.status, statusText: r.statusText, body: await r.text() }
    })

    // 2. Direct fetch to auth endpoint — we need the JWT from the cookie
    void runStep(1, async () => {
      // Try extracting JWT from cookie
      const cookieRaw = document.cookie
      const match = cookieRaw.match(/sb-[^=]+-auth-token=([^;]+)/)
      let accessToken: string | null = null
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1])
          const parsed = JSON.parse(decoded.startsWith("base64-") ? atob(decoded.slice(7)) : decoded)
          accessToken = parsed?.access_token ?? parsed?.[0] ?? null
        } catch (e) {
          return { error: `cookie parse failed: ${String(e)}`, raw_length: match[1].length }
        }
      }
      if (!accessToken) return { error: "no access_token in cookie" }
      const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
        headers: { apikey: ANON, Authorization: `Bearer ${accessToken}` },
      })
      return { status: r.status, body: await r.text() }
    })

    void runStep(2, async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session
        ? { user_id: data.session.user.id, email: data.session.user.email, expires_at: data.session.expires_at }
        : null
    })

    void runStep(3, async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user ? { id: data.user.id, email: data.user.email } : null
    })

    void runStep(4, async () => {
      const { data, error } = await supabase.from("services").select("id, user_id, name")
      if (error) throw new Error(`${error.code ?? ""} ${error.message}`)
      return { count: data?.length ?? 0, rows: data ?? [] }
    })
  }, [runKey])

  const clearAllStorage = () => {
    if (typeof window === "undefined") return
    if (!confirm("Vas a borrar todas las cookies, localStorage y sessionStorage del sitio. ¿Seguro?")) return
    // Clear localStorage
    try { localStorage.clear() } catch { /* noop */ }
    try { sessionStorage.clear() } catch { /* noop */ }
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      const eq = c.indexOf("=")
      const name = (eq > -1 ? c.substring(0, eq) : c).trim()
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
    })
    // Drop the singleton so next createClient() makes a fresh one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__supabase_browser_client__
    alert("Storage limpio. Recargá la página e iniciá sesión de nuevo.")
    window.location.href = "/login"
  }

  return (
    <div className="p-6 max-w-4xl mx-auto text-sm font-mono space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold mb-1">GlowMetrics — Debug</h1>
          <p className="text-[#737373] text-xs">Timeout 5s por paso. Incluye fetch directo que bypassa el cliente.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRunKey((k) => k + 1)} className="px-3 py-1.5 text-xs bg-[#0A0A0A] text-white rounded">
            Re-run
          </button>
          <button onClick={clearAllStorage} className="px-3 py-1.5 text-xs bg-[#DC2626] text-white rounded">
            Clear storage
          </button>
        </div>
      </div>

      <div className="border border-[#E5E5E5] rounded p-3 space-y-1">
        <h2 className="text-xs uppercase tracking-wide text-[#737373] mb-2 font-semibold">ENV</h2>
        <Row label="SUPABASE_URL" value={envUrl} />
        <Row label="ANON_KEY" value={envKeyPrefix} />
        <Row label="cookies (nombres)" value={cookies.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean).join(", ") || "(vacío)"} />
        <Row label="localStorage (keys supa/sb)" value={localStorageKeys.join(", ") || "(vacío)"} />
        <Row label="navigator.locks" value={navigatorLocks} />
      </div>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="border border-[#E5E5E5] rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[#0A0A0A]">{s.name}</span>
              <StatusBadge status={s.status} ms={s.durationMs} />
            </div>
            {s.status === "ok" && (
              <pre className="bg-[#F5F5F5] p-2 rounded text-xs overflow-auto mt-2 max-h-60">{JSON.stringify(s.result, null, 2)}</pre>
            )}
            {s.status === "error" && <p className="text-red-600 text-xs mt-1 break-all">{s.error}</p>}
            {s.status === "timeout" && <p className="text-orange-600 text-xs mt-1">⏱ Timeout — sin respuesta en 5s</p>}
            {s.status === "pending" && <p className="text-[#A3A3A3] text-xs mt-1">⏳ Ejecutando…</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status, ms }: { status: Step["status"]; ms?: number }) {
  const map: Record<Step["status"], string> = {
    pending: "bg-[#F5F5F5] text-[#737373]",
    ok: "bg-[#DCFCE7] text-[#16A34A]",
    timeout: "bg-[#FEF3C7] text-[#D97706]",
    error: "bg-[#FEE2E2] text-[#DC2626]",
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${map[status]}`}>
      {status}{ms != null ? ` · ${ms}ms` : ""}
    </span>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs py-0.5">
      <span className="text-[#737373] shrink-0">{label}:</span>
      <span className="text-[#0A0A0A] break-all">{value ?? "(undefined)"}</span>
    </div>
  )
}
