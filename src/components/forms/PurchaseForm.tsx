"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PurchaseSchema, type PurchaseFormValues } from "@/types/forms"
import { useSupplies } from "@/hooks/useSupplies"

interface PurchaseFormProps {
  onSubmit: (values: PurchaseFormValues) => Promise<void>
}

export function PurchaseForm({ onSubmit }: PurchaseFormProps) {
  const [loading, setLoading] = useState(false)
  const { supplies } = useSupplies()

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(PurchaseSchema),
    defaultValues: {
      supply_id: "",
      purchase_date: format(new Date(), "yyyy-MM-dd"),
      quantity: 0,
      unit_price: 0,
    },
  })

  const qty = form.watch("quantity") ?? 0
  const unitPrice = form.watch("unit_price") ?? 0
  const total = qty * unitPrice

  const handleSubmit = async (values: PurchaseFormValues) => {
    setLoading(true)
    await onSubmit(values)
    setLoading(false)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Insumo *</Label>
        <Select onValueChange={(v) => form.setValue("supply_id", v)} value={form.watch("supply_id")}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Seleccioná el insumo" />
          </SelectTrigger>
          <SelectContent>
            {supplies.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.supply_id && (
          <p className="text-xs text-[#DC2626]">{form.formState.errors.supply_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Cantidad *</Label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            className="h-11"
            {...form.register("quantity", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Precio unitario *</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="h-11"
            {...form.register("unit_price", { valueAsNumber: true })}
          />
        </div>
      </div>

      {total > 0 && (
        <div className="bg-[#F5F5F5] rounded-lg px-3 py-2">
          <p className="text-xs text-[#737373]">
            Total: <span className="font-semibold text-[#0A0A0A] tabular-nums">
              AR$ {total.toLocaleString("es-AR")}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Proveedor</Label>
        <Input placeholder="Nombre del proveedor" className="h-11" {...form.register("supplier_name")} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Fecha *</Label>
        <Input type="date" className="h-11" {...form.register("purchase_date")} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Notas</Label>
        <Textarea placeholder="Observaciones opcionales..." className="resize-none h-16" {...form.register("notes")} />
      </div>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Registrando..." : "Registrar compra"}
      </Button>
    </form>
  )
}
