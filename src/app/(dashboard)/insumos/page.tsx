"use client"

import { useState } from "react"
import { Plus, Package, MoreVertical, Pencil, Trash2, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useSupplies } from "@/hooks/useSupplies"
import { SupplyForm } from "@/components/forms/SupplyForm"
import type { SupplyCatalog } from "@/types/database"

export default function InsumosPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingSupply, setEditingSupply] = useState<SupplyCatalog | null>(null)
  const { supplies, loading, createSupply, updateSupply, deleteSupply } = useSupplies()

  const openCreate = () => { setEditingSupply(null); setSheetOpen(true) }
  const openEdit = (s: SupplyCatalog) => { setEditingSupply(s); setSheetOpen(true) }

  const lowStock = supplies.filter((s) => s.min_stock_alert != null && s.current_stock <= s.min_stock_alert)

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-[#0A0A0A]">Insumos</h2>
        <div className="flex gap-2">
          <Link href="/insumos/compras">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <ShoppingCart className="w-4 h-4" strokeWidth={1.5} /> Compras
            </Button>
          </Link>
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5">
            <Plus className="w-4 h-4" strokeWidth={2} /> Agregar
          </Button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#F59E0B]/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-medium text-[#D97706]">
            ⚠ Stock bajo: {lowStock.map((s) => s.name).join(", ")}
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : supplies.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin insumos aún"
          description="Registrá los productos que usás en tus tratamientos para controlar el stock"
          action={{ label: "Agregar insumo", onClick: openCreate }}
        />
      ) : (
        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          {supplies.map((supply, i) => {
            const isLow = supply.min_stock_alert != null && supply.current_stock <= supply.min_stock_alert
            return (
              <div
                key={supply.id}
                className={`flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors ${
                  i !== supplies.length - 1 ? "border-b border-[#F0F0F0]" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{supply.name}</p>
                    {supply.brand && <span className="text-xs text-[#A3A3A3]">{supply.brand}</span>}
                  </div>
                  <p className={`text-xs ${isLow ? "text-[#D97706]" : "text-[#A3A3A3]"}`}>
                    Stock: {supply.current_stock} {supply.unit}
                    {isLow && " — Stock bajo"}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
                      <MoreVertical className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(supply)} className="gap-2">
                      <Pencil className="w-4 h-4" strokeWidth={1.5} /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteSupply(supply.id)}
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
              {editingSupply ? "Editar insumo" : "Nuevo insumo"}
            </SheetTitle>
          </SheetHeader>
          <SupplyForm
            defaultValues={editingSupply}
            onSubmit={async (values) => {
              if (editingSupply) await updateSupply(editingSupply.id, values)
              else await createSupply(values)
              setSheetOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>
    </PageContainer>
  )
}
