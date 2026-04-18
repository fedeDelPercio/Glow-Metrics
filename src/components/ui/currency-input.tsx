"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  id?: string
}

function addThousandDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function CurrencyInput({ value, onChange, className, placeholder = "0", id }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const displayed = value === 0 ? "" : addThousandDots(String(value))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, "").replace(/\D/g, "")
    const num = raw === "" ? 0 : Number(raw)

    // Preserve caret position after re-render
    const el = e.target
    const dotsBeforeCaret = (el.value.slice(0, el.selectionStart ?? 0).match(/\./g) ?? []).length
    const rawCaret = (el.selectionStart ?? 0) - dotsBeforeCaret

    onChange(num)

    requestAnimationFrame(() => {
      if (!inputRef.current) return
      const newFormatted = num === 0 ? "" : addThousandDots(String(num))
      const newDotsBeforeCaret = (newFormatted.slice(0, rawCaret).match(/\./g) ?? []).length
      const newCaret = rawCaret + newDotsBeforeCaret
      inputRef.current.setSelectionRange(newCaret, newCaret)
    })
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <span className="absolute left-3 text-sm text-[#A3A3A3] select-none pointer-events-none">$</span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayed}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm tabular-nums",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  )
}
