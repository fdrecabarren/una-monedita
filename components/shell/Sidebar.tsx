"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Coins, Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { navItems } from "./nav-config"

interface Props {
  onAddPress: () => void
}

export function Sidebar({ onAddPress }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen fixed left-0 top-0 bg-[#FBFBFA] border-r border-[#EAEAEA] z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[#EAEAEA] flex-shrink-0">
        <div className="w-7 h-7 rounded-[6px] bg-[#111111] flex items-center justify-center flex-shrink-0">
          <Coins size={15} weight="bold" className="text-white" />
        </div>
        <span
          className="text-[15px] tracking-tight text-[#111111]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Una Monedita
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm transition-colors",
                active
                  ? "bg-[#F0EEE9] text-[#111111] font-medium"
                  : "text-[#787774] hover:text-[#111111] hover:bg-[#F7F6F3]"
              )}
            >
              <item.icon
                size={17}
                weight={active ? "bold" : "regular"}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Add button */}
      <div className="px-3 pb-4 pt-2 border-t border-[#EAEAEA] flex-shrink-0">
        <button
          onClick={onAddPress}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-[6px] bg-[#111111] hover:bg-[#333333] active:scale-[.98] text-white text-sm font-medium transition-all"
        >
          <Plus size={16} weight="bold" />
          Nueva transacción
        </button>
      </div>
    </aside>
  )
}
