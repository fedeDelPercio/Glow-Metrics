"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Plus, X, ChevronLeft } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClientForm } from "@/components/forms/ClientForm"
import { AppointmentSchema, type AppointmentFormValues } from "@/types/forms"
import { useAppointments, type AppointmentWithDetails } from "@/hooks/useAppointments"
import { useServices } from "@/hooks/useServices"
import { useClients } from "@/hooks/useClients"
import { triggerGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import type { Client } from "@/types/database"

interface NewAppointmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
  defaultTime?: string
  // When provided, the sheet switches to edit mode: prefilled form, "Guardar
  // cambios" submit, and updates the existing record instead of inserting.
  appointment?: AppointmentWithDetails | null
}

export function NewAppointmentSheet({ open, onOpenChange, defaultDate, defaultTime, appointment }: NewAppointmentSheetProps) {
  const editing = !!appointment
  const [mode, setMode] = useState<"appointment" | "new-client">("appointment")
  const [clientSearch, setClientSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { createAppointment, updateAppointment } = useAppointments()
  const { services } = useServices()
  const { clients, createClient } = useClients(clientSearch)

  const today = format(defaultDate ?? new Date(), "yyyy-MM-dd")
  const initialTime = defaultTime ?? "09:00"

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(AppointmentSchema) as import("react-hook-form").Resolver<AppointmentFormValues>,
    defaultValues: {
      date: today,
      start_time: initialTime,
      status: "reserved",
      service_id: "",
    },
  })

  // Re-sync the form when the defaults change while the sheet is opening
  // (e.g. user clicked a different time slot and re-opened, or switched
  // between create and edit).
  useEffect(() => {
    if (!open) return
    if (appointment) {
      form.reset({
        date: appointment.date,
        start_time: appointment.start_time.slice(0, 5),
        status: appointment.status as AppointmentFormValues["status"],
        service_id: appointment.service_id,
        client_id: appointment.client_id ?? undefined,
        notes: appointment.notes ?? undefined,
        price_charged: appointment.price_charged ?? undefined,
      })
      if (appointment.clients) {
        setSelectedClient(appointment.clients as Client)
      }
    } else {
      form.reset({ date: today, start_time: initialTime, status: "reserved", service_id: "" })
    }
  }, [open, today, initialTime, appointment]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Reset everything when sheet closes
  useEffect(() => {
    if (!open) {
      setMode("appointment")
      setClientSearch("")
      setSelectedClient(null)
      setShowDropdown(false)
    }
  }, [open])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    const typedValues = values as AppointmentFormValues
    let ok = false
    if (editing && appointment) {
      const success = await updateAppointment(appointment.id, typedValues)
      ok = success
    } else {
      const result = await createAppointment(typedValues)
      ok = !!result
    }
    if (ok) {
      triggerGlobalRefresh()
      form.reset({ date: today, start_time: initialTime, status: "reserved", service_id: "" })
      setSelectedClient(null)
      setClientSearch("")
      onOpenChange(false)
    }
  }

  const selectClient = (c: Client) => {
    setSelectedClient(c)
    form.setValue("client_id", c.id)
    setClientSearch("")
    setShowDropdown(false)
  }

  const clearClient = () => {
    setSelectedClient(null)
    form.setValue("client_id", undefined)
    setClientSearch("")
  }

  const handleCreateClient = async (values: Parameters<typeof createClient>[0]) => {
    const newClient = await createClient(values)
    if (newClient) {
      selectClient(newClient)
      setMode("appointment")
    }
  }

  const activeServices = services.filter((s) => s.is_active && !s.deleted_at)
  const showResults = showDropdown

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="mb-4">
          {mode === "new-client" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode("appointment")}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#737373]"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <SheetTitle className="text-base font-semibold">Nueva clienta</SheetTitle>
            </div>
          ) : (
            <SheetTitle className="text-left text-base font-semibold">
              {editing ? "Editar turno" : "Nuevo turno"}
            </SheetTitle>
          )}
        </SheetHeader>

        {mode === "new-client" ? (
          <ClientForm
            onSubmit={handleCreateClient}
          />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-[#737373]">Fecha</Label>
                <Input type="date" className="h-11" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-[#737373]">Hora</Label>
                <Input type="time" className="h-11" {...form.register("start_time")} />
              </div>
            </div>

            {/* Servicio */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#737373]">Servicio *</Label>
              <Select
                onValueChange={(v) => form.setValue("service_id", v)}
                value={form.watch("service_id")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccioná un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — AR$ {s.price.toLocaleString("es-AR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.service_id && (
                <p className="text-xs text-[#DC2626]">{form.formState.errors.service_id.message}</p>
              )}
            </div>

            {/* Clienta */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#737373]">Clienta</Label>

              {selectedClient ? (
                <div className="flex items-center gap-2 h-11 px-3 border border-[#E5E5E5] rounded-md bg-[#FAFAFA]">
                  <div className="w-6 h-6 bg-[#E5E5E5] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-[#525252]">
                      {selectedClient.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="flex-1 text-sm font-medium text-[#0A0A0A] truncate">{selectedClient.full_name}</span>
                  {selectedClient.phone && (
                    <span className="text-xs text-[#A3A3A3]">{selectedClient.phone}</span>
                  )}
                  <button type="button" onClick={clearClient} className="ml-1 text-[#A3A3A3] hover:text-[#0A0A0A]">
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ) : (
                <div ref={searchRef} className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar clienta..."
                      className="h-11 flex-1"
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value)
                        setShowDropdown(true)
                      }}
                      onFocus={() => setShowDropdown(true)}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setMode("new-client")}
                      className="w-11 h-11 flex items-center justify-center rounded-md border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-colors flex-shrink-0"
                      title="Nueva clienta"
                    >
                      <Plus className="w-4 h-4 text-[#525252]" strokeWidth={2} />
                    </button>
                  </div>

                  {showResults && (
                    <div className="absolute top-full left-0 right-12 mt-1 border border-[#E5E5E5] rounded-lg bg-white shadow-md z-10 overflow-hidden max-h-72 overflow-y-auto">
                      {clients.slice(0, 10).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#FAFAFA] border-b border-[#F0F0F0] last:border-0 flex items-center gap-2"
                          onClick={() => selectClient(c)}
                        >
                          <div className="w-6 h-6 bg-[#F5F5F5] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-medium text-[#525252]">
                              {c.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium flex-1 truncate">{c.full_name}</span>
                          {c.phone && <span className="text-[#A3A3A3] text-xs">{c.phone}</span>}
                        </button>
                      ))}
                      {clients.length === 0 && (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm text-[#525252] hover:bg-[#FAFAFA] flex items-center gap-2"
                          onClick={() => setMode("new-client")}
                        >
                          <Plus className="w-4 h-4" strokeWidth={2} />
                          {clientSearch.trim() ? `Crear "${clientSearch.trim()}"` : "Nueva clienta"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11">
              {editing ? "Guardar cambios" : "Guardar turno"}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
