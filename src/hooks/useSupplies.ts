"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useVisibilityRefetch, useLoadingTimeout, useGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import type { SupplyCatalog, SupplyPurchase } from "@/types/database"
import type { SupplyFormValues, PurchaseFormValues } from "@/types/forms"

export function useSupplies() {
  const { profile } = useAuth()
  const [supplies, setSupplies] = useState<SupplyCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchSupplies = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    try {
      const { data } = await supabase
        .from("supply_catalog")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true })
      setSupplies(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [supabase, profile?.id])

  useEffect(() => {
    fetchSupplies()
  }, [fetchSupplies])

  useVisibilityRefetch(fetchSupplies)
  useGlobalRefresh(fetchSupplies)
  useLoadingTimeout(loading, () => setLoading(false))

  const createSupply = async (values: SupplyFormValues) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data, error } = await supabase
      .from("supply_catalog")
      .insert({ user_id: user.id, ...values })
      .select()
      .single()

    if (error) {
      toast.error("Error al crear el insumo")
      return null
    }

    setSupplies((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success("Insumo agregado")
    return data
  }

  const updateSupply = async (id: string, values: Partial<SupplyFormValues>) => {
    setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ...values } : s)))
    const { error } = await supabase.from("supply_catalog").update(values).eq("id", id)
    if (error) {
      toast.error("Error al actualizar el insumo")
      fetchSupplies()
      return false
    }
    toast.success("Insumo actualizado")
    return true
  }

  const deleteSupply = async (id: string) => {
    setSupplies((prev) => prev.filter((s) => s.id !== id))
    await supabase
      .from("supply_catalog")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    toast.success("Insumo eliminado")
  }

  return { supplies, loading, createSupply, updateSupply, deleteSupply, refetch: fetchSupplies }
}

export function usePurchases() {
  const [purchases, setPurchases] = useState<(SupplyPurchase & { supply_catalog: { name: string; unit: string } | null })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchPurchases = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("supply_purchases")
        .select("*, supply_catalog(name, unit)")
        .is("deleted_at", null)
        .order("purchase_date", { ascending: false })
        .limit(50)
      setPurchases((data as typeof purchases) ?? [])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  useVisibilityRefetch(fetchPurchases)
  useGlobalRefresh(fetchPurchases)
  useLoadingTimeout(loading, () => setLoading(false))

  const createPurchase = async (values: PurchaseFormValues) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data, error } = await supabase
      .from("supply_purchases")
      .insert({
        user_id: user.id,
        ...values,
        total_price: values.quantity * values.unit_price,
      })
      .select("*, supply_catalog(name, unit)")
      .single()

    if (error) {
      toast.error("Error al registrar la compra")
      return null
    }

    setPurchases((prev) => [data as typeof purchases[number], ...prev])
    toast.success("Compra registrada")
    return data
  }

  return { purchases, loading, createPurchase, refetch: fetchPurchases }
}
