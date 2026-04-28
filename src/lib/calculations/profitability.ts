import type { Service, ServiceSupply, SupplyCatalog, SupplyPurchase } from "@/types/database"
import type { ServiceProfitability } from "@/types/dashboard"

interface AppointmentRecord {
  service_id: string
  price_charged: number | null
  status: string
}

export function calcServiceProfitability(
  service: Service,
  supplies: (ServiceSupply & { supply_catalog: Pick<SupplyCatalog, "current_stock" | "unit" | "unit_size" | "pack_price"> | null })[],
  purchases: SupplyPurchase[],
  totalFixedCosts: number,
  totalCompletedAppointments: number,
  appointments: AppointmentRecord[],
  hourlyRate = 0
): ServiceProfitability {
  const serviceAppointments = appointments.filter(
    (a) => a.service_id === service.id && a.status === "completed"
  )
  const count = serviceAppointments.length

  const revenue = serviceAppointments.reduce(
    (sum, a) => sum + (a.price_charged ?? service.price),
    0
  )

  // Costo de insumos por sesión. Preferimos pack_price/unit_size cargado en
  // el catálogo (la dueña pone el precio del envase y declaramos el costo
  // por unidad). Si no, fallback al promedio de precios de compras.
  let supplyCostPerSession = 0
  for (const ss of supplies) {
    const cat = ss.supply_catalog
    const packPrice = cat?.pack_price ?? null
    const unitSize = cat?.unit_size ?? null
    let unitCost: number | null = null
    if (packPrice && unitSize && unitSize > 0) {
      unitCost = packPrice / unitSize
    } else {
      const supplyPurchases = purchases.filter((p) => p.supply_id === ss.supply_id)
      if (supplyPurchases.length > 0) {
        unitCost = supplyPurchases.reduce((sum, p) => sum + p.unit_price, 0) / supplyPurchases.length
      }
    }
    if (unitCost != null) {
      supplyCostPerSession += ss.quantity_per_session * unitCost
    }
  }

  const totalSupplyCost = supplyCostPerSession * count

  // Costo del tiempo
  const timeCostPerSession = (service.duration_minutes / 60) * hourlyRate
  const totalTimeCost = timeCostPerSession * count

  // Proporción de costos fijos
  const fixedCostShare =
    totalCompletedAppointments > 0
      ? (totalFixedCosts / totalCompletedAppointments) * count
      : 0

  const profit = revenue - totalSupplyCost - totalTimeCost - fixedCostShare
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0

  return {
    service_id: service.id,
    service_name: service.name,
    revenue,
    supply_cost: totalSupplyCost,
    time_cost: totalTimeCost,
    fixed_cost_share: fixedCostShare,
    profit,
    margin_pct: marginPct,
    appointment_count: count,
  }
}
