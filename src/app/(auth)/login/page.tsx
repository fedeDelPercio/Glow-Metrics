"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"

const Schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

type FormValues = z.infer<typeof Schema>

export default function LoginPage() {
  const { signInWithPassword } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema) as never,
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    const { error } = await signInWithPassword(values.email, values.password)
    setLoading(false)
    if (error) {
      toast.error("Email o contraseña incorrectos")
      return
    }
    router.push("/")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-[#0A0A0A]">Ingresar a GlowMetrics</h2>
        <p className="text-sm text-[#737373] mt-1">Ingresá tu email y contraseña.</p>
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

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs uppercase tracking-wide text-[#737373]">
            Contraseña
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-11 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#525252]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-[#DC2626]">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
    </div>
  )
}
