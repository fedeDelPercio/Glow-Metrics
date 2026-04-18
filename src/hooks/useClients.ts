"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useVisibilityRefetch, useLoadingTimeout, useGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import type { Client } from "@/types/database"
import type { ClientFormValues } from "@/types/forms"
import { ITEMS_PER_PAGE } from "@/lib/utils/constants"

export function useClients(search?: string) {
  const { profile } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const supabase = createClient()

  const fetchClients = useCallback(async (reset = false) => {
    if (!profile?.id) { setLoading(false); return }
    try {
      const currentPage = reset ? 0 : page
      let query = supabase
        .from("clients")
        .select("*")
        .is("deleted_at", null)
        .order("full_name", { ascending: true })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1)

      if (search && search.trim()) {
        query = query.ilike("full_name", `%${search.trim()}%`)
      }

      const { data, error } = await query
      if (error) toast.error(`Error al cargar clientas: ${error.message}`)
      const results = data ?? []

      if (reset) {
        setClients(results)
        setPage(0)
      } else {
        setClients((prev) => [...prev, ...results])
      }

      setHasMore(results.length === ITEMS_PER_PAGE)
    } catch {
      toast.error("Fallo al cargar clientas")
    } finally {
      setLoading(false)
    }
  }, [supabase, page, search, profile?.id])

  useEffect(() => {
    setLoading(true)
    fetchClients(true)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const doRefetch = useCallback(() => { void fetchClients(true) }, [fetchClients])
  useVisibilityRefetch(doRefetch)
  useGlobalRefresh(doRefetch)
  useLoadingTimeout(loading, () => setLoading(false))

  const createClient_ = async (values: ClientFormValues) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const { data, error } = await supabase
      .from("clients")
      .insert({ user_id: user.id, ...values, phone: values.phone || null, email: values.email || null, birth_date: values.birth_date || null })
      .select()
      .single()

    if (error) {
      toast.error("Error al crear la clienta")
      return null
    }

    setClients((prev) => [data, ...prev].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    toast.success("Clienta agregada")
    return data
  }

  const updateClient = async (id: string, values: Partial<ClientFormValues>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...values } : c)))

    const { error } = await supabase.from("clients").update({
      ...values,
      email: values.email || null,
    }).eq("id", id)

    if (error) {
      toast.error("Error al actualizar la clienta")
      fetchClients(true)
      return false
    }

    toast.success("Clienta actualizada")
    return true
  }

  const deleteClient = async (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id))
    const { error } = await supabase
      .from("clients")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      toast.error("Error al eliminar la clienta")
      fetchClients(true)
    } else {
      toast.success("Clienta eliminada")
    }
  }

  const loadMore = () => {
    setPage((p) => p + 1)
    fetchClients(false)
  }

  return { clients, loading, hasMore, createClient: createClient_, updateClient, deleteClient, loadMore, refetch: () => fetchClients(true) }
}

export function useClientById(id: string) {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setClient(data)
        setLoading(false)
      })
  }, [id, supabase])

  return { client, loading }
}
