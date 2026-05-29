"use client"

import { createContext, useContext, useState, useCallback } from "react"
import type { Transaction } from "@/lib/notion/schemas"

interface SheetState {
  open: boolean
  editing: Transaction | null
}

interface TransactionSheetContextValue {
  sheetState: SheetState
  openAdd: () => void
  openEdit: (tx: Transaction) => void
  closeSheet: () => void
}

const TransactionSheetContext = createContext<TransactionSheetContextValue | null>(null)

export function TransactionSheetProvider({ children }: { children: React.ReactNode }) {
  const [sheetState, setSheetState] = useState<SheetState>({ open: false, editing: null })

  const openAdd = useCallback(() => setSheetState({ open: true, editing: null }), [])
  const openEdit = useCallback((tx: Transaction) => setSheetState({ open: true, editing: tx }), [])
  const closeSheet = useCallback(() => setSheetState({ open: false, editing: null }), [])

  return (
    <TransactionSheetContext.Provider value={{ sheetState, openAdd, openEdit, closeSheet }}>
      {children}
    </TransactionSheetContext.Provider>
  )
}

export function useTransactionSheet() {
  const ctx = useContext(TransactionSheetContext)
  if (!ctx) throw new Error("useTransactionSheet must be used within TransactionSheetProvider")
  return ctx
}
