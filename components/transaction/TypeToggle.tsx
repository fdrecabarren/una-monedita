"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type TransactionType = "gasto" | "ingreso"

interface Props {
  value: TransactionType
  onChange: (type: TransactionType) => void
}

const options: { value: TransactionType; label: string }[] = [
  { value: "gasto",   label: "Gasto" },
  { value: "ingreso", label: "Ingreso" },
]

export function TypeToggle({ value, onChange }: Props) {
  return (
    <div className="flex p-1 rounded-[8px] bg-[#F7F6F3] border border-[#EAEAEA] gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative flex-1 h-8 rounded-[6px] text-sm font-medium transition-colors duration-150",
            value === opt.value
              ? opt.value === "gasto"
                ? "text-[#9F2F2D]"
                : "text-[#346538]"
              : "text-[#787774] hover:text-[#111111]"
          )}
        >
          {value === opt.value && (
            <motion.div
              layoutId="type-pill"
              className={cn(
                "absolute inset-0 rounded-[6px] border",
                opt.value === "gasto"
                  ? "bg-[#FDEBEC] border-[#F5C6C5]"
                  : "bg-[#EDF3EC] border-[#B8D9B9]"
              )}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
