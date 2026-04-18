"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"

const Schema = z.object({
  email: z.string().email("Email inválido"),
})

type FormValues = z.infer<typeof Schema>

export default function LoginPage() {
  const { signInWithMagicLink } = useAuth()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    const { error } = await signInWithMagicLink(values.email)
    setLoading(false)
    if (error) {
      toast.error("No pudimos enviar el link. Revisá el email e intentá de nuevo.")
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">✉️</div>
        <h2 className="text-lg font-medium text-[#0A0A0A]">Revisá tu email</h2>
        <p className="text-sm text-[#737373]">
          Enviamos un link de acceso a{" "}
          <span className="text-[#0A0A0A] font-medium">{getValues("email")}</span>.
          Hacé click en el link para ingresar.
        </p>
        <p className="text-xs text-[#A3A3A3]">
          Si no lo ves, revisá la carpeta de spam.
        </p>
        <Button
          variant="ghost"
          className="text-sm text-[#737373]"
          onClick={() => setSent(false)}
        >
          Usar otro email
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-[#0A0A0A]">Ingresar a GlowMetrics</h2>
        <p className="text-sm text-[#737373] mt-1">
          Te enviamos un link mágico a tu email — sin contraseñas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs uppercase tracking-wide text-[#737373]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            autoFocus
            className="h-11"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-[#DC2626]">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Enviando..." : "Enviar link de acceso"}
        </Button>
      </form>

      <p className="text-center text-xs text-[#A3A3A3]">
        Si es tu primera vez, tu cuenta se crea automáticamente.
      </p>
    </div>
  )
}
