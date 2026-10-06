"use client";

import { useState, type CSSProperties } from "react";
import { useStore } from "./store";
import { Sheet, SheetHeader } from "./Sheet";
import {
  type DateRange,
  rangeFor,
  shiftRange,
  addDays,
  toISO,
  parseDate,
} from "@/lib/date-range";

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  borderRadius: 12,
  padding: "12px 14px",
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--text)",
};

function shortcuts(): { label: string; range: DateRange }[] {
  const now = new Date();
  const mes = rangeFor("Mes", now);
  const semana = rangeFor("Semana", now);
  return [
    { label: "Hoy", range: rangeFor("Día", now) },
    { label: "Ayer", range: rangeFor("Día", addDays(now, -1)) },
    { label: "Esta semana", range: semana },
    { label: "Semana pasada", range: shiftRange(semana, "Semana", -1) },
    { label: "Este mes", range: mes },
    { label: "Mes pasado", range: shiftRange(mes, "Mes", -1) },
    { label: "Últimos 7 días", range: { start: addDays(now, -6), end: now } },
    { label: "Últimos 30 días", range: { start: addDays(now, -29), end: now } },
    { label: "Este año", range: rangeFor("Año", now) },
  ];
}

// Cuerpo del selector de rango (atajos + fechas). Se usa dentro de RangeModal y
// como vista interna del sheet de Filtros (nunca dos sheets apilados).
export function RangePicker({ onDone }: { onDone: () => void }) {
  const { range, setRange } = useStore();
  const [start, setStart] = useState(toISO(range.start));
  const [end, setEnd] = useState(toISO(range.end));

  function apply(r: DateRange) {
    setRange(r.start, r.end);
    onDone();
  }

  function applyCustom() {
    setRange(parseDate(start), parseDate(end));
    onDone();
  }

  return (
    <div
      className="app-scroll"
      style={{
        padding: "8px 20px calc(20px + env(safe-area-inset-bottom))",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehavior: "contain",
      }}
    >
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Atajos</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {shortcuts().map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => apply(s.range)}
              style={{
                padding: "10px 14px",
                minHeight: 40,
                borderRadius: 999,
                border: "1.5px solid var(--line)",
                background: "var(--surface)",
                color: "var(--text-2)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Rango personalizado</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="date" aria-label="Desde" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
          <span style={{ color: "var(--text-3)", fontWeight: 700 }} aria-hidden="true">–</span>
          <input type="date" aria-label="Hasta" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <button
        onClick={applyCustom}
        style={{ padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 800, fontSize: 15 }}
      >
        Aplicar
      </button>
    </div>
  );
}

export function RangeModal({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Elegir período" onClose={onClose} style={{ maxHeight: "94dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <SheetHeader title="Elegir período" onClose={onClose} />
      <RangePicker onDone={onClose} />
    </Sheet>
  );
}
