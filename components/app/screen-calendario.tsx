"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore, type UICategory, type UITx } from "./store";
import { CatBubble, Icon } from "./Icon";
import { StateView, MonthNav, MONTHS_FULL } from "./ui";
import { fmt } from "@/lib/format";

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
      <span className="num tnum" style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", flex: "0 0 auto", color: inc ? "var(--green)" : "var(--text)" }}>
        {inc ? "+ " : "− "}
        {fmt(x.amount, currency)}
      </span>
    </button>
  );
}

export function Calendario() {
  const { transactions, byId, month, year, sim, setSim, openEntry, openEdit, mode, currency } = useStore();
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
    if (t.type === "income") dInc += t.amount;
    else dExp += t.amount;
  });

  if (sim === "loading") return <StateView kind="loading" />;
  if (sim === "error") return <StateView kind="error" onRetry={() => setSim("normal")} />;

  function DayCell({ d }: { d: number }) {
    const txs = byDay[d] || [];
    const on = d === selDay;
    const isToday = isThisMonth && d === today.getDate();
    const colors = [...new Set(txs.map((t) => (t.cat ? byId[t.cat]?.color : null)).filter(Boolean))].slice(0, 3) as string[];
    return (
      <button
        onClick={() => setSel(d)}
        className="cal-cell"
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: 13,
          cursor: "pointer",
          fontFamily: "inherit",
          border: isToday && !on ? "1.5px solid var(--green)" : "1.5px solid transparent",
          background: on ? "var(--green)" : txs.length ? "var(--surface)" : "transparent",
          color: on ? "var(--on-accent)" : txs.length ? "var(--text)" : "var(--text-3)",
          boxShadow: !on && txs.length ? "var(--shadow-card)" : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          fontWeight: txs.length ? 800 : 600,
          fontSize: 14.5,
        }}
      >
        <span>{d}</span>
        <span style={{ display: "flex", gap: 3, height: 5, alignItems: "center" }}>
          {colors.map((c, i) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: on ? "rgba(255,255,255,.92)" : c }} />
          ))}
        </span>
      </button>
    );
  }

  const grid = (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: ".03em", color: "var(--text-3)", textTransform: "uppercase" }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={"b" + i} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => (
          <DayCell key={i + 1} d={i + 1} />
        ))}
      </div>
    </div>
  );

  const dateObj = new Date(year, month, selDay);
  const detail = (
    <div style={{ display: "flex", flexDirection: "column", height: wide ? "100%" : "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-3)" }}>{WEEKDAYS_FULL[dateObj.getDay()]}</div>
          <div className="num" style={{ fontWeight: 600, fontSize: 23, lineHeight: 1.15, marginTop: 2, whiteSpace: "nowrap" }}>
            {selDay} de {MONTHS_FULL[month].toLowerCase()}
          </div>
        </div>
        <button
          onClick={() => openEntry("expense", new Date(year, month, selDay))}
          className="fab-btn"
          aria-label="Agregar movimiento en este día"
          style={{ width: 40, height: 40, borderRadius: 12, flex: "0 0 auto", border: "none", cursor: "pointer", background: "var(--green)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "var(--shadow-fab)" }}
        >
          <Icon name="Plus" size={22} stroke={2.6} color="#fff" />
        </button>
      </div>

      {dayTx.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {dInc > 0 && (
              <div style={{ flex: 1, background: "var(--green-soft)", borderRadius: 12, padding: "9px 12px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--green-700)" }}>Ingresos</div>
                <div className="num tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--green-700)" }}>{fmt(dInc, currency)}</div>
              </div>
            )}
            {dExp > 0 && (
              <div style={{ flex: 1, background: "var(--red-soft)", borderRadius: 12, padding: "9px 12px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--red-600)" }}>Gastos</div>
                <div className="num tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--red-600)" }}>{fmt(dExp, currency)}</div>
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
            style={{ padding: "9px 18px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: "inherit", background: "var(--green-soft)", color: "var(--green-700)", fontWeight: 800, fontSize: 13.5 }}
          >
            Agregar movimiento
          </button>
        </div>
      )}
    </div>
  );

  if (wide) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div className="num" style={{ fontWeight: 600, fontSize: 28 }}>Calendario</div>
          <MonthNav center={false} />
        </div>
        <div style={{ display: "flex", gap: 28, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{grid}</div>
          <div style={{ width: 360, flex: "0 0 auto", background: "var(--surface)", borderRadius: 18, border: "1px solid var(--line)", boxShadow: "var(--shadow-card)", padding: "18px 18px", display: "flex", flexDirection: "column" }}>
            {detail}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "6px 16px 24px" }}>
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 14px" }}><MonthNav /></div>
      {grid}
      <div style={{ height: 1, background: "var(--line)", margin: "20px 0 16px" }} />
      {detail}
    </div>
  );
}
