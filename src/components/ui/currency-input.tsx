"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  id?: string
}

function formatARS(value: number): string {
  if (!value && value !== 0) return ""
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function CurrencyInput({ value, onChange, className, placeholder = "$0", id }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "")
    onChange(raw === "" ? 0 : Number(raw))
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type={focused ? "text" : "text"}
      inputMode="numeric"
      value={focused ? (value === 0 ? "" : String(value)) : (value === 0 ? "" : formatARS(value))}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  )
}
