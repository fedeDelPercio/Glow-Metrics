import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  change?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function StatCard({ label, value, change, prefix, suffix, className }: StatCardProps) {
  return (
    <div className={cn("bg-white border border-[#E5E5E5] rounded-xl p-4", className)}>
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-2">{label}</p>
      <p className="text-2xl font-semibold text-[#0A0A0A] tabular-nums leading-none">
        {prefix}{typeof value === "number" ? value.toLocaleString("es-AR") : value}{suffix}
      </p>
      {change !== undefined && (
        <p className={cn("text-xs mt-1.5", change >= 0 ? "text-[#16A34A]" : "text-[#DC2626]")}>
          {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}% vs. mes anterior
        </p>
      )}
    </div>
  )
}
