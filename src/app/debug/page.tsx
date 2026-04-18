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

  useEffect(() => {
    setEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(undefined)")
    setEnvKeyPrefix((process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").slice(0, 20) + "…")
    setCookies(typeof document !== "undefined" ? document.cookie : "")

    const supabase = createClient()
    const allSteps: Step[] = [
      { name: "auth.getSession()", status: "pending" },
      { name: "auth.getUser()", status: "pending" },
      { name: "from('profiles').select() — no filtro", status: "pending" },
      { name: "from('services').select() — no filtro", status: "pending" },
      { name: "from('appointments').select() — no filtro", status: "pending" },
    ]
    setSteps(allSteps)

    const update = (i: number, patch: Partial<Step>) => {
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
    }

    async function runStep(i: number, fn: () => Promise<unknown>) {
      const t0 = Date.now()
      try {
        const res = await withTimeout(fn(), 6000)
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

    // Fire all steps in parallel — no dependency on previous results
    void runStep(0, async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session
        ? {
            user_id: data.session.user.id,
            email: data.session.user.email,
            expires_at: data.session.expires_at,
          }
        : null
    })

    void runStep(1, async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user ? { id: data.user.id, email: data.user.email } : null
    })

    void runStep(2, async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, business_name")
      if (error) throw new Error(`${error.code ?? ""} ${error.message}`)
      return { count: data?.length ?? 0, rows: data ?? [] }
    })

    void runStep(3, async () => {
      const { data, error } = await supabase.from("services").select("id, user_id, name")
      if (error) throw new Error(`${error.code ?? ""} ${error.message}`)
      return { count: data?.length ?? 0, rows: data ?? [] }
    })

    void runStep(4, async () => {
      const { data, error } = await supabase.from("appointments").select("id, user_id, date, start_time")
      if (error) throw new Error(`${error.code ?? ""} ${error.message}`)
      return { count: data?.length ?? 0, rows: data ?? [] }
    })
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto text-sm font-mono space-y-5">
      <div>
        <h1 className="text-xl font-bold mb-1">GlowMetrics — Debug</h1>
        <p className="text-[#737373] text-xs">Cada paso tiene timeout de 6s. Resultados aparecen a medida que llegan.</p>
      </div>

      <div className="border border-[#E5E5E5] rounded p-3 space-y-1">
        <h2 className="text-xs uppercase tracking-wide text-[#737373] mb-2 font-semibold">ENV</h2>
        <Row label="SUPABASE_URL" value={envUrl} />
        <Row label="ANON_KEY" value={envKeyPrefix} />
        <Row label="document.cookie (nombres)" value={cookies.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean).join(", ") || "(vacío)"} />
      </div>

      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="border border-[#E5E5E5] rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[#0A0A0A]">{s.name}</span>
              <StatusBadge status={s.status} ms={s.durationMs} />
            </div>
            {s.status === "ok" && (
              <pre className="bg-[#F5F5F5] p-2 rounded text-xs overflow-auto mt-2">{JSON.stringify(s.result, null, 2)}</pre>
            )}
            {s.status === "error" && <p className="text-red-600 text-xs mt-1">{s.error}</p>}
            {s.status === "timeout" && <p className="text-orange-600 text-xs mt-1">⏱ Timeout — la llamada no respondió</p>}
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
  const label: Record<Step["status"], string> = {
    pending: "pending",
    ok: "ok",
    timeout: "timeout",
    error: "error",
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${map[status]}`}>
      {label[status]}{ms != null ? ` · ${ms}ms` : ""}
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
