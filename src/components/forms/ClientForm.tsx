"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClientSchema, type ClientFormValues } from "@/types/forms"
import { SOURCE_CHANNELS } from "@/lib/utils/constants"
import type { Client } from "@/types/database"

interface ClientFormProps {
  defaultValues?: Client | null
  onSubmit: (values: ClientFormValues) => Promise<void>
}

export function ClientForm({ defaultValues, onSubmit }: ClientFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(ClientSchema),
    defaultValues: {
      full_name: defaultValues?.full_name ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      birth_date: defaultValues?.birth_date ?? "",
      notes: defaultValues?.notes ?? "",
      source: defaultValues?.source ?? "",
    },
  })

  const handleSubmit = async (values: ClientFormValues) => {
    setLoading(true)
    await onSubmit(values)
    setLoading(false)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Nombre completo *</Label>
        <Input placeholder="María González" className="h-11" {...form.register("full_name")} />
        {form.formState.errors.full_name && (
          <p className="text-xs text-[#DC2626]">{form.formState.errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Teléfono</Label>
        <Input type="tel" inputMode="tel" placeholder="+54 9 11 1234-5678" className="h-11" {...form.register("phone")} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Email</Label>
        <Input type="email" placeholder="maria@email.com" className="h-11" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-xs text-[#DC2626]">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">¿De dónde viene?</Label>
        <Select onValueChange={(v) => form.setValue("source", v)} value={form.watch("source") ?? ""}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Canal de origen" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_CHANNELS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Fecha de nacimiento</Label>
        <Input type="date" className="h-11" {...form.register("birth_date")} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Notas</Label>
        <Textarea
          placeholder="Piel sensible, prefiere horarios de la mañana..."
          className="resize-none h-20"
          {...form.register("notes")}
        />
      </div>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Guardando..." : defaultValues ? "Guardar cambios" : "Agregar clienta"}
      </Button>
    </form>
  )
}
