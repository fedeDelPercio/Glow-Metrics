"use client"

import { useState } from "react"
import { Search, Plus, Users, Phone } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useClients } from "@/hooks/useClients"
import { ClientForm } from "@/components/forms/ClientForm"
import { ClientDetailSheet } from "@/components/cards/ClientDetailSheet"
import type { Client } from "@/types/database"
import { SOURCE_CHANNELS } from "@/lib/utils/constants"

export default function ClientasPage() {
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const { clients, loading, createClient, updateClient, deleteClient } = useClients(search)

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div>
          <h2 className="text-base lg:text-2xl font-semibold text-[#0A0A0A]">Clientas</h2>
          <p className="hidden lg:block text-sm text-[#737373] mt-0.5">Tu cartera de clientas y su historial</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-9 lg:h-10 gap-1.5">
          <Plus className="w-4 h-4" strokeWidth={2} /> Agregar
        </Button>
      </div>

      <div className="relative mb-4 lg:mb-6 lg:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" strokeWidth={1.5} />
        <Input
          placeholder="Buscar clienta..."
          className="h-11 pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-0">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-none first:rounded-t-xl last:rounded-b-xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Sin resultados" : "Sin clientas aún"}
          description={search ? "Probá con otro nombre" : "Agregá tus clientas para llevar un historial de visitas"}
          action={!search ? { label: "Agregar clienta", onClick: () => setCreateOpen(true) } : undefined}
        />
      ) : (
        <>
          {/* Mobile: lista apilada. Desktop: grid 2 columnas de cards */}
          <div className="lg:hidden border border-[#E5E5E5] rounded-xl overflow-hidden">
            {clients.map((client, i) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClient(client)}
                className={`w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors text-left ${
                  i !== clients.length - 1 ? "border-b border-[#F0F0F0]" : ""
                }`}
              >
                <div className="w-9 h-9 bg-[#F5F5F5] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-[#525252]">
                    {client.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">{client.full_name}</p>
                  <div className="flex items-center gap-2">
                    {client.phone && (
                      <span className="text-xs text-[#A3A3A3] flex items-center gap-0.5">
                        <Phone className="w-3 h-3" strokeWidth={1.5} /> {client.phone}
                      </span>
                    )}
                    {client.source && (
                      <span className="text-[10px] text-[#A3A3A3]">
                        {SOURCE_CHANNELS.find((s) => s.value === client.source)?.label ?? client.source}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[#D4D4D4] text-xs">›</span>
              </button>
            ))}
          </div>

          <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-3">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClient(client)}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-[#E5E5E5] rounded-xl hover:border-[#D4D4D4] hover:shadow-sm transition-all text-left"
              >
                <div className="w-11 h-11 bg-[#F5F5F5] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-[#525252]">
                    {client.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">{client.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {client.phone && (
                      <span className="text-xs text-[#A3A3A3] flex items-center gap-0.5">
                        <Phone className="w-3 h-3" strokeWidth={1.5} /> {client.phone}
                      </span>
                    )}
                    {client.source && (
                      <span className="text-[10px] text-[#A3A3A3]">
                        {SOURCE_CHANNELS.find((s) => s.value === client.source)?.label ?? client.source}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[#D4D4D4] text-xs">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Sheet: nueva clienta */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base font-semibold">Nueva clienta</SheetTitle>
          </SheetHeader>
          <ClientForm
            onSubmit={async (values) => {
              await createClient(values)
              setCreateOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Sheet: detalle/edición */}
      <ClientDetailSheet
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open) => { if (!open) setSelectedClient(null) }}
        onUpdate={async (id, values) => {
          const ok = await updateClient(id, values)
          if (ok) setSelectedClient((prev) => prev ? { ...prev, ...values } : prev)
          return ok
        }}
        onDelete={(id) => {
          deleteClient(id)
          setSelectedClient(null)
        }}
      />
    </PageContainer>
  )
}
