import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/server"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "GlowMetrics — Tu negocio de cosmetología bajo control",
  description: "Gestión integral para cosmetólogas: turnos, insumos, rentabilidad y diagnóstico de negocio.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GlowMetrics",
  },
}

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Server-side bootstrap of `user` only. The profile is fetched client-side
  // to avoid a hydration mismatch (profile DB fields can race against the
  // server render). `user` is guaranteed available from the first client
  // render — that's the critical piece that unblocks every data hook.
  // See DIAGNOSTIC.md for the full writeup.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
        <Toaster position="top-center" richColors={false} />
      </body>
    </html>
  )
}
