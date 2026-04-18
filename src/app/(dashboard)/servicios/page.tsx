"use client"

import { useState } from "react"
import { Plus, Scissors, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useServices, type ServiceWithCategory } from "@/hooks/useServices"
import { ServiceForm } from "@/components/forms/ServiceForm"
import { formatCurrency, formatDuration } from "@/lib/utils/format"

export default function ServiciosPage() {
  const { services, categories, loading, createService, updateService, deleteService, upsertSupplyRecipe } = useServices()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingService, setEditingService] = useState<ServiceWithCategory | null>(null)

  const grouped = categories
    .filter((cat) => services.some((s) => s.category_id === cat.id && !s.deleted_at))
    .map((cat) => ({
      category: cat,
      services: services.filter((s) => s.category_id === cat.id),
    }))

  const uncategorized = services.filter((s) => !s.category_id)

  const openCreate = () => {
    setEditingService(null)
    setSheetOpen(true)
  }

  const openEdit = (s: ServiceWithCategory) => {
    setEditingService(s)
    setSheetOpen(true)
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div>
          <h2 className="text-base lg:text-2xl font-semibold text-[#0A0A0A]">Servicios</h2>
          <p className="hidden lg:block text-sm text-[#737373] mt-0.5">Tu menú de tratamientos y precios</p>
        </div>
        <Button onClick={openCreate} className="h-9 lg:h-10 gap-1.5">
          <Plus className="w-4 h-4" strokeWidth={2} /> Agregar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Sin servicios aún"
          description="Agregá los tratamientos que ofrecés para comenzar a gestionar tu agenda"
          action={{ label: "Agregar servicio", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, services: catServices }) => (
            <div key={category.id}>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-2">
                {category.name}
              </p>
              <div className="space-y-2 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0">
                {catServices.map((s) => (
                  <ServiceRow key={s.id} service={s} onEdit={openEdit} onDelete={deleteService} />
                ))}
              </div>
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-2">
                Sin categoría
              </p>
              <div className="space-y-2 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0">
                {uncategorized.map((s) => (
                  <ServiceRow key={s.id} service={s} onEdit={openEdit} onDelete={deleteService} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base font-semibold">
              {editingService ? "Editar servicio" : "Nuevo servicio"}
            </SheetTitle>
          </SheetHeader>
          <ServiceForm
            defaultValues={editingService}
            categories={categories}
            onSubmit={async (values, supplies) => {
              if (editingService) {
                const ok = await updateService(editingService.id, values)
                if (ok && supplies !== undefined) await upsertSupplyRecipe(editingService.id, supplies)
              } else {
                const created = await createService(values)
                if (created && supplies !== undefined) await upsertSupplyRecipe(created.id, supplies)
              }
              setSheetOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>
    </PageContainer>
  )
}

function ServiceRow({
  service: s,
  onEdit,
  onDelete,
}: {
  service: ServiceWithCategory
  onEdit: (s: ServiceWithCategory) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#E5E5E5] rounded-xl px-4 py-3 hover:border-[#D4D4D4] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#0A0A0A] truncate">{s.name}</p>
          {!s.is_active && (
            <span className="text-[10px] text-[#A3A3A3] bg-[#F5F5F5] px-1.5 py-0.5 rounded">
              Inactivo
            </span>
          )}
        </div>
        <p className="text-xs text-[#A3A3A3]">{formatDuration(s.duration_minutes)}</p>
      </div>
      <p className="text-sm font-semibold tabular-nums text-[#0A0A0A]">{formatCurrency(s.price)}</p>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
            <MoreVertical className="w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(s)} className="gap-2">
            <Pencil className="w-4 h-4" strokeWidth={1.5} /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(s.id)}
            className="gap-2 text-[#DC2626] focus:text-[#DC2626]"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
