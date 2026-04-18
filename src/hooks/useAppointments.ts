"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { useVisibilityRefetch, useLoadingTimeout, useGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import type { Appointment, Client, Service } from "@/types/database"
import type { AppointmentFormValues } from "@/types/forms"

export type AppointmentWithDetails = Appointment & {
  clients: Pick<Client, "id" | "full_name" | "phone"> | null
  services: Pick<Service, "id" | "name" | "price" | "duration_minutes"> | null
}

export function useAppointments(dateOrRange?: Date | { from: Date; to: Date }) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Stable string keys — Date object refs change every render.
  let fromKey = ""
  let toKey = ""
  if (dateOrRange instanceof Date) {
    fromKey = format(dateOrRange, "yyyy-MM-dd")
    toKey = fromKey
  } else if (dateOrRange) {
    fromKey = format(dateOrRange.from, "yyyy-MM-dd")
    toKey = format(dateOrRange.to, "yyyy-MM-dd")
  }

  const fetchAppointments = useCallback(async () => {
    try {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          clients(id, full_name, phone),
          services(id, name, price, duration_minutes)
        `)
        .is("deleted_at", null)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })

      if (fromKey && toKey) {
        if (fromKey === toKey) {
          query = query.eq("date", fromKey)
        } else {
          query = query.gte("date", fromKey).lte("date", toKey)
        }
      }

      const { data, error } = await query
      if (error) toast.error(`Error al cargar turnos: ${error.message}`)
      setAppointments((data as AppointmentWithDetails[]) ?? [])
    } catch {
      toast.error("Fallo al cargar turnos")
    } finally {
      setLoading(false)
    }
  }, [supabase, fromKey, toKey])

  useEffect(() => {
    setLoading(true)
    fetchAppointments()
  }, [fetchAppointments])

  useVisibilityRefetch(fetchAppointments)
  useGlobalRefresh(fetchAppointments)
  useLoadingTimeout(loading, () => setLoading(false))

  const createAppointment = async (values: AppointmentFormValues) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data: serviceData } = await supabase
      .from("services")
      .select("duration_minutes, price")
      .eq("id", values.service_id)
      .single()

    const startParts = values.start_time.split(":").map(Number)
    const durationMin = serviceData?.duration_minutes ?? 60
    const endDate = new Date(2000, 0, 1, startParts[0], startParts[1] + durationMin)
    const end_time = format(endDate, "HH:mm")

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        user_id: user.id,
        ...values,
        end_time,
        price_charged: values.price_charged ?? serviceData?.price ?? null,
        client_id: values.client_id || null,
      })
      .select(`*, clients(id, full_name, phone), services(id, name, price, duration_minutes)`)
      .single()

    if (error) {
      toast.error("Error al crear el turno")
      return null
    }

    setAppointments((prev) =>
      [...prev, data as AppointmentWithDetails].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )
    )
    toast.success("Turno creado")
    return data
  }

  const updateStatus = async (id: string, status: Appointment["status"]) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    )

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id)

    if (error) {
      toast.error("Error al actualizar el turno")
      fetchAppointments()
      return false
    }

    const labels: Record<string, string> = {
      completed: "Marcado como realizado",
      no_show: "Marcado como ausente",
      cancelled: "Turno cancelado",
      confirmed: "Turno confirmado",
    }
    toast.success(labels[status] ?? "Estado actualizado")
    return true
  }

  const updateAppointment = async (id: string, values: Partial<AppointmentFormValues>) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...values } : a)))

    const { error } = await supabase.from("appointments").update(values).eq("id", id)

    if (error) {
      toast.error("Error al actualizar el turno")
      fetchAppointments()
      return false
    }

    toast.success("Turno actualizado")
    return true
  }

  const deleteAppointment = async (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id))
    await supabase
      .from("appointments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    toast.success("Turno eliminado")
  }

  return { appointments, loading, createAppointment, updateStatus, updateAppointment, deleteAppointment, refetch: fetchAppointments }
}
