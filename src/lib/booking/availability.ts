import { addMinutes, format, parse } from "date-fns"
import type { WorkingHours } from "@/types/database"

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const

export type BusyInterval = { start: string; end: string }

// Returns all start times (HH:mm) where a service of `durationMin` minutes
// fits inside the day's working window without overlapping any busy interval.
// `step` controls slot granularity (defaults to 15 — granular enough for any
// realistic service, while keeping the picker manageable).
export function computeAvailableSlots(opts: {
  date: Date
  workingHours: WorkingHours
  durationMin: number
  busy: BusyInterval[]
  step?: number
  now?: Date
}): string[] {
  const step = opts.step ?? 15
  const day = DAY_KEYS[opts.date.getDay()]
  const window = opts.workingHours[day]
  if (!window || !window.active) return []

  const dayOpen = parseTime(opts.date, window.start)
  const dayClose = parseTime(opts.date, window.end)
  const now = opts.now ?? new Date()
  const minStart = opts.date.toDateString() === now.toDateString() ? now : dayOpen

  const busyMs = opts.busy
    .filter((b) => b.start && b.end)
    .map((b) => ({ start: parseTime(opts.date, b.start).getTime(), end: parseTime(opts.date, b.end).getTime() }))

  const slots: string[] = []
  for (let cursor = roundUp(dayOpen, step); cursor <= addMinutes(dayClose, -opts.durationMin); cursor = addMinutes(cursor, step)) {
    if (cursor < minStart) continue
    const slotStart = cursor.getTime()
    const slotEnd = addMinutes(cursor, opts.durationMin).getTime()
    const conflicts = busyMs.some((b) => slotStart < b.end && slotEnd > b.start)
    if (!conflicts) slots.push(format(cursor, "HH:mm"))
  }
  return slots
}

function parseTime(date: Date, hhmm: string): Date {
  // Postgres TIME columns serialize as "HH:mm:ss" but the booking form
  // submits "HH:mm". Normalize before parsing.
  return parse(hhmm.slice(0, 5), "HH:mm", date)
}

// Round a Date up to the next multiple of `step` minutes.
function roundUp(d: Date, step: number): Date {
  const m = d.getMinutes()
  const remainder = m % step
  if (remainder === 0 && d.getSeconds() === 0) return d
  return addMinutes(d, step - remainder)
}
