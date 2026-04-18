"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useVisibilityRefetch, useLoadingTimeout, useGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import type { FixedCost } from "@/types/database"
import type { FixedCostFormValues } from "@/types/forms"

const MONTHLY_MULTIPLIERS: Record<string, number> = {
  monthly: 1,
  bimonthly: 0.5,
  quarterly: 1 / 3,
  annual: 1 / 12,
}

export function useFixedCosts() {
  const { profile } = useAuth()
  const [costs, setCosts] = useState<FixedCost[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCosts = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    try {
      const { data } = await supabase
        .from("fixed_costs")
        .select("*")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true })
      setCosts(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [supabase, profile?.id])

  useEffect(() => {
    fetchCosts()
  }, [fetchCosts])

  useVisibilityRefetch(fetchCosts)
  useGlobalRefresh(fetchCosts)
  useLoadingTimeout(loading, () => setLoading(false))

  const totalMonthly = costs.reduce((sum, c) => {
    return sum + c.amount * (MONTHLY_MULTIPLIERS[c.frequency] ?? 1)
  }, 0)

  const createCost = async (values: FixedCostFormValues) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data, error } = await supabase
      .from("fixed_costs")
      .insert({ user_id: user.id, ...values })
      .select()
      .single()

    if (error) {
      toast.error("Error al agregar el costo")
      return null
    }

    setCosts((prev) => [...prev, data])
    toast.success("Costo fijo agregado")
    return data
  }

  const updateCost = async (id: string, values: Partial<FixedCostFormValues>) => {
    setCosts((prev) => prev.map((c) => (c.id === id ? { ...c, ...values } : c)))
    const { error } = await supabase.from("fixed_costs").update(values).eq("id", id)
    if (error) {
      toast.error("Error al actualizar el costo")
      fetchCosts()
      return false
    }
    toast.success("Costo actualizado")
    return true
  }

  const deleteCost = async (id: string) => {
    setCosts((prev) => prev.filter((c) => c.id !== id))
    await supabase
      .from("fixed_costs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    toast.success("Costo eliminado")
  }

  return { costs, loading, totalMonthly, createCost, updateCost, deleteCost, refetch: fetchCosts }
}
