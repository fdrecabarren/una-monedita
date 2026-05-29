"use client"

import { Backspace } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { TransactionType } from "./TypeToggle"

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
]

interface Props {
  value: string
  onChange: (value: string) => void
  type: TransactionType
}

export function AmountNumpad({ value, onChange, type }: Props) {
  const handleKey = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1) || "0")
      return
    }
    if (key === ".") {
      if (value.includes(".")) return
      onChange(value === "0" ? "0." : value + ".")
      return
    }
    const next = value === "0" ? key : value + key
    const [, dec] = next.split(".")
    if (dec && dec.length > 2) return
    const [int] = next.split(".")
    if (int.length > 10) return
    onChange(next)
  }

  const displayAmount = (() => {
    const [int, dec] = value.split(".")
    const formatted = parseInt(int || "0", 10).toLocaleString("es-AR")
    if (dec !== undefined) return formatted + "," + dec
    return formatted
  })()

  const amountColor = type === "gasto" ? "text-[#9F2F2D]" : "text-[#346538]"

  return (
    <div className="flex flex-col gap-2">
      {/* Amount display */}
      <div className={cn("text-center py-3", amountColor)}>
        <span
          className="text-[40px] tracking-[-0.02em] leading-none tabular-nums"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          $ {displayAmount}
        </span>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {ROWS.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className={cn(
              "h-13 rounded-[8px] text-lg font-medium transition-all active:scale-[.97]",
              key === "⌫"
                ? "bg-[#F7F6F3] border border-[#EAEAEA] text-[#787774] flex items-center justify-center"
                : "bg-[#F7F6F3] border border-[#EAEAEA] text-[#111111] hover:bg-[#EAEAEA]"
            )}
          >
            {key === "⌫" ? <Backspace size={20} weight="regular" /> : key}
          </button>
        ))}
      </div>
    </div>
  )
}
