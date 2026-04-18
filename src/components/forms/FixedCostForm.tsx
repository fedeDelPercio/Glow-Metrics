"use client"

import { useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FixedCostSchema, type FixedCostFormValues } from "@/types/forms"
import { FIXED_COST_CATEGORIES, FIXED_COST_FREQUENCIES } from "@/lib/utils/constants"
import type { FixedCost } from "@/types/database"

interface FixedCostFormProps {
  defaultValues?: FixedCost | null
  onSubmit: (values: FixedCostFormValues) => Promise<void>
}

export function FixedCostForm({ defaultValues, onSubmit }: FixedCostFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<FixedCostFormValues>({
    resolver: zodResolver(FixedCostSchema) as Resolver<FixedCostFormValues>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      category: defaultValues?.category ?? "",
      amount: defaultValues?.amount ?? 0,
      frequency: (defaultValues?.frequency as FixedCostFormValues["frequency"]) ?? "monthly",
      is_active: defaultValues?.is_active ?? true,
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (values: any) => {
    setLoading(true)
    await onSubmit(values)
    setLoading(false)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Nombre *</Label>
        <Input placeholder="Alquiler del local" className="h-11" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-[#DC2626]">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Categoría *</Label>
        <Select onValueChange={(v) => form.setValue("category", v)} value={form.watch("category")}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Seleccioná una categoría" />
          </SelectTrigger>
          <SelectContent>
            {FIXED_COST_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.category && (
          <p className="text-xs text-[#DC2626]">{form.formState.errors.category.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Monto *</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="h-11"
            {...form.register("amount", { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <p className="text-xs text-[#DC2626]">{form.formState.errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Frecuencia</Label>
          <Select
            onValueChange={(v) => form.setValue("frequency", v as FixedCostFormValues["frequency"])}
            value={form.watch("frequency")}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIXED_COST_FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Guardando..." : defaultValues ? "Guardar cambios" : "Agregar costo"}
      </Button>
    </form>
  )
}
