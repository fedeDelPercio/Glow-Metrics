"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, Copy, ExternalLink, Globe } from "lucide-react"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { updateBookingSettings } from "@/lib/booking/settings-actions"

export default function ReservasOnlinePage() {
  const { user, refreshProfile } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState("")
  const [accepts, setAccepts] = useState(true)
  const [origin, setOrigin] = useState("")
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    void supabase
      .from("profiles")
      .select("public_slug, accepts_online_booking")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setSlug(data.public_slug ?? "")
          setAccepts(data.accepts_online_booking ?? true)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id, supabase])

  const publicUrl = slug && origin ? `${origin}/r/${slug}` : ""

  const save = () => {
    startTransition(async () => {
      const result = await updateBookingSettings({ publicSlug: slug, acceptsOnlineBooking: accepts })
      if (result.ok) {
        toast.success("Cambios guardados")
        await refreshProfile()
      } else {
        toast.error(result.message ?? "No pudimos guardar los cambios")
      }
    })
  }

  const copy = async () => {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <PageContainer>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[#0A0A0A]">Reservas online</h2>
        <p className="text-sm text-[#737373] mt-0.5">
          Compartí tu link y dejá que tus clientas reserven turno solas. Se confirman automáticamente y aparecen en tu agenda.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Public link card */}
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3]">Tu link público</p>
            </div>

            <label className="block">
              <span className="text-xs text-[#737373] block mb-1.5">Identificador</span>
              <div className="flex items-stretch gap-0">
                <span className="flex items-center px-3 bg-[#F5F5F5] border border-r-0 border-[#E5E5E5] rounded-l-lg text-xs text-[#737373] tabular-nums">
                  {origin || "glowmetrics.app"}/r/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="tu-negocio"
                  className="flex-1 min-w-0 h-10 px-3 bg-white border border-[#E5E5E5] focus:border-[#0A0A0A] rounded-r-lg text-sm outline-none transition-colors"
                />
              </div>
              <span className="text-[10px] text-[#A3A3A3] mt-1 block">
                Solo letras, números y guiones. Entre 3 y 50 caracteres.
              </span>
            </label>

            {publicUrl && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0F0F0]">
                <p className="flex-1 min-w-0 text-xs text-[#525252] truncate font-mono">{publicUrl}</p>
                <button
                  onClick={copy}
                  className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium border border-[#E5E5E5] hover:bg-[#F5F5F5] rounded-md transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium border border-[#E5E5E5] hover:bg-[#F5F5F5] rounded-md transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir
                </a>
              </div>
            )}
          </div>

          {/* Toggle card */}
          <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0A0A0A]">Aceptar reservas online</p>
                <p className="text-xs text-[#737373] mt-0.5">
                  Cuando esté apagado, tu link mostrará un mensaje pidiendo que reserven por otro canal.
                </p>
              </div>
              <ToggleSwitch checked={accepts} onChange={setAccepts} />
            </div>
          </div>

          {/* How it works */}
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-2">Cómo funciona</p>
            <ol className="space-y-1.5 text-xs text-[#525252]">
              <li>1. Tu clienta abre el link y elige un servicio.</li>
              <li>2. Ve sólo los días y horarios libres según tu agenda y horario de trabajo.</li>
              <li>3. Completa nombre y teléfono → el turno queda confirmado al instante.</li>
              <li>4. Aparece en tu agenda con la etiqueta <span className="bg-white px-1.5 py-0.5 rounded text-[10px] font-medium">Online</span>.</li>
            </ol>
          </div>

          <Button onClick={save} disabled={pending} className="w-full h-11">
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      )}
    </PageContainer>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#0A0A0A]" : "bg-[#E5E5E5]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}
