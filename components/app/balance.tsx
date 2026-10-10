"use client";

// Saldo en el Resumen: PeriodSummary (tira Ingresos / Gastos / Balance del rango),
// Monedero (barra inferior móvil), BalanceCard (desktop) y la hoja "Tu saldo" con el
// desglose por día / semana / mes.
//
// Glosario: Disponible hoy = saldo inicial + todo lo fechado hasta hoy (no depende
// del rango que se mira). Balance (diario/semanal/mensual/…) = ingresos − gastos del
// período. Saldo al inicio = lo que había antes del período.

import { useMemo, useState, type KeyboardEvent } from "react";
import { useStore, type TxType } from "./store";
import { Sheet, SheetHeader } from "./Sheet";
import { Coin } from "./Coin";
import { Icon } from "./Icon";
import { ActionButton, Segmented, MONTHS_FULL } from "./ui";
import { useElementSize } from "./useElementSize";
import { fmt, fmtShort, fitFontSize } from "@/lib/format";
import { balanceSeries } from "@/lib/balance";
import {
  addDays,
  balanceLabel,
  bucketsFor,
  daysBetween,
  parseDate,
  shortDateLabel,
  type BucketUnit,
} from "@/lib/date-range";

// Color de un monto con signo: ingreso neto verde, gasto neto rojo, cero neutro.
export function signedColor(n: number): string {
  return n < 0 ? "var(--expense)" : n > 0 ? "var(--income)" : "var(--text-2)";
}

function BalanceError() {
  const { retryHistory } = useStore();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      <span className="caption">No se pudo calcular tu saldo</span>
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
// PeriodSummary: Ingresos | Gastos | Balance del rango visible. Ingresos y Gastos
// son además el selector de foco del donut (radiogroup); Balance es solo lectura.
// ---------------------------------------------------------------------------
const FOCUS_OPTIONS: { value: TxType; label: string; dot: string }[] = [
  { value: "income", label: "Ingresos", dot: "var(--income-fill)" },
  { value: "expense", label: "Gastos", dot: "var(--expense-fill)" },
];

export function PeriodSummary({ large = false }: { large?: boolean }) {
  const { totals, currency, focus, setFocus, period, range, today, sim, rangePending, visibleTx, loadError } = useStore();
  const [ref, box] = useElementSize();
  if (loadError) return null;

  const loading = sim === "loading" || (rangePending && visibleTx.length === 0);
  const GAP = 6;
  const PAD = 19; // padding horizontal (8 + 8) + borde (1,5 + 1,5)
  const maxPx = large ? 24 : 17;

  const full = {
    income: fmt(totals.income, currency),
    expense: fmt(totals.expense, currency),
    balance: fmt(totals.balance, currency, { sign: true }),
  };
  const short = {
    income: fmtShort(totals.income, currency),
    expense: fmtShort(totals.expense, currency),
    // fmtShort no pone "+": se agrega a mano para que coincida con el monto completo
    balance: (totals.balance > 0 ? "+\u00a0" : "") + fmtShort(totals.balance, currency),
  };

  // Ancho útil de cada celda según la medida real de la fila (columnas 2fr | 1,15fr
  // con el radiogroup repartido en dos). Un solo tamaño para los tres montos.
  let fontSize = 14;
  let useShort = false;
  if (box.width > 0) {
    const cols = Math.max(box.width - GAP, 0);
    const radioCol = (cols * 2) / 3.15;
    const incExpAvail = Math.max((radioCol - GAP) / 2 - PAD, 0);
    const balAvail = Math.max((cols * 1.15) / 3.15 - PAD, 0);
    const avails = [incExpAvail, incExpAvail, balAvail];
    const texts = [full.income, full.expense, full.balance];
    const raw = Math.min(...texts.map((t, i) => fitFontSize(t, avails[i], maxPx, 0)));
    if (raw >= 12) {
      fontSize = raw;
    } else {
      useShort = true;
      const shorts = [short.income, short.expense, short.balance];
      fontSize = Math.min(...shorts.map((t, i) => fitFontSize(t, avails[i], maxPx, 12)));
    }
  }

  const balName = balanceLabel(period, range, parseDate(today));

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? FOCUS_OPTIONS.length - 1 : -1;
    if (!step && jump < 0) return;
    e.preventDefault();
    const from = FOCUS_OPTIONS.findIndex((o) => o.value === focus);
    const next = jump >= 0 ? jump : (from + step + FOCUS_OPTIONS.length) % FOCUS_OPTIONS.length;
    setFocus(FOCUS_OPTIONS[next].value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  const amountText = (key: "income" | "expense" | "balance") =>
    useShort ? (
      <>
        <span aria-hidden="true">{short[key]}</span>
        <span className="sr-only">{full[key]}</span>
      </>
    ) : (
      full[key]
    );

  const cellBase = {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    gap: 1,
    minHeight: 48,
    minWidth: 0,
    padding: "6px 8px",
    borderRadius: 12,
    textAlign: "left" as const,
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 11, lineHeight: "14px", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" as const };
  const amountStyle = { fontSize, lineHeight: 1.2, fontWeight: 600, whiteSpace: "nowrap" as const };

  if (loading) {
    return (
      <div ref={ref} aria-busy="true" role="status" aria-label="Calculando el período" style={{ display: "grid", gridTemplateColumns: "2fr 1.15fr", gap: GAP, width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: GAP }}>
          <div className="skeleton-row" style={{ height: 48 }} />
          <div className="skeleton-row" style={{ height: 48 }} />
        </div>
        <div className="skeleton-row" style={{ height: 48 }} />
      </div>
    );
  }

  return (
    <div ref={ref} style={{ display: "grid", gridTemplateColumns: "2fr 1.15fr", gap: GAP, width: "100%" }}>
      <div role="radiogroup" aria-label="Mostrar en el gráfico" onKeyDown={onKeyDown} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: GAP }}>
        {FOCUS_OPTIONS.map((o) => {
          const on = focus === o.value;
          const key = o.value === "income" ? "income" : "expense";
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setFocus(o.value)}
              style={{
                ...cellBase,
                cursor: "pointer",
                background: on ? "var(--surface)" : "var(--bg-2)",
                border: on ? "1.5px solid var(--line-strong)" : "1.5px solid transparent",
                boxShadow: on ? `inset 0 -3px 0 ${o.dot}` : "none",
                color: "var(--text)",
              }}
            >
              <span className="eyebrow" style={{ ...labelStyle, fontWeight: on ? 800 : 700 }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: o.dot, flex: "0 0 auto" }} />
                {o.label}
              </span>
              <span className="num tnum" style={{ ...amountStyle, color: o.value === "income" ? "var(--income)" : "var(--expense)" }}>
                {amountText(key)}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ ...cellBase, background: "transparent", border: "1.5px solid var(--line)", cursor: "default" }}>
        <span className="eyebrow" style={labelStyle}>
          {large ? (
            balName
          ) : (
            <>
              <span aria-hidden="true">Balance</span>
              <span className="sr-only">{balName}</span>
            </>
          )}
        </span>
        <span className="num tnum" style={{ ...amountStyle, color: signedColor(totals.balance) }}>
          {amountText("balance")}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monedero: barra inferior móvil. Siempre visible (también con el período vacío:
// el disponible sigue ahí) y siempre "Disponible hoy", sin importar el rango que se
// mire. Tocar el centro abre "Tu saldo".
// ---------------------------------------------------------------------------
export function Monedero() {
  const { openEntry, currency, available } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 16px" }}>
      <ActionButton kind="expense" size={56} onClick={() => openEntry("expense")} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
        {available.status === "error" ? (
          <BalanceError />
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={available.status === "loading" ? "Ver saldo, calculando" : `Ver saldo. Disponible hoy: ${fmt(available.amount, currency)}`}
            style={{ minHeight: 56, minWidth: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: "2px 6px", color: "var(--text)" }}
          >
            <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Coin size={18} sprout={available.status === "ready" && available.monthNet > 0} />
              Disponible hoy
            </span>
            {available.status === "loading" ? (
              <span className="skeleton-row" style={{ width: 112, height: 24, borderRadius: 8, marginTop: 4 }} role="status" aria-label="Calculando saldo" />
            ) : (
              <span
                className="num-coin"
                style={{ fontSize: "clamp(22px, 7vw, 26px)", lineHeight: 1.15, color: available.amount < 0 ? "var(--expense)" : "var(--text)" }}
              >
                {fmt(available.amount, currency)}
              </span>
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
  const { currency, available } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="card-hero" style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Coin size={20} sprout={available.status === "ready" && available.monthNet > 0} />
        Disponible hoy
      </div>
      {available.status === "error" ? (
        <BalanceError />
      ) : available.status === "loading" ? (
        <div className="skeleton-row" role="status" aria-label="Calculando saldo" style={{ height: 52, width: 220 }} />
      ) : (
        <>
          <div className="num-coin" style={{ fontSize: 44, lineHeight: 1.1, color: available.amount < 0 ? "var(--expense)" : "var(--text)" }}>
            {fmt(available.amount, currency)}
          </div>
          <div className="caption">Todo lo que registraste hasta hoy.</div>
          {available.futureCount > 0 && (
            <div className="caption">
              {available.futureCount} {available.futureCount === 1 ? "movimiento con fecha futura" : "movimientos con fecha futura"} (aún no cuentan)
            </div>
          )}
        </>
      )}
      {available.status !== "error" && (
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
// BalanceSheet: "Tu saldo". Disponible hoy arriba; debajo, la cuenta del período
// que se está mirando y su desglose por día / semana / mes.
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
  const { currency, period, range, rangeLabel, allTx, carry, available, setScreen } = useStore();
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
  const lowerRange = rangeLabel.toLowerCase();
  const currencies = useMemo(() => [...new Set(allTx.map((t) => t.currency))], [allTx]);

  const closingLabel =
    carry.status === "ready"
      ? carry.kind === "hoy"
        ? "Saldo hoy"
        : carry.kind === "cierre"
          ? `Saldo al ${shortDateLabel(range.end, now)}`
          : "Saldo previsto"
      : "";
  const untilToday = carry.status === "ready" && carry.kind === "hoy" && carry.futureCount > 0 ? " (hasta hoy)" : "";

  return (
    <Sheet label="Tu saldo" onClose={onClose} style={{ maxHeight: "94dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <SheetHeader title="Tu saldo" onClose={onClose} />
      <div className="app-scroll" style={{ padding: "6px 20px calc(22px + env(safe-area-inset-bottom))", overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
        <div className="card" style={{ padding: "12px 16px" }}>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Coin size={18} sprout={available.status === "ready" && available.monthNet > 0} />
            Disponible hoy
          </div>
          {available.status === "loading" && <div className="skeleton-row" role="status" aria-label="Calculando saldo" style={{ marginTop: 8 }} />}
          {available.status === "error" && <BalanceError />}
          {available.status === "ready" && (
            <>
              <div className="num-coin" style={{ fontSize: 32, lineHeight: 1.15, marginTop: 4, color: available.amount < 0 ? "var(--expense)" : "var(--text)" }}>
                {fmt(available.amount, currency)}
              </div>
              {available.amount < 0 && <div className="caption" style={{ color: "var(--expense)" }}>Gastaste más de lo que tenías.</div>}
              <button
                onClick={() => {
                  setScreen("ajustes");
                  onClose();
                }}
                style={{ minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              >
                ¿No coincide? Ajustalo
              </button>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="eyebrow">Período · {rangeLabel}</div>
          {carry.status === "loading" && <div className="skeleton-row" role="status" aria-label="Calculando período" />}
          {carry.status === "error" && <BalanceError />}
          {carry.status === "ready" && (
            <div className="card" style={{ padding: "10px 16px" }}>
              <Line label={`Saldo al inicio (${shortDateLabel(addDays(range.start, -1), now)})`} value={fmt(carry.opening, currency)} />
              <Line label={`+ Ingresos de ${lowerRange}${untilToday}`} value={fmt(carry.income, currency)} color="var(--income)" />
              <Line label={`− Gastos de ${lowerRange}${untilToday}`} value={fmt(carry.expense, currency)} color="var(--expense)" />
              <div style={{ height: 1, background: "var(--line-strong)", margin: "6px 0" }} />
              <Line label={`= ${closingLabel}`} value={fmt(carry.closing, currency)} strong color={carry.closing < 0 ? "var(--expense)" : undefined} />
            </div>
          )}
        </div>

        {carry.status === "ready" && (
          <div className="caption" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>
              {balanceLabel(period, range, now)}: <strong style={{ color: signedColor(carry.net) }}>{fmt(carry.net, currency, { sign: true })}</strong>
            </span>
            {carry.futureCount > 0 && (
              <span>
                Hay {carry.futureCount} {carry.futureCount === 1 ? "movimiento con fecha futura" : "movimientos con fecha futura"} en este período: se cuentan el día que llegan.
              </span>
            )}
            {currencies.length > 1 && <span>Sumamos movimientos en {currencies.join(" y ")} sin convertir.</span>}
          </div>
        )}

        {activeUnit && carry.status === "ready" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="eyebrow">Desglose</div>
              {units.length > 1 && (
                <div style={{ width: 220 }}>
                  <Segmented<BucketUnit> label="Agrupar" value={activeUnit} onChange={setUnit} options={units.map((u) => ({ value: u, label: UNIT_LABEL[u] }))} />
                </div>
              )}
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
                    <span className="caption tnum" style={{ minWidth: 76, textAlign: "right" }} title="Saldo al cierre">
                      {fmtShort(r.closing, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {withMoves.length > 0 && <div className="caption" style={{ textAlign: "right" }}>Columna derecha: saldo al cierre.</div>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
