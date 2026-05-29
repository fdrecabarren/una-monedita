"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { bottomNavItems } from "./nav-config"

interface Props {
  onAddPress: () => void
}

export function BottomNav({ onAddPress }: Props) {
  const pathname = usePathname()
  const half = Math.ceil(bottomNavItems.length / 2)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#FBFBFA]/95 backdrop-blur border-t border-[#EAEAEA]">
      <div className="flex items-center h-16">
        {bottomNavItems.slice(0, half).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active ? "text-[#111111]" : "text-[#B0ADA8]"
              )}
            >
              <item.icon size={22} weight={active ? "bold" : "regular"} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* FAB — square rounded, NOT rounded-full */}
        <div className="flex items-center justify-center px-3 flex-shrink-0">
          <button
            onClick={onAddPress}
            aria-label="Agregar transacción"
            className="w-13 h-13 -mt-5 rounded-[14px] bg-[#111111] hover:bg-[#333333] flex items-center justify-center active:scale-95 transition-all"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.10)" }}
          >
            <Plus size={24} weight="bold" className="text-white" />
          </button>
        </div>

        {bottomNavItems.slice(half).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active ? "text-[#111111]" : "text-[#B0ADA8]"
              )}
            >
              <item.icon size={22} weight={active ? "bold" : "regular"} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  )
}
