"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { CatBubble, Icon } from "./Icon";
import { Donut } from "./Donut";
import { TrendBars } from "./TrendBars";
import { PeriodPills, RangeNav, CenterBalance, ActionButton, StateView } from "./ui";
import { fmt, fmtShort } from "@/lib/format";
import { bucketsFor, daysBetween, endOfMonth, rangeLabel as formatRangeLabel } from "@/lib/date-range";

function Ring({ size, donutSize, thickness }: { size: number; donutSize: number; thickness: number }) {
  const { breakdown } = useStore();
  const ring = breakdown.slice(0, 8);
  const R = size / 2 - 30;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      {ring.map((b, i) => {
        const ang = ((-90 + i * (360 / Math.max(ring.length, 1))) * Math.PI) / 180;
        const x = size / 2 + R * Math.cos(ang);
        const y = size / 2 + R * Math.sin(ang);
        return (
          <div key={b.cat} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", textAlign: "center" }}>
            <CatBubble icon={b.icon} color={b.color} size={46} stroke={2} title={b.name} />
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--text-2)", marginTop: 3 }}>{Math.round(b.pct * 100)}%</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={donutSize} thickness={thickness}>
          <CenterBalance scale={0.92} />
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
  const { breakdown, setScreen, currency, budgets, range } = useStore();
  const showBudgets = isFullMonthRange(range);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {breakdown.slice(0, limit).map((b) => {
        const budget = showBudgets ? budgets.find((bd) => bd.categoryId === b.cat) : undefined;
        const budgetPct = budget && budget.limit > 0 ? Math.min(b.total / budget.limit, 1) : null;
        const over = budgetPct !== null && b.total > budget!.limit;
        const near = budgetPct !== null && budget!.alertAt80 && budgetPct >= 0.8;
        const barColor = over ? "var(--red)" : near ? "var(--cat-fun)" : b.color;
        return (
          <button
            key={b.cat}
            onClick={() => setScreen("movimientos")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: compact ? "7px 6px" : "10px 6px",
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
                <span className="num tnum" style={{ fontWeight: 600, fontSize: 14, color: over ? "var(--red-600)" : "var(--text)" }}>
                  {budget ? `${fmt(b.total, currency)} de ${fmt(budget.limit, currency)}` : fmt(b.total, currency)}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
                <div style={{ width: (budgetPct ?? b.pct) * 100 + "%", height: "100%", borderRadius: 999, background: barColor }} />
              </div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: over ? "var(--red-600)" : "var(--text-3)", width: 32, textAlign: "right" }}>
              {Math.round((budgetPct ?? b.pct) * 100)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Gasto por balde (día/semana/mes, según bucketsFor) dentro del rango visible.
function useExpenseTrend() {
  const { visibleTx, range } = useStore();
  return useMemo(() => {
    const buckets = bucketsFor(range);
    return buckets.map((b) => ({
      key: b.key,
      label: b.label,
      value: visibleTx.reduce(
        (sum, t) => (t.type === "expense" && t.date >= b.start && t.date <= b.end ? sum + t.amount : sum),
        0
      ),
    }));
  }, [visibleTx, range]);
}

function StatTile({ label, value, color = "var(--text)" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: "1 1 130px", background: "var(--surface)", borderRadius: 14, padding: "10px 12px", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-3)" }}>{label}</div>
      <div className="num tnum" style={{ fontSize: 16, fontWeight: 600, color, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>{value}</div>
    </div>
  );
}

// Comparativa contra el período anterior equivalente + promedio diario, y
// proyección a fin de mes cuando el rango elegido es el mes en curso.
function ComparativeStats() {
  const { totals, prevTotals, prevRange, range, period, currency } = useStore();
  const days = daysBetween(range.start, range.end);

  // El promedio se calcula sobre los días YA transcurridos del rango, no sobre
  // su largo total: si no, en el mes en curso se divide por 31 desde el día 1 y
  // la proyección (promedio × 31) devuelve exactamente lo ya gastado.
  const now = new Date();
  const effectiveEnd = range.end > now ? now : range.end;
  const elapsedDays = Math.min(Math.max(daysBetween(range.start, effectiveEnd), 1), days);
  const avgPerDay = totals.expense / elapsedDays;

  const isCurrentMonth =
    range.start.getDate() === 1 &&
    range.start.getFullYear() === now.getFullYear() &&
    range.start.getMonth() === now.getMonth();
  const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projection = isCurrentMonth ? avgPerDay * daysInThisMonth : null;

  const deltaPct = prevTotals.expense > 0 ? ((totals.expense - prevTotals.expense) / prevTotals.expense) * 100 : null;
  const down = deltaPct !== null && deltaPct < 0;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {deltaPct !== null && (
        <StatTile
          label={`vs ${formatRangeLabel(prevRange, period)}`}
          color={down ? "var(--green-700)" : "var(--red-600)"}
          value={`${Math.abs(Math.round(deltaPct))}%`}
        />
      )}
      <StatTile label="Promedio / día" value={fmt(avgPerDay, currency)} />
      {projection !== null && <StatTile label="Proyección fin de mes" value={fmt(projection, currency)} />}
    </div>
  );
}

function TrendSection() {
  const trend = useExpenseTrend();
  const total = trend.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;
  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, padding: "14px 14px 8px", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="ChartColumn" size={13} stroke={2.4} color="var(--text-3)" /> Tendencia de gasto
      </div>
      <TrendBars data={trend} />
    </div>
  );
}

function SaldoBar() {
  const { totals, openEntry, currency } = useStore();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 26px 16px" }}>
      <ActionButton kind="expense" onClick={() => openEntry("expense")} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>Saldo</div>
        <div className="num" style={{ fontSize: 21, fontWeight: 600, color: "var(--text)" }}>{fmt(totals.balance, currency)}</div>
      </div>
      <ActionButton kind="income" onClick={() => openEntry("income")} />
    </div>
  );
}

export function DashboardMobile() {
  const { dashStyle, sim, setSim, breakdown, visibleTx, currency } = useStore();
  let body;
  if (sim === "loading") body = <StateView kind="loading" />;
  else if (sim === "error") body = <StateView kind="error" onRetry={() => setSim("normal")} />;
  else if (sim === "empty" || visibleTx.length === 0) body = <StateView kind="empty" />;
  else if (dashStyle === "A") {
    body = (
      <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <Ring size={332} donutSize={196} thickness={22} />
      </div>
    );
  } else if (dashStyle === "B") {
    body = (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ padding: "6px 18px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <ComparativeStats />
          <TrendSection />
        </div>
        <div style={{ display: "grid", placeItems: "center", padding: "6px 0 12px" }}>
          <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={188} thickness={20}>
            <CenterBalance scale={0.9} />
          </Donut>
        </div>
        <div style={{ padding: "0 18px 12px" }}>
          <LegendList limit={8} />
        </div>
      </div>
    );
  } else {
    body = (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto" }}>
        <div style={{ padding: "2px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <ComparativeStats />
          <TrendSection />
        </div>
        <div style={{ display: "grid", placeItems: "center", padding: "2px 0 10px" }}>
          <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={176} thickness={19}>
            <CenterBalance scale={0.86} />
          </Donut>
        </div>
        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {breakdown.slice(0, 8).map((b) => (
            <div key={b.cat} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--surface)", borderRadius: 14, padding: "9px 11px", boxShadow: "var(--shadow-card)" }}>
              <CatBubble icon={b.icon} color={b.color} size={34} stroke={2} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                <div className="num tnum" style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600 }}>{Math.round(b.pct * 100)}% · {fmtShort(b.total, currency)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "6px 18px 10px", display: "flex", flexDirection: "column", gap: 12, flex: "0 0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><PeriodPills /></div>
        <RangeNav />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{body}</div>
      {sim === "normal" && visibleTx.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line)", background: "var(--surface)", flex: "0 0 auto" }}>
          <SaldoBar />
        </div>
      )}
    </div>
  );
}

export function DashboardDesktop() {
  const { breakdown, sim, setSim, visibleTx } = useStore();
  let center;
  if (sim === "loading") center = <StateView kind="loading" />;
  else if (sim === "error") center = <StateView kind="error" onRetry={() => setSim("normal")} />;
  else if (sim === "empty" || visibleTx.length === 0) center = <StateView kind="empty" />;
  else
    center = (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 56, flexWrap: "wrap", height: "100%" }}>
        <Donut segments={breakdown.map((b) => ({ value: b.total, color: b.color, cat: b.cat }))} size={300} thickness={32}>
          <CenterBalance scale={1.28} />
        </Donut>
        <div style={{ width: 280, maxWidth: "40vw" }}>
          <LegendList limit={8} />
        </div>
      </div>
    );
  const showStats = !(sim === "loading" || sim === "error" || sim === "empty" || visibleTx.length === 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "26px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <RangeNav center={false} />
        <PeriodPills />
      </div>
      {showStats && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}><ComparativeStats /></div>
          <div style={{ flex: "2 1 360px" }}><TrendSection /></div>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>{center}</div>
    </div>
  );
}
