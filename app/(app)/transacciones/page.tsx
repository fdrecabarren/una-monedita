import { getTransactionsByMonth } from "@/lib/notion/transactions"
import { getCategories } from "@/lib/notion/categories"
import { TransactionList } from "@/components/transaction/TransactionList"
import { FadeIn } from "@/components/ui/FadeIn"

export const dynamic = "force-dynamic"

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function TransaccionesPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [transactions, categories] = await Promise.all([
    getTransactionsByMonth(year, month).catch(() => []),
    getCategories().catch(() => []),
  ])

  const sorted = [...transactions].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  )

  const totalGastos = transactions.filter(t => t.type === "Gasto").reduce((s, t) => s + t.amount, 0)
  const totalIngresos = transactions.filter(t => t.type === "Ingreso").reduce((s, t) => s + t.amount, 0)

  const monthName = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" })

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111]">
      <div className="max-w-3xl mx-auto px-6 py-10 md:px-10">

        <FadeIn delay={0}>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#787774] mb-1">
            Historial
          </p>
          <h1
            className="text-3xl tracking-[-0.03em] leading-[1.1] capitalize mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {monthName}
          </h1>
        </FadeIn>

        {/* Summary strip */}
        <FadeIn delay={80}>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white border border-[#EAEAEA] rounded-[8px] px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#787774] mb-1">Gastos</p>
              <p
                className="text-xl tracking-[-0.02em] text-[#9F2F2D] tabular-nums"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {formatARS(totalGastos)}
              </p>
            </div>
            <div className="bg-white border border-[#EAEAEA] rounded-[8px] px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#787774] mb-1">Ingresos</p>
              <p
                className="text-xl tracking-[-0.02em] text-[#346538] tabular-nums"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {formatARS(totalIngresos)}
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={160}>
          <TransactionList transactions={sorted} categories={categories} />
        </FadeIn>

      </div>
    </div>
  )
}
