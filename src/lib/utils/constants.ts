export const APPOINTMENT_STATUSES = {
  reserved: { label: "Reservado", color: "bg-[#F5F5F5] text-[#525252]" },
  confirmed: { label: "Confirmado", color: "bg-[#0A0A0A] text-white" },
  completed: { label: "Realizado", color: "bg-[#F0FDF4] text-[#16A34A]" },
  no_show: { label: "Ausente", color: "bg-[#FEF2F2] text-[#DC2626]" },
  cancelled: { label: "Cancelado", color: "bg-[#F5F5F5] text-[#A3A3A3] line-through" },
  rescheduled: { label: "Reprogramado", color: "bg-[#FFFBEB] text-[#D97706]" },
} as const

export type AppointmentStatus = keyof typeof APPOINTMENT_STATUSES

export const SOURCE_CHANNELS = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "recomendacion", label: "Recomendación" },
  { value: "google", label: "Google" },
  { value: "caminante", label: "Caminante" },
  { value: "otro", label: "Otro" },
] as const

export type SourceChannel = (typeof SOURCE_CHANNELS)[number]["value"]

export const FIXED_COST_CATEGORIES = [
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios (luz, agua, gas)" },
  { value: "impuestos", label: "Impuestos / Monotributo" },
  { value: "seguros", label: "Seguros" },
  { value: "equipamiento", label: "Equipamiento (amortización)" },
  { value: "marketing", label: "Marketing" },
  { value: "otros", label: "Otros" },
] as const

export const FIXED_COST_FREQUENCIES = [
  { value: "monthly", label: "Mensual" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annual", label: "Anual" },
] as const

export const SUPPLY_UNITS = [
  { value: "ml", label: "ml" },
  { value: "g", label: "g" },
  { value: "unidad", label: "Unidad" },
  { value: "par", label: "Par" },
  { value: "hoja", label: "Hoja" },
  { value: "tira", label: "Tira" },
  { value: "ampolla", label: "Ampolla" },
  { value: "sobre", label: "Sobre" },
] as const

export const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const

export const DEFAULT_WORKING_HOURS = {
  monday: { start: "09:00", end: "18:00", active: true },
  tuesday: { start: "09:00", end: "18:00", active: true },
  wednesday: { start: "09:00", end: "18:00", active: true },
  thursday: { start: "09:00", end: "18:00", active: true },
  friday: { start: "09:00", end: "18:00", active: true },
  saturday: { start: "09:00", end: "13:00", active: true },
  sunday: { start: "09:00", end: "13:00", active: false },
}

export const ITEMS_PER_PAGE = 20

export const CHART_COLORS = ["#0A0A0A", "#404040", "#737373", "#A3A3A3", "#D4D4D4"]
