"use client"

import { useState, useMemo } from "react"
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  isSameDay,
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { useAppointments } from "@/hooks/useAppointments"
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/utils/constants"
import { formatTime, formatCurrency } from "@/lib/utils/format"
import { NewAppointmentSheet } from "@/components/forms/NewAppointmentSheet"
import { cn } from "@/lib/utils"

type ViewMode = "day" | "week" | "month"

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [referenceDate, setReferenceDate] = useState(new Date())
  const [fabOpen, setFabOpen] = useState(false)

  const range = useMemo(() => {
    if (viewMode === "day") return { from: referenceDate, to: referenceDate }
    if (viewMode === "week") return { from: startOfWeek(referenceDate, { weekStartsOn: 1 }), to: endOfWeek(referenceDate, { weekStartsOn: 1 }) }
    return { from: startOfMonth(referenceDate), to: endOfMonth(referenceDate) }
  }, [viewMode, referenceDate])

  const { appointments, loading, updateStatus } = useAppointments(range)

  const goPrev = () => {
    if (viewMode === "day") setReferenceDate(subDays(referenceDate, 1))
    else if (viewMode === "week") setReferenceDate(subWeeks(referenceDate, 1))
    else setReferenceDate(subMonths(referenceDate, 1))
  }

  const goNext = () => {
    if (viewMode === "day") setReferenceDate(addDays(referenceDate, 1))
    else if (viewMode === "week") setReferenceDate(addWeeks(referenceDate, 1))
    else setReferenceDate(addMonths(referenceDate, 1))
  }

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return format(referenceDate, "EEEE d 'de' MMMM", { locale: es })
    if (viewMode === "week") {
      const ws = startOfWeek(referenceDate, { weekStartsOn: 1 })
      const we = endOfWeek(referenceDate, { weekStartsOn: 1 })
      return `${format(ws, "d MMM", { locale: es })} — ${format(we, "d MMM", { locale: es })}`
    }
    return format(referenceDate, "MMMM yyyy", { locale: es })
  }, [viewMode, referenceDate])

  const isCurrentPeriod = useMemo(() => {
    const today = new Date()
    if (viewMode === "day") return isToday(referenceDate)
    if (viewMode === "week") {
      const ws = startOfWeek(referenceDate, { weekStartsOn: 1 })
      const tws = startOfWeek(today, { weekStartsOn: 1 })
      return isSameDay(ws, tws)
    }
    return isSameMonth(referenceDate, today)
  }, [viewMode, referenceDate])

  const backToTodayLabel = viewMode === "day" ? "Volver a hoy" : viewMode === "week" ? "Esta semana" : "Este mes"

  return (
    <PageContainer>
      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#0A0A0A]">Agenda</h2>
          <p className="text-sm text-[#737373] mt-0.5">Tus turnos</p>
        </div>
        <ViewTabs value={viewMode} onChange={setViewMode} />
      </div>

      {/* Mobile view tabs */}
      <div className="lg:hidden mb-4">
        <ViewTabs value={viewMode} onChange={setViewMode} />
      </div>

      {/* Selector de periodo */}
      <div className="flex items-center justify-between lg:justify-start lg:gap-3 mb-4 lg:mb-6">
        <button
          onClick={goPrev}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] lg:border lg:border-[#E5E5E5]"
        >
          <ChevronLeft className="w-5 h-5 text-[#525252]" strokeWidth={1.5} />
        </button>

        <div className="text-center lg:text-left lg:flex-1">
          <p className="text-sm lg:text-base font-medium text-[#0A0A0A] capitalize">{periodLabel}</p>
          {!isCurrentPeriod && (
            <button
              onClick={() => setReferenceDate(new Date())}
              className="text-xs text-[#737373] hover:text-[#0A0A0A] mt-0.5"
            >
              {backToTodayLabel}
            </button>
          )}
        </div>

        <button
          onClick={goNext}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] lg:border lg:border-[#E5E5E5]"
        >
          <ChevronRight className="w-5 h-5 text-[#525252]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Contenido según vista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : viewMode === "day" ? (
        appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin turnos para este día"
            description="Tocá el + para agregar un turno"
            action={{ label: "Nuevo turno", onClick: () => setFabOpen(true) }}
          />
        ) : (
          <div className="space-y-2">
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onStatusChange={(status) => updateStatus(appt.id, status)}
              />
            ))}
          </div>
        )
      ) : viewMode === "week" ? (
        <WeekView
          weekStart={startOfWeek(referenceDate, { weekStartsOn: 1 })}
          appointments={appointments}
          onStatusChange={updateStatus}
          onDayClick={(d) => { setReferenceDate(d); setViewMode("day") }}
        />
      ) : (
        <MonthView
          monthDate={referenceDate}
          appointments={appointments}
          onDayClick={(d) => { setReferenceDate(d); setViewMode("day") }}
        />
      )}

      <NewAppointmentSheet open={fabOpen} onOpenChange={setFabOpen} defaultDate={referenceDate} />
    </PageContainer>
  )
}

function ViewTabs({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const tabs: { value: ViewMode; label: string }[] = [
    { value: "day", label: "Día" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mes" },
  ]
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-[#F5F5F5] rounded-lg">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            value === t.value
              ? "bg-white text-[#0A0A0A] shadow-sm"
              : "text-[#737373] hover:text-[#0A0A0A]"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

type ApptWithDetails = ReturnType<typeof useAppointments>["appointments"][number]

function WeekView({
  weekStart,
  appointments,
  onStatusChange,
  onDayClick,
}: {
  weekStart: Date
  appointments: ApptWithDetails[]
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onDayClick: (d: Date) => void
}) {
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })

  const byDay = useMemo(() => {
    const map: Record<string, ApptWithDetails[]> = {}
    for (const appt of appointments) {
      if (!map[appt.date]) map[appt.date] = []
      map[appt.date].push(appt)
    }
    return map
  }, [appointments])

  return (
    <div className="space-y-3">
      {days.map((d) => {
        const key = format(d, "yyyy-MM-dd")
        const dayAppts = byDay[key] ?? []
        const dayLabel = format(d, "EEEE d", { locale: es })
        return (
          <section key={key}>
            <button
              onClick={() => onDayClick(d)}
              className="flex items-center gap-2 mb-2 group"
            >
              <p className={cn(
                "text-xs uppercase tracking-wide font-medium capitalize",
                isToday(d) ? "text-[#0A0A0A]" : "text-[#737373]"
              )}>
                {dayLabel}
              </p>
              {isToday(d) && (
                <span className="text-[10px] bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded-full">hoy</span>
              )}
              <span className="text-xs text-[#A3A3A3]">
                {dayAppts.length > 0 ? `${dayAppts.length} ${dayAppts.length === 1 ? "turno" : "turnos"}` : "sin turnos"}
              </span>
            </button>
            {dayAppts.length > 0 && (
              <div className="space-y-2">
                {dayAppts.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onStatusChange={(status) => onStatusChange(appt.id, status)}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function MonthView({
  monthDate,
  appointments,
  onDayClick,
}: {
  monthDate: Date
  appointments: ApptWithDetails[]
  onDayClick: (d: Date) => void
}) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const byDay = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {}
    for (const appt of appointments) {
      if (!map[appt.date]) map[appt.date] = { count: 0, revenue: 0 }
      map[appt.date].count++
      if (appt.status === "completed") {
        map[appt.date].revenue += appt.price_charged ?? appt.services?.price ?? 0
      }
    }
    return map
  }, [appointments])

  const weekDayLabels = ["L", "M", "X", "J", "V", "S", "D"]

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium uppercase text-[#A3A3A3] py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd")
          const info = byDay[key]
          const inMonth = isSameMonth(d, monthDate)
          const today = isToday(d)
          return (
            <button
              key={key}
              onClick={() => onDayClick(d)}
              className={cn(
                "aspect-square lg:aspect-[4/3] flex flex-col items-start justify-between p-1.5 lg:p-2 rounded-lg border text-left transition-colors",
                inMonth ? "bg-white" : "bg-[#FAFAFA]",
                today ? "border-[#0A0A0A]" : "border-[#F0F0F0] hover:border-[#E5E5E5]"
              )}
            >
              <span className={cn(
                "text-xs lg:text-sm font-medium tabular-nums",
                !inMonth && "text-[#D4D4D4]",
                inMonth && !today && "text-[#525252]",
                today && "text-[#0A0A0A]"
              )}>
                {format(d, "d")}
              </span>
              {info && inMonth && (
                <div className="w-full">
                  <p className="text-[9px] lg:text-[10px] text-[#A3A3A3] leading-none">
                    {info.count} {info.count === 1 ? "turno" : "turnos"}
                  </p>
                  {info.revenue > 0 && (
                    <p className="text-[9px] lg:text-[10px] font-medium text-[#0A0A0A] leading-none mt-0.5 tabular-nums truncate">
                      {formatCurrency(info.revenue)}
                    </p>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AppointmentCard({
  appointment: appt,
  onStatusChange,
}: {
  appointment: ApptWithDetails
  onStatusChange: (status: AppointmentStatus) => void
}) {
  const statusInfo = APPOINTMENT_STATUSES[appt.status as AppointmentStatus] ?? APPOINTMENT_STATUSES.reserved

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 hover:border-[#D4D4D4] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[#0A0A0A] tabular-nums">
              {formatTime(appt.start_time)}
            </span>
            <span className="text-[#D4D4D4]">·</span>
            <span className="text-sm font-medium text-[#0A0A0A] truncate">
              {appt.clients?.full_name ?? "Sin clienta"}
            </span>
          </div>
          <p className="text-xs text-[#737373] truncate">{appt.services?.name}</p>
          {appt.price_charged != null && (
            <p className="text-xs text-[#A3A3A3] mt-0.5">{formatCurrency(appt.price_charged)}</p>
          )}
        </div>

        <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full border-0 whitespace-nowrap", statusInfo.color)}>
          {statusInfo.label}
        </Badge>
      </div>

      {(appt.status === "reserved" || appt.status === "confirmed") && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[#F0F0F0]">
          <button
            onClick={() => onStatusChange("completed")}
            className="flex-1 text-xs text-[#16A34A] font-medium py-1.5 rounded-lg hover:bg-[#F0FDF4] transition-colors"
          >
            ✓ Realizado
          </button>
          <button
            onClick={() => onStatusChange("no_show")}
            className="flex-1 text-xs text-[#DC2626] font-medium py-1.5 rounded-lg hover:bg-[#FEF2F2] transition-colors"
          >
            ✗ Ausente
          </button>
          {appt.status === "reserved" && (
            <button
              onClick={() => onStatusChange("confirmed")}
              className="flex-1 text-xs text-[#525252] font-medium py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-colors"
            >
              Confirmar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
