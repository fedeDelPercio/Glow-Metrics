"use server"

import { addMinutes, format, parseISO } from "date-fns"
import { z } from "zod"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { computeAvailableSlots } from "@/lib/booking/availability"
import type { WorkingHours } from "@/types/database"

export type PublicProfile = {
  id: string
  business_name: string
  full_name: string
  public_slug: string
  accepts_online_booking: boolean
  working_hours: WorkingHours
  slot_duration_minutes: number
  services: PublicService[]
}

export type PublicService = {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
}

// Reads a professional's public-facing data by slug. Returns null when the
// slug doesn't exist or the professional has disabled online booking — the
// page treats both as "not found" to avoid leaking which slugs exist.
export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  const parsed = z.string().regex(/^[a-z0-9][a-z0-9-]{2,49}$/).safeParse(slug)
  if (!parsed.success) return null

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, business_name, public_slug, accepts_online_booking, working_hours, slot_duration_minutes")
    .eq("public_slug", parsed.data)
    .is("deleted_at", null)
    .maybeSingle()

  if (!profile || !profile.accepts_online_booking) return null

  const { data: services } = await admin
    .from("services")
    .select("id, name, description, price, duration_minutes")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name")

  return {
    id: profile.id,
    full_name: profile.full_name,
    business_name: profile.business_name ?? profile.full_name,
    public_slug: profile.public_slug!,
    accepts_online_booking: profile.accepts_online_booking,
    working_hours: profile.working_hours as WorkingHours,
    slot_duration_minutes: profile.slot_duration_minutes,
    services: (services ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: Number(s.price),
      duration_minutes: s.duration_minutes,
    })),
  }
}

const SlotsInput = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,49}$/),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function getAvailableSlots(input: z.infer<typeof SlotsInput>): Promise<string[]> {
  const parsed = SlotsInput.safeParse(input)
  if (!parsed.success) return []

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, working_hours, accepts_online_booking, deleted_at")
    .eq("public_slug", parsed.data.slug)
    .maybeSingle()
  if (!profile || profile.deleted_at || !profile.accepts_online_booking) return []

  const { data: service } = await admin
    .from("services")
    .select("id, duration_minutes, user_id, deleted_at, is_active")
    .eq("id", parsed.data.serviceId)
    .maybeSingle()
  if (!service || service.user_id !== profile.id || service.deleted_at || !service.is_active) return []

  const { data: appts } = await admin
    .from("appointments")
    .select("start_time, end_time, status")
    .eq("user_id", profile.id)
    .eq("date", parsed.data.date)
    .is("deleted_at", null)
    .neq("status", "cancelled")

  const date = parseISO(parsed.data.date)
  return computeAvailableSlots({
    date,
    workingHours: profile.working_hours as WorkingHours,
    durationMin: service.duration_minutes,
    busy: (appts ?? []).map((a) => ({ start: a.start_time, end: a.end_time })),
  })
}

const BookingInput = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,49}$/),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
})

export type CreateBookingResult =
  | { ok: true; appointmentId: string; date: string; startTime: string; serviceName: string; businessName: string }
  | { ok: false; reason: "invalid_input" | "not_found" | "slot_taken" | "service_error" }

// Atomic-ish public booking: re-checks availability after computing the slot
// list to keep two simultaneous bookings from grabbing the same time. The
// race window is the gap between the SELECT and the INSERT; for the volumes
// we're targeting that's acceptable. If we ever see double-bookings, move
// this into a DB function with a transactional SELECT FOR UPDATE.
export async function createBooking(input: z.infer<typeof BookingInput>): Promise<CreateBookingResult> {
  const parsed = BookingInput.safeParse(input)
  if (!parsed.success) return { ok: false, reason: "invalid_input" }
  const v = parsed.data

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("id, business_name, full_name, working_hours, accepts_online_booking, deleted_at")
    .eq("public_slug", v.slug)
    .maybeSingle()
  if (!profile || profile.deleted_at || !profile.accepts_online_booking) return { ok: false, reason: "not_found" }

  const { data: service } = await admin
    .from("services")
    .select("id, name, duration_minutes, user_id, deleted_at, is_active, price")
    .eq("id", v.serviceId)
    .maybeSingle()
  if (!service || service.user_id !== profile.id || service.deleted_at || !service.is_active) {
    return { ok: false, reason: "service_error" }
  }

  // Re-check that the requested slot is still free.
  const { data: appts } = await admin
    .from("appointments")
    .select("start_time, end_time")
    .eq("user_id", profile.id)
    .eq("date", v.date)
    .is("deleted_at", null)
    .neq("status", "cancelled")

  const free = computeAvailableSlots({
    date: parseISO(v.date),
    workingHours: profile.working_hours as WorkingHours,
    durationMin: service.duration_minutes,
    busy: (appts ?? []).map((a) => ({ start: a.start_time, end: a.end_time })),
  })
  if (!free.includes(v.startTime)) return { ok: false, reason: "slot_taken" }

  // Find or create the client by phone (per-tenant uniqueness).
  const phoneNorm = v.phone.replace(/\s+/g, "")
  let clientId: string
  const { data: existing } = await admin
    .from("clients")
    .select("id")
    .eq("user_id", profile.id)
    .eq("phone", phoneNorm)
    .is("deleted_at", null)
    .maybeSingle()

  if (existing) {
    clientId = existing.id
  } else {
    const { data: created, error: clientErr } = await admin
      .from("clients")
      .insert({
        user_id: profile.id,
        full_name: v.fullName,
        phone: phoneNorm,
        email: v.email || null,
        source: "online_booking",
      })
      .select("id")
      .single()
    if (clientErr || !created) return { ok: false, reason: "service_error" }
    clientId = created.id
  }

  const startDate = parseISO(`${v.date}T${v.startTime}:00`)
  const endTime = format(addMinutes(startDate, service.duration_minutes), "HH:mm")

  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .insert({
      user_id: profile.id,
      client_id: clientId,
      service_id: service.id,
      date: v.date,
      start_time: v.startTime,
      end_time: endTime,
      status: "confirmed",
      booked_via: "public",
      source: "online_booking",
      notes: v.notes || null,
    })
    .select("id")
    .single()

  if (apptErr || !appt) return { ok: false, reason: "service_error" }

  return {
    ok: true,
    appointmentId: appt.id,
    date: v.date,
    startTime: v.startTime,
    serviceName: service.name,
    businessName: profile.business_name ?? profile.full_name,
  }
}
