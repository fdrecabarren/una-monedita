"use client";

import { useMemo, useState } from "react";
import { useStore, type UICategory, type UITx } from "./store";
import { CatBubble, Icon } from "./Icon";
import { StateView, MONTHS, RangeNav } from "./ui";
import { FiltrosModal } from "./modal-filtros";
import { fmt } from "@/lib/format";
import { applyTxFilter, sumTotals, activeFilterCount, EMPTY_TX_FILTER } from "@/lib/tx-filter";

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

// Chips de los filtros activos, uno por pieza (tipo + cada categoría), con
// botón × para quitar esa pieza sola sin abrir la hoja de Filtros.
function FilterChips() {
  const { txFilter, setTxFilter, byId } = useStore();
  const pieces: { key: string; label: string; onRemove: () => void }[] = [];

  if (txFilter.type !== "all") {
    pieces.push({
      key: "type",
      label: txFilter.type === "income" ? "Ingresos" : "Gastos",
      onRemove: () => setTxFilter({ ...txFilter, type: "all" }),
    });
  }
  txFilter.cats.forEach((id) => {
    const c = byId[id];
    if (!c) return;
    pieces.push({
      key: id,
      label: c.name,
      onRemove: () => setTxFilter({ ...txFilter, cats: txFilter.cats.filter((x) => x !== id) }),
    });
  });

  if (pieces.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "0 2px 12px" }}>
      {pieces.map((p) => (
        <button
          key={p.key}
          onClick={p.onRemove}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 8px 6px 12px",
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--text-2)",
            fontWeight: 700,
            fontSize: 12.5,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {p.label}
          <Icon name="X" size={13} stroke={2.6} color="var(--text-3)" />
        </button>
      ))}
    </div>
  );
}

export function Movimientos() {
  const { visibleTx, byId, sim, setSim, currency, txFilter, setTxFilter, loadError } = useStore();
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const filterCount = activeFilterCount(txFilter);

  const filteredTx = useMemo(() => applyTxFilter(visibleTx, txFilter), [visibleTx, txFilter]);
  const filteredTotals = useMemo(() => sumTotals(filteredTx), [filteredTx]);

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 2px 12px" }}>
      <div style={{ flex: 1 }}>
        <RangeNav center={false} />
      </div>
      <button
        onClick={() => setFiltrosOpen(true)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 14px",
          borderRadius: 999,
          border: "1.5px solid var(--line)",
          background: filterCount > 0 ? "var(--green-soft)" : "var(--surface)",
          color: filterCount > 0 ? "var(--green-700)" : "var(--text-2)",
          fontWeight: 800,
          fontSize: 13.5,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <Icon name="SlidersHorizontal" size={16} stroke={2.4} color={filterCount > 0 ? "var(--green-700)" : "var(--text-2)"} />
        Filtros
        {filterCount > 0 && (
          <span
            className="num tnum"
            style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--green)", color: "var(--on-accent)", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center" }}
          >
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );

  if (loadError) return <StateView kind="error" onRetry={() => window.location.reload()} />;
  if (sim === "loading") return <StateView kind="loading" />;
  if (sim === "error") return <StateView kind="error" onRetry={() => setSim("normal")} />;
  // El header se mantiene también en vacío: sin él no hay forma de salir de un
  // período sin movimientos (ni navegar meses ni abrir Filtros) desde acá.
  if (sim === "empty" || visibleTx.length === 0) {
    return (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "4px 16px 24px" }}>
        {header}
        <StateView kind="empty" />
        {filtrosOpen && <FiltrosModal onClose={() => setFiltrosOpen(false)} />}
      </div>
    );
  }

  if (filteredTx.length === 0) {
    return (
      <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "4px 16px 24px" }}>
        {header}
        <FilterChips />
        <StateView
          kind="empty"
          message="Ningún movimiento con estos filtros."
          action={{ label: "Quitar filtros", onClick: () => setTxFilter(EMPTY_TX_FILTER) }}
        />
        {filtrosOpen && <FiltrosModal onClose={() => setFiltrosOpen(false)} />}
      </div>
    );
  }

  // Con exactamente 1 categoría seleccionada la tarjeta agrupadora no aporta
  // nada (ya sabés cuál es) — se muestra una lista plana por fecha desc.
  const flat = txFilter.cats.length === 1;

  const groups: Record<string, Group> = {};
  if (!flat) {
    filteredTx.forEach((x) => {
      const c = x.cat ? byId[x.cat] : undefined;
      if (!c) return;
      if (!groups[c.id]) groups[c.id] = { cat: c, items: [], total: 0 };
      groups[c.id].items.push(x);
      groups[c.id].total += x.amount;
    });
  }
  const list = Object.values(groups).sort((a, b) => {
    if ((a.cat.type === "income") !== (b.cat.type === "income")) return a.cat.type === "income" ? 1 : -1;
    return b.total - a.total;
  });
  const flatList = flat
    ? filteredTx.slice().sort((a, b) => b.date.getTime() - a.date.getTime())
    : [];

  return (
    <div className="app-scroll" style={{ height: "100%", overflowY: "auto", padding: "4px 16px 24px" }}>
      {header}
      <FilterChips />
      <div style={{ display: "flex", gap: 10, margin: "6px 2px 16px" }}>
        {txFilter.type !== "all" ? (
          <div
            style={{
              flex: 1,
              background: txFilter.type === "income" ? "var(--green-soft)" : "var(--red-soft)",
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: txFilter.type === "income" ? "var(--green-700)" : "var(--red-600)" }}>
              {txFilter.type === "income" ? "Ingresos" : "Gastos"}
            </div>
            <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: txFilter.type === "income" ? "var(--green-700)" : "var(--red-600)", marginTop: 2 }}>
              {fmt(txFilter.type === "income" ? filteredTotals.income : filteredTotals.expense, currency)}
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, background: "var(--green-soft)", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--green-700)" }}>Ingresos</div>
              <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--green-700)", marginTop: 2 }}>{fmt(filteredTotals.income, currency)}</div>
            </div>
            <div style={{ flex: 1, background: "var(--red-soft)", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--red-600)" }}>Gastos</div>
              <div className="num tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--red-600)", marginTop: 2 }}>{fmt(filteredTotals.expense, currency)}</div>
            </div>
          </>
        )}
      </div>

      {flat ? (
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: "6px 14px", boxShadow: "var(--shadow-card)" }}>
          {flatList.map((x) => {
            const c = x.cat ? byId[x.cat] : undefined;
            if (!c) return null;
            return <Row key={x.id} x={x} cat={c} />;
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((g) => (
            <GroupCard key={g.cat.id} g={g} />
          ))}
        </div>
      )}

      {filtrosOpen && <FiltrosModal onClose={() => setFiltrosOpen(false)} />}
    </div>
  );
}
