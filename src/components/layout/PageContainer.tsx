import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn(
        "flex-1 w-full px-4 py-4 pb-24 mx-auto",
        "max-w-lg",
        "lg:max-w-5xl lg:px-8 lg:py-8 lg:pb-8",
        className
      )}
    >
      {children}
    </main>
  )
}
