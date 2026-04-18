"use client"

import { useState, useMemo, useRef, useEffect } from "react"
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

const HOUR_START = 7
const HOUR_END = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const PX_PER_HOUR = 64

const GRID_COLORS: Record<string, string> = {
  reserved:    "bg-[#E5E5E5] text-[#0A0A0A]",
  confirmed:   "bg-[#0A0A0A] text-white",
  completed:   "bg-[#DCFCE7] text-[#16A34A]",
  no_show:     "bg-[#FEE2E2] text-[#DC2626]",
  cancelled:   "bg-[#F5F5F5] text-[#A3A3A3]",
  rescheduled: "bg-[#FEF3C7] text-[#D97706]",
}

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

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(referenceDate, { weekStartsOn: 1 }), end: endOfWeek(referenceDate, { weekStartsOn: 1 }) }),
    [referenceDate]
  )

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
      ) : viewMode === "month" ? (
        <MonthView
          monthDate={referenceDate}
          appointments={appointments}
          onDayClick={(d) => { setReferenceDate(d); setViewMode("day") }}
        />
      ) : (
        <TimeGridView
          days={viewMode === "week" ? weekDays : [referenceDate]}
          appointments={appointments}
          onStatusChange={updateStatus}
          onDayClick={(d) => { setReferenceDate(d); setViewMode("day") }}
          isWeek={viewMode === "week"}
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

function TimeGridView({
  days,
  appointments,
  onStatusChange,
  onDayClick,
  isWeek,
}: {
  days: Date[]
  appointments: ApptWithDetails[]
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onDayClick: (d: Date) => void
  isWeek: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const byDay = useMemo(() => {
    const map: Record<string, ApptWithDetails[]> = {}
    for (const appt of appointments) {
      if (!map[appt.date]) map[appt.date] = []
      map[appt.date].push(appt)
    }
    return map
  }, [appointments])

  // Scroll to 8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = PX_PER_HOUR * (8 - HOUR_START) - 8
    }
  }, [])

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i)

  return (
    <div className="border border-[#E5E5E5] rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 230px)" }}>
      {/* Sticky header row */}
      <div className="flex flex-shrink-0 border-b border-[#E5E5E5] bg-white z-20">
        <div className="w-10 flex-shrink-0" />
        {days.map((day) => (
          <button
            key={format(day, "yyyy-MM-dd")}
            onClick={() => isWeek && onDayClick(day)}
            className={cn(
              "flex-1 py-2 flex flex-col items-center border-l border-[#F0F0F0]",
              isWeek && "hover:bg-[#FAFAFA] transition-colors"
            )}
          >
            <span className={cn(
              "text-[10px] uppercase font-medium tracking-wide",
              isToday(day) ? "text-[#0A0A0A]" : "text-[#A3A3A3]"
            )}>
              {format(day, isWeek ? "EEE" : "EEEE", { locale: es })}
            </span>
            <span className={cn(
              "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-0.5",
              isToday(day) ? "bg-[#0A0A0A] text-white" : "text-[#525252]"
            )}>
              {format(day, "d")}
            </span>
          </button>
        ))}
      </div>

      {/* Scrollable grid body */}
      <div ref={scrollRef} className="overflow-y-auto overflow-x-auto flex-1">
        <div className="flex relative" style={{ minWidth: isWeek ? `${days.length * 80 + 40}px` : undefined }}>
          {/* Hour labels column */}
          <div className="w-10 flex-shrink-0 relative">
            {hours.map((h) => (
              <div key={h} style={{ height: PX_PER_HOUR }} className="relative border-b border-[#F5F5F5]">
                <span className="absolute -top-2 right-1.5 text-[10px] text-[#A3A3A3] tabular-nums select-none">
                  {`${String(h).padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayAppts = byDay[key] ?? []
            return (
              <div key={key} className="flex-1 min-w-0 border-l border-[#F0F0F0] relative">
                {/* Hour lines */}
                {hours.map((h) => (
                  <div key={h} style={{ height: PX_PER_HOUR }} className="border-b border-[#F5F5F5]" />
                ))}

                {/* Appointments */}
                {dayAppts.map((appt) => {
                  const parts = appt.start_time.split(":")
                  const hh = parseInt(parts[0])
                  const mm = parseInt(parts[1])
                  if (hh < HOUR_START || hh >= HOUR_END) return null
                  const topMin = (hh - HOUR_START) * 60 + mm
                  const top = (topMin / 60) * PX_PER_HOUR + 1
                  const durationMin = appt.services?.duration_minutes ?? 60
                  const canAct = appt.status === "reserved" || appt.status === "confirmed"
                  const minHeight = !isWeek && canAct ? 100 : 24
                  const height = Math.max((durationMin / 60) * PX_PER_HOUR - 2, minHeight)
                  const gridColor = GRID_COLORS[appt.status] ?? GRID_COLORS.reserved

                  return (
                    <div
                      key={appt.id}
                      className="absolute inset-x-0.5 rounded-lg overflow-hidden"
                      style={{ top, height }}
                    >
                      {isWeek ? (
                        <button
                          onClick={() => onDayClick(day)}
                          className={cn("w-full h-full px-1.5 py-1 text-left rounded-lg", gridColor)}
                        >
                          <p className="text-[10px] font-medium leading-tight truncate">
                            {appt.clients?.full_name ?? "Sin clienta"}
                          </p>
                          {height > 36 && (
                            <p className="text-[9px] leading-tight truncate opacity-70">
                              {appt.services?.name}
                            </p>
                          )}
                        </button>
                      ) : (
                        <DayApptBlock
                          appt={appt}
                          height={height}
                          gridColor={gridColor}
                          onStatusChange={onStatusChange}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DayApptBlock({
  appt,
  height,
  gridColor,
  onStatusChange,
}: {
  appt: ApptWithDetails
  height: number
  gridColor: string
  onStatusChange: (id: string, status: AppointmentStatus) => void
}) {
  const statusInfo = APPOINTMENT_STATUSES[appt.status as AppointmentStatus] ?? APPOINTMENT_STATUSES.reserved
  const canAct = appt.status === "reserved" || appt.status === "confirmed"

  return (
    <div className={cn("w-full h-full px-2 py-1.5 rounded-lg flex flex-col overflow-hidden", gridColor)}>
      <div className="flex items-start justify-between gap-1 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight truncate">
            {appt.clients?.full_name ?? "Sin clienta"}
          </p>
          {height > 40 && (
            <p className="text-[10px] leading-tight truncate opacity-70 mt-0.5">
              {formatTime(appt.start_time)} · {appt.services?.name}
            </p>
          )}
          {height > 56 && appt.services?.price != null && (
            <p className="text-[10px] leading-tight opacity-60 mt-0.5 tabular-nums">
              {formatCurrency(appt.price_charged ?? appt.services.price)}
            </p>
          )}
        </div>
        <Badge className={cn("text-[9px] px-1.5 py-0 h-4 rounded-full border-0 whitespace-nowrap flex-shrink-0", statusInfo.color)}>
          {statusInfo.label}
        </Badge>
      </div>

      {canAct && (
        <div className="flex gap-1 mt-auto pt-1 border-t border-black/10">
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange(appt.id, "completed") }}
            className="flex-1 text-[10px] font-medium py-1 rounded bg-white/60 hover:bg-white/90 text-[#16A34A] transition-colors"
          >
            ✓ Realizado
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange(appt.id, "no_show") }}
            className="flex-1 text-[10px] font-medium py-1 rounded bg-white/60 hover:bg-white/90 text-[#DC2626] transition-colors"
          >
            ✗ Ausente
          </button>
          {appt.status === "reserved" && (
            <button
              onClick={(e) => { e.stopPropagation(); onStatusChange(appt.id, "confirmed") }}
              className="flex-1 text-[10px] font-medium py-1 rounded bg-white/60 hover:bg-white/90 text-[#525252] transition-colors"
            >
              Confirmar
            </button>
          )}
        </div>
      )}
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
