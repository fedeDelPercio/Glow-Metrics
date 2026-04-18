"use client"

import { useState } from "react"
import { Plus, ShoppingCart, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { usePurchases } from "@/hooks/useSupplies"
import { PurchaseForm } from "@/components/forms/PurchaseForm"
import { formatCurrency, formatShortDate } from "@/lib/utils/format"

export default function ComprasPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { purchases, loading, createPurchase } = usePurchases()

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/insumos">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <ArrowLeft className="w-4 h-4 text-[#525252]" strokeWidth={1.5} />
          </button>
        </Link>
        <h2 className="text-base font-semibold text-[#0A0A0A] flex-1">Compras de insumos</h2>
        <Button size="sm" onClick={() => setSheetOpen(true)} className="h-9 gap-1.5">
          <Plus className="w-4 h-4" strokeWidth={2} /> Registrar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sin compras registradas"
          description="Registrá tus compras para controlar el inventario automáticamente"
          action={{ label: "Registrar compra", onClick: () => setSheetOpen(true) }}
        />
      ) : (
        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          {purchases.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#FAFAFA] ${
                i !== purchases.length - 1 ? "border-b border-[#F0F0F0]" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0A0A0A] truncate">
                  {p.supply_catalog?.name ?? "Insumo eliminado"}
                </p>
                <p className="text-xs text-[#A3A3A3]">
                  {p.quantity} {p.supply_catalog?.unit} · {p.supplier_name ?? "Sin proveedor"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold tabular-nums text-[#0A0A0A]">{formatCurrency(p.total_price)}</p>
                <p className="text-xs text-[#A3A3A3]">{formatShortDate(p.purchase_date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base font-semibold">Registrar compra</SheetTitle>
          </SheetHeader>
          <PurchaseForm
            onSubmit={async (values) => {
              await createPurchase(values)
              setSheetOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>
    </PageContainer>
  )
}
