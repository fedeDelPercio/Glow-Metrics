import { notFound } from "next/navigation"
import { getPublicProfile } from "@/lib/booking/actions"
import { BookingFlow } from "./BookingFlow"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = await getPublicProfile(slug)
  return {
    title: profile ? `Reservá tu turno — ${profile.business_name}` : "Reservá tu turno",
    description: profile ? `Agendá tu turno en ${profile.business_name}` : undefined,
  }
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = await getPublicProfile(slug)
  if (!profile) notFound()

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3] mb-1">Reservá tu turno</p>
          <h1 className="text-xl font-semibold text-[#0A0A0A]">{profile.business_name}</h1>
        </header>
        <BookingFlow profile={profile} />
        <footer className="mt-12 text-center">
          <p className="text-[10px] text-[#A3A3A3]">
            Reservas online por <span className="font-medium text-[#737373]">GlowMetrics</span>
          </p>
        </footer>
      </div>
    </main>
  )
}
