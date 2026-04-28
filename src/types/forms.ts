import { z } from "zod"

export const ProfileSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  business_name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
})

export const OnboardingStep1Schema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  business_name: z.string().min(2, "El nombre del negocio es requerido").max(100),
})

export const OnboardingStep2Schema = z.object({
  working_hours: z.record(
    z.string(),
    z.object({
      start: z.string(),
      end: z.string(),
      active: z.boolean(),
    })
  ),
})

export const OnboardingStep3Schema = z.object({
  slot_duration_minutes: z.number().int().min(15).max(120),
})

export const ServiceCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50),
  color: z.string(),
})

export const ServiceSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  price: z.number().positive("El precio debe ser positivo"),
  duration_minutes: z.number().int().min(5, "Mínimo 5 min").max(480, "Máximo 8 horas"),
  is_active: z.boolean(),
})

export const ServiceSupplySchema = z.object({
  supply_id: z.string().uuid("Seleccioná un insumo"),
  quantity_per_session: z.number().positive("La cantidad debe ser positiva"),
})

export const ClientSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  source: z.string().optional().nullable(),
})

export const AppointmentSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  service_id: z.string().uuid("Seleccioná un servicio"),
  date: z.string().min(1, "Seleccioná una fecha"),
  start_time: z.string().min(1, "Seleccioná el horario"),
  status: z.enum(["reserved", "confirmed", "completed", "no_show", "cancelled", "rescheduled"]),
  source: z.string().optional().nullable(),
  price_charged: z.number().positive().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const SupplySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  brand: z.string().max(100).optional().nullable(),
  unit: z.string().min(1, "Seleccioná la unidad"),
  unit_size: z.number().positive().optional().nullable(),
  pack_price: z.number().positive().optional().nullable(),
  min_stock_alert: z.number().positive().optional().nullable(),
})

export const PurchaseSchema = z.object({
  supply_id: z.string().uuid("Seleccioná un insumo"),
  supplier_name: z.string().max(100).optional().nullable(),
  quantity: z.number().positive("La cantidad debe ser positiva"),
  unit_price: z.number().positive("El precio debe ser positivo"),
  purchase_date: z.string().min(1, "Seleccioná una fecha"),
  notes: z.string().max(500).optional().nullable(),
})

export const FixedCostSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  category: z.string().min(1, "Seleccioná una categoría"),
  amount: z.number().positive("El monto debe ser positivo"),
  frequency: z.enum(["monthly", "bimonthly", "quarterly", "annual"]),
  is_active: z.boolean(),
})

export type ProfileFormValues = z.infer<typeof ProfileSchema>
export type OnboardingStep1Values = z.infer<typeof OnboardingStep1Schema>
export type OnboardingStep2Values = z.infer<typeof OnboardingStep2Schema>
export type OnboardingStep3Values = z.infer<typeof OnboardingStep3Schema>
export type ServiceCategoryFormValues = z.infer<typeof ServiceCategorySchema>
export type ServiceFormValues = z.infer<typeof ServiceSchema>
export type ServiceSupplyFormValues = z.infer<typeof ServiceSupplySchema>
export type ClientFormValues = z.infer<typeof ClientSchema>
export type AppointmentFormValues = z.infer<typeof AppointmentSchema>
export type SupplyFormValues = z.infer<typeof SupplySchema>
export type PurchaseFormValues = z.infer<typeof PurchaseSchema>
export type FixedCostFormValues = z.infer<typeof FixedCostSchema>
