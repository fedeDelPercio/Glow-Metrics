"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Sidebar } from "@/components/layout/Sidebar"
import { NewAppointmentSheet } from "@/components/forms/NewAppointmentSheet"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [fabOpen, setFabOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <Sidebar onFabClick={() => setFabOpen(true)} />

      {/* Mobile: header top + bottom nav. Desktop: no header/nav, sidebar replaces them. */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex-1">{children}</div>
        <BottomNav onFabClick={() => setFabOpen(true)} />
      </div>

      <NewAppointmentSheet open={fabOpen} onOpenChange={setFabOpen} />
    </div>
  )
}
