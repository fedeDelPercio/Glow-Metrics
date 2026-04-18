import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns"
import { es } from "date-fns/locale"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (isToday(d)) return "Hoy"
  if (isTomorrow(d)) return "Mañana"
  if (isYesterday(d)) return "Ayer"
  return format(d, "d 'de' MMMM", { locale: es })
}

export function formatDateFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":")
  return `${hours}:${minutes}`
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date
  return format(d, "d MMM", { locale: es })
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
