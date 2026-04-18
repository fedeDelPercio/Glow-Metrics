"use client"

import { useState } from "react"
import { subMonths, addMonths, format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { PageContainer } from "@/components/layout/PageContainer"
import { StatCard } from "@/components/cards/StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { formatCurrency, formatPercent, formatShortDate } from "@/lib/utils/format"
import { CHART_COLORS, SOURCE_CHANNELS } from "@/lib/utils/constants"

export default function ReportesPage() {
  const [referenceDate, setReferenceDate] = useState(new Date())
  const { stats, loading } = useDashboardStats(referenceDate)

  const monthLabel = format(referenceDate, "MMMM yyyy", { locale: es })

  const revenueChange = stats && stats.prev_period_revenue > 0
    ? ((stats.total_revenue - stats.prev_period_revenue) / stats.prev_period_revenue) * 100
    : undefined

  const channelData = stats?.channel_distribution.map((c) => ({
    name: SOURCE_CHANNELS.find((s) => s.value === c.channel)?.label ?? c.channel,
    value: c.count,
    pct: c.pct,
  }))

  return (
    <PageContainer>
      {/* Selector de mes */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setReferenceDate(subMonths(referenceDate, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]"
        >
          <ChevronLeft className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm font-semibold text-[#0A0A0A] capitalize">{monthLabel}</h2>
        <button
          onClick={() => setReferenceDate(addMonths(referenceDate, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]"
        >
          <ChevronRight className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !stats || stats.completed_appointments === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos para este período"
          description="Los reportes se generan automáticamente cuando registrás turnos realizados"
        />
      ) : (
        <div className="space-y-6">
          {/* Stats principales */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Facturación total" value={formatCurrency(stats.total_revenue)} change={revenueChange} className="col-span-2" />
            <StatCard label="Turnos realizados" value={stats.completed_appointments} />
            <StatCard label="Ticket promedio" value={formatCurrency(stats.avg_ticket)} />
            <StatCard label="Ocupación" value={formatPercent(stats.occupancy_rate)} />
            <StatCard label="Tasa de ausencias" value={formatPercent(stats.absence_rate)} />
          </div>

          {/* Costos y punto de equilibrio */}
          {stats.total_fixed_costs > 0 && (
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-3">
                Economía del mes
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#737373]">Costos fijos (estimado)</span>
                  <span className="font-medium tabular-nums">{formatCurrency(stats.total_fixed_costs)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#737373]">Punto de equilibrio</span>
                  <span className="font-medium">{stats.break_even_appointments} turnos</span>
                </div>
                <div className="h-px bg-[#F0F0F0]" />
                <div className="flex justify-between text-sm">
                  <span className="text-[#737373]">Resultado estimado</span>
                  <span className={`font-semibold tabular-nums ${stats.total_revenue > stats.total_fixed_costs ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {formatCurrency(stats.total_revenue - stats.total_fixed_costs)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico de ingresos por día */}
          {stats.revenue_by_day.length > 0 && (
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-4">
                Ingresos por día
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.revenue_by_day} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatShortDate(v)}
                    tick={{ fontSize: 10, fill: "#A3A3A3" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#A3A3A3" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), "Ingresos"]}
                    labelFormatter={(label) => formatShortDate(String(label))}
                    contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 8 }}
                    cursor={{ fill: "#F5F5F5" }}
                  />
                  <Bar dataKey="revenue" fill="#0A0A0A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top servicios */}
          {stats.top_services_revenue.length > 0 && (
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-3">
                Servicios por facturación
              </p>
              <div className="space-y-2">
                {stats.top_services_revenue.map((s, i) => (
                  <div key={s.service_id} className="flex items-center gap-2">
                    <span className="text-xs text-[#A3A3A3] w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs font-medium text-[#0A0A0A] truncate">{s.service_name}</span>
                        <span className="text-xs tabular-nums text-[#0A0A0A] ml-2">{formatCurrency(s.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0A0A0A] rounded-full"
                          style={{ width: `${(s.revenue / stats.top_services_revenue[0].revenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribución por canal */}
          {channelData && channelData.length > 0 && (
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-4">
                Origen de clientas
              </p>
              <div className="flex justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {channelData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value) => <span className="text-xs text-[#525252]">{value}</span>}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} turnos (${(props?.payload as { pct?: number })?.pct?.toFixed(0) ?? 0}%)`,
                        name,
                      ]}
                      contentStyle={{ fontSize: 12, border: "1px solid #E5E5E5", borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Rentabilidad por servicio */}
          {stats.top_services_profitability.length > 0 && (
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-3">
                Rentabilidad por servicio
              </p>
              <div className="space-y-0">
                {stats.top_services_profitability.map((s, i) => (
                  <div
                    key={s.service_id}
                    className={`flex items-center justify-between py-2.5 ${
                      i !== stats.top_services_profitability.length - 1 ? "border-b border-[#F0F0F0]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#0A0A0A] truncate">{s.service_name}</p>
                      <p className="text-[10px] text-[#A3A3A3]">{s.appointment_count} turnos</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className={`text-sm font-semibold tabular-nums ${s.profit >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                        {formatCurrency(s.profit)}
                      </p>
                      <p className="text-[10px] text-[#A3A3A3]">{formatPercent(s.margin_pct)} margen</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
