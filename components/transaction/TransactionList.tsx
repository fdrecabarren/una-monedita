"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { CategoryIcon } from "@/lib/category-icons"
import { ArrowUp, ArrowDown } from "@phosphor-icons/react"
import { useTransactionSheet } from "@/components/shell/TransactionSheetProvider"
import type { Transaction } from "@/lib/notion/schemas"
import type { Category } from "@/lib/notion/schemas"

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
}

export function TransactionList({ transactions, categories }: Props) {
  const { openEdit } = useTransactionSheet()
  const router = useRouter()

  // Refresh server data when a transaction is saved/deleted
  useEffect(() => {
    const handler = () => router.refresh()
    window.addEventListener("transaction-saved", handler)
    return () => window.removeEventListener("transaction-saved", handler)
  }, [router])

  const catMap = new Map(categories.map((c) => [c.id, c]))

  // Group by date
  const groups = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = tx.date ?? "sin-fecha"
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  if (transactions.length === 0) {
    return (
      <div className="bg-white border border-[#EAEAEA] rounded-[8px] px-6 py-16 text-center">
        <p className="text-[#787774] text-sm">Sin transacciones este mes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((date) => (
        <div key={date}>
          <p className="text-[11px] uppercase tracking-[0.06em] text-[#787774] mb-2 capitalize">
            {date === "sin-fecha" ? "Sin fecha" : formatDateGroup(date)}
          </p>
          <div className="bg-white border border-[#EAEAEA] rounded-[8px] overflow-hidden">
            <ul>
              {groups[date].map((tx, i) => {
                const cat = tx.categoryId ? catMap.get(tx.categoryId) : null
                const isGasto = tx.type === "Gasto"
                return (
                  <li
                    key={tx.id}
                    className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-[#F7F6F3] active:bg-[#F0EEE9] transition-colors ${
                      i < groups[date].length - 1 ? "border-b border-[#EAEAEA]" : ""
                    }`}
                    onClick={() => openEdit(tx)}
                  >
                    <div
                      className={`w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0 ${
                        isGasto ? "bg-[#FDEBEC]" : "bg-[#EDF3EC]"
                      }`}
                    >
                      <CategoryIcon
                        name={cat?.name}
                        size={16}
                        weight="bold"
                        className={isGasto ? "text-[#9F2F2D]" : "text-[#346538]"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111111] truncate">
                        {cat?.name ?? tx.type ?? "Transacción"}
                      </p>
                      {tx.notes && (
                        <p className="text-xs text-[#787774] truncate">{tx.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-sm font-medium tabular-nums ${
                          isGasto ? "text-[#9F2F2D]" : "text-[#346538]"
                        }`}
                        style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {isGasto
                            ? <ArrowDown size={11} weight="bold" />
                            : <ArrowUp size={11} weight="bold" />
                          }
                          {formatARS(tx.amount)}
                        </span>
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}
