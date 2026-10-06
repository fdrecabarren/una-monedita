"use client";

// Saldo en el Resumen: vista compartida (useBalanceView), Monedero (barra
// inferior móvil), BalanceCard (desktop) y la hoja "Tu saldo" con la ecuación y
// el desglose por día / semana / mes.
//
// Glosario: Balance (diario/semanal/mensual/…) = ingresos − gastos del período.
// Saldo anterior = lo que venía de antes. Disponible = saldo anterior + balance,
// contado hasta hoy.

import { useMemo, useState } from "react";
import { useStore } from "./store";
import { Sheet, SheetHeader } from "./Sheet";
import { Coin } from "./Coin";
import { Icon } from "./Icon";
import { ActionButton, Segmented, MONTHS_FULL } from "./ui";
import { TrendBars } from "./TrendBars";
import { fmt, fmtShort } from "@/lib/format";
import { balanceSeries } from "@/lib/balance";
import {
  addDays,
  balanceLabel,
  bucketsFor,
  daysBetween,
  shortDateLabel,
  type BucketUnit,
} from "@/lib/date-range";

type Status = "ready" | "loading" | "error";

export interface BalanceView {
  status: Status;
  // acumulado activo: muestra Disponible; si no, el balance del período
  carried: boolean;
  eyebrow: string;
  amount: number;
  // balance del período completo (ingresos − gastos), con su nombre
  periodName: string;
  periodNet: number;
  income: number;
  expense: number;
  opening: number;
  futureCount: number;
}

export function useBalanceView(): BalanceView {
  const { carry, carryOver, totals, period, range } = useStore();
  const now = new Date();
  const periodName = balanceLabel(period, range, now);
  const base = { periodName, periodNet: totals.balance, income: totals.income, expense: totals.expense, opening: 0, futureCount: 0 };
  if (!carryOver || carry.status === "off") {
    return { ...base, status: "ready", carried: false, eyebrow: periodName, amount: totals.balance };
  }
  if (carry.status === "loading" || carry.status === "error") {
    return { ...base, status: carry.status, carried: true, eyebrow: "Disponible", amount: 0 };
  }
  const eyebrow =
    carry.kind === "hoy" ? "Disponible hoy" : carry.kind === "cierre" ? `Saldo al ${shortDateLabel(range.end, now)}` : "Saldo previsto";
  return {
    ...base,
    status: "ready",
    carried: true,
    eyebrow,
    amount: carry.closing,
    income: carry.income,
    expense: carry.expense,
    opening: carry.opening,
    futureCount: carry.futureCount,
  };
}

function signedColor(n: number): string {
  return n < 0 ? "var(--expense)" : n > 0 ? "var(--income)" : "var(--text-2)";
}

function BalanceError() {
  const { retryHistory } = useStore();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      <span className="caption">No se pudo calcular el saldo</span>
      <button
        onClick={retryHistory}
        style={{ minHeight: 44, padding: "0 10px", border: "none", background: "transparent", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
      >
        Reintentar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monedero: barra inferior móvil. Siempre visible (también con el período vacío:
// el disponible sigue ahí). Tocar el centro abre "Tu saldo".
// ---------------------------------------------------------------------------
export function Monedero() {
  const { openEntry, currency } = useStore();
  const v = useBalanceView();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 16px" }}>
      <ActionButton kind="expense" size={56} onClick={() => openEntry("expense")} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
        {v.status === "error" ? (
          <BalanceError />
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={v.status === "loading" ? "Ver saldo, calculando" : `Ver saldo. ${v.eyebrow}: ${fmt(v.amount, currency)}`}
            style={{ minHeight: 56, minWidth: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: "2px 6px", color: "var(--text)" }}
          >
            <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {v.carried && <Coin size={18} sprout={v.periodNet > 0} />}
              {v.eyebrow}
            </span>
            {v.status === "loading" ? (
              <span className="skeleton-row" style={{ width: 112, height: 24, borderRadius: 8, marginTop: 4 }} role="status" aria-label="Calculando saldo" />
            ) : (
              <>
                <span
                  className="num-coin"
                  style={{ fontSize: "clamp(22px, 7vw, 26px)", lineHeight: 1.15, color: v.amount < 0 ? "var(--expense)" : "var(--text)" }}
                >
                  {fmt(v.amount, currency, v.carried ? undefined : { sign: true })}
                </span>
                {v.carried && (
                  <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: signedColor(v.periodNet) }}>
                    {v.periodName} {fmt(v.periodNet, currency, { sign: true })}
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </div>
      <ActionButton kind="income" size={56} onClick={() => openEntry("income")} />
      {open && <BalanceSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BalanceCard: hero del Resumen en desktop.
// ---------------------------------------------------------------------------
export function BalanceCard() {
  const { currency } = useStore();
  const v = useBalanceView();
  const [open, setOpen] = useState(false);
  return (
    <div className="card-hero" style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {v.carried && <Coin size={20} sprout={v.periodNet > 0} />}
        {v.eyebrow}
      </div>
      {v.status === "error" ? (
        <BalanceError />
      ) : v.status === "loading" ? (
        <div className="skeleton-row" role="status" aria-label="Calculando saldo" style={{ height: 52, width: 220 }} />
      ) : (
        <>
          <div className="num-coin" style={{ fontSize: 44, lineHeight: 1.1, color: v.amount < 0 ? "var(--expense)" : "var(--text)" }}>
            {fmt(v.amount, currency, v.carried ? undefined : { sign: true })}
          </div>
          {v.carried && (
            <div className="caption tnum" style={{ lineHeight: 1.5 }}>
              Saldo anterior <strong style={{ color: "var(--text)" }}>{fmt(v.opening, currency)}</strong>
              <br />
              <span style={{ color: "var(--income)", fontWeight: 700 }}>+ {fmt(v.income, currency)}</span>
              {" · "}
              <span style={{ color: "var(--expense)", fontWeight: 700 }}>− {fmt(v.expense, currency)}</span>
            </div>
          )}
          <div className="tnum" style={{ fontSize: 14, fontWeight: 700, color: signedColor(v.periodNet) }}>
            {v.periodName} {fmt(v.periodNet, currency, { sign: true })}
          </div>
          {v.futureCount > 0 && (
            <div className="caption">{v.futureCount} {v.futureCount === 1 ? "movimiento con fecha futura" : "movimientos con fecha futura"} (aún no cuentan)</div>
          )}
        </>
      )}
      {v.status !== "error" && (
        <button
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          style={{ alignSelf: "flex-start", minHeight: 44, marginTop: 2, padding: "0 2px", border: "none", background: "transparent", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
        >
          Ver desglose
          <Icon name="ChevronRight" size={16} stroke={2.4} color="var(--accent-ink)" />
        </button>
      )}
      {open && <BalanceSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BalanceSheet: "Tu saldo". Ecuación + desglose por día / semana / mes.
// ---------------------------------------------------------------------------
const UNIT_LABEL: Record<BucketUnit, string> = { day: "Por día", week: "Por semana", month: "Por mes" };

function unitsFor(period: string, lenDays: number): BucketUnit[] {
  if (period === "Semana") return ["day"];
  if (period === "Mes") return ["week", "day"];
  if (period === "Año") return ["month"];
  if (period === "Día") return [];
  return lenDays <= 31 ? ["day", "week"] : lenDays <= 186 ? ["week", "month"] : ["month"];
}

function rowLabel(unit: BucketUnit, start: Date, end: Date, now: Date): string {
  if (unit === "day") return start.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: start.getMonth() === now.getMonth() ? undefined : "short" });
  if (unit === "week") return `${shortDateLabel(start, now)} – ${shortDateLabel(end, now)}`;
  return MONTHS_FULL[start.getMonth()];
}

function Line({ label, value, strong = false, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "6px 0" }}>
      <span style={{ fontSize: 15, fontWeight: strong ? 800 : 600, color: strong ? "var(--text)" : "var(--text-2)" }}>{label}</span>
      <span className="amount" style={{ fontWeight: strong ? 700 : 600, color: color ?? "var(--text)", fontSize: strong ? 20 : 16, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

export function BalanceSheet({ onClose }: { onClose: () => void }) {
  const { currency, period, range, rangeLabel, allTx, visibleTx, carryOver, carry } = useStore();
  const v = useBalanceView();
  const [now] = useState(() => new Date());
  const lenDays = daysBetween(range.start, range.end);
  const units = unitsFor(period, lenDays);
  const [unit, setUnit] = useState<BucketUnit | null>(null);
  const activeUnit: BucketUnit | null = units.length ? (unit && units.includes(unit) ? unit : units[0]) : null;

  const openingForSeries = carry.status === "ready" ? carry.opening : 0;
  // sin useMemo manual: el compilador de React lo memoiza solo
  const buckets = activeUnit ? bucketsFor(range, activeUnit) : [];
  const rows = balanceSeries(allTx, buckets, openingForSeries, now).map((p, i) => ({ ...p, start: buckets[i].start, end: buckets[i].end }));

  const withMoves = rows.filter((r) => r.income !== 0 || r.expense !== 0);
  const showCarry = v.carried && v.status === "ready";
  const lowerRange = rangeLabel.toLowerCase();
  const currencies = useMemo(() => {
    const set = new Set((carryOver ? allTx : visibleTx).map((t) => t.currency));
    return [...set];
  }, [allTx, visibleTx, carryOver]);

  return (
    <Sheet label="Tu saldo" onClose={onClose} style={{ maxHeight: "94dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <SheetHeader title="Tu saldo" onClose={onClose} />
      <div className="app-scroll" style={{ padding: "6px 20px calc(22px + env(safe-area-inset-bottom))", overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
        {v.status === "loading" && <div className="skeleton-row" role="status" aria-label="Calculando saldo" />}
        {v.status === "error" && <BalanceError />}

        {showCarry && (
          <div className="card" style={{ padding: "10px 16px" }}>
            <Line label={`Saldo anterior (al ${shortDateLabel(addDays(range.start, -1), now)})`} value={fmt(v.opening, currency)} />
            <Line label={`+ Ingresos de ${lowerRange}`} value={fmt(v.income, currency)} color="var(--income)" />
            <Line label={`− Gastos de ${lowerRange}`} value={fmt(v.expense, currency)} color="var(--expense)" />
            <div style={{ height: 1, background: "var(--line-strong)", margin: "6px 0" }} />
            <Line label={`= ${v.eyebrow}`} value={fmt(v.amount, currency)} strong color={v.amount < 0 ? "var(--expense)" : undefined} />
            {v.amount < 0 && <div className="caption" style={{ color: "var(--expense)" }}>Gastaste más de lo que tenías.</div>}
          </div>
        )}

        {v.status === "ready" && !v.carried && (
          <div className="card" style={{ padding: "10px 16px" }}>
            <Line label={`Ingresos de ${lowerRange}`} value={fmt(v.income, currency)} color="var(--income)" />
            <Line label={`Gastos de ${lowerRange}`} value={fmt(v.expense, currency)} color="var(--expense)" />
            <div style={{ height: 1, background: "var(--line-strong)", margin: "6px 0" }} />
            <Line label={v.periodName} value={fmt(v.periodNet, currency, { sign: true })} strong color={signedColor(v.periodNet)} />
          </div>
        )}

        {v.status === "ready" && (
          <div className="caption" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {showCarry && (
              <span>
                {v.periodName}: <strong style={{ color: signedColor(v.periodNet) }}>{fmt(v.periodNet, currency, { sign: true })}</strong>
              </span>
            )}
            {v.futureCount > 0 && (
              <span>
                Hay {v.futureCount} {v.futureCount === 1 ? "movimiento con fecha futura" : "movimientos con fecha futura"} en este período: se cuentan el día que llegan.
              </span>
            )}
            {currencies.length > 1 && <span>Sumamos movimientos en {currencies.join(" y ")} sin convertir.</span>}
          </div>
        )}

        {activeUnit && v.status === "ready" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="eyebrow">Desglose</div>
              {units.length > 1 && (
                <div style={{ width: 220 }}>
                  <Segmented<BucketUnit> label="Agrupar" value={activeUnit} onChange={setUnit} options={units.map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
                </div>
              )}
            </div>
            <div className="card" style={{ padding: "12px 12px 6px" }}>
              <TrendBars
                signed
                color="var(--income-fill)"
                negativeColor="var(--expense-fill)"
                data={rows.map((r) => ({ key: r.key, label: r.label, value: r.net }))}
                ariaLabel={`Balance ${UNIT_LABEL[activeUnit].toLowerCase()}`}
              />
            </div>
            {withMoves.length === 0 ? (
              <div className="caption" style={{ textAlign: "center", padding: "8px 0" }}>Sin movimientos en este período.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {withMoves.map((r) => (
                  <li
                    key={r.key}
                    style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "10px 2px", borderTop: "1px solid var(--line)", opacity: r.future ? 0.65 : 1 }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700 }}>
                      {rowLabel(activeUnit, r.start, r.end, now)}
                      {r.future && <span className="caption" style={{ marginLeft: 6 }}>previsto</span>}
                    </span>
                    <span className="amount tnum" style={{ color: signedColor(r.net), fontSize: 15 }}>
                      {fmt(r.net, currency, { sign: true })}
                    </span>
                    {showCarry && (
                      <span className="caption tnum" style={{ minWidth: 76, textAlign: "right" }} title="Saldo al cierre">
                        {fmtShort(r.closing, currency)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {showCarry && withMoves.length > 0 && <div className="caption" style={{ textAlign: "right" }}>Columna derecha: saldo al cierre.</div>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
