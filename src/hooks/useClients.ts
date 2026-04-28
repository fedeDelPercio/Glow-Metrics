"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useVisibilityRefetch, useLoadingTimeout, useGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import { diag, withDiagTimeout } from "@/lib/diag"
import type { Client } from "@/types/database"
import type { ClientFormValues } from "@/types/forms"
import { ITEMS_PER_PAGE } from "@/lib/utils/constants"

const CHANNEL = "hook:useClients"

export function useClients(search?: string) {
  const { user } = useAuth()
  const userId = user?.id
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const supabase = createClient()

  const fetchClients = useCallback(async (reset = false) => {
    if (!userId) {
      diag.warn(CHANNEL, "fetch_skipped_no_user")
      setLoading(false)
      return
    }
    const currentPage = reset ? 0 : page
    let query = supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1)

    if (search && search.trim()) {
      query = query.ilike("full_name", `%${search.trim()}%`)
    }

    const res = await withDiagTimeout(CHANNEL, "fetch", query, 6000)
    if (!res.ok) {
      toast.error(res.reason === "timeout" ? "La carga de clientas tardó demasiado" : "Fallo al cargar clientas")
      setLoading(false)
      return
    }
    const { data, error } = res.value
    if (error) {
      diag.error(CHANNEL, "fetch_error", { code: error.code, message: error.message })
      toast.error(`Error al cargar clientas: ${error.message}`)
    }
    const results = data ?? []
    diag.log(CHANNEL, "fetch_result", { rows: results.length, page: currentPage })

    if (reset) {
      setClients(results)
      setPage(0)
    } else {
      setClients((prev) => [...prev, ...results])
    }
    setHasMore(results.length === ITEMS_PER_PAGE)
    setLoading(false)
  }, [supabase, page, search, userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetchClients(true)
  }, [search, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const doRefetch = useCallback(() => { void fetchClients(true) }, [fetchClients])
  useVisibilityRefetch(doRefetch)
  useGlobalRefresh(doRefetch)
  useLoadingTimeout(loading, () => setLoading(false))

  const createClient_ = async (values: ClientFormValues) => {
    if (!userId) return null

    const { data, error } = await supabase
      .from("clients")
      .insert({ user_id: userId, ...values, phone: values.phone || null, email: values.email || null, birth_date: values.birth_date || null })
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
