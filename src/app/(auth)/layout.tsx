export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">GlowMetrics</h1>
          <p className="text-sm text-[#737373] mt-1">Tu negocio de cosmetología bajo control</p>
        </div>
        {children}
      </div>
    </div>
  )
}
