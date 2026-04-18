"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { triggerGlobalRefresh } from "@/hooks/useVisibilityRefetch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title?: string
  backHref?: string
}

export function Header({ title }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    triggerGlobalRefresh()
    setTimeout(() => setSpinning(false), 600)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "G"

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <header className="lg:hidden sticky top-0 bg-white border-b border-[#E5E5E5] z-40">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div>
          {title ? (
            <h1 className="text-base font-medium text-[#0A0A0A]">{title}</h1>
          ) : (
            <div>
              <p className="text-xs text-[#A3A3A3] uppercase tracking-wide leading-none">GlowMetrics</p>
              <h1 className="text-base font-semibold text-[#0A0A0A] leading-tight">
                {profile?.business_name || profile?.full_name || "Mi negocio"}
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#737373] hover:bg-[#F5F5F5] transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className={cn("w-4 h-4", spinning && "animate-spin")} strokeWidth={1.5} />
          </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="outline-none">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ""} />
                <AvatarFallback className="bg-[#F5F5F5] text-[#525252] text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-[#0A0A0A]">{profile?.full_name}</p>
              <p className="text-xs text-[#737373]">{profile?.business_name}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/costos")}>
              Costos fijos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/insumos")}>
              Insumos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-[#DC2626]">
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
