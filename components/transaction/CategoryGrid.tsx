"use client"

import { cn } from "@/lib/utils"
import { CategoryIcon } from "@/lib/category-icons"

export interface SheetCategory {
  id: string
  label: string
  icon: string | null
}

interface Props {
  categories: SheetCategory[]
  selected: string | null
  onSelect: (id: string) => void
}

export function CategoryGrid({ categories, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((cat) => {
        const isSelected = selected === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 py-3 rounded-[8px] border transition-all active:scale-95",
              isSelected
                ? "bg-[#F0EEE9] border-[#111111] text-[#111111]"
                : "bg-white border-[#EAEAEA] text-[#787774] hover:border-[#B0ADA8] hover:text-[#111111]"
            )}
          >
            <CategoryIcon
              name={cat.label}
              size={20}
              weight={isSelected ? "bold" : "regular"}
              className={isSelected ? "text-[#111111]" : "text-[#787774]"}
            />
            <span
              className={cn(
                "text-[10px] font-medium leading-none text-center px-1",
                isSelected ? "text-[#111111]" : "text-[#787774]"
              )}
            >
              {cat.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
