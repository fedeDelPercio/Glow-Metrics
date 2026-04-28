"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { useAuth } from "@/hooks/useAuth"
import { useVisibilityRefetch, useLoadingTimeout, useGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import { calcOccupancyRate, calcAbsenceRate, calcTotalSlots } from "@/lib/calculations/occupancy"
import { calcServiceProfitability } from "@/lib/calculations/profitability"
import { generateDiagnostics } from "@/lib/calculations/diagnostics"
import type { DashboardStats } from "@/types/dashboard"
import { SOURCE_CHANNELS } from "@/lib/utils/constants"

export function useDashboardStats(referenceDate = new Date()) {
  const { user, profile } = useAuth()
  const userId = user?.id
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [revalidateTick, setRevalidateTick] = useState(0)
  const supabase = createClient()

  const triggerRevalidate = useCallback(() => setRevalidateTick((n) => n + 1), [])

  useEffect(() => {
    if (!userId || !profile) return
    const uid = userId
    const prof = profile
    let cancelled = false

    async function fetchStats() {
      setLoading(true)
      try {
      const periodStart = startOfMonth(referenceDate)
      const periodEnd = endOfMonth(referenceDate)
      const prevStart = startOfMonth(subMonths(referenceDate, 1))
      const prevEnd = endOfMonth(subMonths(referenceDate, 1))

      const [
        { data: appointments },
        { data: prevAppointments },
        { data: services },
        { data: serviceSupplies },
        { data: purchases },
        { data: fixedCosts },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, services(id, name, price, duration_minutes)")
          .eq("user_id", uid)
          .is("deleted_at", null)
          .gte("date", format(periodStart, "yyyy-MM-dd"))
          .lte("date", format(periodEnd, "yyyy-MM-dd")),
        supabase
          .from("appointments")
          .select("price_charged, status")
          .eq("user_id", uid)
          .is("deleted_at", null)
          .gte("date", format(prevStart, "yyyy-MM-dd"))
          .lte("date", format(prevEnd, "yyyy-MM-dd"))
          .eq("status", "completed"),
        supabase.from("services").select("*").eq("user_id", uid).is("deleted_at", null),
        supabase.from("service_supplies").select("*, supply_catalog(current_stock, unit)"),
        supabase.from("supply_purchases").select("*").eq("user_id", uid).is("deleted_at", null),
        supabase.from("fixed_costs").select("*").eq("user_id", uid).is("deleted_at", null).eq("is_active", true),
      ])

      const completed = (appointments ?? []).filter((a) => a.status === "completed")
      const noShows = (appointments ?? []).filter((a) => a.status === "no_show")

      const totalRevenue = completed.reduce((sum, a) => sum + (a.price_charged ?? (a.services as { price: number } | null)?.price ?? 0), 0)
      const prevRevenue = (prevAppointments ?? []).reduce((sum, a) => sum + (a.price_charged ?? 0), 0)

      const totalFixedCosts = (fixedCosts ?? []).reduce((sum, c) => {
        const multipliers: Record<string, number> = { monthly: 1, bimonthly: 0.5, quarterly: 1 / 3, annual: 1 / 12 }
        return sum + c.amount * (multipliers[c.frequency] ?? 1)
      }, 0)

      const totalSlots = calcTotalSlots(
        periodStart,
        periodEnd,
        prof.working_hours,
        prof.slot_duration_minutes
      )

      const occupancy = calcOccupancyRate(completed.length, totalSlots)
      const absenceRate = calcAbsenceRate(noShows.length, completed.length)
      const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0

      // Profitability por servicio
      const servicesProfit = (services ?? []).map((svc) => {
        const svcSupplies = (serviceSupplies ?? []).filter((ss) => ss.service_id === svc.id)
        return calcServiceProfitability(
          svc,
          svcSupplies as Parameters<typeof calcServiceProfitability>[1],
          (purchases ?? []) as Parameters<typeof calcServiceProfitability>[2],
          totalFixedCosts,
          completed.length,
          appointments ?? [],
        )
      }).filter((s) => s.appointment_count > 0)

      const topByRevenue = [...servicesProfit].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      const topByProfit = [...servicesProfit].sort((a, b) => b.margin_pct - a.margin_pct).slice(0, 5)

      // Canales
      const channelCounts: Record<string, { count: number; revenue: number }> = {}
      for (const a of completed) {
        const ch = (a as { source?: string | null }).source ?? "otro"
        if (!channelCounts[ch]) channelCounts[ch] = { count: 0, revenue: 0 }
        channelCounts[ch].count++
        channelCounts[ch].revenue += (a as { price_charged?: number | null }).price_charged ?? 0
      }
      const channelDist = Object.entries(channelCounts)
        .map(([channel, data]) => ({
          channel,
          count: data.count,
          revenue: data.revenue,
          pct: completed.length > 0 ? (data.count / completed.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

      // Revenue por día
      const revenueByDay: Record<string, { revenue: number; count: number }> = {}
      for (const a of completed) {
        const d = (a as { date: string }).date
        if (!revenueByDay[d]) revenueByDay[d] = { revenue: 0, count: 0 }
        revenueByDay[d].revenue += (a as { price_charged?: number | null }).price_charged ?? 0
        revenueByDay[d].count++
      }

      const avgVariableCost = servicesProfit.length > 0
        ? servicesProfit.reduce((sum, s) => sum + (s.supply_cost + s.time_cost) / Math.max(1, s.appointment_count), 0) / servicesProfit.length
        : 0
      const breakEven = avgTicket > avgVariableCost
        ? Math.ceil(totalFixedCosts / (avgTicket - avgVariableCost))
        : 0

      const dashStats: DashboardStats = {
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,
        prev_period_revenue: prevRevenue,
        completed_appointments: completed.length,
        total_appointments: (appointments ?? []).length,
        no_show_appointments: noShows.length,
        cancelled_appointments: (appointments ?? []).filter((a) => a.status === "cancelled").length,
        avg_ticket: avgTicket,
        occupancy_rate: occupancy,
        absence_rate: absenceRate,
        top_services_revenue: topByRevenue,
        top_services_profitability: topByProfit,
        channel_distribution: channelDist,
        revenue_by_day: Object.entries(revenueByDay).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
        total_fixed_costs: totalFixedCosts,
        break_even_appointments: breakEven,
      }

      if (!cancelled) setStats(dashStats)
      } catch (e) {
        console.error("[useDashboardStats] fetch failed", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [userId, profile?.id, referenceDate.getMonth(), referenceDate.getFullYear(), revalidateTick]) // eslint-disable-line react-hooks/exhaustive-deps

  useVisibilityRefetch(triggerRevalidate)
  useGlobalRefresh(triggerRevalidate)
  useLoadingTimeout(loading, () => setLoading(false))

  const diagnostics = stats ? generateDiagnostics(stats) : []

  return { stats, loading, diagnostics, refetch: triggerRevalidate }
}
