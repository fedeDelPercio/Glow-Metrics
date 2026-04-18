import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/hooks/useAuth"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-center" richColors={false} />
      </body>
    </html>
  )
}
