"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import {
  OnboardingStep1Schema,
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  type OnboardingStep1Values,
  type OnboardingStep2Values,
  type OnboardingStep3Values,
} from "@/types/forms"
import { DAYS_OF_WEEK, DEFAULT_WORKING_HOURS } from "@/lib/utils/constants"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<OnboardingStep1Values | null>(null)
  const [step2Data, setStep2Data] = useState<OnboardingStep2Values | null>(null)
  const [loading, setLoading] = useState(false)

  const form1 = useForm<OnboardingStep1Values>({
    resolver: zodResolver(OnboardingStep1Schema),
    defaultValues: { full_name: "", business_name: "" },
  })

  const form2 = useForm<OnboardingStep2Values>({
    resolver: zodResolver(OnboardingStep2Schema),
    defaultValues: { working_hours: DEFAULT_WORKING_HOURS },
  })

  const form3 = useForm<OnboardingStep3Values>({
    resolver: zodResolver(OnboardingStep3Schema),
    defaultValues: { slot_duration_minutes: 30 },
  })

  const handleStep1 = (values: OnboardingStep1Values) => {
    setStep1Data(values)
    setStep(2)
  }

  const handleStep2 = (values: OnboardingStep2Values) => {
    setStep2Data(values)
    setStep(3)
  }

  const handleStep3 = async (values: OnboardingStep3Values) => {
    if (!user || !step1Data || !step2Data) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({
      full_name: step1Data.full_name,
      business_name: step1Data.business_name,
      working_hours: step2Data.working_hours as unknown as import("@/types/database").Database["public"]["Tables"]["profiles"]["Update"]["working_hours"],
      slot_duration_minutes: values.slot_duration_minutes,
      onboarding_completed: true,
    }).eq("id", user.id)

    setLoading(false)

    if (error) {
      toast.error("Error al guardar el perfil")
      return
    }

    await refreshProfile()
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full mx-0.5 transition-colors ${
                  s <= step ? "bg-[#0A0A0A]" : "bg-[#E5E5E5]"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-[#A3A3A3] text-center">Paso {step} de 3</p>
        </div>

        {step === 1 && (
          <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#0A0A0A]">¡Hola! Contanos sobre vos</h2>
              <p className="text-sm text-[#737373] mt-1">Estos datos aparecen en tu perfil</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#737373]">Tu nombre</Label>
              <Input
                placeholder="María González"
                className="h-11"
                {...form1.register("full_name")}
              />
              {form1.formState.errors.full_name && (
                <p className="text-xs text-[#DC2626]">{form1.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-[#737373]">Nombre de tu negocio</Label>
              <Input
                placeholder="Estética María"
                className="h-11"
                {...form1.register("business_name")}
              />
              {form1.formState.errors.business_name && (
                <p className="text-xs text-[#DC2626]">{form1.formState.errors.business_name.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11">Siguiente</Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#0A0A0A]">¿Cuándo trabajás?</h2>
              <p className="text-sm text-[#737373] mt-1">Configurá tus días y horarios de atención</p>
            </div>

            <div className="space-y-3">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const watchActive = form2.watch(`working_hours.${key}.active`)
                return (
                  <div key={key} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => form2.setValue(`working_hours.${key}.active` as `working_hours.${string}.active`, !watchActive as never)}
                      className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                        watchActive ? "bg-[#0A0A0A]" : "bg-[#E5E5E5]"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${
                          watchActive ? "translate-x-2" : "-translate-x-2"
                        }`}
                      />
                    </button>
                    <span className={`text-sm w-24 ${watchActive ? "text-[#0A0A0A]" : "text-[#A3A3A3]"}`}>
                      {label}
                    </span>
                    {watchActive && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          className="h-8 text-sm px-2"
                          {...form2.register(`working_hours.${key}.start`)}
                        />
                        <span className="text-[#A3A3A3] text-xs">a</span>
                        <Input
                          type="time"
                          className="h-8 text-sm px-2"
                          {...form2.register(`working_hours.${key}.end`)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button type="submit" className="flex-1 h-11">Siguiente</Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={form3.handleSubmit(handleStep3)} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#0A0A0A]">Duración de los turnos</h2>
              <p className="text-sm text-[#737373] mt-1">¿Cada cuántos minutos abrís un slot en la agenda?</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[15, 30, 45, 60, 90, 120].map((min) => {
                const current = form3.watch("slot_duration_minutes")
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => form3.setValue("slot_duration_minutes", min)}
                    className={`h-14 rounded-lg border text-sm font-medium transition-colors ${
                      current === min
                        ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                        : "bg-white text-[#0A0A0A] border-[#E5E5E5] hover:border-[#D4D4D4]"
                    }`}
                  >
                    {min} min
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button type="submit" className="flex-1 h-11" disabled={loading}>
                {loading ? "Guardando..." : "¡Listo!"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
