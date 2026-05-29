import { getTransactionsByMonth } from "@/lib/notion/transactions"
import { getCategories } from "@/lib/notion/categories"
import { FadeIn } from "@/components/ui/FadeIn"
import { CategoryIcon } from "@/lib/category-icons"
import { ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr"

export const dynamic = "force-dynamic"

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

export default async function DashboardPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [transactions, categories] = await Promise.all([
    getTransactionsByMonth(year, month).catch(() => []),
    getCategories().catch(() => []),
  ])

  const catMap = new Map(categories.map((c) => [c.id, c]))

  const gastos = transactions.filter((t) => t.type === "Gasto")
  const ingresos = transactions.filter((t) => t.type === "Ingreso")
  const totalGastos = gastos.reduce((s, t) => s + t.amount, 0)
  const totalIngresos = ingresos.reduce((s, t) => s + t.amount, 0)
  const balance = totalIngresos - totalGastos

  const recent = [...transactions]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 10)

  const monthName = now.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111]">
      <div className="max-w-5xl mx-auto px-6 py-10 md:px-10">

        {/* Header */}
        <FadeIn delay={0}>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#787774] mb-1">
            Resumen
          </p>
          <h1
            className="text-3xl tracking-[-0.03em] leading-[1.1] capitalize"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {monthName}
          </h1>
        </FadeIn>

        {/* Bento row 1 — Gastos / Ingresos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 mb-3">
          <FadeIn delay={80}>
            <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#787774] mb-3">
                Gastos
              </p>
              <p
                className="text-4xl tracking-[-0.02em] text-[#9F2F2D] tabular-nums"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {formatARS(totalGastos)}
              </p>
              <p className="text-xs text-[#787774] mt-2">
                {gastos.length} transacción{gastos.length !== 1 ? "es" : ""}
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={160}>
            <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#787774] mb-3">
                Ingresos
              </p>
              <p
                className="text-4xl tracking-[-0.02em] text-[#346538] tabular-nums"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {formatARS(totalIngresos)}
              </p>
              <p className="text-xs text-[#787774] mt-2">
                {ingresos.length} transacción{ingresos.length !== 1 ? "es" : ""}
              </p>
            </div>
          </FadeIn>
        </div>

        {/* Bento row 2 — Balance */}
        <FadeIn delay={240}>
          <div className="bg-white border border-[#EAEAEA] rounded-[8px] p-6 mb-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#787774] mb-3">
              Balance del mes
            </p>
            <p
              className={`text-5xl tracking-[-0.03em] leading-[1.1] tabular-nums ${
                balance >= 0 ? "text-[#346538]" : "text-[#9F2F2D]"
              }`}
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {balance >= 0 ? "+" : ""}
              {formatARS(balance)}
            </p>
          </div>
        </FadeIn>

        {/* Bento row 3 — Transacciones recientes */}
        <FadeIn delay={320}>
          <div className="bg-white border border-[#EAEAEA] rounded-[8px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAEAEA]">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#787774]">
                Transacciones recientes
              </p>
            </div>

            {recent.length === 0 ? (
              <div className="px-6 py-12 text-center text-[#787774] text-sm">
                Sin transacciones este mes
              </div>
            ) : (
              <ul>
                {recent.map((tx, i) => {
                  const cat = tx.categoryId ? catMap.get(tx.categoryId) : null
                  const isGasto = tx.type === "Gasto"
                  return (
                    <li
                      key={tx.id}
                      className={`flex items-center gap-4 px-6 py-3.5 ${
                        i < recent.length - 1 ? "border-b border-[#EAEAEA]" : ""
                      }`}
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
                        <p className="text-[11px] text-[#787774]">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </FadeIn>

      </div>
    </div>
  )
}
