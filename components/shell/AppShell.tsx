"use client"

import { Sidebar } from "./Sidebar"
import { BottomNav } from "./BottomNav"
import { AddTransactionSheet } from "../transaction/AddTransactionSheet"
import { TransactionSheetProvider, useTransactionSheet } from "./TransactionSheetProvider"

function ShellInner({ children }: { children: React.ReactNode }) {
  const { sheetState, openAdd, closeSheet } = useTransactionSheet()

  return (
    <>
      <Sidebar onAddPress={openAdd} />

      <div className="md:ml-60 min-h-screen">
        <main className="min-h-screen pb-24 md:pb-0">{children}</main>
      </div>

      <BottomNav onAddPress={openAdd} />

      <AddTransactionSheet
        open={sheetState.open}
        transaction={sheetState.editing}
        onClose={closeSheet}
      />
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TransactionSheetProvider>
      <ShellInner>{children}</ShellInner>
    </TransactionSheetProvider>
  )
}
