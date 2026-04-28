"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Scissors, Users, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/agenda", icon: Calendar, label: "Agenda" },
  { href: "/clientas", icon: Users, label: "Clientas" },
  { href: "/servicios", icon: Scissors, label: "Servicios" },
]

interface BottomNavProps {
  onFabClick?: () => void
}

export function BottomNav({ onFabClick }: BottomNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] pb-safe z-50">
      <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
        <NavItem href={NAV_ITEMS[0].href} icon={NAV_ITEMS[0].icon} label={NAV_ITEMS[0].label} active={isActive(NAV_ITEMS[0].href)} />
        <NavItem href={NAV_ITEMS[1].href} icon={NAV_ITEMS[1].icon} label={NAV_ITEMS[1].label} active={isActive(NAV_ITEMS[1].href)} />

        {/* FAB central */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={onFabClick}
            className="w-14 h-14 bg-[#0A0A0A] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            aria-label="Agregar"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2} />
          </button>
        </div>

        <NavItem href={NAV_ITEMS[2].href} icon={NAV_ITEMS[2].icon} label={NAV_ITEMS[2].label} active={isActive(NAV_ITEMS[2].href)} />
        <NavItem href={NAV_ITEMS[3].href} icon={NAV_ITEMS[3].icon} label={NAV_ITEMS[3].label} active={isActive(NAV_ITEMS[3].href)} />
      </div>
    </nav>
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
      className="flex-1 flex flex-col items-center gap-1 py-1 min-w-[44px] min-h-[44px] justify-center"
    >
      <Icon
        className={cn("w-5 h-5 transition-colors", active ? "text-[#0A0A0A]" : "text-[#A3A3A3]")}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          active ? "text-[#0A0A0A]" : "text-[#A3A3A3]"
        )}
      >
        {label}
      </span>
    </Link>
  )
}
