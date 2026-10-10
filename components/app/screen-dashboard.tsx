"use client";

import { useStore, type TxType } from "./store";
import { CatBubble, Icon } from "./Icon";
import { Donut } from "./Donut";
import { PeriodPills, RangeNav, CenterBalance, StateView } from "./ui";
import { Monedero, BalanceCard, PeriodSummary } from "./balance";
import { useElementSize } from "./useElementSize";
import { fmt, fmtShort } from "@/lib/format";
import { daysBetween, endOfMonth, rangeLabel as formatRangeLabel } from "@/lib/date-range";

// Tamaño del anillo entre min y max que entre en el contenedor: el anillo de
// 332px fijo no entraba en un iPhone chico (375×667).
function useFit(min: number, max: number) {
  const [ref, box] = useElementSize();
  const size = box.width ? Math.round(Math.max(min, Math.min(max, box.width - 24, box.height - 8))) : max;
  return [ref, size] as const;
}

function donutLabel(focus: TxType, breakdown: { name: string; pct: number }[]): string {
  const head = focus === "expense" ? "Gastos por categoría" : "Ingresos por categoría";
  return `${head}: ${breakdown.map((b) => `${b.name} ${Math.round(b.pct * 100)} %`).join(", ")}`;
}

function Ring({ size }: { size: number }) {
  const { breakdown, focus } = useStore();
  const ring = breakdown.slice(0, 8);
  const k = size / 332;
  const bubble = Math.round(46 * k);
  const R = size / 2 - bubble * 0.65;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      {ring.map((b, i) => {
        const ang = ((-90 + i * (360 / Math.max(ring.length, 1))) * Math.PI) / 180;
        const x = size / 2 + R * Math.cos(ang);
        const y = size / 2 + R * Math.sin(ang);
        return (
          <div key={b.cat} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", textAlign: "center" }}>
            <CatBubble icon={b.icon} color={b.color} size={bubble} stroke={2} title={b.name} />
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)", marginTop: 3 }}>
              <span className="sr-only">{b.name} </span>
              {Math.round(b.pct * 100)}%
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <Donut
          segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))}
          size={Math.round(196 * k)}
          thickness={Math.max(16, Math.round(22 * k))}
          label={donutLabel(focus, breakdown)}
        >
          <CenterBalance scale={0.92 * k} />
        </Donut>
      </div>
    </div>
  );
}

// Presupuestos son mensuales por definición del schema de Notion — solo tiene
// sentido mostrarlos contra el gasto real cuando el rango elegido es,
// justamente, un mes completo (period "Mes", o un rango custom que coincide).
function isFullMonthRange(range: { start: Date; end: Date }): boolean {
  return range.start.getDate() === 1 && range.end.getTime() === endOfMonth(range.start).getTime();
}

export function LegendList({ limit = 99, compact = false }: { limit?: number; compact?: boolean }) {
  const { breakdown, setScreen, currency, budgets, range, focus } = useStore();
  const showBudgets = focus === "expense" && isFullMonthRange(range);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {breakdown.slice(0, limit).map((b) => {
        const budget = showBudgets ? budgets.find((bd) => bd.categoryId === b.cat) : undefined;
        const budgetPct = budget && budget.limit > 0 ? Math.min(b.total / budget.limit, 1) : null;
        const over = budgetPct !== null && b.total > budget!.limit;
        const near = !over && budgetPct !== null && budget!.alertAt80 && budgetPct >= 0.8;
        const barColor = over ? "var(--expense-fill)" : near ? "var(--warn)" : b.color;
        const pct = Math.round((budgetPct ?? b.pct) * 100);
        return (
          <button
            key={b.cat}
            onClick={() => setScreen("movimientos")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: compact ? "7px 6px" : "10px 6px",
              minHeight: 44,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              width: "100%",
            }}
          >
            <CatBubble icon={b.icon} color={b.color} size={compact ? 34 : 40} stroke={2} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{b.name}</span>
                <span className="num tnum" style={{ fontWeight: 600, fontSize: 14, color: over ? "var(--expense)" : "var(--text)" }}>
                  {budget ? `${fmt(b.total, currency)} de ${fmt(budget.limit, currency)}` : fmt(b.total, currency)}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
                <div style={{ width: (budgetPct ?? b.pct) * 100 + "%", height: "100%", borderRadius: 999, background: barColor }} />
              </div>
            </div>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, fontSize: 12, fontWeight: 800, color: over ? "var(--expense)" : near ? "var(--warn)" : "var(--text-2)", minWidth: 40 }}>
              {(over || near) && <Icon name="TriangleAlert" size={14} stroke={2.4} color={over ? "var(--expense)" : "var(--warn)"} />}
              {pct}%
              {over && <span className="sr-only"> del presupuesto, superado</span>}
              {near && <span className="sr-only"> del presupuesto, cerca del límite</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatTile({ label, value, color = "var(--text)", icon }: { label: string; value: string; color?: string; icon?: string }) {
  return (
    <div className="card" style={{ flex: "1 1 130px", padding: "10px 12px" }}>
      <div className="eyebrow" style={{ color: "var(--text-2)" }}>{label}</div>
      <div className="num tnum" style={{ fontSize: 16, fontWeight: 600, color, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <Icon name={icon} size={16} stroke={2.4} color={color} />}
        {value}
      </div>
    </div>
  );
}

// Comparativa contra el período anterior equivalente + promedio diario, y
// proyección a fin de mes cuando el rango elegido es el mes en curso. Todo
// sobre el monto del tipo (gasto/ingreso) en foco.
function ComparativeStats() {
  const { totals, prevTotals, prevRange, range, period, currency, focus } = useStore();
  const days = daysBetween(range.start, range.end);
  const isExpense = focus === "expense";
  const focusTotal = totals[focus];
  const prevFocusTotal = prevTotals[focus];

  // El promedio se calcula sobre los días YA transcurridos del rango, no sobre
  // su largo total: si no, en el mes en curso se divide por 31 desde el día 1 y
  // la proyección (promedio × 31) devuelve exactamente lo ya gastado.
  const now = new Date();
  const effectiveEnd = range.end > now ? now : range.end;
  const elapsedDays = Math.min(Math.max(daysBetween(range.start, effectiveEnd), 1), days);
  const avgPerDay = focusTotal / elapsedDays;

  const isCurrentMonth =
    range.start.getDate() === 1 &&
    range.start.getFullYear() === now.getFullYear() &&
    range.start.getMonth() === now.getMonth();
  const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projection = isCurrentMonth ? avgPerDay * daysInThisMonth : null;

  const deltaPct = prevFocusTotal > 0 ? ((focusTotal - prevFocusTotal) / prevFocusTotal) * 100 : null;
  // Para gasto, bajar es bueno (verde); para ingreso, subir es bueno (verde) — signo invertido.
  const good = deltaPct !== null && (isExpense ? deltaPct < 0 : deltaPct > 0);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {deltaPct !== null && (
        <StatTile
          label={`vs ${formatRangeLabel(prevRange, period)}`}
          color={good ? "var(--income)" : "var(--expense)"}
          icon={deltaPct < 0 ? "TrendingDown" : "TrendingUp"}
          value={`${Math.abs(Math.round(deltaPct))} % ${deltaPct < 0 ? "menos" : "más"}`}
        />
      )}
      <StatTile label="Promedio / día" value={fmt(avgPerDay, currency)} />
      {projection !== null && (
        <StatTile label={isExpense ? "Proyección fin de mes" : "Proyección de ingresos"} value={fmt(projection, currency)} />
      )}
    </div>
  );
}

function FitRing() {
  const [ref, size] = useFit(240, 332);
  return (
    <div ref={ref} className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", placeItems: "center" }}>
      <Ring size={size} />
    </div>
  );
}

export function DashboardMobile() {
  const { dashStyle, sim, setSim, breakdown, visibleTx, currency, budgets, range, focus, loadError, rangePending } = useStore();
  const showBudgets = focus === "expense" && isFullMonthRange(range);
  const showMonedero = !loadError && sim === "normal";
  const donutSegments = breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }));
  let body;
  if (loadError) body = <StateView kind="error" onRetry={() => window.location.reload()} />;
  else if (sim === "loading" || (rangePending && visibleTx.length === 0 && sim === "normal")) body = <StateView kind="loading" />;
  else if (sim === "error") body = <StateView kind="error" onRetry={() => setSim("normal")} />;
  else if (sim === "empty" || visibleTx.length === 0) body = <StateView kind="empty" />;
  else if (breakdown.length === 0) {
    body = (
      <StateView
        kind="empty"
        title={focus === "income" ? "Sin ingresos" : "Sin gastos"}
        message={
          focus === "income"
            ? "No registraste ingresos en este período. Tocá Gastos arriba o probá con otro rango."
            : "No registraste gastos en este período. Tocá Ingresos arriba o probá con otro rango."
        }
      />
    );
  } else if (dashStyle === "A") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <FitRing />
      </div>
    );
  } else if (dashStyle === "B") {
    body = (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ display: "grid", placeItems: "center", padding: "6px 0 12px" }}>
          <Donut segments={donutSegments} size={188} thickness={20} label={donutLabel(focus, breakdown)}>
            <CenterBalance scale={0.9} />
          </Donut>
        </div>
        <div style={{ padding: "0 16px 12px" }}>
          <LegendList limit={8} />
        </div>
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <ComparativeStats />
        </div>
      </div>
    );
  } else {
    body = (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ display: "grid", placeItems: "center", padding: "2px 0 10px" }}>
          <Donut segments={donutSegments} size={176} thickness={19} label={donutLabel(focus, breakdown)}>
            <CenterBalance scale={0.86} />
          </Donut>
        </div>
        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {breakdown.slice(0, 8).map((b) => {
            const bud = showBudgets ? budgets.find((x) => x.categoryId === b.cat) : undefined;
            const pct = bud && bud.limit > 0 ? Math.min(b.total / bud.limit, 1) : null;
            const over = pct !== null && b.total > bud!.limit;
            const near = !over && pct !== null && bud!.alertAt80 && pct >= 0.8;
            return (
              <div key={b.cat} className="card" style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px" }}>
                <CatBubble icon={b.icon} color={b.color} size={34} stroke={2} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                  <div className="num tnum" style={{ fontSize: 12, color: over ? "var(--expense)" : near ? "var(--warn)" : "var(--text-2)", fontWeight: 600 }}>
                    {bud ? `${fmtShort(b.total, currency)} / ${fmtShort(bud.limit, currency)}` : `${Math.round(b.pct * 100)}% · ${fmtShort(b.total, currency)}`}
                  </div>
                  {pct !== null && (
                    <div style={{ height: 4, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: pct * 100 + "%", height: "100%", borderRadius: 999, background: over ? "var(--expense-fill)" : near ? "var(--warn)" : b.color }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <ComparativeStats />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "4px 16px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: "0 0 auto" }}>
        <PeriodPills />
        <RangeNav />
      </div>
      <div style={{ padding: "4px 16px 8px", flex: "0 0 auto" }}>
        <PeriodSummary />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{body}</div>
      {showMonedero && (
        <div style={{ borderTop: "1px solid var(--line)", background: "var(--surface)", flex: "0 0 auto" }}>
          <Monedero />
        </div>
      )}
    </div>
  );
}

export function DashboardDesktop() {
  const { breakdown, sim, setSim, visibleTx, focus, loadError, rangePending } = useStore();
  let center;
  if (loadError) center = <StateView kind="error" onRetry={() => window.location.reload()} />;
  else if (sim === "loading" || (rangePending && visibleTx.length === 0 && sim === "normal")) center = <StateView kind="loading" />;
  else if (sim === "error") center = <StateView kind="error" onRetry={() => setSim("normal")} />;
  else if (sim === "empty" || visibleTx.length === 0) center = <StateView kind="empty" />;
  else if (breakdown.length === 0) {
    center = (
      <StateView
        kind="empty"
        title={focus === "income" ? "Sin ingresos" : "Sin gastos"}
        message={
          focus === "income"
            ? "No registraste ingresos en este período. Tocá Gastos arriba o probá con otro rango."
            : "No registraste gastos en este período. Tocá Ingresos arriba o probá con otro rango."
        }
      />
    );
  } else
    center = (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 56, flexWrap: "wrap", padding: "8px 0 16px" }}>
        <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={300} thickness={32} label={donutLabel(focus, breakdown)}>
          <CenterBalance scale={1.28} />
        </Donut>
        <div style={{ width: 280, maxWidth: "40vw" }}>
          <LegendList limit={8} />
        </div>
      </div>
    );
  const showStats = !(loadError || sim === "loading" || sim === "error" || sim === "empty" || visibleTx.length === 0 || breakdown.length === 0);
  const showBalance = !loadError && sim === "normal";
  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "26px 32px", minHeight: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <RangeNav center={false} />
          <PeriodPills />
        </div>
        {showBalance && (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}><BalanceCard /></div>
            <div style={{ flex: "2 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <PeriodSummary large />
              {showStats && <ComparativeStats />}
            </div>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0 }}>{center}</div>
      </div>
    </div>
  );
}
