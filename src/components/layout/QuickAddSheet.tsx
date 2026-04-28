"use client"

import { useEffect, useState } from "react"
import { Calendar, UserPlus, Wallet, Package, Coins, ChevronLeft } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NewAppointmentSheet } from "@/components/forms/NewAppointmentSheet"
import { ClientForm } from "@/components/forms/ClientForm"
import { FixedCostForm } from "@/components/forms/FixedCostForm"
import { SupplyForm } from "@/components/forms/SupplyForm"
import { useClients } from "@/hooks/useClients"
import { useFixedCosts } from "@/hooks/useFixedCosts"
import { useSupplies } from "@/hooks/useSupplies"
import { triggerGlobalRefresh } from "@/hooks/useVisibilityRefetch"

type Target = "appointment" | "client" | "supply" | "fixed-cost"
type Step = "main" | "costs"

interface QuickAddSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return isDesktop
}

export function QuickAddSheet({ open, onOpenChange }: QuickAddSheetProps) {
  const [target, setTarget] = useState<Target | null>(null)
  const [step, setStep] = useState<Step>("main")
  const isDesktop = useIsDesktop()

  const { createClient } = useClients()
  const { createCost } = useFixedCosts()
  const { createSupply } = useSupplies()

  // Reset internal state whenever the sheet fully closes
  useEffect(() => {
    if (!open) {
      setTarget(null)
      setStep("main")
    }
  }, [open])

  const closeAll = () => {
    setTarget(null)
    setStep("main")
    onOpenChange(false)
  }

  const pickerOpen = open && target === null

  const pickerTitle = step === "costs" ? "Nuevos costos" : "¿Qué querés agregar?"

  const pickerBody = (
    <div className="grid gap-2">
      {step === "main" ? (
        <>
          <PickerOption
            icon={Calendar}
            title="Nuevo turno"
            subtitle="Agendar una cita"
            onClick={() => setTarget("appointment")}
          />
          <PickerOption
            icon={UserPlus}
            title="Nueva clienta"
            subtitle="Sumar a tu cartera"
            onClick={() => setTarget("client")}
          />
          <PickerOption
            icon={Wallet}
            title="Nuevos costos"
            subtitle="Insumos o costos fijos"
            onClick={() => setStep("costs")}
          />
        </>
      ) : (
        <>
          <PickerOption
            icon={Package}
            title="Insumo"
            subtitle="Producto del stock"
            onClick={() => setTarget("supply")}
          />
          <PickerOption
            icon={Coins}
            title="Costo fijo"
            subtitle="Alquiler, servicios, etc."
            onClick={() => setTarget("fixed-cost")}
          />
        </>
      )}
    </div>
  )

  const pickerHeader = step === "costs" ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setStep("main")}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] text-[#737373]"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>
      <span className="text-base font-semibold text-[#0A0A0A]">{pickerTitle}</span>
    </div>
  ) : (
    <span className="text-base font-semibold text-[#0A0A0A]">{pickerTitle}</span>
  )

  return (
    <>
      {/* Picker: Dialog on desktop, Sheet on mobile */}
      {isDesktop ? (
        <Dialog open={pickerOpen} onOpenChange={(v) => { if (!v) closeAll() }}>
          <DialogContent className="sm:max-w-md p-5">
            <DialogHeader>
              <DialogTitle asChild>{pickerHeader}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">{pickerBody}</div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={pickerOpen} onOpenChange={(v) => { if (!v) closeAll() }}>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl px-4 pb-8">
            <SheetHeader className="mb-4">
              <SheetTitle asChild>{pickerHeader}</SheetTitle>
            </SheetHeader>
            {pickerBody}
          </SheetContent>
        </Sheet>
      )}

      {/* Appointment — keeps its own sheet */}
      <NewAppointmentSheet
        open={open && target === "appointment"}
        onOpenChange={(v) => { if (!v) closeAll() }}
      />

      {/* Client */}
      <FormShell
        isDesktop={isDesktop}
        open={open && target === "client"}
        onClose={closeAll}
        title="Nueva clienta"
      >
        <ClientForm
          onSubmit={async (values) => {
            const c = await createClient(values)
            if (c) {
              triggerGlobalRefresh()
              closeAll()
            }
          }}
        />
      </FormShell>

      {/* Supply */}
      <FormShell
        isDesktop={isDesktop}
        open={open && target === "supply"}
        onClose={closeAll}
        title="Nuevo insumo"
      >
        <SupplyForm
          onSubmit={async (values) => {
            const s = await createSupply(values)
            if (s) {
              triggerGlobalRefresh()
              closeAll()
            }
          }}
        />
      </FormShell>

      {/* Fixed cost */}
      <FormShell
        isDesktop={isDesktop}
        open={open && target === "fixed-cost"}
        onClose={closeAll}
        title="Nuevo costo fijo"
      >
        <FixedCostForm
          onSubmit={async (values) => {
            const c = await createCost(values)
            if (c) {
              triggerGlobalRefresh()
              closeAll()
            }
          }}
        />
      </FormShell>
    </>
  )
}

function FormShell({
  isDesktop,
  open,
  onClose,
  title,
  children,
}: {
  isDesktop: boolean
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-left">{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">{children}</div>
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left text-base font-semibold">{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}

function PickerOption({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl border border-[#E5E5E5] bg-white hover:bg-[#FAFAFA] hover:border-[#D4D4D4] transition-colors text-left min-h-[64px]"
    >
      <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0A0A0A]">{title}</p>
        <p className="text-xs text-[#737373] mt-0.5">{subtitle}</p>
      </div>
      <span className="text-[#D4D4D4]">›</span>
    </button>
  )
}
