"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SupplySchema, type SupplyFormValues } from "@/types/forms"
import { SUPPLY_UNITS } from "@/lib/utils/constants"
import type { SupplyCatalog } from "@/types/database"

interface SupplyFormProps {
  defaultValues?: SupplyCatalog | null
  onSubmit: (values: SupplyFormValues) => Promise<void>
}

export function SupplyForm({ defaultValues, onSubmit }: SupplyFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<SupplyFormValues>({
    resolver: zodResolver(SupplySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      brand: defaultValues?.brand ?? "",
      unit: defaultValues?.unit ?? "",
      unit_size: defaultValues?.unit_size ?? undefined,
      pack_price: defaultValues?.pack_price ?? undefined,
      min_stock_alert: defaultValues?.min_stock_alert ?? undefined,
    },
  })

  const handleSubmit = async (values: SupplyFormValues) => {
    setLoading(true)
    await onSubmit(values)
    setLoading(false)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Nombre del insumo *</Label>
        <Input placeholder="Crema hidratante" className="h-11" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-[#DC2626]">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Marca</Label>
        <Input placeholder="Ej: Mesoestetic" className="h-11" {...form.register("brand")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Unidad *</Label>
          <Select onValueChange={(v) => form.setValue("unit", v)} value={form.watch("unit")}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Unidad" />
            </SelectTrigger>
            <SelectContent>
              {SUPPLY_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.unit && (
            <p className="text-xs text-[#DC2626]">{form.formState.errors.unit.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Tamaño envase</Label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="250"
            className="h-11"
            {...form.register("unit_size", { setValueAs: (v) => v === "" ? undefined : Number(v) })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Precio del envase</Label>
        <CurrencyInput
          value={form.watch("pack_price") ?? 0}
          onChange={(v) => form.setValue("pack_price", v > 0 ? v : undefined, { shouldValidate: true })}
        />
        <p className="text-[10px] text-[#A3A3A3]">
          Lo usamos para calcular el costo por sesión en cada servicio. Opcional.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Alerta de stock mínimo</Label>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Ej: 50 (avisar cuando queden menos de 50ml)"
          className="h-11"
          {...form.register("min_stock_alert", { setValueAs: (v) => v === "" ? undefined : Number(v) })}
        />
      </div>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Guardando..." : defaultValues ? "Guardar cambios" : "Agregar insumo"}
      </Button>
    </form>
  )
}
