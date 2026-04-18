"use client"

import { useState } from "react"
import { Plus, Receipt, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFixedCosts } from "@/hooks/useFixedCosts"
import { FixedCostForm } from "@/components/forms/FixedCostForm"
import { formatCurrency } from "@/lib/utils/format"
import { FIXED_COST_CATEGORIES, FIXED_COST_FREQUENCIES } from "@/lib/utils/constants"
import type { FixedCost } from "@/types/database"

const MONTHLY_MULTIPLIERS: Record<string, number> = {
  monthly: 1,
  bimonthly: 0.5,
  quarterly: 1 / 3,
  annual: 1 / 12,
}

export default function CostosPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null)
  const { costs, loading, totalMonthly, createCost, updateCost, deleteCost } = useFixedCosts()

  const openCreate = () => { setEditingCost(null); setSheetOpen(true) }
  const openEdit = (c: FixedCost) => { setEditingCost(c); setSheetOpen(true) }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#0A0A0A]">Costos fijos</h2>
        <Button size="sm" onClick={openCreate} className="h-9 gap-1.5">
          <Plus className="w-4 h-4" strokeWidth={2} /> Agregar
        </Button>
      </div>

      {/* Total mensual */}
      {costs.length > 0 && (
        <div className="bg-[#F5F5F5] rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-[#737373] uppercase tracking-wide mb-0.5">Total mensual estimado</p>
          <p className="text-2xl font-semibold tabular-nums text-[#0A0A0A]">{formatCurrency(totalMonthly)}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : costs.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin costos fijos"
          description="Registrá el alquiler, servicios e impuestos para calcular tu rentabilidad real"
          action={{ label: "Agregar costo", onClick: openCreate }}
        />
      ) : (
        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          {costs.map((cost, i) => {
            const monthlyAmount = cost.amount * (MONTHLY_MULTIPLIERS[cost.frequency] ?? 1)
            const freqLabel = FIXED_COST_FREQUENCIES.find((f) => f.value === cost.frequency)?.label ?? cost.frequency
            return (
              <div
                key={cost.id}
                className={`flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors ${
                  i !== costs.length - 1 ? "border-b border-[#F0F0F0]" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">{cost.name}</p>
                  <p className="text-xs text-[#A3A3A3]">
                    {FIXED_COST_CATEGORIES.find((c) => c.value === cost.category)?.label ?? cost.category} · {freqLabel}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-[#0A0A0A]">{formatCurrency(cost.amount)}</p>
                  {cost.frequency !== "monthly" && (
                    <p className="text-xs text-[#A3A3A3] tabular-nums">{formatCurrency(monthlyAmount)}/mes</p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
                      <MoreVertical className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cost)} className="gap-2">
                      <Pencil className="w-4 h-4" strokeWidth={1.5} /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteCost(cost.id)}
                      className="gap-2 text-[#DC2626] focus:text-[#DC2626]"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base font-semibold">
              {editingCost ? "Editar costo" : "Nuevo costo fijo"}
            </SheetTitle>
          </SheetHeader>
          <FixedCostForm
            defaultValues={editingCost}
            onSubmit={async (values) => {
              if (editingCost) await updateCost(editingCost.id, values)
              else await createCost(values)
              setSheetOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>
    </PageContainer>
  )
}
