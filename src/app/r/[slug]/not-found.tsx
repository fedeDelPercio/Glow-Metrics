export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3] mb-2">Página no encontrada</p>
        <h1 className="text-lg font-semibold text-[#0A0A0A] mb-2">Esta página no existe</h1>
        <p className="text-sm text-[#737373]">
          El link que seguiste puede estar desactualizado o el profesional no acepta reservas online en este momento.
        </p>
      </div>
    </main>
  )
}
