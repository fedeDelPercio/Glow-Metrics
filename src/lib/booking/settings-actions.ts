"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

// These actions are tied to the authenticated owner's session, so they use
// the per-request server client (RLS-scoped). Slug uniqueness is enforced
// by the partial unique index in migration 002.

const SettingsInput = z.object({
  publicSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,49}$/, "Solo letras, números y guiones (3-50 caracteres)"),
  acceptsOnlineBooking: z.boolean(),
})

export type UpdateSettingsResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "slug_taken" | "unauthorized" | "error"; message?: string }

export async function updateBookingSettings(input: z.infer<typeof SettingsInput>): Promise<UpdateSettingsResult> {
  const parsed = SettingsInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: parsed.error.issues[0]?.message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: "unauthorized" }

  // Slug uniqueness pre-check using admin client (the user's own current
  // slug must not collide with itself).
  const admin = getSupabaseAdmin()
  const { data: collision } = await admin
    .from("profiles")
    .select("id")
    .eq("public_slug", parsed.data.publicSlug)
    .neq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle()
  if (collision) return { ok: false, reason: "slug_taken", message: "Ese link ya está en uso. Probá con otro." }

  const { error } = await supabase
    .from("profiles")
    .update({
      public_slug: parsed.data.publicSlug,
      accepts_online_booking: parsed.data.acceptsOnlineBooking,
    })
    .eq("id", user.id)

  if (error) {
    if (error.code === "23505") return { ok: false, reason: "slug_taken", message: "Ese link ya está en uso." }
    return { ok: false, reason: "error", message: error.message }
  }

  revalidatePath("/reservas-online")
  return { ok: true }
}
