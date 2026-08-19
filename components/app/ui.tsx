"use client";

import { useState } from "react";
import { useStore, type Period, type TxType } from "./store";
import { Icon } from "./Icon";
import { RangeModal } from "./modal-range";
import { fmt } from "@/lib/format";

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MONTHS_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const PERIOD_ITEMS: { value: Period; label: string }[] = [
  { value: "Día", label: "Día" },
  { value: "Semana", label: "Semana" },
  { value: "Mes", label: "Mes" },
  { value: "Año", label: "Año" },
  { value: "Personalizado", label: "Rango" },
];

export function PeriodPills({ size = "md" }: { size?: "sm" | "md" }) {
  const { period, setPeriod } = useStore();
  const [rangeOpen, setRangeOpen] = useState(false);
  const pad = size === "sm" ? "5px 11px" : "7px 15px";
  const fs = size === "sm" ? 12.5 : 13.5;
  return (
    <>
      <div style={{ display: "flex", gap: 3, background: "var(--bg-2)", padding: 3, borderRadius: 999 }}>
        {PERIOD_ITEMS.map((p) => {
          const on = p.value === period;
          return (
            <button
              key={p.value}
              onClick={() => (p.value === "Personalizado" ? setRangeOpen(true) : setPeriod(p.value))}
              style={{
                padding: pad,
                borderRadius: 999,
                fontSize: fs,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                color: on ? "var(--on-accent)" : "var(--text-2)",
                background: on ? "var(--green)" : "transparent",
                boxShadow: on ? "var(--shadow-fab)" : "none",
                transition: "background .15s, color .15s",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {rangeOpen && <RangeModal onClose={() => setRangeOpen(false)} />}
    </>
  );
}

export function MonthNav({ center = true }: { center?: boolean }) {
  const { month, year, navMonth } = useStore();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: center ? "center" : "flex-start" }}>
      <button className="icon-btn" onClick={() => navMonth(-1)} aria-label="Mes anterior">
        <Icon name="ChevronLeft" size={20} stroke={2.4} color="var(--text-2)" />
      </button>
      <div style={{ minWidth: 132, textAlign: "center", fontWeight: 800, fontSize: 16 }}>
        {MONTHS_FULL[month]} <span style={{ color: "var(--text-3)", fontWeight: 700 }}>{year}</span>
      </div>
      <button className="icon-btn" onClick={() => navMonth(1)} aria-label="Mes siguiente">
        <Icon name="ChevronRight" size={20} stroke={2.4} color="var(--text-2)" />
      </button>
    </div>
  );
}

// Cabecera de navegación del Resumen: ‹ [etiqueta del rango] › — funciona para
// los cinco períodos (Día/Semana/Mes/Año/Rango); tocar la etiqueta abre el
// selector de rango, igual que la pastilla "Rango" de PeriodPills.
export function RangeNav({ center = true }: { center?: boolean }) {
  const { rangeLabel, navRange } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: center ? "center" : "flex-start" }}>
      <button className="icon-btn" onClick={() => navRange(-1)} aria-label="Período anterior">
        <Icon name="ChevronLeft" size={20} stroke={2.4} color="var(--text-2)" />
      </button>
      <button
        onClick={() => setOpen(true)}
        className="num"
        style={{ minWidth: 132, textAlign: "center", fontWeight: 600, fontSize: 16, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", padding: "4px 6px" }}
      >
        {rangeLabel}
      </button>
      <button className="icon-btn" onClick={() => navRange(1)} aria-label="Período siguiente">
        <Icon name="ChevronRight" size={20} stroke={2.4} color="var(--text-2)" />
      </button>
      {open && <RangeModal onClose={() => setOpen(false)} />}
    </div>
  );
}

export function CenterBalance({ scale = 1 }: { scale?: number }) {
  const { totals, currency, focus } = useStore();
  const isExpense = focus === "expense";
  return (
    <div>
      <div style={{ fontSize: 10.5 * Math.max(scale, 0.9), fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)" }}>
        Balance
      </div>
      <div className="num" style={{ fontSize: 34 * scale, fontWeight: 600, lineHeight: 1.04, color: "var(--text)", marginTop: 2 }}>
        {fmt(totals.balance, currency)}
      </div>
      <div className="num tnum" style={{ fontSize: 14.5 * scale, fontWeight: 600, color: isExpense ? "var(--red)" : "var(--green)", marginTop: 4 }}>
        {isExpense ? "− " : "+ "}{fmt(isExpense ? totals.expense : totals.income, currency)}
      </div>
    </div>
  );
}

export function ActionButton({ kind, onClick, size = 60 }: { kind: "expense" | "income"; onClick: () => void; size?: number }) {
  const expense = kind === "expense";
  return (
    <button
      onClick={onClick}
      aria-label={expense ? "Registrar gasto" : "Registrar ingreso"}
      className="fab-btn"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        border: "none",
        cursor: "pointer",
        background: expense ? "var(--red)" : "var(--green)",
        color: "#fff",
        boxShadow: expense ? "0 6px 16px rgba(224,88,74,.32)" : "var(--shadow-fab)",
        transition: "filter .15s, transform .1s",
      }}
    >
      <Icon name={expense ? "Minus" : "Plus"} size={Math.round(size * 0.46)} stroke={3} color="#fff" />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 3, background: "var(--bg-2)", padding: 3, borderRadius: 10 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              color: on ? "var(--text)" : "var(--text-3)",
              background: on ? "var(--surface)" : "transparent",
              boxShadow: on ? "var(--shadow-card)" : "none",
              transition: "background .15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// FocusToggle: alterna el foco del Resumen entre Gastos e Ingresos. La pastilla
// activa toma el color semántico del tipo (rojo gasto / verde ingreso) para que
// se lea de un vistazo, a diferencia de PeriodPills que siempre usa el acento.
export function FocusToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { focus, setFocus } = useStore();
  const pad = size === "sm" ? "5px 11px" : "7px 15px";
  const fs = size === "sm" ? 12.5 : 13.5;
  const items: { value: TxType; label: string; color: string }[] = [
    { value: "expense", label: "Gastos", color: "var(--red)" },
    { value: "income", label: "Ingresos", color: "var(--green)" },
  ];
  return (
    <div style={{ display: "flex", gap: 3, background: "var(--bg-2)", padding: 3, borderRadius: 999 }}>
      {items.map((it) => {
        const on = it.value === focus;
        return (
          <button
            key={it.value}
            onClick={() => setFocus(it.value)}
            style={{
              padding: pad,
              borderRadius: 999,
              fontSize: fs,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              color: on ? "var(--on-accent)" : "var(--text-2)",
              background: on ? it.color : "transparent",
              boxShadow: on ? "var(--shadow-fab)" : "none",
              transition: "background .15s, color .15s",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function StateView({
  kind,
  onRetry,
  title,
  message,
  action,
}: {
  kind: "loading" | "empty" | "error";
  onRetry?: () => void;
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  if (kind === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 18, height: "100%" }}>
        <div className="skeleton-donut" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "80%", maxWidth: 320 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    );
  }
  const map: Record<string, { icon: string; title: string; body: string }> = {
    empty: { icon: "Wallet", title: "Sin movimientos", body: "No registraste gastos ni ingresos en este período. Tocá + o − para empezar." },
    error: { icon: "CloudOff", title: "No se pudo cargar", body: "Hubo un problema al traer tus datos. Revisá la conexión e intentá de nuevo." },
  };
  const s = map[kind] || map.empty;
  const primaryAction = kind === "error" ? { label: "Reintentar", onClick: onRetry ?? (() => {}) } : action;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 14, textAlign: "center", height: "100%" }}>
      <div style={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg-2)", color: "var(--text-3)" }}>
        <Icon name={s.icon} size={34} stroke={1.8} color="var(--text-3)" />
      </div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{title ?? s.title}</div>
      <div style={{ color: "var(--text-2)", fontSize: 14.5, maxWidth: 300, lineHeight: 1.5 }}>{message ?? s.body}</div>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          style={{
            marginTop: 6,
            padding: "10px 20px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            background: "var(--green)",
            color: "var(--on-accent)",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {primaryAction.label}
        </button>
      )}
    </div>
  );
}
