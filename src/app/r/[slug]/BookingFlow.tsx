"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { addDays, format, isSameDay, parse, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { Check, ChevronLeft, Clock, Loader2 } from "lucide-react"
import { createBooking, getAvailableSlots, type PublicProfile, type PublicService } from "@/lib/booking/actions"
import { formatCurrency } from "@/lib/utils/format"

const DAYS_AHEAD = 30
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const

type Step = "service" | "date" | "time" | "contact" | "done"

type DoneState = {
  date: string
  startTime: string
  serviceName: string
  businessName: string
}

export function BookingFlow({ profile }: { profile: PublicProfile }) {
  const [step, setStep] = useState<Step>("service")
  const [service, setService] = useState<PublicService | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[] | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [contact, setContact] = useState({ fullName: "", phone: "", email: "", notes: "" })
  const [submitting, startSubmit] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<DoneState | null>(null)

  const dayList = useMemo(() => {
    const today = startOfDay(new Date())
    const out: { date: Date; available: boolean }[] = []
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = addDays(today, i)
      const dayKey = DAY_KEYS[d.getDay()]
      const wh = profile.working_hours[dayKey]
      out.push({ date: d, available: !!wh?.active })
    }
    return out
  }, [profile.working_hours])

  useEffect(() => {
    if (step !== "time" || !service || !date) return
    setSlots(null)
    setSlotsLoading(true)
    getAvailableSlots({
      slug: profile.public_slug,
      serviceId: service.id,
      date: format(date, "yyyy-MM-dd"),
    }).then((s) => {
      setSlots(s)
      setSlotsLoading(false)
    })
  }, [step, service, date, profile.public_slug])

  const goBack = () => {
    setError(null)
    if (step === "date") setStep("service")
    else if (step === "time") setStep("date")
    else if (step === "contact") setStep("time")
  }

  const submit = () => {
    if (!service || !date || !time) return
    setError(null)
    startSubmit(async () => {
      const result = await createBooking({
        slug: profile.public_slug,
        serviceId: service.id,
        date: format(date, "yyyy-MM-dd"),
        startTime: time,
        fullName: contact.fullName,
        phone: contact.phone,
        email: contact.email || undefined,
        notes: contact.notes || undefined,
      })
      if (result.ok) {
        setDone(result)
        setStep("done")
      } else {
        setError(
          result.reason === "slot_taken"
            ? "Ese horario ya fue tomado mientras completabas. Elegí otro."
            : result.reason === "invalid_input"
            ? "Revisá los datos: nombre y teléfono son obligatorios."
            : "No pudimos crear el turno. Intentalo de nuevo en unos segundos."
        )
        if (result.reason === "slot_taken") setStep("time")
      }
    })
  }

  if (profile.services.length === 0) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 text-center">
        <p className="text-sm text-[#737373]">Este profesional aún no publicó servicios disponibles.</p>
      </div>
    )
  }

  if (step === "done" && done) {
    return <DoneScreen done={done} />
  }

  return (
    <div className="space-y-4">
      <Stepper current={step} />

      {step !== "service" && (
        <button onClick={goBack} className="flex items-center gap-1 text-xs text-[#737373] hover:text-[#0A0A0A] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Volver
        </button>
      )}

      {step === "service" && (
        <ServicePicker
          services={profile.services}
          onPick={(s) => {
            setService(s)
            setStep("date")
          }}
        />
      )}

      {step === "date" && (
        <DatePicker
          days={dayList}
          selected={date}
          onPick={(d) => {
            setDate(d)
            setStep("time")
          }}
        />
      )}

      {step === "time" && (
        <TimePicker
          slots={slots}
          loading={slotsLoading}
          duration={service?.duration_minutes ?? 0}
          date={date!}
          onPick={(t) => {
            setTime(t)
            setStep("contact")
          }}
        />
      )}

      {step === "contact" && (
        <ContactForm
          value={contact}
          onChange={setContact}
          submitting={submitting}
          error={error}
          summary={{ service: service!, date: date!, time: time! }}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

function Stepper({ current }: { current: Step }) {
  const order: Step[] = ["service", "date", "time", "contact"]
  const idx = order.indexOf(current)
  if (current === "done") return null
  return (
    <div className="flex gap-1.5 mb-1">
      {order.map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-1 rounded-full ${i <= idx ? "bg-[#0A0A0A]" : "bg-[#E5E5E5]"}`}
        />
      ))}
    </div>
  )
}

function ServicePicker({ services, onPick }: { services: PublicService[]; onPick: (s: PublicService) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3] mb-1">Elegí un servicio</p>
      {services.map((s) => (
        <button
          key={s.id}
          onClick={() => onPick(s)}
          className="w-full bg-white border border-[#E5E5E5] hover:border-[#0A0A0A] rounded-xl p-4 text-left transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#0A0A0A]">{s.name}</p>
              {s.description && (
                <p className="text-xs text-[#737373] mt-0.5 line-clamp-2">{s.description}</p>
              )}
              <p className="text-[11px] text-[#A3A3A3] mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDuration(s.duration_minutes)}
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-[#0A0A0A] shrink-0">
              {formatCurrency(s.price)}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

function DatePicker({ days, selected, onPick }: { days: { date: Date; available: boolean }[]; selected: Date | null; onPick: (d: Date) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3] mb-2">Elegí un día</p>
      <div className="grid grid-cols-4 gap-2">
        {days.map(({ date, available }) => {
          const isSelected = selected && isSameDay(selected, date)
          return (
            <button
              key={date.toISOString()}
              disabled={!available}
              onClick={() => onPick(date)}
              className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-colors ${
                isSelected
                  ? "bg-[#0A0A0A] border-[#0A0A0A] text-white"
                  : available
                  ? "bg-white border-[#E5E5E5] hover:border-[#0A0A0A] text-[#0A0A0A]"
                  : "bg-[#F5F5F5] border-[#F0F0F0] text-[#D4D4D4] cursor-not-allowed"
              }`}
            >
              <span className={`text-[10px] uppercase ${isSelected ? "text-[#A3A3A3]" : "text-[#A3A3A3]"}`}>
                {format(date, "EEE", { locale: es }).slice(0, 3)}
              </span>
              <span className="text-base font-semibold tabular-nums mt-0.5">
                {format(date, "d")}
              </span>
              <span className={`text-[9px] uppercase mt-0.5 ${isSelected ? "text-[#A3A3A3]" : "text-[#A3A3A3]"}`}>
                {format(date, "MMM", { locale: es })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimePicker({ slots, loading, duration, date, onPick }: { slots: string[] | null; loading: boolean; duration: number; date: Date; onPick: (t: string) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3] mb-1">Horarios disponibles</p>
      <p className="text-xs text-[#737373] mb-3">
        {format(date, "EEEE d 'de' MMMM", { locale: es })} · {formatDuration(duration)}
      </p>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
        </div>
      ) : !slots || slots.length === 0 ? (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 text-center">
          <p className="text-sm text-[#737373]">No hay horarios disponibles este día.</p>
          <p className="text-xs text-[#A3A3A3] mt-1">Probá con otra fecha.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((t) => (
            <button
              key={t}
              onClick={() => onPick(t)}
              className="bg-white border border-[#E5E5E5] hover:border-[#0A0A0A] rounded-lg py-2.5 text-sm font-medium text-[#0A0A0A] tabular-nums transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ContactForm({
  value,
  onChange,
  submitting,
  error,
  summary,
  onSubmit,
}: {
  value: { fullName: string; phone: string; email: string; notes: string }
  onChange: (v: typeof value) => void
  submitting: boolean
  error: string | null
  summary: { service: PublicService; date: Date; time: string }
  onSubmit: () => void
}) {
  const set = <K extends keyof typeof value>(k: K, v: string) => onChange({ ...value, [k]: v })
  const valid = value.fullName.trim().length >= 2 && value.phone.trim().length >= 6

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit()
      }}
      className="space-y-4"
    >
      <div className="bg-[#F5F5F5] rounded-xl p-3">
        <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3] mb-1">Resumen</p>
        <p className="text-sm font-medium text-[#0A0A0A]">{summary.service.name}</p>
        <p className="text-xs text-[#737373]">
          {format(summary.date, "EEEE d 'de' MMMM", { locale: es })} · {summary.time}h · {formatCurrency(summary.service.price)}
        </p>
      </div>

      <div className="space-y-3">
        <Field label="Tu nombre" required>
          <input
            type="text"
            value={value.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Nombre y apellido"
            autoComplete="name"
            required
            className="w-full h-11 px-3 bg-white border border-[#E5E5E5] focus:border-[#0A0A0A] rounded-lg text-sm outline-none transition-colors"
          />
        </Field>
        <Field label="Teléfono / WhatsApp" required>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="11-1234-5678"
            autoComplete="tel"
            required
            className="w-full h-11 px-3 bg-white border border-[#E5E5E5] focus:border-[#0A0A0A] rounded-lg text-sm outline-none transition-colors"
          />
        </Field>
        <Field label="Email (opcional)">
          <input
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            className="w-full h-11 px-3 bg-white border border-[#E5E5E5] focus:border-[#0A0A0A] rounded-lg text-sm outline-none transition-colors"
          />
        </Field>
        <Field label="¿Querés dejar una nota?">
          <textarea
            value={value.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Por ejemplo: alergias, preferencias…"
            rows={3}
            className="w-full px-3 py-2 bg-white border border-[#E5E5E5] focus:border-[#0A0A0A] rounded-lg text-sm outline-none transition-colors resize-none"
          />
        </Field>
      </div>

      {error && (
        <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={!valid || submitting}
        className="w-full h-11 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#262626] disabled:bg-[#E5E5E5] disabled:text-[#A3A3A3] transition-colors flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? "Reservando…" : "Confirmar turno"}
      </button>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-[#A3A3A3] block mb-1">
        {label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

function DoneScreen({ done }: { done: DoneState }) {
  const date = parse(done.date, "yyyy-MM-dd", new Date())
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F0FDF4] flex items-center justify-center">
        <Check className="w-6 h-6 text-[#16A34A]" strokeWidth={2.5} />
      </div>
      <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">¡Turno confirmado!</h2>
      <p className="text-sm text-[#737373] mb-4">
        Te esperamos en {done.businessName}
      </p>
      <div className="bg-[#F5F5F5] rounded-lg p-3 text-left">
        <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3] mb-1">Tu turno</p>
        <p className="text-sm font-medium text-[#0A0A0A]">{done.serviceName}</p>
        <p className="text-xs text-[#737373] mt-0.5">
          {format(date, "EEEE d 'de' MMMM", { locale: es })} · {done.startTime}h
        </p>
      </div>
    </div>
  )
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}
