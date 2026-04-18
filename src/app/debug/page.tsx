"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type DebugState = {
  envUrl: string
  envKeyPrefix: string
  session: unknown
  sessionError: string | null
  user: unknown
  userError: string | null
  profileRow: unknown
  profileError: string | null
  servicesAll: unknown
  servicesAllError: string | null
  servicesFiltered: unknown
  servicesFilteredError: string | null
  appointmentsAll: unknown
  appointmentsAllError: string | null
}

export default function DebugPage() {
  const [state, setState] = useState<DebugState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const out: DebugState = {
      envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(undefined)",
      envKeyPrefix: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").slice(0, 20) + "…",
      session: null,
      sessionError: null,
      user: null,
      userError: null,
      profileRow: null,
      profileError: null,
      servicesAll: null,
      servicesAllError: null,
      servicesFiltered: null,
      servicesFilteredError: null,
      appointmentsAll: null,
      appointmentsAllError: null,
    }

    async function run() {
      try {
        const { data: sessionData, error: sErr } = await supabase.auth.getSession()
        out.session = sessionData.session
          ? {
              user_id: sessionData.session.user.id,
              email: sessionData.session.user.email,
              access_token_length: sessionData.session.access_token?.length,
              expires_at: sessionData.session.expires_at,
            }
          : null
        out.sessionError = sErr ? sErr.message : null
      } catch (e) {
        out.sessionError = String(e)
      }

      try {
        const { data: userData, error: uErr } = await supabase.auth.getUser()
        out.user = userData.user ? { id: userData.user.id, email: userData.user.email } : null
        out.userError = uErr ? uErr.message : null
      } catch (e) {
        out.userError = String(e)
      }

      // Profile
      const uid = (out.user as { id?: string } | null)?.id
      if (uid) {
        try {
          const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle()
          out.profileRow = data
          out.profileError = error ? error.message : null
        } catch (e) {
          out.profileError = String(e)
        }
      }

      // Services — no filters (RLS only)
      try {
        const { data, error } = await supabase.from("services").select("id, user_id, name")
        out.servicesAll = { count: data?.length ?? 0, rows: data?.slice(0, 5) ?? [] }
        out.servicesAllError = error ? `${error.code ?? ""} ${error.message}` : null
      } catch (e) {
        out.servicesAllError = String(e)
      }

      // Services filtered by current user
      if (uid) {
        try {
          const { data, error } = await supabase
            .from("services")
            .select("id, user_id, name")
            .eq("user_id", uid)
          out.servicesFiltered = { count: data?.length ?? 0, rows: data?.slice(0, 5) ?? [] }
          out.servicesFilteredError = error ? `${error.code ?? ""} ${error.message}` : null
        } catch (e) {
          out.servicesFilteredError = String(e)
        }
      }

      // Appointments — no filters
      try {
        const { data, error } = await supabase.from("appointments").select("id, user_id, date, start_time")
        out.appointmentsAll = { count: data?.length ?? 0, rows: data?.slice(0, 5) ?? [] }
        out.appointmentsAllError = error ? `${error.code ?? ""} ${error.message}` : null
      } catch (e) {
        out.appointmentsAllError = String(e)
      }

      setState(out)
      setLoading(false)
    }

    run()
  }, [])

  if (loading) {
    return <div className="p-6 text-sm">Ejecutando diagnóstico…</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto text-sm font-mono space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-2">GlowMetrics — Debug</h1>
        <p className="text-[#737373] text-xs">Diagnóstico de auth + queries. No dejar en prod a largo plazo.</p>
      </div>

      <Section title="ENV">
        <Row label="NEXT_PUBLIC_SUPABASE_URL" value={state?.envUrl} />
        <Row label="ANON_KEY (prefix)" value={state?.envKeyPrefix} />
      </Section>

      <Section title="AUTH SESSION (getSession)">
        <pre className="bg-[#F5F5F5] p-3 rounded text-xs overflow-auto">
          {JSON.stringify(state?.session, null, 2)}
        </pre>
        {state?.sessionError && <p className="text-red-600 text-xs mt-2">Error: {state.sessionError}</p>}
      </Section>

      <Section title="AUTH USER (getUser — verifica JWT en el servidor)">
        <pre className="bg-[#F5F5F5] p-3 rounded text-xs overflow-auto">
          {JSON.stringify(state?.user, null, 2)}
        </pre>
        {state?.userError && <p className="text-red-600 text-xs mt-2">Error: {state.userError}</p>}
      </Section>

      <Section title="PROFILES — eq('id', user.id)">
        <pre className="bg-[#F5F5F5] p-3 rounded text-xs overflow-auto">
          {JSON.stringify(state?.profileRow, null, 2)}
        </pre>
        {state?.profileError && <p className="text-red-600 text-xs mt-2">Error: {state.profileError}</p>}
      </Section>

      <Section title="SERVICES — sin filtros (solo RLS)">
        <pre className="bg-[#F5F5F5] p-3 rounded text-xs overflow-auto">
          {JSON.stringify(state?.servicesAll, null, 2)}
        </pre>
        {state?.servicesAllError && <p className="text-red-600 text-xs mt-2">Error: {state.servicesAllError}</p>}
      </Section>

      <Section title="SERVICES — eq('user_id', user.id)">
        <pre className="bg-[#F5F5F5] p-3 rounded text-xs overflow-auto">
          {JSON.stringify(state?.servicesFiltered, null, 2)}
        </pre>
        {state?.servicesFilteredError && <p className="text-red-600 text-xs mt-2">Error: {state.servicesFilteredError}</p>}
      </Section>

      <Section title="APPOINTMENTS — sin filtros (solo RLS)">
        <pre className="bg-[#F5F5F5] p-3 rounded text-xs overflow-auto">
          {JSON.stringify(state?.appointmentsAll, null, 2)}
        </pre>
        {state?.appointmentsAllError && <p className="text-red-600 text-xs mt-2">Error: {state.appointmentsAllError}</p>}
      </Section>

      <div className="text-xs text-[#737373] pt-4 border-t border-[#E5E5E5]">
        Cómo interpretar:
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li><b>Session null</b> → el browser client no tiene el token en memoria (problema de cookies).</li>
          <li><b>User null pero Session OK</b> → JWT inválido o expirado.</li>
          <li><b>Services sin filtro count = 0</b> pero hay filas en la DB → RLS bloquea.</li>
          <li><b>Services filtrado count = 0</b> pero sin filtro count &gt; 0 → el user actual no es dueño de las filas.</li>
          <li><b>ENV URL distinto a jjsainuhekjlrhhucqzr</b> → Vercel apunta a otro proyecto.</li>
        </ul>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-wide text-[#737373] mb-2 font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs py-1">
      <span className="text-[#737373]">{label}:</span>
      <span className="text-[#0A0A0A] break-all">{value ?? "(undefined)"}</span>
    </div>
  )
}
