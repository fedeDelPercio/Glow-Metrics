import type { DiagnosticAction } from "@/types/dashboard"
import type { DashboardStats } from "@/types/dashboard"

export function generateDiagnostics(stats: DashboardStats): DiagnosticAction[] {
  const actions: DiagnosticAction[] = []

  // Tasa de ausencia alta
  if (stats.absence_rate > 15) {
    actions.push({
      title: "Reducí las ausencias",
      description: `Tu tasa de ausencias es del ${stats.absence_rate.toFixed(0)}%. Probá confirmar los turnos por WhatsApp el día anterior.`,
      impact: "high",
      category: "occupancy",
    })
  }

  // Baja ocupación
  if (stats.occupancy_rate < 60) {
    actions.push({
      title: "Tu agenda tiene lugar",
      description: `Ocupás el ${stats.occupancy_rate.toFixed(0)}% de tu capacidad. Publicar en Instagram los horarios libres puede traer más clientas.`,
      impact: "high",
      category: "occupancy",
    })
  }

  // Servicio con bajo margen
  const lowMarginServices = stats.top_services_revenue.filter((s) => s.margin_pct < 30 && s.appointment_count > 0)
  if (lowMarginServices.length > 0) {
    const worst = lowMarginServices[0]
    actions.push({
      title: `Revisá el precio de ${worst.service_name}`,
      description: `Tu margen en este servicio es del ${worst.margin_pct.toFixed(0)}%. Considerate subir el precio o reducir el uso de insumos.`,
      impact: "high",
      category: "pricing",
    })
  }

  // Ingresos bajaron respecto al período anterior
  if (stats.prev_period_revenue > 0) {
    const change = ((stats.total_revenue - stats.prev_period_revenue) / stats.prev_period_revenue) * 100
    if (change < -10) {
      actions.push({
        title: "Tus ingresos bajaron",
        description: `Facturaste un ${Math.abs(change).toFixed(0)}% menos que el período anterior. Revisá si perdiste clientas frecuentes.`,
        impact: "high",
        category: "clients",
      })
    }
  }

  // Canal con mayor conversión
  if (stats.channel_distribution.length > 0) {
    const topChannel = stats.channel_distribution[0]
    const CHANNEL_LABELS: Record<string, string> = {
      instagram: "Instagram",
      whatsapp: "WhatsApp",
      recomendacion: "Recomendaciones",
      google: "Google",
      caminante: "Caminantes",
    }
    if (topChannel.pct > 50) {
      actions.push({
        title: `${CHANNEL_LABELS[topChannel.channel] ?? topChannel.channel} es tu mejor canal`,
        description: `El ${topChannel.pct.toFixed(0)}% de tus clientas vienen de ahí. Potenciá ese canal con más contenido o pide referidos.`,
        impact: "medium",
        category: "clients",
      })
    }
  }

  // Ticket promedio bajo para la capacidad
  if (stats.total_fixed_costs > 0 && stats.avg_ticket > 0) {
    const breakEven = stats.break_even_appointments
    if (breakEven > stats.completed_appointments) {
      actions.push({
        title: "Aún no cubriste tus costos fijos",
        description: `Necesitás ${breakEven} turnos al mes para cubrir gastos fijos. Llevás ${stats.completed_appointments}. Quedan ${breakEven - stats.completed_appointments} turnos.`,
        impact: "high",
        category: "costs",
      })
    }
  }

  return actions.slice(0, 3)
}
