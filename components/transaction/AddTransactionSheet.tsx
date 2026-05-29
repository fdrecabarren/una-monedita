"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Trash } from "@phosphor-icons/react"
import { TypeToggle, type TransactionType } from "./TypeToggle"
import { AmountNumpad } from "./AmountNumpad"
import { CategoryGrid, type SheetCategory } from "./CategoryGrid"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/lib/notion/schemas"

interface Props {
  open: boolean
  onClose: () => void
  transaction?: Transaction | null
}

export function AddTransactionSheet({ open, onClose, transaction }: Props) {
  const isEdit = !!transaction

  const [type, setType] = useState<TransactionType>("gasto")
  const [amount, setAmount] = useState("0")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [categories, setCategories] = useState<SheetCategory[]>([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Seed form from existing transaction when editing
  useEffect(() => {
    if (open && transaction) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(transaction.type === "Ingreso" ? "ingreso" : "gasto")
      setAmount(String(transaction.amount))
      setCategoryId(transaction.categoryId ?? null)
      setNote(transaction.notes ?? "")
    } else if (!open) {
      setType("gasto")
      setAmount("0")
      setCategoryId(null)
      setNote("")
      setSaved(false)
      setConfirmDelete(false)
    }
  }, [open, transaction])

  // Fetch categories when sheet opens or type changes
  useEffect(() => {
    if (!open) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingCats(true)
    const kind = type === "gasto" ? "Gasto" : "Ingreso"
    fetch(`/api/categories?kind=${kind}`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; name: string; icon: string | null }>) => {
        if (!cancelled) {
          setCategories(data.map((c) => ({ id: c.id, label: c.name, icon: c.icon })))
        }
      })
      .catch(() => { if (!cancelled) setCategories([]) })
      .finally(() => { if (!cancelled) setLoadingCats(false) })
    return () => { cancelled = true }
  }, [open, type])

  const handleTypeChange = (t: TransactionType) => {
    setType(t)
    if (!isEdit) setCategoryId(null)
  }

  const handleSave = async () => {
    if (amount === "0" || !categoryId || saving) return
    setSaving(true)
    try {
      let res: Response
      if (isEdit && transaction) {
        res = await fetch(`/api/transactions/${transaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: type === "gasto" ? "Gasto" : "Ingreso",
            amount: parseFloat(amount),
            categoryId,
            ...(note ? { notes: note } : { notes: "" }),
          }),
        })
      } else {
        res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: type === "gasto" ? "Gasto" : "Ingreso",
            amount: parseFloat(amount),
            currency: "ARS",
            categoryId,
            ...(note ? { notes: note } : {}),
          }),
        })
      }
      if (!res.ok) throw new Error("API error")
      setSaved(true)
      setTimeout(() => {
        onClose()
        // Refresh server data without full reload
        window.dispatchEvent(new CustomEvent("transaction-saved"))
      }, 700)
    } catch {
      // TODO: surface error toast
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit || !transaction || deleting) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      onClose()
      window.dispatchEvent(new CustomEvent("transaction-saved"))
    } catch {
      // TODO: surface error
    } finally {
      setDeleting(false)
    }
  }

  const canSave = amount !== "0" && categoryId !== null && !saving

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet — mobile: bottom sheet, desktop: centered card */}
          <motion.div
            className={cn(
              "fixed z-50 bg-white border border-[#EAEAEA] flex flex-col",
              "bottom-0 left-0 right-0 rounded-t-[16px] max-h-[92dvh]",
              "md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2",
              "md:w-[420px] md:rounded-[12px] md:max-h-[90vh]"
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-8 h-1 rounded-[2px] bg-[#EAEAEA]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#EAEAEA]">
              <h2 className="text-sm font-semibold text-[#111111]">
                {isEdit ? "Editar transacción" : "Nueva transacción"}
              </h2>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-[6px] bg-[#F7F6F3] border border-[#EAEAEA] flex items-center justify-center text-[#787774] hover:text-[#111111] transition-colors"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 pt-4">
              <TypeToggle value={type} onChange={handleTypeChange} />
              <AmountNumpad value={amount} onChange={setAmount} type={type} />

              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-[#787774] mb-2">
                  Categoría
                </p>
                {loadingCats ? (
                  <div className="h-20 flex items-center justify-center text-[#787774] text-xs">
                    Cargando…
                  </div>
                ) : categories.length === 0 ? (
                  <div className="h-20 flex items-center justify-center text-[#787774] text-xs text-center px-4">
                    Sin categorías.{" "}
                    <a href="/api/seed" target="_blank" className="text-[#111111] underline ml-1">
                      Importar predeterminadas
                    </a>
                  </div>
                ) : (
                  <CategoryGrid
                    categories={categories}
                    selected={categoryId}
                    onSelect={setCategoryId}
                  />
                )}
              </div>

              <div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota (opcional)"
                  maxLength={100}
                  className="w-full h-10 px-4 rounded-[8px] border border-[#EAEAEA] bg-[#F7F6F3] text-sm text-[#111111] placeholder:text-[#B0ADA8] outline-none focus:border-[#111111] transition-colors"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div
              className="px-5 pt-3 pb-5 border-t border-[#EAEAEA] space-y-2"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            >
              {isEdit && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={cn(
                    "w-full h-9 rounded-[6px] text-sm font-medium transition-all border",
                    confirmDelete
                      ? "bg-[#FDEBEC] border-[#F5C6C5] text-[#9F2F2D] hover:bg-[#F5C6C5]"
                      : "bg-white border-[#EAEAEA] text-[#787774] hover:border-[#9F2F2D] hover:text-[#9F2F2D]"
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Trash size={14} weight={confirmDelete ? "bold" : "regular"} />
                    {deleting ? "Eliminando…" : confirmDelete ? "Confirmar eliminación" : "Eliminar"}
                  </span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  "w-full h-10 rounded-[6px] text-sm font-medium transition-all",
                  saved
                    ? "bg-[#EDF3EC] text-[#346538] border border-[#B8D9B9]"
                    : canSave
                    ? "bg-[#111111] hover:bg-[#333333] active:scale-[.98] text-white"
                    : "bg-[#F7F6F3] text-[#B0ADA8] border border-[#EAEAEA] cursor-not-allowed"
                )}
              >
                {saved ? "Guardado" : saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
