"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useVisibilityRefetch, useLoadingTimeout, useGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import type { Service, ServiceCategory, ServiceSupply } from "@/types/database"
import type { ServiceFormValues, ServiceSupplyFormValues } from "@/types/forms"

export type ServiceWithCategory = Service & {
  service_categories: ServiceCategory | null
  service_supplies: (ServiceSupply & { supply_catalog: { name: string; unit: string } | null })[]
}

export function useServices() {
  const { profile } = useAuth()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchServices = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setLoading(false); return }
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          service_categories(*),
          service_supplies(*, supply_catalog(name, unit))
        `)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })

      if (error) toast.error(`Error al cargar servicios: ${error.message}`)
      setServices((data as ServiceWithCategory[]) ?? [])
    } catch {
      toast.error("Fallo al cargar servicios")
    }
  }, [supabase, profile?.id])

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("service_categories")
      .select("*")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
    setCategories(data ?? [])
  }, [supabase])

  const refetch = useCallback(async () => {
    try {
      await Promise.all([fetchServices(), fetchCategories()])
    } finally {
      setLoading(false)
    }
  }, [fetchServices, fetchCategories])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useVisibilityRefetch(refetch)
  useGlobalRefresh(refetch)
  useLoadingTimeout(loading, () => setLoading(false))

  const createService = async (values: ServiceFormValues) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const optimistic: ServiceWithCategory = {
      id: crypto.randomUUID(),
      user_id: user.id,
      category_id: values.category_id ?? null,
      name: values.name,
      description: values.description ?? null,
      price: values.price,
      duration_minutes: values.duration_minutes,
      is_active: values.is_active,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      service_categories: null,
      service_supplies: [],
    }

    setServices((prev) => [optimistic, ...prev])

    const { data, error } = await supabase
      .from("services")
      .insert({ user_id: user.id, ...values })
      .select(`*, service_categories(*), service_supplies(*, supply_catalog(name, unit))`)
      .single()

    if (error) {
      setServices((prev) => prev.filter((s) => s.id !== optimistic.id))
      toast.error("Error al crear el servicio")
      return null
    }

    setServices((prev) => prev.map((s) => (s.id === optimistic.id ? (data as ServiceWithCategory) : s)))
    toast.success("Servicio creado")
    return data
  }

  const updateService = async (id: string, values: Partial<ServiceFormValues>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...values } : s))
    )

    const { error } = await supabase.from("services").update(values).eq("id", id)

    if (error) {
      toast.error("Error al actualizar el servicio")
      await fetchServices()
      return false
    }

    toast.success("Servicio actualizado")
    return true
  }

  const deleteService = async (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
    const { error } = await supabase
      .from("services")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      toast.error("Error al eliminar el servicio")
      await fetchServices()
    } else {
      toast.success("Servicio eliminado")
    }
  }

  const upsertSupplyRecipe = async (serviceId: string, supplies: ServiceSupplyFormValues[]) => {
    await supabase.from("service_supplies").delete().eq("service_id", serviceId)

    if (supplies.length > 0) {
      const { error } = await supabase.from("service_supplies").insert(
        supplies.map((s) => ({
          service_id: serviceId,
          supply_id: s.supply_id,
          quantity_per_session: s.quantity_per_session,
        }))
      )
      if (error) {
        toast.error("Error al guardar la receta de insumos")
        return false
      }
    }

    await fetchServices()
    return true
  }

  return { services, categories, loading, createService, updateService, deleteService, upsertSupplyRecipe, refetch }
}
