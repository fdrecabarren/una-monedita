"use client";

import { useState } from "react";
import { useStore, type UICategory, type UITx } from "./store";
import { CatBubble, Icon } from "./Icon";
import { StateView, MONTHS } from "./ui";
import { fmt } from "@/lib/format";

function fmtDate(d: Date) {
  return d.getDate() + " " + MONTHS[d.getMonth()].toLowerCase();
}

function Row({ x, cat }: { x: UITx; cat: UICategory }) {
  const { openEdit, currency } = useStore();
  const inc = cat.type === "income";
  return (
    <button
      onClick={() => openEdit(x)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 4px",
        width: "100%",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: 999, background: cat.color, flex: "0 0 auto" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)" }}>{x.note || cat.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{fmtDate(x.date)}</div>
      </div>
      <span className="num tnum" style={{ fontSize: 14, fontWeight: 700, color: inc ? "var(--green)" : "var(--text)" }}>
        {inc ? "+ " : "− "}
        {fmt(x.amount, currency)}
      </span>
    </button>
  );
}

interface Group {
  cat: UICategory;
  items: UITx[];
  total: number;
}

function GroupCard({ g }: { g: Group }) {
  const [open, setOpen] = useState(false);
  const { currency } = useStore();
  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, padding: "6px 14px", boxShadow: "var(--shadow-card)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left" }}
      >
        <CatBubble icon={g.cat.icon} color={g.cat.color} size={42} stroke={2} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>{g.cat.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>
            {g.items.length} {g.items.length === 1 ? "movimiento" : "movimientos"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num tnum" style={{ fontWeight: 700, fontSize: 15, color: g.cat.type === "income" ? "var(--green)" : "var(--text)" }}>
            {g.cat.type === "income" ? "+ " : "− "}
            {fmt(g.total, currency)}
          </div>
        </div>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={18} stroke={2.2} color="var(--text-3)" />
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 2, marginTop: 2 }}>
          {g.items
            .slice()
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((x) => (
              <Row key={x.id} x={x} cat={g.cat} />
            ))}
        </div>
      )}
    </div>
  );
}

export function Movimientos() {
  const { visibleTx, byId, sim, setSim, totals, currency } = useStore();
  if (sim === "loading") return <StateView kind="loading" />;
  if (sim === "error") return <StateView kind="error" onRetry={() => setSim("normal")} />;
  if (sim === "empty" || visibleTx.length === 0) return <StateView kind="empty" />;

  const groups: Record<string, Group> = {};
  visibleTx.forEach((x) => {
    const c = x.cat ? byId[x.cat] : undefined;
    if (!c) return;
    if (!groups[c.id]) groups[c.id] = { cat: c, items: [], total: 0 };
    groups[c.id].items.push(x);
    groups[c.id].total += x.amount;
  });
  const list = Object.values(groups).sort((a, b) => {
    if ((a.cat.type === "income") !== (b.cat.type === "income")) return a.cat.type === "income" ? 1 : -1;
    return b.total - a.total;
  });

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "4px 16px 24px" }}>
      <div style={{ display: "flex", gap: 10, margin: "6px 2px 16px" }}>
        <div style={{ flex: 1, background: "var(--green-soft)", borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--green-700)" }}>Ingresos</div>
          <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--green-700)", marginTop: 2 }}>{fmt(totals.income, currency)}</div>
        </div>
        <div style={{ flex: 1, background: "var(--red-soft)", borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--red-600)" }}>Gastos</div>
          <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--red-600)", marginTop: 2 }}>{fmt(totals.expense, currency)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((g) => (
          <GroupCard key={g.cat.id} g={g} />
        ))}
      </div>
    </div>
  );
}
