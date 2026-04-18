"use client"

import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { TrendingUp, Calendar, AlertCircle, Package, Wallet, BarChart3, ChevronRight } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { StatCard } from "@/components/cards/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { useAppointments } from "@/hooks/useAppointments"
import { formatCurrency, formatPercent } from "@/lib/utils/format"
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/utils/constants"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const { profile } = useAuth()
  const today = new Date()
  const { stats, loading, diagnostics } = useDashboardStats(today)
  const { appointments: todayAppointments, loading: apptLoading, updateStatus } = useAppointments(today)

  const todayCompleted = todayAppointments.filter((a) => a.status === "completed").length
  const todayTotal = todayAppointments.filter((a) => a.status !== "cancelled").length

  const revenueChange = stats && stats.prev_period_revenue > 0
    ? ((stats.total_revenue - stats.prev_period_revenue) / stats.prev_period_revenue) * 100
    : undefined

  return (
    <PageContainer>
      {/* Saludo */}
      <div className="mb-5 lg:mb-8">
        <p className="text-xs text-[#A3A3A3] uppercase tracking-wide mb-0.5 capitalize">
          {format(today, "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <h2 className="text-xl lg:text-3xl font-semibold text-[#0A0A0A]">
          Hola, {profile?.full_name?.split(" ")[0] ?? ""}
        </h2>
      </div>

      {/* Stats del mes */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-6 lg:mb-8">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-6 lg:mb-8">
          <StatCard
            label="Facturado este mes"
            value={formatCurrency(stats?.total_revenue ?? 0)}
            change={revenueChange}
            className="col-span-2 lg:col-span-2"
          />
          <StatCard
            label="Turnos realizados"
            value={stats?.completed_appointments ?? 0}
            suffix={` de ${stats?.total_appointments ?? 0}`}
          />
          <StatCard
            label="Ticket promedio"
            value={formatCurrency(stats?.avg_ticket ?? 0)}
          />
          <StatCard
            label="Ocupación"
            value={formatPercent(stats?.occupancy_rate ?? 0)}
          />
          <StatCard
            label="Tasa de ausencias"
            value={formatPercent(stats?.absence_rate ?? 0)}
          />
        </div>
      )}

      {/* Desktop: two-column main area. Mobile: single column stacked. */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Columna principal (izq en desktop): diagnóstico + turnos de hoy */}
        <div className="lg:col-span-2">
          {/* Diagnóstico */}
          {diagnostics.length > 0 && (
            <section className="mb-6">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} /> Acciones recomendadas
              </p>
              <div className="space-y-2">
                {diagnostics.map((action, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 hover:border-[#D4D4D4] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        className={cn(
                          "w-4 h-4 mt-0.5 flex-shrink-0",
                          action.impact === "high" ? "text-[#DC2626]" : "text-[#D97706]"
                        )}
                        strokeWidth={1.5}
                      />
                      <div>
                        <p className="text-sm font-medium text-[#0A0A0A]">{action.title}</p>
                        <p className="text-xs text-[#737373] mt-0.5">{action.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Turnos de hoy */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} /> Turnos de hoy
              </p>
              <span className="text-xs text-[#A3A3A3]">{todayCompleted}/{todayTotal} realizados</span>
            </div>

            {apptLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : todayAppointments.length === 0 ? (
              <p className="text-sm text-[#A3A3A3] py-4 text-center">Sin turnos para hoy</p>
            ) : (
              <div className="space-y-2">
                {todayAppointments.slice(0, 5).map((appt) => {
                  const statusInfo = APPOINTMENT_STATUSES[appt.status as AppointmentStatus] ?? APPOINTMENT_STATUSES.reserved
                  return (
                    <div key={appt.id} className="flex items-center gap-3 bg-white border border-[#E5E5E5] rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#0A0A0A] tabular-nums">
                            {appt.start_time.slice(0, 5)}
                          </span>
                          <span className="text-sm text-[#0A0A0A] truncate">
                            {appt.clients?.full_name ?? "Sin clienta"}
                          </span>
                        </div>
                        <p className="text-xs text-[#A3A3A3] truncate">{appt.services?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full border-0", statusInfo.color)}>
                          {statusInfo.label}
                        </Badge>
                        {(appt.status === "reserved" || appt.status === "confirmed") && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateStatus(appt.id, "completed")}
                              className="text-[10px] text-[#16A34A] font-medium px-2 py-1 rounded-md hover:bg-[#F0FDF4]"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => updateStatus(appt.id, "no_show")}
                              className="text-[10px] text-[#DC2626] font-medium px-2 py-1 rounded-md hover:bg-[#FEF2F2]"
                            >
                              ✗
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Columna lateral (der en desktop): top servicios + gestión (solo mobile) */}
        <aside className="lg:col-span-1">
          {/* Top servicios */}
          {stats && stats.top_services_revenue.length > 0 && (
            <section className="mb-6">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-3">
                Top servicios este mes
              </p>
              <div className="space-y-0 border border-[#E5E5E5] rounded-xl overflow-hidden">
                {stats.top_services_revenue.slice(0, 3).map((s, i) => (
                  <div
                    key={s.service_id}
                    className={`flex items-center gap-3 px-4 py-3 bg-white ${
                      i !== Math.min(stats.top_services_revenue.length, 3) - 1 ? "border-b border-[#F0F0F0]" : ""
                    }`}
                  >
                    <span className="text-xs font-semibold text-[#A3A3A3] w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A0A0A] truncate">{s.service_name}</p>
                      <p className="text-xs text-[#A3A3A3]">{s.appointment_count} turnos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-[#0A0A0A]">{formatCurrency(s.revenue)}</p>
                      <p className={cn("text-xs tabular-nums", s.margin_pct >= 40 ? "text-[#16A34A]" : s.margin_pct >= 20 ? "text-[#D97706]" : "text-[#DC2626]")}>
                        {formatPercent(s.margin_pct)} margen
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gestión — solo mobile (en desktop está en la sidebar) */}
          <section className="lg:hidden mb-6">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-3">
              Gestión del negocio
            </p>
            <div className="space-y-0 border border-[#E5E5E5] rounded-xl overflow-hidden bg-white">
              <Link
                href="/insumos"
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors border-b border-[#F0F0F0]"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">Insumos</p>
                  <p className="text-xs text-[#A3A3A3]">Stock, compras y consumo</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#D4D4D4]" strokeWidth={1.5} />
              </Link>
              <Link
                href="/costos"
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors border-b border-[#F0F0F0]"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">Costos fijos</p>
                  <p className="text-xs text-[#A3A3A3]">Alquiler, servicios, impuestos</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#D4D4D4]" strokeWidth={1.5} />
              </Link>
              <Link
                href="/reportes"
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A]">Reportes</p>
                  <p className="text-xs text-[#A3A3A3]">Rentabilidad y tendencias</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#D4D4D4]" strokeWidth={1.5} />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </PageContainer>
  )
}
