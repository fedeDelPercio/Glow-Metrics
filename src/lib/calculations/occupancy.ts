import type { WorkingHours } from "@/types/database"
import { eachDayOfInterval, getDay } from "date-fns"

const DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
}

export function calcTotalSlots(
  start: Date,
  end: Date,
  workingHours: WorkingHours,
  slotDurationMinutes: number
): number {
  const days = eachDayOfInterval({ start, end })
  let totalSlots = 0

  for (const day of days) {
    const dayKey = DAY_MAP[getDay(day)]
    const hours = workingHours[dayKey]
    if (!hours?.active) continue

    const [startH, startM] = hours.start.split(":").map(Number)
    const [endH, endM] = hours.end.split(":").map(Number)
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)
    totalSlots += Math.floor(totalMinutes / slotDurationMinutes)
  }

  return totalSlots
}

export function calcOccupancyRate(completedAppointments: number, totalSlots: number): number {
  if (totalSlots === 0) return 0
  return Math.min(100, (completedAppointments / totalSlots) * 100)
}

export function calcAbsenceRate(noShows: number, completed: number): number {
  const total = noShows + completed
  if (total === 0) return 0
  return (noShows / total) * 100
}
