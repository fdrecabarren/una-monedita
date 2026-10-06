"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { useStore, type Period, type TxType } from "./store";
import { Icon } from "./Icon";
import { RangeModal } from "./modal-range";
import { fmt } from "@/lib/format";

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MONTHS_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
// "Personalizado" no es una opción del selector: se abre desde la etiqueta de
// RangeNav (un segmento que abre un modal rompería la semántica de selección).
const PERIOD_ITEMS: { value: Period; label: string }[] = [
  { value: "Día", label: "Día" },
  { value: "Semana", label: "Semana" },
  { value: "Mes", label: "Mes" },
  { value: "Año", label: "Año" },
];

// Único estilo de selección de la app: pista --bg-2, opción elegida sobre
// --surface con borde, sin sombras ni colores de marca. El estado se comunica
// con peso + fondo + aria-checked, no solo con color.
// Patrón radio de ARIA: un solo tab stop (la opción elegida, o la primera si no
// hay ninguna) y las flechas mueven la selección.
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  stretch = false,
}: {
  label: string;
  options: { value: T; label: string; dot?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  stretch?: boolean;
}) {
  const current = options.findIndex((o) => o.value === value);
  const tabStop = current >= 0 ? current : 0;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : -1;
    if (!step && jump < 0) return;
    e.preventDefault();
    const from = current >= 0 ? current : 0;
    const next = jump >= 0 ? jump : (from + step + options.length) % options.length;
    onChange(options[next].value);
    const radios = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    radios[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} style={{ display: "flex", gap: 3, background: "var(--bg-2)", padding: 3, borderRadius: 999, width: stretch ? "100%" : undefined }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => onChange(o.value)}
            style={{
              flex: stretch ? 1 : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "8px 14px",
              minHeight: 36,
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: on ? 800 : 700,
              border: on ? "1px solid var(--line)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              color: on ? "var(--text)" : "var(--text-2)",
              background: on ? "var(--surface)" : "transparent",
              transition: "background .15s, color .15s",
            }}
          >
            {o.dot && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: o.dot, flex: "0 0 auto" }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PeriodPills() {
  const { period, setPeriod } = useStore();
  return (
    <SegmentedControl<Period>
      label="Período"
      options={PERIOD_ITEMS}
      value={period === "Personalizado" ? null : period}
      onChange={setPeriod}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label = "Opciones",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return <SegmentedControl<T> label={label} options={options} value={value} onChange={onChange} stretch />;
}

// FocusToggle: alterna el foco del Resumen entre Gastos e Ingresos. Misma
// pastilla neutra que el resto; un punto de color indica el tipo.
export function FocusToggle() {
  const { focus, setFocus } = useStore();
  return (
    <SegmentedControl<TxType>
      label="Mostrar"
      options={[
        { value: "expense", label: "Gastos", dot: "var(--expense-fill)" },
        { value: "income", label: "Ingresos", dot: "var(--income-fill)" },
      ]}
      value={focus}
      onChange={setFocus}
    />
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

// Cabecera de navegación del Resumen: ‹ [etiqueta del rango ⌄] ›. Funciona para
// los períodos fijos y el rango personalizado; tocar la etiqueta abre el selector
// de rango.
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
        aria-haspopup="dialog"
        aria-label={`Elegir período, ${rangeLabel}`}
        className="num"
        style={{ minWidth: 132, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 600, fontSize: 16, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", padding: "4px 6px" }}
      >
        {rangeLabel}
        <Icon name="ChevronDown" size={14} stroke={2.4} color="var(--text-3)" />
      </button>
      <button className="icon-btn" onClick={() => navRange(1)} aria-label="Período siguiente">
        <Icon name="ChevronRight" size={20} stroke={2.4} color="var(--text-2)" />
      </button>
      {open && <RangeModal onClose={() => setOpen(false)} />}
    </div>
  );
}

// Centro del donut: lo que suma el anillo (gastos o ingresos del foco), sin
// repetir el saldo: el Disponible vive en un solo lugar (Monedero / BalanceCard).
export function CenterBalance({ scale = 1 }: { scale?: number }) {
  const { totals, currency, focus, rangeLabel } = useStore();
  const isExpense = focus === "expense";
  return (
    <div>
      <div className="eyebrow" style={{ color: "var(--text-2)" }}>{isExpense ? "Gastos" : "Ingresos"}</div>
      <div className="num" style={{ fontSize: 34 * scale, fontWeight: 600, lineHeight: 1.04, color: "var(--text)", marginTop: 2 }}>
        {fmt(isExpense ? totals.expense : totals.income, currency)}
      </div>
      <div className="caption" style={{ marginTop: 4 }}>{rangeLabel.toLowerCase()}</div>
    </div>
  );
}

export function ActionButton({ kind, onClick, size = 60 }: { kind: "expense" | "income"; onClick: () => void; size?: number }) {
  const expense = kind === "expense";
  return (
    <button
      onClick={onClick}
      aria-label={expense ? "Agregar gasto" : "Agregar ingreso"}
      className="fab-btn"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        border: "none",
        cursor: "pointer",
        background: expense ? "var(--expense-fill)" : "var(--income-fill)",
        color: expense ? "var(--on-expense)" : "var(--on-income)",
        boxShadow: "var(--shadow-soft)",
        transition: "filter .15s, transform .1s",
      }}
    >
      <Icon name={expense ? "Minus" : "Plus"} size={Math.round(size * 0.46)} stroke={3} color={expense ? "var(--on-expense)" : "var(--on-income)"} />
    </button>
  );
}

// Aviso flotante. Los errores no se cierran solos y llevan botón de cierre; los
// éxitos desaparecen a los pocos segundos (el store los limpia).
export function Toast({ desktop }: { desktop: boolean }) {
  const { notice, dismissNotice } = useStore();
  if (!notice) return null;
  const error = notice.kind === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className="card"
      style={{
        position: "fixed",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: error ? "8px 6px 8px 14px" : "11px 16px",
        boxShadow: "var(--shadow-soft)",
        borderColor: "var(--line-strong)",
        fontFamily: "var(--font-app), ui-sans-serif, system-ui, sans-serif",
        color: "var(--text)",
        fontWeight: 700,
        fontSize: 14,
        width: "max-content",
        maxWidth: "min(92vw, 420px)",
        ...(desktop
          ? { right: 24, bottom: 24 }
          : { left: "50%", transform: "translateX(-50%)", top: "calc(env(safe-area-inset-top) + 12px)" }),
      }}
    >
      <Icon name={error ? "CircleAlert" : "CircleCheck"} size={18} stroke={2.2} color={error ? "var(--expense)" : "var(--income)"} />
      <span style={{ lineHeight: 1.35 }}>{notice.text}</span>
      {error && (
        <button className="icon-btn" onClick={dismissNotice} aria-label="Cerrar aviso" style={{ flex: "0 0 auto" }}>
          <Icon name="X" size={18} stroke={2.2} color="var(--text-2)" />
        </button>
      )}
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
  message?: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  if (kind === "loading") {
    return (
      <div role="status" aria-label="Cargando" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 18, height: "100%" }}>
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
    empty: { icon: "Wallet", title: "Sin movimientos", body: "No hay movimientos en este período. Tocá − para cargar un gasto o + para un ingreso." },
    error: { icon: "CloudOff", title: "No se pudo cargar", body: "Hubo un problema al traer tus datos. Revisá la conexión e intentá de nuevo." },
  };
  const s = map[kind] || map.empty;
  const primaryAction = kind === "error" ? { label: "Reintentar", onClick: onRetry ?? (() => {}) } : action;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 14, textAlign: "center", height: "100%" }}>
      <div style={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg-2)", color: "var(--text-3)" }}>
        <Icon name={s.icon} size={34} stroke={1.8} color="var(--text-3)" />
      </div>
      <div style={{ fontWeight: 800, fontSize: 17 }}>{title ?? s.title}</div>
      <div style={{ color: "var(--text-2)", fontSize: 15, maxWidth: 300, lineHeight: 1.5 }}>{message ?? s.body}</div>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          style={{
            marginTop: 6,
            padding: "12px 20px",
            minHeight: 44,
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            background: "var(--accent)",
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
