export interface StatCardData {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  prefix?: string
  suffix?: string
}

export interface ServiceProfitability {
  service_id: string
  service_name: string
  revenue: number
  supply_cost: number
  time_cost: number
  fixed_cost_share: number
  profit: number
  margin_pct: number
  appointment_count: number
}

export interface ChannelStats {
  channel: string
  count: number
  revenue: number
  pct: number
}

export interface DashboardStats {
  period_start: Date
  period_end: Date
  total_revenue: number
  prev_period_revenue: number
  completed_appointments: number
  total_appointments: number
  no_show_appointments: number
  cancelled_appointments: number
  avg_ticket: number
  occupancy_rate: number
  absence_rate: number
  top_services_revenue: ServiceProfitability[]
  top_services_profitability: ServiceProfitability[]
  channel_distribution: ChannelStats[]
  revenue_by_day: { date: string; revenue: number; count: number }[]
  total_fixed_costs: number
  break_even_appointments: number
}

export interface DiagnosticAction {
  title: string
  description: string
  impact: "high" | "medium" | "low"
  category: "pricing" | "occupancy" | "costs" | "clients" | "supplies"
}

export interface SupplyStockStatus {
  supply_id: string
  supply_name: string
  unit: string
  current_stock: number
  theoretical_consumption: number
  deviation_pct: number
  alert: boolean
}
