"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Home, Calendar, Scissors, Users, Package, Wallet, BarChart3, Plus, LogOut, RefreshCw } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { triggerGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/agenda", icon: Calendar, label: "Agenda" },
  { href: "/clientas", icon: Users, label: "Clientas" },
  { href: "/servicios", icon: Scissors, label: "Servicios" },
]

const SECONDARY_ITEMS = [
  { href: "/insumos", icon: Package, label: "Insumos" },
  { href: "/costos", icon: Wallet, label: "Costos fijos" },
  { href: "/reportes", icon: BarChart3, label: "Reportes" },
]

interface SidebarProps {
  onFabClick?: () => void
}

export function Sidebar({ onFabClick }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    triggerGlobalRefresh()
    setTimeout(() => setSpinning(false), 600)
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "G"

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 border-r border-[#E5E5E5] bg-white">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#F0F0F0] flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-[#A3A3A3] uppercase tracking-widest leading-none">GlowMetrics</p>
          <h1 className="text-sm font-semibold text-[#0A0A0A] leading-tight mt-0.5 truncate">
            {profile?.business_name || profile?.full_name || "Mi negocio"}
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#A3A3A3] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] transition-colors flex-shrink-0"
          title="Recargar datos"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 transition-transform", spinning && "animate-spin")} strokeWidth={1.5} />
        </button>
      </div>

      {/* Nuevo turno CTA */}
      <div className="px-3 pt-4">
        <button
          onClick={onFabClick}
          className="w-full flex items-center justify-center gap-2 h-10 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#262626] transition-colors active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" strokeWidth={2} /> Nuevo turno
        </button>
      </div>

      {/* Primary nav */}
      <nav className="px-3 pt-6 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} />
        ))}
      </nav>

      {/* Secondary nav */}
      <div className="px-3 pt-6">
        <p className="px-3 text-[10px] font-medium uppercase tracking-widest text-[#A3A3A3] mb-2">
          Gestión
        </p>
        <nav className="space-y-0.5">
          {SECONDARY_ITEMS.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} />
          ))}
        </nav>
      </div>

      {/* User at bottom */}
      <div className="mt-auto border-t border-[#F0F0F0] px-3 py-3">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ""} />
            <AvatarFallback className="bg-[#F5F5F5] text-[#525252] text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#0A0A0A] truncate">{profile?.full_name ?? "—"}</p>
            <p className="text-[10px] text-[#A3A3A3] truncate">{profile?.business_name ?? ""}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FEF2F2] text-[#A3A3A3] hover:text-[#DC2626] transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-[#F5F5F5] text-[#0A0A0A] font-medium"
          : "text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
      )}
    >
      <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-[#0A0A0A]" : "text-[#737373]")} strokeWidth={1.5} />
      <span>{label}</span>
    </Link>
  )
}
