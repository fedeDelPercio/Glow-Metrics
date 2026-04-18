"use client"

import { useState, useEffect } from "react"
import { Phone, Mail, Calendar, User, Pencil, Trash2, ChevronLeft } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClientForm } from "@/components/forms/ClientForm"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { SOURCE_CHANNELS, APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/utils/constants"
import { formatShortDate, formatTime, formatCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/database"
import type { ClientFormValues } from "@/types/forms"

type ApptItem = {
  id: string
  date: string
  start_time: string
  status: string
  price_charged: number | null
  services: { name: string; price: number } | null
}

interface ClientDetailSheetProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, values: Partial<ClientFormValues>) => Promise<boolean>
  onDelete: (id: string) => void
}

export function ClientDetailSheet({ client, open, onOpenChange, onUpdate, onDelete }: ClientDetailSheetProps) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [appointments, setAppointments] = useState<ApptItem[]>([])
  const [loadingAppts, setLoadingAppts] = useState(false)

  useEffect(() => {
    if (!client || !open) return
    setMode("view")
    setLoadingAppts(true)
    const supabase = createSupabaseClient()
    supabase
      .from("appointments")
      .select("id, date, start_time, status, price_charged, services(name, price)")
      .eq("client_id", client.id)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setAppointments((data as ApptItem[]) ?? [])
        setLoadingAppts(false)
      })
  }, [client, open])

  if (!client) return null

  const sourceLabel = SOURCE_CHANNELS.find((s) => s.value === client.source)?.label

  const handleEdit = async (values: ClientFormValues) => {
    const ok = await onUpdate(client.id, values)
    if (ok) setMode("view")
  }

  const handleDelete = () => {
    onDelete(client.id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="mb-4">
          {mode === "edit" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode("view")}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#737373]"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <SheetTitle className="text-base font-semibold">Editar clienta</SheetTitle>
            </div>
          ) : (
            <SheetTitle className="text-base font-semibold sr-only">Detalle de clienta</SheetTitle>
          )}
        </SheetHeader>

        {mode === "edit" ? (
          <ClientForm defaultValues={client} onSubmit={handleEdit} />
        ) : (
          <div className="space-y-5">
            {/* Avatar + nombre */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#F5F5F5] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-semibold text-[#525252]">
                  {client.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-[#0A0A0A] leading-tight">{client.full_name}</h2>
                {sourceLabel && (
                  <span className="text-xs text-[#A3A3A3]">Viene por {sourceLabel}</span>
                )}
              </div>
            </div>

            {/* Info de contacto */}
            <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors border-b border-[#F0F0F0]"
                >
                  <Phone className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
                  <span className="text-sm text-[#0A0A0A]">{client.phone}</span>
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors border-b border-[#F0F0F0]"
                >
                  <Mail className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
                  <span className="text-sm text-[#0A0A0A]">{client.email}</span>
                </a>
              )}
              {client.birth_date && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F0F0F0]">
                  <Calendar className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
                  <span className="text-sm text-[#0A0A0A]">
                    {new Date(client.birth_date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
                  </span>
                </div>
              )}
              {!client.phone && !client.email && !client.birth_date && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <User className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
                  <span className="text-sm text-[#A3A3A3]">Sin datos de contacto</span>
                </div>
              )}
            </div>

            {/* Notas */}
            {client.notes && (
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-[#737373]">Notas</p>
                <p className="text-sm text-[#525252] bg-[#FAFAFA] rounded-xl px-4 py-3 leading-relaxed">
                  {client.notes}
                </p>
              </div>
            )}

            {/* Historial de turnos */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-[#737373]">Turnos</p>
              {loadingAppts ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 bg-[#F5F5F5] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-sm text-[#A3A3A3] px-1">Sin turnos registrados</p>
              ) : (
                <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                  {appointments.map((appt, i) => {
                    const statusInfo = APPOINTMENT_STATUSES[appt.status as AppointmentStatus] ?? APPOINTMENT_STATUSES.reserved
                    return (
                      <div
                        key={appt.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 bg-white",
                          i !== appointments.length - 1 && "border-b border-[#F0F0F0]"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0A0A0A] truncate">
                            {appt.services?.name ?? "Servicio eliminado"}
                          </p>
                          <p className="text-xs text-[#A3A3A3]">
                            {formatShortDate(appt.date)} · {formatTime(appt.start_time)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {appt.price_charged != null && (
                            <span className="text-xs text-[#737373] tabular-nums">
                              {formatCurrency(appt.price_charged)}
                            </span>
                          )}
                          <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full border-0", statusInfo.color)}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 h-11 gap-2" onClick={() => setMode("edit")}>
                <Pencil className="w-4 h-4" strokeWidth={1.5} /> Editar
              </Button>
              <button
                onClick={handleDelete}
                className="w-11 h-11 flex items-center justify-center rounded-md border border-[#E5E5E5] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] transition-colors"
              >
                <Trash2 className="w-4 h-4 text-[#DC2626]" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
