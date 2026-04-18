"use client"

import { useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ServiceSchema, type ServiceFormValues, type ServiceSupplyFormValues } from "@/types/forms"
import type { ServiceCategory } from "@/types/database"
import type { ServiceWithCategory } from "@/hooks/useServices"
import { useSupplies } from "@/hooks/useSupplies"

interface ServiceFormProps {
  defaultValues?: ServiceWithCategory | null
  categories: ServiceCategory[]
  onSubmit: (values: ServiceFormValues, supplies: ServiceSupplyFormValues[]) => Promise<void>
}

export function ServiceForm({ defaultValues, categories, onSubmit }: ServiceFormProps) {
  const { supplies } = useSupplies()
  const [showRecipe, setShowRecipe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recipe, setRecipe] = useState<ServiceSupplyFormValues[]>(
    defaultValues?.service_supplies?.map((ss) => ({
      supply_id: ss.supply_id,
      quantity_per_session: ss.quantity_per_session,
    })) ?? []
  )

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(ServiceSchema) as Resolver<ServiceFormValues>,
    defaultValues: {
      name: defaultValues?.name ?? "",
      category_id: defaultValues?.category_id ?? undefined,
      description: defaultValues?.description ?? "",
      price: defaultValues?.price ?? 0,
      duration_minutes: defaultValues?.duration_minutes ?? 60,
      is_active: defaultValues?.is_active ?? true,
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (values: any) => {
    const typedValues = values as ServiceFormValues
    setLoading(true)
    try {
      await onSubmit(typedValues, recipe)
    } finally {
      setLoading(false)
    }
  }

  const addRecipeItem = () => {
    setRecipe((prev) => [...prev, { supply_id: "", quantity_per_session: 0 }])
  }

  const removeRecipeItem = (index: number) => {
    setRecipe((prev) => prev.filter((_, i) => i !== index))
  }

  const updateRecipeItem = (index: number, field: keyof ServiceSupplyFormValues, value: string | number) => {
    setRecipe((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Nombre del servicio *</Label>
        <Input placeholder="Limpieza facial profunda" className="h-11" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-[#DC2626]">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Precio *</Label>
          <CurrencyInput
            value={form.watch("price") ?? 0}
            onChange={(v) => form.setValue("price", v, { shouldValidate: true })}
          />
          {form.formState.errors.price && (
            <p className="text-xs text-[#DC2626]">{form.formState.errors.price.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-[#737373]">Duración (min) *</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="60"
            className="h-11"
            {...form.register("duration_minutes", { valueAsNumber: true })}
          />
          {form.formState.errors.duration_minutes && (
            <p className="text-xs text-[#DC2626]">{form.formState.errors.duration_minutes.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Categoría</Label>
        <Select
          onValueChange={(v) => form.setValue("category_id", v)}
          value={form.watch("category_id") ?? ""}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-[#737373]">Descripción</Label>
        <Textarea
          placeholder="Descripción opcional del servicio..."
          className="resize-none h-20"
          {...form.register("description")}
        />
      </div>

      {/* Receta de insumos */}
      <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors"
          onClick={() => setShowRecipe(!showRecipe)}
        >
          <span>Receta de insumos {recipe.length > 0 ? `(${recipe.length})` : ""}</span>
          {showRecipe ? (
            <ChevronUp className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
          )}
        </button>

        {showRecipe && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#F0F0F0]">
            <p className="text-xs text-[#737373] pt-3">
              Indicá qué insumos usás y en qué cantidad por sesión
            </p>

            {recipe.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={item.supply_id}
                  onValueChange={(v) => updateRecipeItem(index, "supply_id", v)}
                >
                  <SelectTrigger className="flex-1 h-10 text-sm">
                    <SelectValue placeholder="Insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Cant."
                  className="w-20 h-10 text-sm"
                  value={item.quantity_per_session || ""}
                  onChange={(e) => updateRecipeItem(index, "quantity_per_session", Number(e.target.value))}
                />

                <button
                  type="button"
                  onClick={() => removeRecipeItem(index)}
                  className="w-8 h-8 flex items-center justify-center text-[#A3A3A3] hover:text-[#DC2626]"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRecipeItem}
              className="flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#0A0A0A] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Agregar insumo
            </button>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? "Guardando..." : defaultValues ? "Guardar cambios" : "Crear servicio"}
      </Button>
    </form>
  )
}
