"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore, type UICategory, type UITx } from "./store";
import { CatBubble, Icon } from "./Icon";
import { StateView, MonthNav, MONTHS_FULL } from "./ui";
import { signedColor } from "./balance";
import { useElementSize } from "./useElementSize";
import { fmt, fmtShort } from "@/lib/format";
import { addDays, startOfDay } from "@/lib/date-range";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const WEEKDAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function useIsWide(bp = 760) {
  const [w, setW] = useState(false);
  useEffect(() => {
    const on = () => setW(window.innerWidth > bp);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [bp]);
  return w;
}

function DayRow({ x, cat, onClick }: { x: UITx; cat: UICategory; onClick: () => void }) {
  const { currency } = useStore();
  const inc = cat.type === "income";
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 2px", width: "100%", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
      <CatBubble icon={cat.icon} color={cat.color} size={40} stroke={2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)" }}>{x.note || cat.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{cat.name}</div>
      </div>
      <span className="num tnum" style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", flex: "0 0 auto", color: inc ? "var(--income)" : "var(--text)" }}>
        {inc ? "+ " : "− "}
        {fmt(x.amount, currency)}
      </span>
    </button>
  );
}

export function Calendario() {
  const { transactions, byId, month, year, sim, setSim, openEntry, openEdit, mode, currency, carryOver, balanceBefore } = useStore();
  const autoWide = useIsWide();
  const wide = mode ? mode === "desktop" : autoWide;

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.getFullYear() === year && t.date.getMonth() === month),
    [transactions, year, month]
  );
  const byDay = useMemo(() => {
    const m: Record<number, UITx[]> = {};
    monthTx.forEach((t) => {
      const d = t.date.getDate();
      (m[d] = m[d] || []).push(t);
    });
    return m;
  }, [monthTx]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const rows = Math.ceil((firstWeekday + daysInMonth) / 7);

  // Tamaño de celda para que la grilla completa entre sin scroll: se mide el alto
  // real del contenedor (ya sin cabecera ni nav) y se le resta lo que ocupan
  // MonthNav, el resumen del mes, la fila de días y un mínimo para el detalle.
  // (callback ref: se engancha aunque el primer render haya sido un estado de carga)
  const [boxRef, box] = useElementSize();
  const boxH = box.height;
  const gap = 6;
  const reserved = wide ? 190 : 300;
  const cellMax = wide ? 96 : 40;
  const cellPx = boxH ? Math.max(26, Math.min((boxH - reserved - (rows - 1) * gap) / rows, cellMax)) : 36;
  const gridMaxWidth = `${Math.round(cellPx * 7 + gap * 6)}px`;

  const monthKey = `${year}-${month}`;
  const firstWithTx = useMemo(
    () => Object.keys(byDay).map(Number).sort((a, b) => a - b)[0] || 1,
    [byDay]
  );
  const [picked, setPicked] = useState<{ key: string; day: number } | null>(null);
  const selDay = Math.min(picked && picked.key === monthKey ? picked.day : firstWithTx, daysInMonth);
  const setSel = (d: number) => setPicked({ key: monthKey, day: d });

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

  const dayTx = (byDay[selDay] || []).slice().sort((a, b) => b.amount - a.amount);
  let dInc = 0;
  let dExp = 0;
  dayTx.forEach((t) => {
    if (t.transfer) return;
    if (t.type === "income") dInc += t.amount;
    else dExp += t.amount;
  });
  let mInc = 0;
  let mExp = 0;
  monthTx.forEach((t) => {
    if (t.transfer) return;
    if (t.type === "income") mInc += t.amount;
    else mExp += t.amount;
  });
  const monthNet = mInc - mExp;
  // Saldo del mes y del día (null mientras el historial no esté listo o con el
  // acumulado apagado). El mes en curso se cuenta hasta hoy, igual que el
  // "Disponible hoy" del Resumen; un mes pasado, al cierre; uno futuro, previsto.
  const tomorrow = addDays(startOfDay(today), 1);
  const monthIsFuture = new Date(year, month, 1).getTime() > today.getTime();
  const monthClosing = carryOver ? balanceBefore(isThisMonth ? tomorrow : new Date(year, month + 1, 1)) : null;
  const monthClosingLabel = isThisMonth ? "Disponible hoy" : monthIsFuture ? "Saldo previsto" : "Saldo al cierre";
  const dayNet = dInc - dExp;
  const dayClosing = carryOver ? balanceBefore(new Date(year, month, selDay + 1)) : null;
  const dayClosingLabel = new Date(year, month, selDay).getTime() > today.getTime() ? "Saldo previsto" : "Saldo al cierre";

  if (sim === "loading") return <StateView kind="loading" />;
  if (sim === "error") return <StateView kind="error" onRetry={() => setSim("normal")} />;

  function DayCell({ d }: { d: number }) {
    const txs = byDay[d] || [];
    const on = d === selDay;
    const isToday = isThisMonth && d === today.getDate();
    const cellNet = txs.reduce((n, t) => (t.transfer ? n : n + (t.type === "income" ? t.amount : -t.amount)), 0);
    const colors = [...new Set(txs.map((t) => (t.cat ? byId[t.cat]?.color : null)).filter(Boolean))].slice(0, 3) as string[];
    return (
      <button
        onClick={() => setSel(d)}
        className="cal-cell"
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: wide ? 13 : 11,
          cursor: "pointer",
          fontFamily: "inherit",
          border: isToday && !on ? "2px solid var(--accent)" : txs.length && !on ? "1.5px solid var(--line)" : "1.5px solid transparent",
          background: on ? "var(--text)" : txs.length ? "var(--surface)" : "transparent",
          color: on ? "var(--surface)" : txs.length ? "var(--text)" : "var(--text-3)",
          
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: wide ? 3 : 2,
          fontWeight: txs.length ? 800 : 600,
          fontSize: wide ? 14.5 : 13,
          lineHeight: 1.1,
        }}
      >
        <span>{d}</span>
        <span style={{ display: "flex", gap: wide ? 3 : 2.5, height: wide ? 5 : 4, alignItems: "center" }}>
          {colors.map((c, i) => (
            <span key={i} style={{ width: wide ? 5 : 4, height: wide ? 5 : 4, borderRadius: 999, background: on ? "var(--surface)" : c }} />
          ))}
        </span>
        {wide && cellNet !== 0 && (
          <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: on ? "var(--surface)" : signedColor(cellNet) }}>
            {cellNet < 0 ? "−" : "+"}
            {fmtShort(Math.abs(cellNet), currency)}
          </span>
        )}
      </button>
    );
  }

  const grid = (
    <div style={{ width: "100%", maxWidth: gridMaxWidth, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap, marginBottom: wide ? 6 : 5 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--text-3)", textTransform: "uppercase" }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap }}>
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={"b" + i} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => (
          <DayCell key={i + 1} d={i + 1} />
        ))}
      </div>
    </div>
  );

  const summary = (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 14px" }}>
      <div>
        <div className="eyebrow">Balance mensual</div>
        <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: signedColor(monthNet) }}>{fmt(monthNet, currency, { sign: true })}</div>
      </div>
      {monthClosing !== null && (
        <div style={{ textAlign: "right" }}>
          <div className="eyebrow">{monthClosingLabel}</div>
          <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: monthClosing < 0 ? "var(--expense)" : "var(--text)" }}>{fmt(monthClosing, currency)}</div>
        </div>
      )}
    </div>
  );

  const dateObj = new Date(year, month, selDay);
  const detail = (
    <div style={{ display: "flex", flexDirection: "column", height: wide ? "100%" : "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-3)" }}>{WEEKDAYS_FULL[dateObj.getDay()]}</div>
          <div className="num" style={{ fontWeight: 600, fontSize: 23, lineHeight: 1.15, marginTop: 2, whiteSpace: "nowrap" }}>
            {selDay} de {MONTHS_FULL[month].toLowerCase()}
          </div>
        </div>
        <button
          onClick={() => openEntry("expense", new Date(year, month, selDay))}
          className="fab-btn"
          aria-label="Agregar movimiento en este día"
          style={{ width: 44, height: 44, borderRadius: 12, flex: "0 0 auto", border: "none", cursor: "pointer", background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-fab)" }}
        >
          <Icon name="Plus" size={22} stroke={2.6} color="var(--on-accent)" />
        </button>
      </div>

      {(dayTx.length > 0 || dayClosing !== null) && (
        <div className="caption tnum" style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", columnGap: 14, rowGap: 2 }}>
          {dayTx.length > 0 && (
            <span>
              Balance del día <strong style={{ color: signedColor(dayNet) }}>{fmt(dayNet, currency, { sign: true })}</strong>
            </span>
          )}
          {dayClosing !== null && (
            <span>
              {dayClosingLabel} <strong style={{ color: dayClosing < 0 ? "var(--expense)" : "var(--text)" }}>{fmt(dayClosing, currency)}</strong>
            </span>
          )}
        </div>
      )}

      {dayTx.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {dInc > 0 && (
              <div style={{ flex: 1, background: "var(--income-soft)", borderRadius: 12, padding: "9px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--income)" }}>Ingresos</div>
                <div className="num tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--income)" }}>{fmt(dInc, currency)}</div>
              </div>
            )}
            {dExp > 0 && (
              <div style={{ flex: 1, background: "var(--expense-soft)", borderRadius: 12, padding: "9px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--expense)" }}>Gastos</div>
                <div className="num tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--expense)" }}>{fmt(dExp, currency)}</div>
              </div>
            )}
          </div>
          <div className="app-scroll" style={{ flex: wide ? 1 : "none", minHeight: 0, overflowY: wide ? "auto" : "visible" }}>
            {dayTx.map((x) => {
              const c = x.cat ? byId[x.cat] : null;
              if (!c) return null;
              return <DayRow key={x.id} x={x} cat={c} onClick={() => openEdit(x)} />;
            })}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 20px", gap: 12, flex: wide ? 1 : "none" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--bg-2)" }}>
            <Icon name="CalendarDays" size={28} stroke={1.8} color="var(--text-3)" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-2)" }}>Sin movimientos este día</div>
          <button
            onClick={() => openEntry("expense", new Date(year, month, selDay))}
            style={{ padding: "9px 18px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "inherit", background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 13.5 }}
          >
            Agregar movimiento
          </button>
        </div>
      )}
    </div>
  );

  if (wide) {
    return (
      <div ref={boxRef} style={{ height: "100%", display: "flex", flexDirection: "column", padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="num" style={{ fontWeight: 600, fontSize: 28 }}>Calendario</div>
          <MonthNav center={false} />
        </div>
        <div style={{ marginBottom: 14, maxWidth: 420 }}>{summary}</div>
        <div style={{ display: "flex", gap: 28, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{grid}</div>
          <div style={{ width: 360, flex: "0 0 auto", background: "var(--surface)", borderRadius: 18, border: "1px solid var(--line)", padding: "18px 18px", display: "flex", flexDirection: "column" }}>
            {detail}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", padding: "4px 16px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", margin: "2px 0 6px", flex: "0 0 auto" }}><MonthNav /></div>
      <div style={{ flex: "0 0 auto", marginBottom: 10 }}>{summary}</div>
      <div style={{ flex: "0 0 auto" }}>{grid}</div>
      <div style={{ height: 1, background: "var(--line)", margin: "12px 0 10px", flex: "0 0 auto" }} />
      <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 12 }}>{detail}</div>
    </div>
  );
}
